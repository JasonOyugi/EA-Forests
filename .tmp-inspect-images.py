import importlib.util, json
from pathlib import Path
from urllib.parse import urljoin
spec=importlib.util.spec_from_file_location('hub','.tmp-hub-images.py'); h=importlib.util.module_from_spec(spec); spec.loader.exec_module(h)
results=[]
for id,url in h.cards:
    p=Path('.tmp-hub-source',id+'.html')
    if not p.exists(): continue
    parser=h.Images(); parser.feed(p.read_text(encoding='utf-8',errors='replace'))
    imgs=list(dict.fromkeys(urljoin(url,i) for i in parser.images if i and not i.startswith('data:')))
    results.append({'id':id,'source':url,'images':imgs})
    print(id,json.dumps(imgs)[:2700])
Path('.tmp-hub-cached-images.json').write_text(json.dumps(results,indent=2))
