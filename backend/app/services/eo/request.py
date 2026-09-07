"""Deterministic analysis-request identity (EO observation architecture
section 17). Equivalent requests must deduplicate; a refresh must not mutate
historical results.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class EOAnalysisRequest:
    world_id: str
    aoi_version_id: str
    geometry_hash: str
    window_start: datetime
    window_end: datetime
    provider_key: str
    collection_key: str
    recipe_key: str
    recipe_version: str
    qa_profile_key: str
    qa_profile_version: str
    statistics_profile: str
    grid_crs: str
    grid_resolution_m: int
    grid_version: str

    def request_hash(self) -> str:
        payload = {
            "world_id": self.world_id,
            "aoi_version_id": self.aoi_version_id,
            "geometry_hash": self.geometry_hash,
            "window_start": self.window_start.isoformat(),
            "window_end": self.window_end.isoformat(),
            "provider_key": self.provider_key,
            "collection_key": self.collection_key,
            "recipe_key": self.recipe_key,
            "recipe_version": self.recipe_version,
            "qa_profile_key": self.qa_profile_key,
            "qa_profile_version": self.qa_profile_version,
            "statistics_profile": self.statistics_profile,
            "grid_crs": self.grid_crs,
            "grid_resolution_m": self.grid_resolution_m,
            "grid_version": self.grid_version,
        }
        return hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()
