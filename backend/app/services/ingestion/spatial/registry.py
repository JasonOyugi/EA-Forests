import json
from pathlib import Path

REGISTRY_PATH = Path(__file__).with_name("sources.json")
CLASSES = frozenset({
    "official_forest_reserve", "gazetted_forest", "tree_plantation",
    "planted_tree_candidate", "forest_candidate", "confirmed_commercial_asset",
})
COUNTRIES = {"UG": "Uganda", "KE": "Kenya", "TZ": "Tanzania"}


def load_registry(path=REGISTRY_PATH):
    rows = json.loads(Path(path).read_text(encoding="utf-8"))
    result = {}
    for row in rows:
        key = row["source_key"]
        if key in result or row["semantic_class"] not in CLASSES:
            raise ValueError(f"Invalid/duplicate spatial source: {key}")
        if not set(row["countries"]).issubset(COUNTRIES):
            raise ValueError(f"Unsupported coverage: {key}")
        result[key] = row
    return result
