"""Regenerate assets/factory/manifest.json (sizes, hashes, licences, material->texture map).
Run after build_glb.py and encode-ktx2.cjs:  python3 tools/assets/make_manifest.py
"""
import json, os, hashlib
D = os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'factory')
OWN = {"author": "Lean Quest project (code-authored by Claude for yureepornyk-cmyk/lean-quest)", "license": "CC0-1.0",
       "source": "tools/assets/author.mjs (geometry, materials, animation clips) - generated, no third-party meshes, scans or photos"}
TEX_SRC = "tools/assets/textures.py (seeded procedural noise) -> tools/assets/encode-ktx2.cjs (Basis Universal encoder, Apache-2.0)"
ORDER = [('hall', 1), ('station', 1), ('car', 1), ('worker', 1), ('flowrack', 2), ('tools', 2), ('fixtures', 2)]
MATS = {
 "M_FloorEpoxy": {"set": "floor", "repeat": [9, 5.5], "maps": ["albedo", "normal", "orm"], "normalScale": 0.35},
 "M_Slat": {"set": "slat", "repeat": [1, 1], "maps": ["albedo", "normal", "orm"], "normalScale": 1.0},
 "M_Tyre": {"set": "tread", "repeat": [4, 1], "maps": ["normal", "orm"], "normalScale": 1.2},
 "M_Steel": {"set": "metal", "repeat": [2, 2], "maps": ["normal", "orm"], "normalScale": 0.4},
 "M_SteelDark": {"set": "metal", "repeat": [2, 2], "maps": ["normal", "orm"], "normalScale": 0.4},
 "M_Roller": {"set": "metal", "repeat": [1, 1], "maps": ["normal"], "normalScale": 0.3},
 "M_UniformShirt": {"set": "fabric", "repeat": [3, 3], "maps": ["normal"], "normalScale": 0.6},
 "M_UniformPants": {"set": "fabric", "repeat": [3, 3], "maps": ["normal"], "normalScale": 0.6},
 "M_Gloves": {"set": "fabric", "repeat": [6, 6], "maps": ["normal"], "normalScale": 0.8},
 "M_SeatFabric": {"set": "fabric", "repeat": [2, 2], "maps": ["normal"], "normalScale": 0.6},
 "M_BinBlue": {"set": "plastic", "repeat": [2, 2], "maps": ["normal"], "normalScale": 0.5},
 "M_BinGrey": {"set": "plastic", "repeat": [2, 2], "maps": ["normal"], "normalScale": 0.5},
 "M_RubberMat": {"set": "plastic", "repeat": [6, 2], "maps": ["normal"], "normalScale": 1.2},
}
QUALITY = {
 "low": {"textureSize": 512, "maps": ["albedo", "orm"], "lod": 1, "shadows": False, "pixelRatio": 1},
 "medium": {"textureSize": 512, "maps": ["albedo", "normal", "orm"], "lod": 0, "shadows": True, "shadowMap": 1024, "pixelRatio": 1.5},
 "high": {"textureSize": 1024, "maps": ["albedo", "normal", "orm"], "lod": 0, "shadows": True, "shadowMap": 2048, "pixelRatio": 2},
}
def sha(p): return hashlib.sha256(open(p, 'rb').read()).hexdigest()
def main():
    st = json.load(open(os.path.join(D, 'build-stats.json')))
    models = {}
    for n, ph in ORDER:
        p = os.path.join(D, n + '.glb')
        models[n] = {"url": n + ".glb", "phase": ph, "bytes": os.path.getsize(p), "sha256": sha(p),
                     "triangles": {"lod0": int(st[n]['trisLOD0']), "lod1": int(st[n]['trisLOD1'])}, "clips": st[n]['clips'], **OWN}
    tex = {}
    for f in sorted(os.listdir(os.path.join(D, 'tex'))):
        if not f.endswith('.ktx2'): continue
        p = os.path.join(D, 'tex', f)
        tex[f[:-5]] = {"url": "tex/" + f, "bytes": os.path.getsize(p), "sha256": sha(p),
                       "codec": "UASTC+Zstd" if '_normal_' in f else "ETC1S", "colorSpace": "srgb" if '_albedo_' in f else "linear",
                       **OWN, "source": TEX_SRC}
    man = {"version": 1, "name": "Lean Quest - Assembly vertical slice", "units": "metres, +Y up, line flows +X",
           "budget": {"firstSceneBytesMax": 15 * 1024 * 1024, "targetFps": 30, "note": "Budgets proposed in CLAUDE-3D-BRIEF.md; measured values are in ASSET-REPORT.md"},
           "quality": QUALITY, "models": models, "textures": tex, "materials": MATS,
           "thirdPartyRuntime": [
               {"name": "three.js r160 (three.module.min.js, GLTFLoader, KTX2Loader, RoomEnvironment, BufferGeometryUtils, WorkerPool, ktx-parse, zstddec)", "license": "MIT", "path": "three.module.min.js, vendor/three/"},
               {"name": "Basis Universal transcoder (three.js r160 examples/jsm/libs/basis)", "license": "Apache-2.0", "path": "vendor/three/libs/basis/"}],
           "thirdPartyBuildTools": [
               {"name": "three.js r160 GLTFExporter + TextureUtils", "license": "MIT", "path": "tools/assets/lib/, tools/assets/utils/"},
               {"name": "meshoptimizer 1.3 simplifier (LOD1 generation)", "license": "MIT", "path": "tools/assets/lib/meshopt_simplifier.js"},
               {"name": "Basis Universal encoder (webgl/encoder/build, not committed)", "license": "Apache-2.0", "url": "https://github.com/BinomialLLC/basis_universal"}]}
    json.dump(man, open(os.path.join(D, 'manifest.json'), 'w'), indent=1, ensure_ascii=False)
    print('models KB', round(sum(m['bytes'] for m in models.values()) / 1024))
    for q, cfg in QUALITY.items():
        b = 0
        for setn in {m['set'] for m in MATS.values()}:
            for mp in {x for m in MATS.values() if m['set'] == setn for x in m['maps']}:
                if mp in cfg['maps']: b += tex[f"{setn}_{mp}_{cfg['textureSize']}"]['bytes']
        print(q, 'textures KB', round(b / 1024))
if __name__ == '__main__': main()
