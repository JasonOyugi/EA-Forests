"""Discover schemas; enumerate all object IDs, then fetch bounded, verified pages.

ArcGIS returnIdsOnly is not subject to maxRecordCount. Count/ID checks detect
incomplete inventories. Truncated pages are recursively split, never accepted as
complete. OID provides stable source identity; names never serve as feature IDs.
"""
from .base import AcquisitionError
from urllib.parse import urlencode

ITEM_API = "https://www.arcgis.com/sharing/rest/content/items/"


def acquire_arcgis(source, acquisition, page_size=500):
    a = acquisition
    if source.get("directory_url"):
        directory, _ = a.get(source["directory_url"], "directory.json", {"f": "json"})
        services = [s for s in directory.get("services", [])
                    if s["name"] == source["service_name"] and s["type"] == "FeatureServer"]
        if len(services) != 1:
            raise AcquisitionError("Expected one matching FeatureServer in directory")
        url = services[0]["url"]
    else:
        item, _ = a.get(ITEM_API + source["item_id"], "item.json", {"f": "json"})
        url = item["url"]
    service, _ = a.get(url, "service.json", {"f": "json"})
    item, _ = a.get(ITEM_API + service["serviceItemId"], "publisher.json", {"f": "json"})
    candidates = [x for x in service["layers"] if x["name"] == source["layer_name"]]
    if len(candidates) != 1:
        raise AcquisitionError("Expected one matching layer name")
    layer_url = f"{url}/{candidates[0]['id']}"
    layer, _ = a.get(layer_url, "layer.json", {"f": "json"})
    if layer.get("geometryType") != "esriGeometryPolygon":
        raise AcquisitionError("Not a polygon layer; no boundaries will be invented")
    if "geojson" not in layer.get("supportedQueryFormats", "").lower():
        raise AcquisitionError("Service does not advertise GeoJSON")
    oid = layer.get("objectIdField") or next(
        f["name"] for f in layer["fields"] if f["type"] == "esriFieldTypeOID")
    expected, _ = a.get(layer_url + "/query", "count.json",
                        {"f": "json", "where": "1=1", "returnCountOnly": "true"})
    inventory, _ = a.get(layer_url + "/query", "ids.json",
                         {"f": "json", "where": "1=1", "returnIdsOnly": "true"})
    ids = sorted(inventory.get("objectIds") or [])
    if len(ids) != expected["count"] or len(ids) != len(set(ids)):
        raise AcquisitionError("Count/ID inventory mismatch; acquisition is incomplete")
    size = max(1, min(page_size, layer.get("maxRecordCount", 1000)))
    pages = []

    def fetch_ids(chunk):
        params = {
            "f": "geojson", "objectIds": ",".join(map(str, chunk)), "outFields": "*",
            "returnGeometry": "true", "outSR": 4326, "returnZ": "false", "returnM": "false",
        }
        # Some ArcGIS front doors return 404 for URLs over 2 KiB, despite a
        # larger maxRecordCount. Honor both record and encoded URL budgets.
        if len(layer_url) + len(urlencode(params)) > 1900 and len(chunk) > 1:
            mid = len(chunk) // 2
            fetch_ids(chunk[:mid])
            fetch_ids(chunk[mid:])
            return
        data, raw = a.get(layer_url + "/query", f"features-{chunk[0]}-{chunk[-1]}.geojson", params)
        features = data.get("features", [])
        returned = [f.get("properties", {}).get(oid, f.get("id")) for f in features]
        if (data.get("exceededTransferLimit") or len(returned) != len(set(returned))
                or set(returned) != set(chunk)):
            if len(chunk) == 1:
                raise AcquisitionError(f"Missing/duplicated feature ID {chunk[0]}")
            mid = len(chunk) // 2
            fetch_ids(chunk[:mid])
            fetch_ids(chunk[mid:])
            return
        pages.append({**raw, "feature_count": len(features)})

    for offset in range(0, len(ids), size):
        fetch_ids(ids[offset:offset + size])
    final, _ = a.get(layer_url, "layer-after.json", {"f": "json"})
    if layer.get("editingInfo") != final.get("editingInfo"):
        raise AcquisitionError("Layer changed during retrieval; retry a consistent snapshot")
    sr = layer.get("extent", {}).get("spatialReference", service.get("spatialReference", {}))
    return {"status": "acquired", "source_count": len(ids), "pages": pages,
            "id_field": oid, "original_srid": sr.get("latestWkid", sr.get("wkid")),
            "geometry_srid": 4326, "layer_url": layer_url, "layer_id": layer["id"],
            "source_metadata": {"item": item, "service": service, "layer": layer},
            "normalization": "ArcGIS outSR=4326; original service CRS retained"}
