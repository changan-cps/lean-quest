"""Procedural, tileable PBR texture sources for the assembly vertical slice.

Everything here is generated from seeded noise, so the output is original work of
this project (no third-party images). Run:  python3 tools/assets/textures.py OUTDIR
Produces PNGs named <set>_<map>.png (map = albedo | normal | orm) at 1024 px.
ORM packing: R = ambient occlusion, G = roughness, B = metalness (glTF convention).
"""
import sys, os, numpy as np
from PIL import Image

N = 1024
rng = np.random.default_rng(20261011)

def noise(scale, aniso=(1.0, 1.0), n=N):
    """Periodic band-limited noise in [-1,1] (FFT filtered, so it tiles)."""
    w = rng.standard_normal((n, n))
    fy = np.fft.fftfreq(n)[:, None] * n / aniso[1]
    fx = np.fft.fftfreq(n)[None, :] * n / aniso[0]
    f = np.sqrt(fx * fx + fy * fy)
    filt = np.exp(-(f / scale) ** 2)
    filt[0, 0] = 0
    r = np.real(np.fft.ifft2(np.fft.fft2(w) * filt))
    return r / (np.abs(r).max() + 1e-9)

def normal_from_height(h, strength):
    dx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * 0.5 * strength
    dy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * 0.5 * strength
    n = np.stack([-dx, dy, np.ones_like(h)], -1)  # OpenGL / glTF (+Y up)
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    return ((n * 0.5 + 0.5) * 255).astype(np.uint8)

def save(arr, name, out):
    a = np.clip(arr, 0, 255).astype(np.uint8)
    Image.fromarray(a).save(os.path.join(out, name + '.png'))

def rgb(c, k):
    return np.stack([c[0] * k, c[1] * k, c[2] * k], -1)

def orm(ao, rough, metal):
    return np.stack([ao * 255, rough * 255, metal * 255], -1)

yy, xx = np.mgrid[0:N, 0:N] / N

def floor(out):
    # light-grey self-levelling epoxy with soft trowel mottling and fine specks
    mott = noise(6) * 0.5 + noise(20) * 0.3
    speck = (noise(380) > 0.55).astype(float)
    k = 1 + mott * 0.045 - speck * 0.05
    save(rgb((188, 193, 198), k), 'floor_albedo', out)
    save(normal_from_height(noise(140) * 0.6 + noise(30) * 0.4, 3.0), 'floor_normal', out)
    save(orm(np.ones((N, N)), 0.32 + mott * 0.08 + speck * 0.1, np.zeros((N, N))), 'floor_orm', out)

def metal(out):
    # brushed steel: streaks along U
    h = noise(400, aniso=(40, 1)) * 0.7 + noise(60) * 0.3
    save(normal_from_height(h, 2.0), 'metal_normal', out)
    save(orm(np.ones((N, N)), 0.34 + noise(8) * 0.05 + h * 0.04, np.ones((N, N))), 'metal_orm', out)

def tread(out):
    # tyre tread: U wraps the circumference (4 repeats per tile), V across the width
    ribs = np.abs(((yy * 5) % 1) - 0.5) < 0.06           # 4 circumferential grooves
    blocks = np.abs((((xx * 24) + yy * 1.2) % 1) - 0.5) < 0.07  # angled sipes
    shoulder = (yy < 0.08) | (yy > 0.92)
    h = 1 - ribs * 1.0 - blocks * 0.6 * (~shoulder) + noise(300) * 0.03
    save(normal_from_height(h, 8.0), 'tread_normal', out)
    ao = 1 - ribs * 0.55 - blocks * 0.35
    save(orm(ao, 0.88 + noise(40) * 0.04, np.zeros((N, N))), 'tread_orm', out)

def slats(out):
    # slat conveyor: 8 steel slats per tile with dark gaps
    t = (xx * 8) % 1
    gap = (t < 0.04) | (t > 0.96)
    groove = np.abs(((yy * 32) % 1) - 0.5) < 0.12
    h = 1 - gap * 1.0 - groove * 0.25 + noise(200, aniso=(1, 30)) * 0.05
    save(normal_from_height(h, 6.0), 'slat_normal', out)
    alb = rgb((126, 133, 140), 1 + noise(12) * 0.06 - gap * 0.7)
    save(alb, 'slat_albedo', out)
    save(orm(1 - gap * 0.7 - groove * 0.15, 0.45 + noise(20) * 0.08 + gap * 0.3, np.where(gap, 0.0, 0.85)), 'slat_orm', out)

def fabric(out):
    # cotton twill for the work uniform (diagonal wale)
    tw = np.sin((xx + yy) * N * np.pi / 3.0) * 0.5 + np.sin((xx - yy) * N * np.pi / 9.0) * 0.15
    h = tw + noise(250) * 0.4
    save(normal_from_height(h, 1.2), 'fabric_normal', out)

def plastic(out):
    # textured PP for parts bins / grips (fine stipple)
    save(normal_from_height(noise(420), 1.6), 'plastic_normal', out)

if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else 'build/tex-src'
    os.makedirs(out, exist_ok=True)
    for f in (floor, metal, tread, slats, fabric, plastic):
        f(out)
    print('ok', sorted(os.listdir(out)))
