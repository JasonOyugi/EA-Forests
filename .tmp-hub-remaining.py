import importlib.util,concurrent.futures,json,re
from pathlib import Path
spec=importlib.util.spec_from_file_location('hub','.tmp-hub-images.py'); h=importlib.util.module_from_spec(spec); spec.loader.exec_module(h)
pages={
'nfc-company':'https://newforests.earth/',
'miti-repo':'https://github.com/DeKUT-DSAIL/miti360',
'miti-paper':'https://arxiv.org/pdf/2606.29447',
'processing-paper':'https://www.eajsti.org/index.php/EAJSTI/article/download/1948/401/9308',
'sepal-docs':'https://docs.sepal.io/en/latest/setup/presentation.html',
'kenya-carbon-guide':'https://www.businessdailyafrica.com/bd/markets/commodities/kenya-caps-carbon-credit-exports-to-shield-domestic-goals-5546344',
}
html=Path('.tmp-hub-source/kenya-rules-pipeline.html').read_text()
links=re.findall(r'href="([^"]+\.pdf)"',html)
pages['kenya-rules-pdf']='https://forestry.go.ke'+links[0]
pages['kenya-concessions-pdf']='https://forestry.go.ke'+links[2]
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool: results=list(pool.map(h.inspect,pages.items()))
Path('.tmp-hub-remaining.json').write_text(json.dumps(results,indent=2))
for r in results: print(r['id'],json.dumps(r.get('images',r.get('error')))[:3500])
