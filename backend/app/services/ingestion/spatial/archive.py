"""Bounded disk downloads and streaming vector readers (GeoJSON/SHP/FileGDB).

Archives remain immutable artifacts. Extraction refuses traversal and zip bombs.
GDAL/Fiona streams records; it does not load the global WRI table in memory.
"""
import hashlib
import json
import shutil
import zipfile
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin

from .base import AcquisitionError


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []

    def handle_starttag(self, tag, attrs):
        if tag == "a":
            self.links.extend(v for k, v in attrs if k == "href")


def resolve_archive(source, acquisition):
    if source["strategy"] == "wri_archive":
        data, _ = acquisition.get(source["catalog_url"], "catalogue.json")
        candidates = [x for x in data["result"]["resources"]
                      if x.get("format", "").lower() == "zip" and x.get("url")]
        if len(candidates) != 1:
            raise AcquisitionError("WRI catalogue does not resolve a unique ZIP")
        return candidates[0]["url"]
    html, _ = acquisition.get(source["reference_url"], "landing.html", as_json=False)
    links = Links()
    links.feed(html)
    urls = sorted({urljoin(source["reference_url"], x) for x in links.links
                   if ".zip" in x.lower() and not x.startswith("#")})
    if len(urls) != 1:
        raise AcquisitionError("NFA advertises a shapefile but no unique ZIP download resolves "
                               "(the Forest Reserves Shapefile link is a # placeholder)")
    return urls[0]


def download_archive(url, acquisition, workdir, max_bytes=12 * 1024**3):
    workdir = Path(workdir)
    workdir.mkdir(parents=True, exist_ok=True)
    destination = workdir / (hashlib.sha256(url.encode()).hexdigest() + ".zip")
    # Completed local copies are rehashed by the artifact store. Partial transfers
    # never become evidence or input. Requests has no read-all for these archives.
    if not destination.exists():
        partial = destination.with_suffix(".partial")
        with acquisition.http.get(url, stream=True, timeout=(20, 120)) as response:
            response.raise_for_status()
            advertised = int(response.headers.get("Content-Length", 0))
            if advertised > max_bytes:
                raise AcquisitionError(f"Archive {advertised} bytes exceeds download budget {max_bytes}")
            if shutil.disk_usage(workdir).free < max(advertised * 5, 1024**3):
                raise AcquisitionError("Insufficient disk for immutable archive and bounded extraction")
            size = 0
            with partial.open("wb") as output:
                for block in response.iter_content(8 * 1024 * 1024):
                    size += len(block)
                    if size > max_bytes:
                        raise AcquisitionError("Archive exceeds configured download budget")
                    output.write(block)
            if advertised and size != advertised:
                raise AcquisitionError("Archive length differs from Content-Length")
        if not zipfile.is_zipfile(partial):
            raise AcquisitionError("Download is not a ZIP archive")
        partial.replace(destination)
    uri, sha = acquisition.store.put_file(destination)
    raw = {"artifact_uri": uri, "content_hash": sha, "original_filename": url.split("/")[-1],
           "media_type": "application/zip", "url": url,
           "retrieved_at": datetime.now(timezone.utc).isoformat()}
    acquisition.artifacts.append(raw)
    return raw


def extract_archive(path, target, max_bytes=80 * 1024**3):
    target = Path(target).resolve()
    target.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(path) as archive:
        entries = archive.infolist()
        if sum(x.file_size for x in entries) > max_bytes:
            raise AcquisitionError("ZIP expands beyond configured disk budget")
        for item in entries:
            destination = (target / item.filename).resolve()
            if not destination.is_relative_to(target) or (item.external_attr >> 16) & 0o170000 == 0o120000:
                raise AcquisitionError("Unsafe archive entry")
        archive.extractall(target)
    candidates = list(target.rglob("*.gdb")) + list(target.rglob("*.shp"))
    candidates += list(target.rglob("*.geojson"))
    if len(candidates) != 1:
        raise AcquisitionError(f"Choose one vector dataset explicitly; found {len(candidates)}")
    return candidates[0]


def vector_features(path, layer=None, bbox=None):
    import fiona
    from fiona.model import to_dict
    layers = fiona.listlayers(path)
    if layer is None and len(layers) != 1:
        raise AcquisitionError(f"Specify a layer from {layers}")
    with fiona.open(path, layer=layer or layers[0]) as collection:
        srid = collection.crs.to_epsg()
        if not srid:
            raise AcquisitionError("Source CRS has no EPSG code; explicit reviewed normalization required")
        if bbox is not None and srid != 4326:
            raise AcquisitionError("Spatial subset bbox must be in native CRS; use a normalized input")
        for feature in collection.filter(bbox=bbox) if bbox else collection:
            yield to_dict(feature), srid


def geojson_features(content):
    data = json.loads(content)
    if data.get("type") != "FeatureCollection":
        raise AcquisitionError("Expected a GeoJSON FeatureCollection")
    crs = data.get("crs")
    if crs and not (
        isinstance(crs, dict)
        and crs.get("type") == "name"
        and isinstance(crs.get("properties", {}), dict)
        and str(crs["properties"].get("name", "")).upper().replace("EPSG:", "")
        in {"4326", "3857"}
    ):
        raise AcquisitionError("Legacy GeoJSON CRS requires explicit vector import normalization")
    yield from data["features"]
