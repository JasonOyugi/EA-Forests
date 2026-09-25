import concurrent.futures,io,json,sys,urllib.request,subprocess
from pathlib import Path
from PIL import Image
sys.path.insert(0,'.tmp-hub-python');import pymupdf as fitz
out=Path('vite-version/public/images/information')
results=json.loads(Path('.tmp-hub-downloads.json').read_text())
remaining={r['id']:r for r in json.loads(Path('.tmp-hub-remaining.json').read_text())}
downloads={
'fertiliser-supply-shock':('https://www.theeastafrican.co.ke/resource/image/5387992/landscape_ratio2x1/1600/800/bf08a6b3f71fcfcc364c1250f298d836/vh/tanker.jpg','https://www.theeastafrican.co.ke/tea/business-tech/iran-war-cuts-fertiliser-supplies-to-kenya-tanzania-5387948','Original article: LPG tanker at anchor off Shinas, Oman'),
'east-africa-fuel-corridor':('https://www.theeastafrican.co.ke/resource/image/5536898/landscape_ratio2x1/1600/800/5c4d4e2b51a49a380d8964032c5e22e4/xA/unoc.jpg','https://www.theeastafrican.co.ke/tea/business-tech/uganda-tightens-its-grip-on-kenya-fuel-corridor-5536864','Original article: UNOC delegation at Mombasa port'),
'oromia-isfl-issuance':('https://biocarbonfund-isfl.org/sites/default/files/2026-07/AdobeStock_181653849.jpeg',results['oromia-isfl-issuance']['source'],'Original ISFL announcement: Ethiopian highlands'),
'kenya-carbon-rulebook':(remaining['kenya-carbon-guide']['images'][0],remaining['kenya-carbon-guide']['source'],'Same announcement covered by Business Daily'),
'sepal-toolkit':('https://docs.sepal.io/en/latest/_images/sepal_home1.png','https://docs.sepal.io/en/latest/setup/presentation.html','Official SEPAL documentation: monitoring workspace'),
}
def download(item):
    id,(url,source,note)=item
    try:
        raw=Path('.tmp-hub-source',id+'.image')
        subprocess.run(['curl.exe','--compressed','-fLsS','--max-time','35','-A','Mozilla/5.0',url,'-o',str(raw)],check=True,capture_output=True)
        im=Image.open(raw).convert('RGB'); size=list(im.size);im.thumbnail((2000,2000),Image.Resampling.LANCZOS);im.save(out/(id+'.webp'),'WEBP',quality=86)
        results[id]={'file':'/images/information/'+id+'.webp','url':url,'source':source,'note':note,'originalSize':size};print(id,size,flush=True)
    except Exception as e:print(id,str(e),flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:list(pool.map(download,downloads.items()))
for id,source_id,page_index in [('kenya-rules-pipeline','kenya-rules-pdf',0),('forestry-concession-rules','kenya-concessions-pdf',0),('miti360-dataset','miti-paper',2),('tanzania-processing-study','processing-paper',0)]:
    doc=fitz.open(Path('.tmp-hub-source',source_id+'.pdf'))
    # Actual study imagery, selected after inspecting the extracted figures.
    page=doc[page_index];pix=page.get_pixmap(matrix=fitz.Matrix(2.5,2.5));im=Image.open(io.BytesIO(pix.tobytes('png'))).convert('RGB');im.thumbnail((2000,2000));im.save(out/(id+'.webp'),'WEBP',quality=86)
    results[id]={'file':'/images/information/'+id+'.webp','url':remaining[source_id]['source'],'source':remaining[source_id]['source'],'note':f'Original source document, page {page_index+1}','originalSize':list(im.size)}
    for p in doc:
        if id in ('miti360-dataset','tanzania-processing-study') and p.get_images():
            for idx,item in enumerate(p.get_images()):
                img=doc.extract_image(item[0]); path=Path('.tmp-hub-source',f'{id}-p{p.number+1}-{idx}.{img["ext"]}');path.write_bytes(img['image']); print(path,img['width'],img['height'],flush=True)
Path('.tmp-hub-downloads.json').write_text(json.dumps(results,indent=2))
subprocess.run(['curl.exe','--compressed','-fLsS','--max-time','35','https://newforests.earth/','-o','.tmp-hub-source/nfc-decoded.html'])
