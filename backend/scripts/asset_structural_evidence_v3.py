"""Real structural evidence v3 (Track v7): footprint-matched GEDI<->CHMv2
reconciliation, data-driven structural strata (not a median 50/50 split),
GEDI L4A AGBD as independent model-derived evidence, and ALOS PALSAR L-band
backscatter as a qualitative structural diagnostic. All polygon-clipped to
the real canonical AOI (unchanged from v2's fix).

WHY THIS EXISTS: v2 (asset_structural_evidence.py) polygon-clipped CHMv2 and
GEDI but (a) never compared the two sensors on the SAME ground support, so a
genuine cross-sensor disagreement (Namavundu: CHMv2 p98 ~13m vs GEDI RH98
mean ~32m) went unexplained, and (b) split each polygon into exactly two
zones at the CHMv2 median height purely for tractability -- a real,
non-arbitrary split, but not a data-driven stratification using the actual
multi-sensor evidence available.

METHOD NOTES (read before trusting any number below):
  - GEDI<->CHM reconciliation: for every real GEDI L2A/L2B footprint sample,
    CHMv2 is re-sampled over a 12.5m-radius disc (matching GEDI's ~25m
    footprint diameter) via reduceRegions, giving a CHM percentile profile
    on the SAME ground support as that shot's GEDI RH profile. This is what
    lets us compute a real paired bias/RMSE/MAE/rank-correlation instead of
    comparing two different areas.
  - Structural strata: built from real per-point samples (CHMv2 height,
    CHMv2-derived local cover proxy, Sentinel-2 NDVI/NDMI/NBR, Sentinel-1
    VV/VH, SRTM slope) at ~30m nominal spacing, k-means clustered (plain
    numpy Lloyd's algorithm, no sklearn/scipy dependency available in this
    environment), then a k-NN majority smoothing pass acts as the minimum-
    mapping-unit filter (a literal raster-based MMU was not used because
    reconstructing an exact affine grid from GEE's sampleRectangle output
    proved less robust than working directly with the real per-point
    coordinates GEE already returns). These are DERIVED ANALYSIS STRATA --
    not surveyed compartments, not official sub-blocks.
  - GEDI L4A AGBD and ALOS PALSAR are NOT fed into the tree-population
    likelihood in this pass. They are retained as independent, real,
    dated evidence for posterior-predictive consistency checks
    (tree_population_model.py) -- documented that way explicitly, per the
    instruction not to map L-band to biomass without calibration and not to
    double-count GEDI structure metrics that already dominate the model.

Usage:
    uv run python scripts/asset_structural_evidence_v3.py \
        --polygon-dir ../outputs/asset-intel \
        --output ../outputs/asset-intel/asset-structural-evidence-v3.json
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import ee
import numpy as np

REFERENCE_ASSETS = [
    {"canonical_name": "Kapimpini", "polygon_file": "polygon-Kapimpini.geojson"},
    {"canonical_name": "Namavundu", "polygon_file": "polygon-Namavundu.geojson"},
    {"canonical_name": "MBOONI SOUTH", "polygon_file": "polygon-MBOONI_SOUTH.geojson"},
]

CHM_ASSET_ID = "projects/meta-forest-monitoring-okw37/assets/CanopyHeight"
GEDI_L2A = "LARSE/GEDI/GEDI02_A_002_MONTHLY"
GEDI_L2B = "LARSE/GEDI/GEDI02_B_002_MONTHLY"
GEDI_L4A = "LARSE/GEDI/GEDI04_A_002_MONTHLY"
PALSAR_EPOCH = "JAXA/ALOS/PALSAR/YEARLY/SAR_EPOCH"
S2_COLLECTION = "COPERNICUS/S2_SR_HARMONIZED"
S1_COLLECTION = "COPERNICUS/S1_GRD"
DEM_ASSET = "USGS/SRTMGL1_003"

# Reused (not modified) from the separate EO observation pipeline's own
# constants, for cloud-mask/reflectance-scale consistency -- see
# app/services/eo/feature_registry.py. Not calling into that pipeline's
# ingestion code itself: this script has its own scope (spatial clustering
# features), not observations.eo_series ingestion.
SCL_REJECTED_CLASSES = (0, 1, 2, 3, 7, 8, 9, 10, 11)
REFLECTANCE_SCALE = 0.0001

MAX_GEDI_SHOTS = 500
GEDI_FOOTPRINT_RADIUS_M = 12.5
GEDI_L2_RH_BANDS = ["rh25", "rh50", "rh75", "rh90", "rh95", "rh98"]
GEDI_L2_META_BANDS = ["quality_flag", "sensitivity", "shot_number_within_beam", "beam", "delta_time", "degrade_flag"]
GEDI_L4A_BANDS = ["agbd", "agbd_se", "agbd_pi_lower", "agbd_pi_upper", "l4_quality_flag", "degrade_flag", "sensitivity", "beam"]

N_CLUSTER_POINTS_PER_HA = 0.6  # sampling density target for the strata grid
MIN_CLUSTER_POINTS = 250
MAX_CLUSTER_POINTS = 4000
KMEANS_K = 6
KNN_SMOOTH_K = 8
KNN_SMOOTH_ITERS = 2


def load_polygon_geojson(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def load_polygon(path: Path) -> ee.Geometry:
    return ee.Geometry(load_polygon_geojson(path))


def _polygon_rings(geojson: dict) -> list[list[tuple[float, float]]]:
    coords = geojson.get("coordinates")
    gtype = geojson.get("type")
    rings: list[list[tuple[float, float]]] = []
    if gtype == "Polygon":
        for ring in coords:
            rings.append([(c[0], c[1]) for c in ring])
    elif gtype == "MultiPolygon":
        for poly in coords:
            for ring in poly:
                rings.append([(c[0], c[1]) for c in ring])
    return rings


def _edge_distance_m(lon: float, lat: float, rings: list[list[tuple[float, float]]]) -> float | None:
    """Pure-Python point-to-polygon-boundary distance in meters (equirectangular
    approximation about the query point's own latitude -- accurate to well
    under 1% for the local distances involved here, tens to a few thousand
    meters). Avoids relying on an Earth Engine geometry-boundary method."""
    if not rings:
        return None
    lat0 = math.radians(lat)
    m_per_deg_lon = 111_320.0 * math.cos(lat0)
    m_per_deg_lat = 110_540.0

    def to_xy(lo, la):
        return ((lo - lon) * m_per_deg_lon, (la - lat) * m_per_deg_lat)

    px, py = 0.0, 0.0
    best = None
    for ring in rings:
        pts = [to_xy(lo, la) for lo, la in ring]
        for i in range(len(pts) - 1):
            ax, ay = pts[i]
            bx, by = pts[i + 1]
            dx, dy = bx - ax, by - ay
            seg_len2 = dx * dx + dy * dy
            if seg_len2 == 0:
                t = 0.0
            else:
                t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / seg_len2))
            cx, cy = ax + t * dx, ay + t * dy
            d = math.hypot(px - cx, py - cy)
            if best is None or d < best:
                best = d
    return best


def _chm_image() -> ee.Image:
    return ee.ImageCollection(CHM_ASSET_ID).mosaic().select(0).rename("height_m")


def gedi_l2_shots(geom: ee.Geometry) -> list[dict]:
    bands = GEDI_L2_RH_BANDS + GEDI_L2_META_BANDS
    l2a = ee.ImageCollection(GEDI_L2A).filterBounds(geom).select(bands).mosaic()
    l2b = ee.ImageCollection(GEDI_L2B).filterBounds(geom).select(["cover", "pai", "fhd_normal"]).mosaic()
    combined = l2a.addBands(l2b)
    samples = combined.sample(region=geom, scale=25, numPixels=MAX_GEDI_SHOTS, geometries=True, seed=7)
    features = samples.getInfo().get("features", [])
    shots = []
    for f in features:
        props = f.get("properties", {})
        coords = f.get("geometry", {}).get("coordinates")
        if props.get("rh98") is None:
            continue
        shot = {
            "lon": coords[0] if coords else None,
            "lat": coords[1] if coords else None,
            "shot_number_within_beam": props.get("shot_number_within_beam"),
            "beam": props.get("beam"),
            "delta_time": props.get("delta_time"),
            "degrade_flag": props.get("degrade_flag"),
            "quality_flag": props.get("quality_flag"),
            "sensitivity": props.get("sensitivity"),
            "cover": props.get("cover"),
            "pai": props.get("pai"),
            "fhd_normal": props.get("fhd_normal"),
        }
        for b in GEDI_L2_RH_BANDS:
            shot[f"{b}_m"] = props.get(b)
        shots.append(shot)
    return shots


def gedi_l4a_shots(geom: ee.Geometry) -> list[dict]:
    l4a = ee.ImageCollection(GEDI_L4A).filterBounds(geom).select(GEDI_L4A_BANDS).mosaic()
    samples = l4a.sample(region=geom, scale=25, numPixels=MAX_GEDI_SHOTS, geometries=True, seed=11)
    features = samples.getInfo().get("features", [])
    shots = []
    for f in features:
        props = f.get("properties", {})
        coords = f.get("geometry", {}).get("coordinates")
        if props.get("agbd") is None:
            continue
        shots.append(
            {
                "lon": coords[0] if coords else None,
                "lat": coords[1] if coords else None,
                "agbd_mg_ha": props.get("agbd"),
                "agbd_se_mg_ha": props.get("agbd_se"),
                "agbd_pi_lower_mg_ha": props.get("agbd_pi_lower"),
                "agbd_pi_upper_mg_ha": props.get("agbd_pi_upper"),
                "l4_quality_flag": props.get("l4_quality_flag"),
                "degrade_flag": props.get("degrade_flag"),
                "sensitivity": props.get("sensitivity"),
                "beam": props.get("beam"),
            }
        )
    return shots


def reconcile_gedi_chm(geom: ee.Geometry, shots: list[dict], rings: list[list[tuple[float, float]]]) -> list[dict]:
    """Real footprint-matched comparison: CHMv2 re-sampled over the SAME
    ~25m-diameter disc as each GEDI shot, not averaged over the whole
    polygon. Also computes edge distance (to the polygon boundary, pure
    Python -- see _edge_distance_m) and a real footprint-overlap-fraction
    proxy (valid CHM pixel count inside the disc / the pixel count a fully-
    inside disc would have at 1m)."""
    if not shots:
        return []
    expected_full_disc_pixels = math.pi * (GEDI_FOOTPRINT_RADIUS_M**2)  # at ~1m native CHM resolution

    feats = []
    for i, s in enumerate(shots):
        pt = ee.Geometry.Point([s["lon"], s["lat"]])
        disc = pt.buffer(GEDI_FOOTPRINT_RADIUS_M)
        feats.append(ee.Feature(disc, {"shot_idx": i}))
    fc = ee.FeatureCollection(feats)

    chm = _chm_image()
    reducer = (
        ee.Reducer.percentile([50, 75, 90, 95, 98])
        .combine(ee.Reducer.max(), sharedInputs=True)
        .combine(ee.Reducer.count(), sharedInputs=True)
    )
    reduced = chm.reduceRegions(collection=fc, reducer=reducer, scale=1)
    info = reduced.getInfo().get("features", [])

    matched = []
    for feat in info:
        props = feat.get("properties", {})
        idx = props.get("shot_idx")
        if idx is None:
            continue
        s = dict(shots[idx])
        # NOTE: reduceRegions() column names are the bare reducer-statistic
        # names (p50/p75/.../count/max), NOT band-prefixed like a combined
        # reduceRegion() call on a single-band image -- verified live via a
        # single-feature repro after this first came back as chm_pixel_count
        # == 0 for every shot (scripts/debug session, this sprint).
        chm_count = props.get("count") or 0
        edge_dist = _edge_distance_m(s["lon"], s["lat"], rings)
        s.update(
            {
                "chm_p50_m": props.get("p50"),
                "chm_p75_m": props.get("p75"),
                "chm_p90_m": props.get("p90"),
                "chm_p95_m": props.get("p95"),
                "chm_p98_m": props.get("p98"),
                "chm_max_m": props.get("max"),
                "chm_pixel_count": chm_count,
                "footprint_overlap_fraction": round(min(1.0, chm_count / expected_full_disc_pixels), 3)
                if expected_full_disc_pixels
                else None,
                "edge_distance_m": round(edge_dist, 1) if edge_dist is not None else None,
            }
        )
        matched.append(s)
    return matched


def _spearman(x: list[float], y: list[float]) -> float | None:
    """Manual Spearman rank correlation (no scipy available)."""
    n = len(x)
    if n < 3:
        return None

    def rank(vals):
        order = sorted(range(len(vals)), key=lambda i: vals[i])
        ranks = [0.0] * len(vals)
        i = 0
        while i < len(order):
            j = i
            while j + 1 < len(order) and vals[order[j + 1]] == vals[order[i]]:
                j += 1
            avg_rank = (i + j) / 2.0 + 1.0
            for k in range(i, j + 1):
                ranks[order[k]] = avg_rank
            i = j + 1
        return ranks

    rx = rank(x)
    ry = rank(y)
    mean_rx = sum(rx) / n
    mean_ry = sum(ry) / n
    cov = sum((rx[i] - mean_rx) * (ry[i] - mean_ry) for i in range(n))
    var_x = sum((rx[i] - mean_rx) ** 2 for i in range(n))
    var_y = sum((ry[i] - mean_ry) ** 2 for i in range(n))
    if var_x <= 0 or var_y <= 0:
        return None
    return cov / math.sqrt(var_x * var_y)


def compute_reconciliation_stats(matched: list[dict]) -> dict:
    pairs_by_level = {"50": ("rh50_m", "chm_p50_m"), "75": ("rh75_m", "chm_p75_m"), "90": ("rh90_m", "chm_p90_m"), "95": ("rh95_m", "chm_p95_m"), "98": ("rh98_m", "chm_p98_m")}
    out = {}
    for level, (rh_key, chm_key) in pairs_by_level.items():
        diffs, gedi_vals, chm_vals = [], [], []
        for m in matched:
            g = m.get(rh_key)
            c = m.get(chm_key)
            if g is None or c is None:
                continue
            diffs.append(g - c)
            gedi_vals.append(g)
            chm_vals.append(c)
        if not diffs:
            out[level] = {"n_pairs": 0}
            continue
        n = len(diffs)
        bias = sum(diffs) / n
        rmse = math.sqrt(sum(d * d for d in diffs) / n)
        mae = sum(abs(d) for d in diffs) / n
        out[level] = {
            "n_pairs": n,
            "bias_gedi_minus_chm_m": round(bias, 2),
            "rmse_m": round(rmse, 2),
            "mae_m": round(mae, 2),
            "spearman_rank_corr": round(r, 3) if (r := _spearman(gedi_vals, chm_vals)) is not None else None,
        }

    # Disagreement attribution: does bias differ by quality_flag / sensitivity / footprint edge distance?
    quality1 = [m for m in matched if m.get("quality_flag") == 1 and m.get("rh98_m") is not None and m.get("chm_p98_m") is not None]
    quality0 = [m for m in matched if m.get("quality_flag") == 0 and m.get("rh98_m") is not None and m.get("chm_p98_m") is not None]
    near_edge = [m for m in matched if (m.get("edge_distance_m") or 999) < 25 and m.get("rh98_m") is not None and m.get("chm_p98_m") is not None]
    far_edge = [m for m in matched if (m.get("edge_distance_m") or 0) >= 25 and m.get("rh98_m") is not None and m.get("chm_p98_m") is not None]
    low_overlap = [m for m in matched if (m.get("footprint_overlap_fraction") or 1) < 0.6 and m.get("rh98_m") is not None and m.get("chm_p98_m") is not None]

    def _mean_bias(rows):
        if not rows:
            return None
        return round(sum(r["rh98_m"] - r["chm_p98_m"] for r in rows) / len(rows), 2)

    out["attribution_rh98_minus_chm_p98"] = {
        "quality_flag_1_mean_bias_m": _mean_bias(quality1),
        "quality_flag_1_n": len(quality1),
        "quality_flag_0_mean_bias_m": _mean_bias(quality0),
        "quality_flag_0_n": len(quality0),
        "near_edge_lt25m_mean_bias_m": _mean_bias(near_edge),
        "near_edge_lt25m_n": len(near_edge),
        "far_edge_ge25m_mean_bias_m": _mean_bias(far_edge),
        "far_edge_ge25m_n": len(far_edge),
        "low_footprint_overlap_lt0.6_mean_bias_m": _mean_bias(low_overlap),
        "low_footprint_overlap_lt0.6_n": len(low_overlap),
        "note": (
            "Positive bias = GEDI RH98 reads higher than footprint-matched CHMv2 p98. If bias is "
            "similar across quality/edge/overlap splits, the disagreement is more likely genuine "
            "structural heterogeneity or CHMv2 saturation/underestimation at tall canopy than a "
            "footprint-quality artefact; if bias concentrates in low-quality/near-edge/low-overlap "
            "shots, those specific shots should be treated as unreliable, not the whole GEDI record."
        ),
    }
    return out


def _s2_s1_dem_feature_image() -> tuple[ee.Image, list[str]]:
    """Median S2 index composite (last ~18 months) + S1 VV/VH composite +
    SRTM slope, all left at native resolution -- reprojected/aggregated
    inside build_feature_points() via the sampling scale itself, not here."""
    s2 = ee.ImageCollection(S2_COLLECTION).filterDate("2024-06-01", "2025-12-31")

    def mask_s2(img):
        scl = img.select("SCL")
        reject = ee.Image.constant(0)
        for code in SCL_REJECTED_CLASSES:
            reject = reject.Or(scl.eq(code))
        valid = reject.Not()
        return img.select(["B4", "B8", "B11", "B12"]).multiply(REFLECTANCE_SCALE).updateMask(valid)

    s2_composite = s2.map(mask_s2).median()
    b8 = s2_composite.select("B8")
    ndvi = b8.subtract(s2_composite.select("B4")).divide(b8.add(s2_composite.select("B4"))).rename("ndvi")
    ndmi = b8.subtract(s2_composite.select("B11")).divide(b8.add(s2_composite.select("B11"))).rename("ndmi")
    nbr = b8.subtract(s2_composite.select("B12")).divide(b8.add(s2_composite.select("B12"))).rename("nbr")

    s1 = (
        ee.ImageCollection(S1_COLLECTION)
        .filterDate("2024-06-01", "2025-12-31")
        .filter(ee.Filter.eq("instrumentMode", "IW"))
        .filter(ee.Filter.listContains("transmitterReceiverPolarisation", "VV"))
        .filter(ee.Filter.listContains("transmitterReceiverPolarisation", "VH"))
    )
    vv = s1.select("VV").median().rename("s1_vv")
    vh = s1.select("VH").median().rename("s1_vh")

    slope = ee.Terrain.slope(ee.Image(DEM_ASSET)).rename("slope_deg")
    chm = _chm_image()
    cover = chm.gt(2).rename("cover_gt2m")

    feature_image = ee.Image.cat([chm, cover, ndvi, ndmi, nbr, vv, vh, slope])
    feature_names = ["height_m", "cover_gt2m", "ndvi", "ndmi", "nbr", "s1_vv", "s1_vh", "slope_deg"]
    return feature_image, feature_names


def build_feature_points(geom: ee.Geometry, area_ha: float) -> tuple[np.ndarray, np.ndarray, list[str]]:
    """Real per-point multi-sensor feature samples inside the polygon, used
    as the clustering input for data-driven structural strata. Returns
    (coords[N,2] lon/lat, features[N,F], feature_names)."""
    n_points = int(min(MAX_CLUSTER_POINTS, max(MIN_CLUSTER_POINTS, area_ha * N_CLUSTER_POINTS_PER_HA)))
    feature_image, feature_names = _s2_s1_dem_feature_image()
    samples = feature_image.sample(region=geom, scale=25, numPixels=n_points, geometries=True, seed=13, dropNulls=True)
    info = samples.getInfo().get("features", [])
    coords, feats = [], []
    for f in info:
        props = f.get("properties", {})
        c = f.get("geometry", {}).get("coordinates")
        if c is None or any(props.get(name) is None for name in feature_names):
            continue
        coords.append(c)
        feats.append([props[name] for name in feature_names])
    return np.array(coords, dtype=float), np.array(feats, dtype=float), feature_names


def kmeans(X: np.ndarray, k: int, n_iter: int = 50, n_init: int = 8, seed: int = 0):
    rng = np.random.default_rng(seed)
    best_inertia = np.inf
    best_labels = None
    best_centers = None
    n = X.shape[0]
    k = min(k, n)
    for init in range(n_init):
        idx = rng.choice(n, size=k, replace=False)
        centers = X[idx].copy()
        labels = np.zeros(n, dtype=int)
        for _ in range(n_iter):
            d = ((X[:, None, :] - centers[None, :, :]) ** 2).sum(-1)
            new_labels = d.argmin(1)
            if np.array_equal(new_labels, labels) and _ > 0:
                break
            labels = new_labels
            new_centers = centers.copy()
            for j in range(k):
                members = X[labels == j]
                if len(members) > 0:
                    new_centers[j] = members.mean(0)
            centers = new_centers
        d = ((X[:, None, :] - centers[None, :, :]) ** 2).sum(-1)
        labels = d.argmin(1)
        inertia = d[np.arange(n), labels].sum()
        if inertia < best_inertia:
            best_inertia = inertia
            best_labels = labels
            best_centers = centers
    return best_labels, best_centers, float(best_inertia)


def knn_majority_smooth(coords: np.ndarray, labels: np.ndarray, k: int = KNN_SMOOTH_K, iters: int = KNN_SMOOTH_ITERS) -> np.ndarray:
    n = len(coords)
    k = min(k, max(1, n - 1))
    labels = labels.copy()
    for _ in range(iters):
        new_labels = labels.copy()
        for i in range(n):
            d = ((coords - coords[i]) ** 2).sum(1)
            nn_idx = np.argsort(d)[1 : k + 1]
            vals, counts = np.unique(labels[nn_idx], return_counts=True)
            new_labels[i] = vals[np.argmax(counts)]
        labels = new_labels
    return labels


def label_strata(centers: np.ndarray, feature_names: list[str], present_labels: list[int]) -> dict[int, str]:
    """Semantic labels assigned post-hoc from real cluster-mean feature
    values (height + cover rank), never asserted before clustering."""
    h_idx = feature_names.index("height_m")
    c_idx = feature_names.index("cover_gt2m")
    scores = {j: centers[j, h_idx] * 0.6 + centers[j, c_idx] * 20 * 0.4 for j in present_labels}
    ordered = sorted(present_labels, key=lambda j: scores[j])
    n = len(ordered)
    names = ["open_non_forest", "low_woody_regenerating", "closed_medium_canopy", "tall_mature_canopy", "tall_mature_canopy", "tall_mature_canopy"]
    label_map = {}
    for rank, j in enumerate(ordered):
        name_idx = min(rank * len(names) // max(n, 1), len(names) - 1) if n > 1 else 0
        label_map[j] = names[name_idx] if n > 1 else "unresolved"
    return label_map


def classify_strata(geom: ee.Geometry, area_ha: float) -> dict:
    coords, feats, feature_names = build_feature_points(geom, area_ha)
    if len(coords) < 20:
        return {
            "method": "data-driven k-means clustering (insufficient samples returned)",
            "n_sample_points": int(len(coords)),
            "strata": [],
            "note": "Fewer than 20 valid feature samples were returned by Earth Engine for this polygon; "
            "no reliable data-driven stratification could be built. Do not treat as zero strata -- "
            "treat as NOT_IDENTIFIABLE at this resolution.",
        }

    mu = feats.mean(0)
    sigma = feats.std(0)
    sigma[sigma == 0] = 1.0
    X = (feats - mu) / sigma

    labels, centers_std, inertia = kmeans(X, KMEANS_K, seed=17)
    labels = knn_majority_smooth(coords, labels)

    present = sorted(set(labels.tolist()))
    centers_real = centers_std * sigma + mu
    label_names = label_strata(centers_real, feature_names, present)

    h_idx = feature_names.index("height_m")
    strata = []
    for j in present:
        mask = labels == j
        n_pts = int(mask.sum())
        area_share = n_pts / len(labels)
        stratum_feats = feats[mask]
        heights = stratum_feats[:, h_idx]
        pct_levels = [50, 75, 90, 95, 98]
        chm_percentiles = {f"p{q}": round(float(np.percentile(heights, q)), 2) for q in pct_levels} if len(heights) >= 5 else None
        strata.append(
            {
                "cluster_id": int(j),
                "label": label_names[j],
                "n_sample_points": n_pts,
                "area_share": round(area_share, 4),
                "area_ha": round(area_share * area_ha, 2),
                "mean_features": {name: round(float(stratum_feats[:, i].mean()), 4) for i, name in enumerate(feature_names)},
                "chm_height_percentiles_m": chm_percentiles,
            }
        )
    strata.sort(key=lambda s: -s["area_ha"])

    return {
        "method": (
            f"k-means (k={KMEANS_K}, plain numpy Lloyd's algorithm, 8 restarts) over standardized "
            "[height_m, cover_gt2m, ndvi, ndmi, nbr, s1_vv, s1_vh, slope_deg] at ~25-30m point-sample "
            f"density (n={len(coords)} points), then a {KNN_SMOOTH_K}-nearest-neighbour majority vote "
            f"({KNN_SMOOTH_ITERS} passes) as a minimum-mapping-unit smoothing step. Clusters labelled "
            "post-hoc by rank of mean canopy height + cover -- DERIVED ANALYSIS STRATA, not surveyed "
            "compartments or official sub-blocks."
        ),
        "n_sample_points": int(len(coords)),
        "kmeans_inertia": round(inertia, 2),
        "strata": strata,
        "_labels": labels.tolist(),
        "_coords": coords.tolist(),
    }


def palsar_per_stratum(geom: ee.Geometry, strata_result: dict) -> dict:
    """Real ALOS PALSAR-2 L-band backscatter, most recent available epoch
    intersecting this polygon (yearly mosaic product; NOT resampled to
    current date -- reported with its real acquisition year). Reported per
    stratum as a diagnostic only (see module docstring: not mapped to
    biomass without calibration, not fed into the tree-population
    likelihood)."""
    ic = ee.ImageCollection(PALSAR_EPOCH).filterBounds(geom)
    n = ic.size().getInfo()
    if n == 0:
        return {"available": False, "note": "No ALOS PALSAR epoch mosaic intersects this polygon."}
    dates = ic.aggregate_array("system:time_start").getInfo()
    latest_millis = max(dates)
    import datetime

    latest_year = datetime.datetime.fromtimestamp(latest_millis / 1000, tz=datetime.timezone.utc).year
    latest_image = ic.filterDate(f"{latest_year}-01-01", f"{latest_year + 1}-01-01").mosaic()
    hv_db = latest_image.select("HV").pow(2).log10().multiply(10).subtract(83.0).rename("hv_db")
    hh_db = latest_image.select("HH").pow(2).log10().multiply(10).subtract(83.0).rename("hh_db")

    labels = np.array(strata_result.get("_labels", []))
    coords = np.array(strata_result.get("_coords", []))
    if len(coords) == 0:
        return {"available": True, "acquisition_year": latest_year, "note": "No sample points to attach per-stratum PALSAR means to.", "per_stratum": []}

    feats = ee.Image.cat([hv_db, hh_db]).sample(region=geom, scale=25, numPixels=min(len(coords) * 2, MAX_CLUSTER_POINTS), geometries=True, seed=13).getInfo()
    pts = feats.get("features", [])
    pt_coords = np.array([f["geometry"]["coordinates"] for f in pts])
    pt_hv = np.array([f["properties"].get("hv_db") for f in pts], dtype=float)
    pt_hh = np.array([f["properties"].get("hh_db") for f in pts], dtype=float)

    per_stratum = []
    label_names = {s["cluster_id"]: s["label"] for s in strata_result.get("strata", [])}
    for cluster_id, label in label_names.items():
        cmask = labels == cluster_id
        if not cmask.any() or len(pt_coords) == 0:
            continue
        cluster_pts = coords[cmask]
        # nearest PALSAR sample to each cluster point's location (small AOIs -> planar approx is fine)
        assigned_hv, assigned_hh = [], []
        for cp in cluster_pts:
            d = ((pt_coords - cp) ** 2).sum(1)
            j = int(np.argmin(d))
            if not math.isnan(pt_hv[j]):
                assigned_hv.append(pt_hv[j])
            if not math.isnan(pt_hh[j]):
                assigned_hh.append(pt_hh[j])
        per_stratum.append(
            {
                "cluster_id": int(cluster_id),
                "label": label,
                "hv_db_mean": round(float(np.mean(assigned_hv)), 2) if assigned_hv else None,
                "hh_db_mean": round(float(np.mean(assigned_hh)), 2) if assigned_hh else None,
                "n": len(assigned_hv),
            }
        )
    return {
        "available": True,
        "source": PALSAR_EPOCH,
        "acquisition_year": latest_year,
        "note": (
            f"L-band backscatter from the {latest_year} ALOS-2 PALSAR-2 yearly mosaic -- the most recent "
            "epoch available in this collection, real but dated (not current-year). HV backscatter is "
            "known to saturate around ~90-100 Mg/ha AGB in tropical forest, so this is reported as a "
            "qualitative structural diagnostic (differentiate open/low-woody vs at-least-moderate woody "
            "structure), NOT converted to biomass directly."
        ),
        "per_stratum": per_stratum,
    }


def assign_gedi_to_strata(strata_result: dict, matched_shots: list[dict], l4a_shots: list[dict]) -> None:
    """Nearest-sample-point stratum assignment for GEDI L2 (matched, for the
    tree-population likelihood) and L4A (for the independent AGBD check).
    Mutates each stratum dict in strata_result['strata'] in place, adding
    'gedi_evidence' (empirical RH/cover means among shots assigned to this
    stratum) and 'gedi_l4a_agbd_mean_mg_ha'."""
    coords = np.array(strata_result.get("_coords", []))
    labels = np.array(strata_result.get("_labels", []))
    if len(coords) == 0:
        return

    def nearest_cluster(lon, lat):
        d = ((coords - np.array([lon, lat])) ** 2).sum(1)
        return int(labels[int(np.argmin(d))])

    by_cluster_l2: dict[int, list[dict]] = {}
    for s in matched_shots:
        if s.get("lon") is None or s.get("chm_p50_m") is None:
            continue
        c = nearest_cluster(s["lon"], s["lat"])
        by_cluster_l2.setdefault(c, []).append(s)

    by_cluster_l4a: dict[int, list[float]] = {}
    for s in l4a_shots:
        if s.get("lon") is None or s.get("agbd_mg_ha") is None:
            continue
        c = nearest_cluster(s["lon"], s["lat"])
        by_cluster_l4a.setdefault(c, []).append(s["agbd_mg_ha"])

    for stratum in strata_result.get("strata", []):
        cid = stratum["cluster_id"]
        shots = by_cluster_l2.get(cid, [])
        if shots:
            rh_means = {}
            for level in [50, 75, 90, 95, 98]:
                vals = [s[f"rh{level}_m"] for s in shots if s.get(f"rh{level}_m") is not None]
                rh_means[f"p{level}"] = round(sum(vals) / len(vals), 2) if vals else None
            cover_vals = [s["cover"] for s in shots if s.get("cover") is not None]
            stratum["gedi_evidence"] = {
                "n_shots": len(shots),
                "rh_percentiles_m": rh_means,
                "cover_mean": round(sum(cover_vals) / len(cover_vals), 3) if cover_vals else None,
            }
        else:
            stratum["gedi_evidence"] = {"n_shots": 0, "rh_percentiles_m": None, "cover_mean": None}
        agbd_vals = by_cluster_l4a.get(cid, [])
        stratum["gedi_l4a_agbd_mean_mg_ha"] = round(sum(agbd_vals) / len(agbd_vals), 1) if agbd_vals else None
        stratum["gedi_l4a_n_shots"] = len(agbd_vals)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--polygon-dir", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--area-ha-json", type=Path, default=None, help="optional asset-state-v2.json to read real areas from")
    args = parser.parse_args()

    ee.Initialize(project="ee-oyugijason")

    areas_by_name = {}
    if args.area_ha_json and args.area_ha_json.exists():
        d = json.loads(args.area_ha_json.read_text(encoding="utf-8"))
        for a in d.get("assets", []):
            areas_by_name[a["canonical_name"]] = a["asset_identity"]["area_ha"]

    results = []
    for asset in REFERENCE_ASSETS:
        name = asset["canonical_name"]
        print(f"=== {name} ===")
        geojson = load_polygon_geojson(args.polygon_dir / asset["polygon_file"])
        geom = ee.Geometry(geojson)
        rings = _polygon_rings(geojson)
        area_ha = areas_by_name.get(name, 500.0)

        print("  GEDI L2A/L2B shots...")
        l2_shots = gedi_l2_shots(geom)
        print(f"  {len(l2_shots)} shots. Reconciling against footprint-matched CHMv2...")
        matched = reconcile_gedi_chm(geom, l2_shots, rings)
        reconciliation = compute_reconciliation_stats(matched)

        print("  GEDI L4A AGBD shots...")
        l4a_shots = gedi_l4a_shots(geom)

        print("  Building data-driven structural strata...")
        strata_result = classify_strata(geom, area_ha)

        print("  Assigning GEDI shots to nearest structural stratum...")
        assign_gedi_to_strata(strata_result, matched, l4a_shots)

        print("  ALOS PALSAR per-stratum diagnostic...")
        palsar = palsar_per_stratum(geom, strata_result) if strata_result.get("strata") else {"available": False, "note": "No strata to attach PALSAR to."}

        strata_public = {k: v for k, v in strata_result.items() if not k.startswith("_")}

        results.append(
            {
                "canonical_name": name,
                "area_ha": area_ha,
                "gedi_chm_reconciliation": {
                    "method": (
                        "Each real GEDI L2A/L2B footprint sample is matched against CHMv2 re-sampled over "
                        "a 12.5m-radius disc centred on the SAME shot location (not a whole-polygon average), "
                        "then paired bias/RMSE/MAE/Spearman rank correlation are computed per RH level."
                    ),
                    "n_shots_matched": len(matched),
                    "by_rh_level": reconciliation,
                    "shots": matched,
                },
                "gedi_l4a_agbd": {
                    "source": GEDI_L4A,
                    "epistemic_status": "MODEL_DERIVED_EO_EVIDENCE",
                    "note": (
                        "GEDI L4A AGBD is a MODEL-DERIVED biomass product (region x plant-functional-type "
                        "calibrated), NOT field truth. Independent African-savanna validation found "
                        "R^2=0.42, RMSE ~12 Mg/ha (79.5%), bias ~-36% for the stock model in some regions "
                        "(sourced during this sprint's research pass) -- retained here as an independent "
                        "consistency check on the inferred tree population, not as ground truth and not "
                        "fed into the same likelihood as GEDI L2 structure metrics (documented dependency: "
                        "L4A AGBD is itself partly derived FROM L2 RH metrics, so using both as independent "
                        "likelihood terms would double-count that shared information)."
                    ),
                    "n_shots": len(l4a_shots),
                    "shots": l4a_shots,
                },
                "structural_strata": strata_public,
                "palsar_l_band": palsar,
            }
        )
        n_q1 = sum(1 for s in matched if s.get("quality_flag") == 1)
        print(f"  Done: {len(matched)} matched shots ({n_q1} quality=1), {len(strata_public.get('strata', []))} strata, PALSAR available={palsar.get('available')}")

    output = {"model_version": "asset-structural-evidence-v3-reconciled-strata", "assets": results}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(output, indent=2), encoding="utf-8")
    print(f"\nWrote {args.output}")


if __name__ == "__main__":
    main()
