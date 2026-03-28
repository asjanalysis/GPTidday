#!/usr/bin/env python3
from __future__ import annotations
import json, re, hashlib, datetime
from dataclasses import dataclass, asdict
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import urlparse

SEEDS = [
    {"url":"https://www.vans.com/en-us/shoes-c00081/toddler-checkerboard-slip-on-v-shoe-pvn0a4vhrbla","retailer_name":"Vans","brand":"Vans","age_hint":"2T-4T","category_hint":"shoes","tags":["checkerboard","skate","classic"],"gender":"neutral"},
    {"url":"https://www.vans.com/en-us/shoes-c00081/toddler-ward-shoe-pvn000d3ybka","retailer_name":"Vans","brand":"Vans","age_hint":"2T-4T","category_hint":"shoes","tags":["skate","streetwear"],"gender":"neutral"},
    {"url":"https://www.quiksilver.com/baby-boys-2-7-surfsilk-tijuana-boardshorts-EQKBS03300.html","retailer_name":"Quiksilver","brand":"Quiksilver","age_hint":"2T-7","category_hint":"boardshorts","tags":["surf","beach","graphic"],"gender":"boy"},
    {"url":"https://us.oneill.com/products/fa3106002-boyss-balance-hoodie","retailer_name":"O'Neill","brand":"O'Neill","age_hint":"2T-7","category_hint":"hoodies","tags":["surf","streetwear","vintage wash"],"gender":"boy"},
    {"url":"https://us.oneill.com/products/sp4106039-girls-saltwater-dreams-tee","retailer_name":"O'Neill","brand":"O'Neill","age_hint":"2T-7","category_hint":"tees","tags":["surf","graphic","beach"],"gender":"girl"}
]

include_keywords = ['toddler','baby','infant','kid','romper','onesie','boardshort','skate','surf','checkerboard','hoodie','beanie','tee','shoe']
exclude_keywords = ['adult','men','women','gift card']
style_map = {"punk":["punk","distressed","grunge","alt"],"surf":["surf","wave","beach","saltwater","boardshort"],"skate":["skate","checkerboard","streetwear","vans"],"checkerboard":["checkerboard"],"graphic":["graphic","logo","print"],"beach":["beach","ocean","coast"],"vintage wash":["vintage","washed","faded"]}

@dataclass
class Product:
    id: str; slug: str; title: str; description_short: str; brand: str; retailer_name: str; retailer_domain: str
    source_product_url: str; image_url: str; additional_images: list[str]; current_price: float; original_price: float | None
    currency: str; age_range: str; sizes: list[str]; category: str; style_tags: list[str]; availability: str
    last_checked_at: str; source_type: str; product_hash: str; gender: str | None; featured_score: int; recently_updated: bool


def relevance(text:str)->bool:
    t=text.lower(); return any(k in t for k in include_keywords) and not any(k in t for k in exclude_keywords)

def style_tags(text:str,tags:list[str])->list[str]:
    t=text.lower(); out=set(tags)
    for tag,words in style_map.items():
        if any(w in t for w in words): out.add(tag)
    return sorted(out)

def normalize_category(hint:str,text:str)->str:
    lookup=[('onesie','onesies'),('romper','rompers'),('tee','tees'),('hoodie','hoodies'),('short','boardshorts'),('beanie','beanies'),('sock','socks'),('shoe','shoes'),('jacket','jackets'),('overall','overalls'),('hat','hats'),('bag','accessories')]
    t=(hint+' '+text).lower()
    for needle,cat in lookup:
        if needle in t:return cat
    return 'clothing'

