"""Offline, reproducible catalogue extraction. Network downloads are a separate, reviewed step.

Usage: python scripts/ingest-planting-catalogues.py --snapshots ../tmp
Retains original names, quoted amounts, product URLs and an access-date ledger.
"""
import argparse
import hashlib
import json
import re
from html import unescape
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--snapshots', type=Path, required=True)
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
out = root / 'src/app/shop/data/source-data/planting-material'
out.mkdir(parents=True, exist_ok=True)
sources = []

def read(name, url, notes):
    raw = (args.snapshots / name).read_bytes()
    sources.append(dict(file=name, url=url, accessedAt='2026-09-12', sha256=hashlib.sha256(raw).hexdigest(), notes=notes))
    return raw.decode('utf8')

tfs = read('tfs-catalog.html', 'https://seed.tfs.go.tz/catalog', 'TLS hostname mismatch during download. Embedded row timestamps are 2017; amounts are historical, not current prices.')
rows = json.JSONDecoder().raw_decode(tfs[tfs.index('[{"id":'):])[0]
(out / 'tfs-catalogue.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2) + '\n', encoding='utf8')

pattern = re.compile(r'<h3>\s*<a\s+href="([^"]+)">([^<]+)</a>\s*</h3>\s*<h4>\s*Ksh\.([\d,.]+)', re.S)
catalogues = []
for filename, branch, material, url in [
    ('kefri-nyeri-seeds.html', 'Nyeri', 'seed', 'https://enterprise.kefri.org/product-category.php?id=33&type=end-category'),
    ('kefri-muguga-seedlings.html', 'Muguga', 'seedling', 'https://enterprise.kefri.org/product-category.php?id=135&type=end-category'),
]:
    html = read(filename, url, 'Official branch catalogue. Seed prices have no stated mass/pack unit. Seedling prices are listed by individual product; confirm stock and final quotation.')
    seen = set()
    for href, name, amount in pattern.findall(html):
        if not href.startswith('product.php?') or href in seen: continue
        seen.add(href)
        catalogues.append(dict(name=unescape(name).strip(), branch=branch, material=material, amount=float(amount.replace(',', '')),
            currency='KES', url='https://enterprise.kefri.org/' + unescape(href), catalogueUrl=url, accessedAt='2026-09-12'))
(out / 'kefri-catalogues.json').write_text(json.dumps(catalogues, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
(out / 'source-ledger.json').write_text(json.dumps(sources, indent=2) + '\n', encoding='utf8')
print(json.dumps({'tfsSourceRows': len(rows), 'tfsNames': len({row['treename_biological'] for row in rows}), 'kefriRows': len(catalogues)}, indent=2))
