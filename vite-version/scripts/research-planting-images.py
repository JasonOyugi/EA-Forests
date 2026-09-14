"""Research reusable Commons photographs; metadata retained before any download.

Run --research to cache candidate metadata, then --download after reviewing the
candidate list. Images are illustrative species photos, never proof of a clone.
"""
import argparse, json, re, time, urllib.parse, urllib.request
from pathlib import Path
from html import unescape

root = Path(__file__).resolve().parents[1]
metadata = root / 'src/app/shop/data/source-data/planting-material/image-candidates.json'
names = ['Pinus patula', 'Pinus caribaea', 'Pinus maximinoi', 'Eucalyptus grandis', 'Eucalyptus urophylla', 'Eucalyptus nitens', 'Eucalyptus saligna', 'Eucalyptus camaldulensis', 'Melia volkensii', 'Gmelina arborea', 'Tectona grandis', 'Maesopsis eminii', 'Grevillea robusta', 'Cupressus lusitanica']
parser=argparse.ArgumentParser(); parser.add_argument('--research', action='store_true'); args=parser.parse_args()
def fetch(url):
    request=urllib.request.Request(url,headers={'User-Agent':'EA-Forests source research/1.0 (noncommercial source attribution audit)'})
    with urllib.request.urlopen(request,timeout=25) as response: return response.read()
def plain(s): return unescape(re.sub('<[^>]+>','',s)).strip()
results=json.loads(metadata.read_text(encoding='utf8')) if metadata.exists() else {}
for name in names:
    if name in results: continue
    query=urllib.parse.urlencode(dict(action='query',format='json',generator='search',gsrsearch=f'intitle:"{name}" filetype:bitmap',gsrnamespace=6,gsrlimit=8,prop='imageinfo',iiprop='url|extmetadata',iiurlwidth=1200))
    try:
        data=json.loads(fetch('https://commons.wikimedia.org/w/api.php?'+query))
        photos=[]
        for page in data.get('query',{}).get('pages',{}).values():
            info=page.get('imageinfo',[{}])[0]; meta=info.get('extmetadata',{})
            license=plain(meta.get('LicenseShortName',{}).get('value',''))
            if not any(term in license.lower() for term in ['cc by','cc0','public domain']): continue
            photos.append(dict(title=page['title'],url=info.get('thumburl',info.get('url')),sourcePage=info.get('descriptionurl'),
                creator=plain(meta.get('Artist',{}).get('value','')),license=license,licenseUrl=meta.get('LicenseUrl',{}).get('value',''),
                description=plain(meta.get('ImageDescription',{}).get('value',''))))
        results[name]=photos
        metadata.write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
        print(name,[(p['title'],p['license']) for p in photos],flush=True)
    except Exception as error: print(name,str(error),flush=True)
    time.sleep(.25)
