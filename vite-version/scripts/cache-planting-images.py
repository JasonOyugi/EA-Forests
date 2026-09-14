"""Cache reviewed reusable photographs, keeping attribution beside the gallery data."""
import json, re, urllib.request
from pathlib import Path

root=Path(__file__).resolve().parents[1]
source=root/'src/app/shop/data/source-data/planting-material/image-candidates.json'
candidates=json.loads(source.read_text(encoding='utf8'))
selected={
    'Pinus patula':[3,6,7], 'Pinus caribaea':[0,4,6], 'Pinus maximinoi':[7,4,1],
    'Eucalyptus grandis':[7,5,3], 'Eucalyptus urophylla':[1,2], 'Eucalyptus nitens':[0],
    'Eucalyptus saligna':[1,5,6], 'Eucalyptus camaldulensis':[5,6,7], 'Gmelina arborea':[3,0,4],
    'Tectona grandis':[1,5,6], 'Maesopsis eminii':[5,1,2], 'Grevillea robusta':[0,3,6], 'Cupressus lusitanica':[0,1,7],
}
folder=root/'public/images/planting-material'; folder.mkdir(parents=True,exist_ok=True)
result={}
for species,indices in selected.items():
    result[species]=[]
    for number,index in enumerate(indices,1):
        photo=candidates[species][index]
        filename=re.sub('[^a-z0-9]+','-',species.lower())+f'-{number}.jpg'
        target=folder/filename
        try:
            if not target.exists():
                request=urllib.request.Request(photo['url'],headers={'User-Agent':'EA-Forests image attribution audit/1.0'})
                with urllib.request.urlopen(request,timeout=30) as response:
                    if not response.headers.get('Content-Type','').startswith('image/'): raise ValueError('Not an image')
                    target.write_bytes(response.read())
            result[species].append(dict(url='/images/planting-material/'+filename,title=f'{species} — '+photo['title'].removeprefix('File:'),
                source='Wikimedia Commons',sourcePage=photo['sourcePage'],creator=photo['creator'],license=photo['license'],
                licenseUrl=photo['licenseUrl'],specificity='species-level',depicts=species,objectPosition='center',
                sourceDescription=photo['description'],downloadedAt='2026-09-13'))
            print(filename,target.stat().st_size,flush=True)
        except Exception as error: print('FAILED',filename,str(error),flush=True)
(root/'src/app/shop/data/planting-images.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print('Cached images',sum(map(len,result.values())),flush=True)
