import concurrent.futures, json, re, urllib.request
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin

class Images(HTMLParser):
    def __init__(self):
        super().__init__(); self.images=[]
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if tag=='meta' and a.get('property',a.get('name')) in ('og:image','twitter:image'):
            self.images.insert(0, a.get('content',''))
        if tag=='img':
            self.images.append(a.get('data-src',a.get('src','')))
            if a.get('srcset'): self.images.extend(x.strip().split(' ')[0] for x in a['srcset'].split(','))

data=Path('vite-version/src/app/information/data.ts').read_text(encoding='utf-8')
cards=[]
for m in re.finditer(r'\bid: "([^"]+)"',data):
    section=data[m.end():]; href=re.search(r'href: "([^"]+)"',section).group(1)
    cards.append((m.group(1),href))

def inspect(card):
    id,url=card
    try:
        r=urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=25)
        content=r.read()
        Path('.tmp-hub-source').mkdir(exist_ok=True)
        Path('.tmp-hub-source',id+('.pdf' if 'pdf' in r.headers.get('Content-Type','') else '.html')).write_bytes(content)
        parser=Images(); parser.feed(content.decode('utf-8',errors='replace'))
        images=list(dict.fromkeys(urljoin(url,i) for i in parser.images if i and not i.startswith('data:')))
        return {'id':id,'source':url,'images':images}
    except Exception as e: return {'id':id,'source':url,'error':str(e)}

if __name__=='__main__':
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as pool:
        results=list(pool.map(inspect,cards))
    Path('.tmp-hub-images.json').write_text(json.dumps(results,indent=2),encoding='utf-8')
    for r in results: print(r['id'],json.dumps(r.get('images',r.get('error')))[:2200])
