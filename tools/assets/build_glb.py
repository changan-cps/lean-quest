"""Export the code-authored assets to assets/factory/*.glb via headless Chromium.

Usage (from the repo root, with a static server on 8811):
  python3 -m http.server 8811 --bind 127.0.0.1 &
  python3 tools/assets/build_glb.py
"""
import asyncio, base64, hashlib, json, os, sys
from playwright.async_api import async_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'assets', 'factory')

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('http://127.0.0.1:8811/tools/assets/author.html')
        await pg.wait_for_function('window.ready', timeout=30000)
        res = await pg.evaluate('exportAll()')
        await b.close()
    if errs:
        print('page errors', errs); sys.exit(1)
    os.makedirs(OUT, exist_ok=True)
    stats = res['stats']
    for name, b64 in res['b64'].items():
        data = base64.b64decode(b64)
        with open(os.path.join(OUT, name + '.glb'), 'wb') as f:
            f.write(data)
        stats[name]['sha256'] = hashlib.sha256(data).hexdigest()
    with open(os.path.join(OUT, 'build-stats.json'), 'w') as f:
        json.dump(stats, f, indent=1)
    for k, v in stats.items():
        print(f"{k:9s} {v['bytes']/1024:8.1f} KB  meshes {v['meshes']:3d}  tris LOD0 {int(v['trisLOD0']):6d}  LOD1 {int(v['trisLOD1']):6d}  {','.join(v['clips'])}")

asyncio.run(main())
