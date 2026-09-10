"""Native GEDI discovery via NASA CMR (observatory v1, section 10) --
NOT Earth Engine. CMR granule SEARCH is public and requires no
credentials; this proves real granule-level GEDI02_A (L2A, current
version) coverage exists for real AOIs, independent of EE's gridded
raster representation. Actual granule DOWNLOAD (to parse shot-level RH
profiles) requires a NASA Earthdata Login (URS) account -- this script
also verifies that claim directly (a HEAD request against a real granule
download URL) rather than asserting it from documentation alone.

Does not download any granule. Does not require credentials to run.
"""

from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

TARGETS = {
    "Epor (UG)": (33.04741, 2.39443, 33.06751, 2.41269),
    "Zulia (UG)": (33.70342, 3.88588, 34.13813, 4.23027),
    "Musamya (UG)": (31.98988, 0.2572, 32.02645, 0.30148),
    "Mount Kenya gazetted forest (KE)": (37.017470242426, -0.428124302050444, 37.616785388923, 0.0888858205195988),
}
SHORT_NAME = "GEDI02_A"
CMR_GRANULES_URL = "https://cmr.earthdata.nasa.gov/search/granules.json"


def discover(bbox: tuple[float, float, float, float], page_size: int = 200) -> dict:
    params = {
        "short_name": SHORT_NAME,
        "bounding_box": ",".join(str(v) for v in bbox),
        "temporal": "2019-01-01T00:00:00Z,2026-09-10T00:00:00Z",
        "page_size": page_size,
    }
    url = f"{CMR_GRANULES_URL}?{urllib.parse.urlencode(params)}"
    with urllib.request.urlopen(url, timeout=30) as resp:
        data = json.loads(resp.read())
    entries = data.get("feed", {}).get("entry", [])
    dates = sorted(e["time_start"] for e in entries if "time_start" in e)
    download_links = [
        link["href"]
        for e in entries
        for link in e.get("links", [])
        if link.get("rel", "").endswith("/data#") or "download" in link.get("href", "").lower()
    ]
    return {
        "granule_count_this_page": len(entries),
        "earliest": dates[0] if dates else None,
        "latest": dates[-1] if dates else None,
        "sample_granule_ids": [e["title"] for e in entries[:3]],
        "sample_download_url": download_links[0] if download_links else None,
    }


def verify_download_requires_credentials(url: str) -> str:
    req = urllib.request.Request(url, method="HEAD")
    try:
        urllib.request.urlopen(req, timeout=15)
        return "UNEXPECTED: download succeeded without credentials"
    except urllib.error.HTTPError as exc:
        return f"HTTP {exc.code} {exc.reason} (confirms Earthdata Login required)"
    except Exception as exc:  # noqa: BLE001
        return f"{type(exc).__name__}: {exc}"


def main() -> None:
    report = {}
    sample_url = None
    for name, bbox in TARGETS.items():
        try:
            result = discover(bbox)
            report[name] = result
            if sample_url is None and result.get("sample_download_url"):
                sample_url = result["sample_download_url"]
        except Exception as exc:  # noqa: BLE001
            report[name] = {"error": f"{type(exc).__name__}: {exc}"}

    report["_credential_check"] = (
        verify_download_requires_credentials(sample_url) if sample_url else "no sample URL found to test"
    )
    out_path = Path(__file__).resolve().parents[2] / "outputs" / "eo" / "gedi_native_discovery.json"
    out_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    print(f"wrote {out_path}")


if __name__ == "__main__":
    main()