def get_jsonld(url:str)->dict|None:
    req=Request(url,headers={'User-Agent':'Mozilla/5.0 TinyThrashThreadsBot/1.0'})
    html=urlopen(req,timeout=20).read().decode('utf-8','ignore')
    blobs=re.findall(r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',html,re.S|re.I)
    for blob in blobs:
      try:
        parsed=json.loads(blob.strip())
      except Exception:
        continue
      nodes=parsed if isinstance(parsed,list) else [parsed]
      for node in nodes:
        if isinstance(node,dict) and node.get('@type')=='Product': return node
    return None

def parse_price(v):
    if v is None:return 0.0
    try:return float(re.sub(r'[^\d.]','',str(v)) or 0)
    except Exception:return 0.0

def availability(raw):
    v=(raw or '').lower()
    if 'instock' in v or 'in stock' in v:return 'in_stock'
    if 'outofstock' in v or 'out of stock' in v:return 'out_of_stock'
    return 'unknown'

def slugify(v): return re.sub(r'(^-|-$)','',re.sub(r'[^a-z0-9]+','-',v.lower()))

def feature_score(tags,title):
    score=len(tags)*10
    if 'checkerboard' in title.lower(): score += 15
    if 'punk' in tags: score += 12
    if 'surf' in tags: score += 10
    if 'skate' in tags: score += 10
    return min(score,100)

def normalize(seed,node,now):
    title=(node.get('name') or '').strip(); image=node.get('image')
    if isinstance(image,list): image=image[0] if image else ''
    if not title or not image: return None
    desc=re.sub('<[^>]*>',' ',(node.get('description') or '')).strip()
    text=f"{title} {desc} {seed['category_hint']} {seed['age_hint']}"
    if not relevance(text): return None
    offers=node.get('offers')
    if isinstance(offers,list): offers=offers[0] if offers else {}
    offers=offers if isinstance(offers,dict) else {}
    tags=style_tags(text,seed['tags']); category=normalize_category(seed['category_hint'],text)
    url=seed['url']; price=parse_price(offers.get('price') or node.get('price'))
    return Product(
      id=hashlib.sha1(url.encode()).hexdigest()[:12], slug=slugify(f"{seed['brand']}-{title}"), title=title, description_short=desc[:180],
      brand=seed['brand'], retailer_name=seed['retailer_name'], retailer_domain=urlparse(url).hostname or '', source_product_url=url,
      image_url=str(image), additional_images=[x for x in node.get('image',[]) if isinstance(x,str)][1:6] if isinstance(node.get('image'),list) else [],
      current_price=price, original_price=None, currency=offers.get('priceCurrency','USD'), age_range=seed['age_hint'], sizes=node.get('size') if isinstance(node.get('size'),list) else ([node.get('size')] if node.get('size') else []),
      category=category, style_tags=tags, availability=availability(offers.get('availability')), last_checked_at=now, source_type='json_ld',
      product_hash=hashlib.sha1(f"{seed['brand']}:{title}:{price}".encode()).hexdigest(), gender=seed.get('gender'), featured_score=feature_score(tags,title), recently_updated=True
    )

def main():
    now=datetime.datetime.utcnow().replace(microsecond=0).isoformat()+"Z"
    products=[]
    fallback=json.loads(Path('data/fallback_products.json').read_text(encoding='utf-8'))
    for i, seed in enumerate(SEEDS):
        try:
            node=get_jsonld(seed['url'])
            if not node:
                raise RuntimeError('No Product json-ld found')
            p=normalize(seed,node,now)
            if p: products.append(p)
        except Exception as exc:
            print('Failed', seed['url'], exc)
            fb=fallback[i] if i < len(fallback) else None
            if fb:
                p=normalize(seed, fb, now)
                if p: products.append(p)
    dedup={}
    for p in products:
        if p.product_hash not in dedup or p.featured_score > dedup[p.product_hash].featured_score:
            dedup[p.product_hash]=p
    sorted_products=sorted([asdict(p) for p in dedup.values()], key=lambda x: x['featured_score'], reverse=True)
    payload={"generated_at":now,"product_count":len(sorted_products),"products":sorted_products}
    out=Path('data/products.generated.json')
    out.write_text(json.dumps(payload,indent=2),encoding='utf-8')
    print(f'Wrote {len(sorted_products)} products to {out}')

if __name__=='__main__':
    main()
