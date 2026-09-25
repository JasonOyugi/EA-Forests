import importlib.util,concurrent.futures,json
from pathlib import Path
spec=importlib.util.spec_from_file_location('hub','.tmp-hub-images.py'); h=importlib.util.module_from_spec(spec); spec.loader.exec_module(h)
pages={
 'kenya-forest-regulator':'https://forestry.go.ke/he-president-william-s-ruto-phd-cgh-assents-forest-conservation-and-management-amendment-act-2025',
 'oromia-alt':'https://www.biocarbonfund-isfl.org/ethiopia',
 'nfc-alt':'https://impactfund.dk/news/impact-fund-denmark-takes-out-eu-backed-guarantee-for-investment-in-sustainable-forestry/',
 'kenya-carbon-alt':'https://abcnews.com/International/wireStory/kenya-unveils-carbon-market-rule-book-caps-overseas-135362523',
 'miti360-paper':'https://arxiv.org/html/2606.29447v1',
 'rwanda-coffee-alt':'https://journalijecc.com/index.php/IJECC/article/view/5561',
 'quality-tree-alt':'https://www.cifor-icraf.org/quality-tree-seed-for-africa/',
}
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool: results=list(pool.map(h.inspect,pages.items()))
Path('.tmp-extra-images.json').write_text(json.dumps(results,indent=2))
for r in results: print(r['id'],json.dumps(r.get('images',r.get('error')))[:2600])
