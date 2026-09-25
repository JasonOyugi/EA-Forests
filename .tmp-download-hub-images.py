import concurrent.futures, io, json, urllib.request, urllib.parse, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageOps
sys.path.insert(0,'.tmp-hub-python')
import fitz

source_rows=json.loads(Path('.tmp-hub-images.json').read_text())+json.loads(Path('.tmp-extra-images.json').read_text())
rows={r['id']:r for r in source_rows}
selections={}
def pick(id, source_id, needle, note='Publisher image from the linked source'):
    r=rows[source_id]; url=next(i for i in r['images'] if needle in i)
    selections[id]={'url':url,'source':r['source'],'note':note}
pick('kenya-forest-regulator','kenya-forest-regulator','2026-06')
pick('kenya-dryland-policy','kenya-dryland-policy','2026-03')
pick('ethiopia-carbon-directive','ethiopia-carbon-directive','1141_')
pick('kenya-carbon-registry','kenya-carbon-registry','2026-03')
pick('uganda-timber-prices','uganda-timber-prices','harvest-logistics.jpeg')
pick('tropical-timber-benchmark','tropical-timber-benchmark','aaw2149.jpg')
pick('article-six-pipeline','article-six-pipeline','home-banner')
pick('nfc-investment','nfc-investment','nfc.jpg')
pick('nfc-guarantee','nfc-alt','saiff-ii-scaled.avif','Same publisher: EU-backed sustainable forestry guarantee programme')
pick('kenya-seed-regulation','kenya-seed-regulation','2026-07')
pick('kenya-rwanda-seed-policy','kenya-rwanda-seed-policy','4999--scaled')
pick('quality-tree-seed-project','kenya-rwanda-seed-policy','8659--scaled','Quality Tree Seed project fieldwork, from the linked partner policy report')
pick('tree-genebank','tree-genebank','urgent-need.jpg')
pick('uganda-lidar-inventory','uganda-lidar-inventory','335a3957')
pick('open-foris-uganda','open-foris-uganda','News%20Web')
selections['open-foris-uganda']['url']=selections['open-foris-uganda']['url'].replace('/styles/fao_ui_banner/public/','/')
pick('tree-crop-mapping-guidance','tree-crop-mapping-guidance','uf14d33')
pick('safari-ya-mbao','safari-ya-mbao','SYM_Header-3.jpg')
pick('sepal-toolkit','sepal-toolkit','sepalmid-cover')
selections.update({
 'iran-war-forestry-timeline':{'url':'https://upload.wikimedia.org/wikipedia/commons/f/f5/Strait_of_Hormuz_%28MODIS_2020-12-04%29.jpg','source':'https://commons.wikimedia.org/wiki/File:Strait_of_Hormuz_(MODIS_2020-12-04).jpg','note':'NASA MODIS: actual Strait of Hormuz satellite view; public domain'},
 'oromia-isfl-issuance':{'url':'https://www.biocarbonfund-isfl.org/sites/default/files/2026-07/AdobeStock_181653849.jpeg','source':rows['oromia-isfl-issuance']['source'],'note':'Original photo accompanying the ISFL issuance announcement'},
 'east-africa-fuel-corridor':{'url':'https://www.theeastafrican.co.ke/resource/image/5383578/portrait_ratio1x1/1600/1600/68a8d83a6ebea9129ff9b71193938236/cY/port.jpg','source':'https://www.theeastafrican.co.ke/tea/news/east-africa/east-african-citizens-brace-for-hard-times-as-war-escalates-5383572','note':'Same publisher: tankers at Mombasa Kipevu Oil Terminal'},
 'rwanda-coffee-genetics':{'url':'https://magazine.coffee/files/1/uploads/images/1%201%20Spring%202021/Screenshot%202021-10-28%20at%2020_23_37.png','source':'https://magazine.coffee/blog/9/6252/what-is-it-the-eugenoides-coffee-varietal-explained','note':'Coffea eugenioides at Coffee Research Foundation, Ruiru; species illustration, not the Rwanda study site'},
})
out=Path('vite-version/public/images/information'); out.mkdir(parents=True,exist_ok=True)
def download(item):
    id,row=item
    try:
        req=urllib.request.Request(row['url'].replace(' ','%20'),headers={'User-Agent':'Mozilla/5.0'})
        content=urllib.request.urlopen(req,timeout=25).read()
        im=Image.open(io.BytesIO(content)).convert('RGB')
        row['originalSize']=list(im.size)
        im.thumbnail((2000,2000),Image.Resampling.LANCZOS)
        im.save(out/(id+'.webp'),'WEBP',quality=86,method=6)
        row['file']='/images/information/'+id+'.webp'
        print(id,row['originalSize'],flush=True)
    except Exception as e: row['error']=str(e);print(id,str(e),flush=True)
    return id,row
with concurrent.futures.ThreadPoolExecutor(max_workers=10) as pool: results=dict(pool.map(download,selections.items()))
Path('.tmp-hub-downloads.json').write_text(json.dumps(results,indent=2))
# Extract the actual report covers and programme images at print resolution.
for id in ['cafi-sme-facility','kenya-commercial-strategy','commercial-breeding-plan']:
    pdf=Path('.tmp-hub-source',id+'.pdf')
    if not pdf.exists(): continue
    doc=fitz.open(pdf)
    page=doc[0]
    if id=='commercial-breeding-plan':
        for p in doc:
            if 'breeding' in p.get_text().lower() and p.get_images(): page=p; break
    pix=page.get_pixmap(matrix=fitz.Matrix(2.5,2.5))
    im=Image.open(io.BytesIO(pix.tobytes('png'))).convert('RGB'); im.thumbnail((2000,2000))
    im.save(out/(id+'.webp'),'WEBP',quality=86)
    results[id]={'file':'/images/information/'+id+'.webp','source':rows[id]['source'],'url':rows[id]['source'],'originalSize':list(im.size),'note':f'Linked report, page {page.number+1} rendered at high resolution'}
Path('.tmp-hub-downloads.json').write_text(json.dumps(results,indent=2))
files=list(out.glob('*.webp')); contact=Image.new('RGB',(1000,((len(files)+3)//4)*180),'#eeeeee'); draw=ImageDraw.Draw(contact)
for i,p in enumerate(files):
    im=Image.open(p); im.thumbnail((246,146)); x=(i%4)*250;y=(i//4)*180;contact.paste(im,(x,y));draw.text((x,y+147),p.stem[:29],fill='black')
contact.save('.tmp-hub-contact.jpg')
