"""Bounded acquisition with exact response bytes in the canonical artifact store."""
import hashlib
import json
from datetime import datetime, timezone

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


def canonical_json(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False,
                      allow_nan=False).encode("utf-8")


def digest(value):
    return hashlib.sha256(canonical_json(value)).hexdigest()


class AcquisitionError(ValueError):
    pass


class Acquisition:
    def __init__(self, store, http=None):
        self.store = store
        self.http = http or requests.Session()
        if http is None:
            self.http.mount("https://", HTTPAdapter(max_retries=Retry(
                total=4, backoff_factor=1, status_forcelist=[429, 502, 503, 504],
                allowed_methods=["GET"], respect_retry_after_header=True,
            )))
        self.artifacts = []

    def preserve(self, content, name, media_type, url=None, **metadata):
        uri, sha = self.store.put(content)
        row = {"artifact_uri": uri, "content_hash": sha, "original_filename": name,
               "media_type": media_type, "retrieved_at": datetime.now(timezone.utc).isoformat(),
               "url": url, **metadata}
        self.artifacts.append(row)
        return row

    def get(self, url, name, params=None, as_json=True):
        response = self.http.get(url, params=params, timeout=(15, 90))
        response.raise_for_status()
        if len(response.content) > 128 * 1024 * 1024:
            raise AcquisitionError("Response exceeds 128 MiB page budget")
        artifact = self.preserve(response.content, name,
                                 response.headers.get("Content-Type", "application/json"),
                                 response.url)
        if not as_json:
            return response.text, artifact
        data = response.json()
        if "error" in data:
            raise AcquisitionError(f"Upstream error: {data['error']}")
        return data, artifact
