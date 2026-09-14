"""Integration QA through the installed agent-browser CLI in one process lifetime.

Keeps the CLI's Windows child-job browser alive across sequential interactions.
Uses synthetic Nairobi coordinates; never reads the user's actual location.
"""
import json, os, shutil, subprocess
from pathlib import Path

root=Path(__file__).resolve().parents[1]
out=root/'docs/data-provenance/planting-qa'; out.mkdir(parents=True,exist_ok=True)
cli=shutil.which('agent-browser')
if not cli:
    candidates=list((Path(os.environ['LOCALAPPDATA'])/'npm-cache/_npx').glob('*/node_modules/agent-browser/bin/agent-browser-win32-x64.exe'))
    if not candidates: raise RuntimeError('Install agent-browser before browser QA')
    cli=str(candidates[0])
session='ea-planting-integration'
report=[]
def ab(*args, js=None):
    result=subprocess.run([cli,'--session',session,*args],input=js,text=True,encoding='utf8',errors='replace',capture_output=True,timeout=55)
    if result.returncode: raise RuntimeError(' '.join(args)+': '+result.stderr+result.stdout)
    return result.stdout
def snapshot(name):
    (out/(name+'.txt')).write_text(ab('snapshot','-i'),encoding='utf8')
def check(name, js):
    output=ab('eval','--stdin',js='(()=>{const assert=(value,message)=>{if(!value)throw new Error(message)};'+js+';return "PASS"})()')
    if 'PASS' not in output: raise RuntimeError(name+': '+output)
    report.append({'check':name,'result':'pass'}); print(name,'PASS',flush=True)
def shot(name): ab('screenshot',str(out/(name+'.png')))
def wait(text): ab('wait','--text',text)
try:
    ab('open','http://127.0.0.1:5181/shop/seedlings'); wait('More filters & sorting'); snapshot('seedlings-desktop')
    check('Seedlings listing and explicit location CTA',"assert(document.body.innerText.includes('Use my location to find nearby nurseries'),'CTA absent'); assert(document.body.innerText.includes('Starting from'),'Known price absent'); assert(document.body.innerText.includes('1,000 seedlings'),'Quantity missing')")
    shot('seedlings-desktop')
    ab('open','http://127.0.0.1:5181/shop/seedlings/pinus-patula-seedlings'); wait('Nurseries supplying this material'); snapshot('seedling-product')
    check('Initial minimum',"assert(document.body.innerText.includes('Starting from'),'Minimum absent'); assert(document.body.innerText.includes('KES'),'Currency absent')")
    ab('find','role','button','click','--name','100 seedlings','--exact'); wait('Estimated from unit price'); snapshot('quantity-100')
    check('100 seedling inferred total',"assert(document.body.innerText.includes('KES 1,000'),'Expected 100 x KES 10'); assert(document.body.innerText.includes('Estimated from unit price'),'Estimate not labelled')")
    ab('find','role','button','click','--name','1,000 seedlings','--exact'); wait('KES 10,000'); snapshot('quantity-1000'); shot('quantity-1000')
    ab('find','role','button','click','--name','Kenya','--exact'); wait('KEFRI Enterprise'); snapshot('country-kenya')
    check('Country filter reaches supplier list',"assert([...document.querySelectorAll('[data-offer-id]')].every(el=>el.innerText.includes('Kenya')),'Foreign supplier remained')")
    ab('eval','--stdin',js="Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition:(ok)=>ok({coords:{latitude:-1.2921,longitude:36.8219}})}})")
    ab('find','role','button','click','--name','Use my location to find nearby nurseries','--exact'); wait('Nearest first'); snapshot('location-allowed')
    check('Allowed location distances and ordering',"const km=[...document.querySelectorAll('[data-offer-id]')].map(el=>Number(el.innerText.match(/Approximately (\\d+) km away/)?.[1])).filter(Number.isFinite); assert(km.length>0,'No distances'); assert(km.every((n,i)=>i===0||n>=km[i-1]),'Distances not ordered')")
    ab('eval','--stdin',js="document.getElementById('planting-suppliers').scrollIntoView()"); shot('location-allowed')
    ab('open','http://127.0.0.1:5181/shop/seedlings/pinus-patula-seeds'); wait('Seed suppliers & source records'); snapshot('seed-product')
    check('Pinus seed suppliers and TFS technical data',"const text=document.body.innerText; assert(text.includes('TFS')&&text.includes('KEFRI')&&text.includes('National Tree Seed Centre'),'Seed suppliers missing'); assert(text.includes('125,000')&&text.includes('75,000')&&text.includes('PIPA088A'),'TFS fields missing'); assert(text.includes('Price on request'),'Unknown-price fallback missing'); assert(!text.includes('1,000 seedlings'),'Seedling quantity leaked into seeds')")
    for i in [1,2,3]:
        if i > 1: ab('find','role','button','click','--name','Next slide','--exact')
        snapshot('gallery-'+str(i))
        check('Gallery image '+str(i)+' fills hero',"const imgs=[...document.querySelectorAll('button[aria-label^=\"Expand\"] img')]; assert(imgs.length===3,'Expected three images'); assert(imgs.every(img=>getComputedStyle(img).objectFit==='cover'),'Image fit incorrect'); const r=imgs[0].getBoundingClientRect(); assert(r.width>300&&r.height>=420,'Hero too small')")
    shot('seed-product-desktop')
    ab('eval','--stdin',js="Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition:(_,fail)=>fail({code:1})}})")
    ab('find','role','button','click','--name','Use my location to find nearby nurseries','--exact'); wait('Location permission was declined'); snapshot('location-denied')
    check('Denied location retains manual filters',"assert(document.querySelector('[aria-label=\"Supplier country\"]'),'Country controls absent'); assert(!document.body.innerText.includes('Finding your location'),'Location stuck')")
    ab('set','viewport','390','844'); snapshot('seed-product-mobile')
    check('Mobile product has no horizontal overflow',"assert(document.documentElement.scrollWidth<=window.innerWidth+1,'Horizontal overflow')")
    shot('seed-product-mobile')
    ab('open','http://127.0.0.1:5181/shop/seedlings?material=seed'); wait('More filters & sorting'); snapshot('seeds-mobile')
    check('Seeds view and mobile controls',"assert(!document.body.innerText.includes('1,000 seedlings'),'Wrong quantity'); assert(document.documentElement.scrollWidth<=window.innerWidth+1,'Horizontal overflow')")
    shot('seeds-mobile')
    ab('set','viewport','1440','1000'); shot('seeds-desktop')
except Exception as error:
    report.append({'check':'browser sequence','result':'fail','detail':str(error)}); print(str(error),flush=True)
    try: snapshot('failure'); shot('failure')
    except Exception: pass
    raise
finally:
    (out/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8')
    try: ab('close')
    except Exception: pass
