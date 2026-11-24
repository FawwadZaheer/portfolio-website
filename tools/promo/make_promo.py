"""Promo reel for Fawwad Zaheer Rizvi's portfolio — 44 s, 1920x1080, 30 fps.

Every overlay is drawn here with Pillow on top of the real gameplay / Blender footage,
one encoded file per scene, then joined and muxed with the soundtrack from make_music.py.

Usage:
  python make_promo.py <project_root> <out_dir> [scene ...]       # render scenes (all by default)
  python make_promo.py <project_root> <out_dir> --still <scene> <t> # one PNG for checking
"""
import os
import subprocess
import sys
from functools import lru_cache

import numpy as np
from PIL import Image, ImageDraw, ImageFont

W, H, FPS = 1920, 1080, 30
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = sys.argv[1] if len(sys.argv) > 1 else '.'
MEDIA = os.path.join(ROOT, 'public', 'media')

LIGHTEST = (224, 248, 208)
LIGHT = (136, 192, 112)
DARK = (52, 104, 86)
DARKEST = (8, 24, 32)
PALETTE = np.array([DARKEST, DARK, LIGHT, LIGHTEST], dtype=np.uint8)


def mix(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


GRID = mix(DARKEST, DARK, 0.35)


@lru_cache(None)
def PIX(size):
    return ImageFont.truetype(os.path.join(HERE, 'PressStart2P.ttf'), size)


@lru_cache(None)
def MONO(size, bold=False):
    return ImageFont.truetype(os.path.join(HERE, 'PlexMono-Bold.ttf' if bold else 'PlexMono-Medium.ttf'), size)


# ------------------------------------------------------------------ easing / helpers
def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def prog(t, t0, dur):
    return clamp((t - t0) / dur)


def ease_out(x):
    return 1 - (1 - x) ** 3


def ease_in(x):
    return x ** 3


def ease_back(x, s=1.70158):
    x -= 1
    return x * x * ((s + 1) * x + s) + 1


def typed(s, t, t0, cps=28):
    n = int(max(0.0, t - t0) * cps)
    return s[:n]


def text(d, xy, s, font, fill, shadow=None, off=6, anchor='la'):
    x, y = xy
    if shadow is not None:
        d.text((x + off, y + off), s, font=font, fill=shadow, anchor=anchor)
    d.text((x, y), s, font=font, fill=fill, anchor=anchor)


def text_w(s, font):
    return font.getlength(s)


def box(d, rect, fill, border=None, bw=6, shadow=None, soff=10):
    x0, y0, x1, y1 = rect
    if shadow is not None:
        d.rectangle((x0 + soff, y0 + soff, x1 + soff, y1 + soff), fill=shadow)
    d.rectangle(rect, fill=fill)
    if border is not None:
        d.rectangle(rect, outline=border, width=bw)


def chip(d, x, y, label, font, fg=DARKEST, bg=LIGHT, border=DARKEST, pad=(18, 12), shadow=DARKEST):
    w = text_w(label, font)
    asc, desc = font.getmetrics()
    h = asc + desc
    rect = (x, y, x + w + pad[0] * 2, y + h + pad[1] * 2)
    box(d, rect, bg, border, 4, shadow, 6)
    d.text((x + pad[0], y + pad[1]), label, font=font, fill=fg)
    return rect[2]


def pixel_check(d, x, y, s=6, color=LIGHT):
    # tiny pixel-art tick mark
    for cx, cy in [(0, 3), (1, 4), (2, 5), (3, 4), (4, 3), (5, 2), (6, 1), (7, 0)]:
        d.rectangle((x + cx * s, y + cy * s, x + cx * s + s - 1, y + cy * s + s - 1), fill=color)


def trophy(d, x, y, s=8, c=LIGHT, dk=DARKEST):
    art = [
        "XXXXXXXXX",
        "X.XXXXX.X",
        "X.XXXXX.X",
        ".XXXXXXX.",
        "..XXXXX..",
        "...XXX...",
        "....X....",
        "...XXX...",
        "..XXXXX..",
    ]
    for j, row in enumerate(art):
        for i, ch in enumerate(row):
            if ch == 'X':
                d.rectangle((x + i * s, y + j * s, x + i * s + s - 1, y + j * s + s - 1), fill=c)


# ------------------------------------------------------------------ backgrounds & post
def grid_bg(t, speed=40, color=DARKEST, line=GRID, step=48):
    off = int(t * speed) % step
    img = Image.new('RGB', (W, H), color)
    d = ImageDraw.Draw(img)
    for x in range(0, W + step, step):
        d.line((x, 0, x, H), fill=line, width=2)
    for y in range(-step, H + step, step):
        d.line((0, y + off, W, y + off), fill=line, width=2)
    return img


def _post_mask():
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    nx = (xx / W - 0.5) * 2
    ny = (yy / H - 0.5) * 2
    vig = 1 - 0.22 * np.clip((nx ** 2 + ny ** 2) / 2, 0, 1) ** 1.3
    scan = np.where((yy.astype(int) % 3) == 2, 0.9, 1.0)
    return (vig * scan * 256).astype(np.uint16)[..., None]


POST = None


def post(img, glitch=0.0, seed=0):
    global POST
    if POST is None:
        POST = _post_mask()
    a = np.asarray(img, dtype=np.uint16)
    a = (a * POST) >> 8
    a = a.astype(np.uint8)
    if glitch > 0:
        rng = np.random.default_rng(seed)
        shift = int(18 * glitch)
        a = a.copy()
        a[..., 0] = np.roll(a[..., 0], shift, axis=1)
        a[..., 2] = np.roll(a[..., 2], -shift, axis=1)
        for _ in range(int(10 * glitch)):
            y0 = rng.integers(0, H - 40)
            h = rng.integers(8, 60)
            a[y0:y0 + h] = np.roll(a[y0:y0 + h], rng.integers(-120, 120), axis=1)
    return a


BAYER = (np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16.0 - 0.5)


def gameboyify(img):
    """Map footage onto the 4-colour Game Boy palette with ordered dithering."""
    a = np.asarray(img, dtype=np.float32)
    y = (0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]) / 255.0
    y = np.clip(y * 1.25 - 0.05, 0, 1)
    b = np.tile(BAYER, (a.shape[0] // 4 + 1, a.shape[1] // 4 + 1))[: a.shape[0], : a.shape[1]]
    idx = np.clip(np.floor(y * 3 + 0.5 + b * 0.9), 0, 3).astype(np.int64)
    return Image.fromarray(PALETTE[idx])


# ------------------------------------------------------------------ footage
class Clip:
    """Streams frames of a source video segment as PIL images (sw x sh, 16:9 after `pre`)."""

    def __init__(self, rel, start, dur, pre='', size=(1280, 720), speed=1.0, eq=''):
        self.path = os.path.join(MEDIA, rel)
        self.size = size
        sw, sh = size
        vf = []
        if pre:
            vf.append(pre)
        vf.append(f'scale={sw}:{sh}:force_original_aspect_ratio=increase,crop={sw}:{sh}')
        if eq:
            vf.append(eq)
        if speed != 1.0:
            vf.append(f'setpts=PTS/{speed}')
        vf.append(f'fps={FPS}')
        self.cmd = ['ffmpeg', '-v', 'error', '-ss', f'{start:.3f}', '-t', f'{dur * speed + 0.3:.3f}', '-i', self.path,
                    '-vf', ','.join(vf), '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']
        self.proc = None
        self.last = None

    def next(self):
        if self.proc is None:
            self.proc = subprocess.Popen(self.cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
        sw, sh = self.size
        buf = self.proc.stdout.read(sw * sh * 3)
        if len(buf) == sw * sh * 3:
            self.last = Image.frombuffer('RGB', (sw, sh), buf)
        return self.last

    def close(self):
        if self.proc:
            self.proc.stdout.close()
            self.proc.kill()


def kenburns(img, p, z0, z1, cx=0.5, cy=0.5, out=(W, H)):
    """Crop a window of zoom z (1 = whole frame) centred near (cx, cy) and scale to `out`."""
    sw, sh = img.size
    z = z0 + (z1 - z0) * p
    ww, wh = sw / z, sh / z
    x0 = clamp(cx * sw - ww / 2, 0, sw - ww)
    y0 = clamp(cy * sh - wh / 2, 0, sh - wh)
    return img.resize(out, Image.BICUBIC, box=(x0, y0, x0 + ww, y0 + wh))


# ------------------------------------------------------------------ shared overlays
def stage_card(img, t, label, title, dur_hold=0.45, dur_out=0.3):
    """Full-screen 'STAGE 01' card that slides up and off to reveal the footage."""
    if t > dur_hold + dur_out:
        return
    p = ease_in(prog(t, dur_hold, dur_out))
    y = int(-H * p)
    d = ImageDraw.Draw(img)
    d.rectangle((0, y, W, y + H), fill=DARKEST)
    d.rectangle((0, y + H - 16, W, y + H), fill=LIGHT)
    pop = ease_back(prog(t, 0.0, 0.25))
    s = 96 if pop > 0.95 else 80
    text(d, (W // 2, y + H // 2 - 50), label, PIX(s), LIGHTEST, DARK, 8, anchor='mm')
    if t > 0.12:
        text(d, (W // 2, y + H // 2 + 70), title, PIX(40), LIGHT, anchor='mm')


def lower_third(img, t, title, kind, engine, items, team, t0=0.55):
    d = ImageDraw.Draw(img, 'RGBA')
    p = ease_out(prog(t, t0, 0.35))
    x = int(-900 + 980 * p)
    y = 640
    w, h = 900, 360
    d.rectangle((x + 12, y + 12, x + w + 12, y + h + 12), fill=DARKEST + (255,))
    d.rectangle((x, y, x + w, y + h), fill=DARKEST + (235,))
    d.rectangle((x, y, x + w, y + h), outline=LIGHT + (255,), width=5)
    d.rectangle((x, y, x + 14, y + h), fill=LIGHT + (255,))
    text(d, (x + 50, y + 36), title.upper(), PIX(48), LIGHTEST, DARK, 6)
    cx = x + 50
    if t > t0 + 0.25:
        cx = chip(d, cx, y + 112, engine, MONO(26, True), DARKEST, LIGHT) + 16
    if t > t0 + 0.4:
        cx = chip(d, cx, y + 112, kind, MONO(26, True), LIGHTEST, DARK, LIGHT) + 16
    if team and t > t0 + 0.55:
        chip(d, cx, y + 112, 'TEAM PROJECT', MONO(26, True), DARKEST, LIGHTEST)
    for k, it in enumerate(items):
        ts = t0 + 0.9 + k * 0.7
        if t < ts:
            break
        yy = y + 196 + k * 50
        pixel_check(d, x + 52, yy + 8, 4)
        text(d, (x + 100, yy), typed(it, t, ts, 40), MONO(32), LIGHTEST)


def hud(img, t, left, right, total):
    d = ImageDraw.Draw(img, 'RGBA')
    p = ease_out(prog(t, 0.6, 0.3))
    y = int(-80 + 116 * p)
    text(d, (48, y), left, PIX(24), LIGHTEST, DARKEST, 4)
    tw = text_w(right, PIX(24))
    text(d, (W - 48 - tw, y), right, PIX(24), LIGHTEST, DARKEST, 4)
    # progress bar along the bottom edge
    d.rectangle((0, H - 10, int(W * clamp(t / total)), H), fill=LIGHT + (255,))


def window(img, rect, title, content, t_pop=0.0, t=1.0):
    """Retro OS window with a title bar, `content` scaled into it."""
    p = ease_back(prog(t, t_pop, 0.3))
    if p <= 0:
        return
    x0, y0, x1, y1 = rect
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    s = max(0.05, p)
    x0, x1 = cx - (cx - x0) * s, cx + (x1 - cx) * s
    y0, y1 = cy - (cy - y0) * s, cy + (y1 - cy) * s
    x0, y0, x1, y1 = map(int, (x0, y0, x1, y1))
    d = ImageDraw.Draw(img)
    bar = 52
    box(d, (x0, y0, x1, y1), DARKEST, LIGHT, 5, (0, 0, 0), 12)
    d.rectangle((x0, y0, x1, y0 + bar), fill=LIGHT)
    if s > 0.9:
        d.text((x0 + 20, y0 + 16), title, font=PIX(20), fill=DARKEST)
        for k in range(3):
            d.rectangle((x1 - 40 - k * 34, y0 + 14, x1 - 18 - k * 34, y0 + 36), fill=DARKEST)
    iw, ih = x1 - x0 - 10, y1 - y0 - bar - 5
    if iw > 10 and ih > 10:
        img.paste(content.resize((iw, ih), Image.BICUBIC), (x0 + 5, y0 + bar))


# ================================================================== scenes
# Each scene: (frames, render(i, t) -> PIL.Image, glitch_in)

def scene_coldopen():
    words = ['CODE', 'PLAY', 'DESIGN', 'MODEL']
    clips = [
        (Clip('games/ship-brawl/video.mp4', 34.4, 0.6), 1.15, 1.3, 0.5, 0.5),
        (Clip('games/dungeon-escape/video.mp4', 29.5, 0.6, eq='eq=gamma=1.4:brightness=0.05'), 1.35, 1.5, 0.53, 0.62),
        (Clip('games/base-defenders/video.mp4', 132.0, 0.6), 1.7, 1.9, 0.41, 0.33),
        (Clip('models/low-poly-ship/video.mp4', 3.0, 0.6, pre='crop=790:444:90:110'), 1.0, 1.15, 0.5, 0.5),
    ]

    def render(i, t):
        k = min(3, i // 15)
        clip, z0, z1, cx, cy = clips[k]
        lt = (i % 15) / 15
        img = gameboyify(kenburns(clip.next(), lt, z0, z1, cx, cy))
        d = ImageDraw.Draw(img)
        s = 1 - ease_out(clamp(lt * 3))
        size = int(160 + 64 * s)
        size -= size % 8
        text(d, (W // 2, H // 2), words[k], PIX(size), LIGHTEST, DARKEST, 12, anchor='mm')
        if i % 15 < 2:  # white flash on each cut
            img = Image.blend(img, Image.new('RGB', (W, H), LIGHTEST), 0.75 if i % 15 == 0 else 0.35)
        return img

    return 60, render, 0


def scene_boot():
    def render(i, t):
        img = Image.new('RGB', (W, H), LIGHTEST)
        d = ImageDraw.Draw(img)
        p = clamp(t / 1.0)
        y = int(-160 + (H // 2 - 60 + 160) * p)
        text(d, (W // 2, y), 'FZR', PIX(192), DARKEST, LIGHT, 12, anchor='mm')
        if t >= 1.0:
            text(d, (W // 2, H // 2 + 90), 'PORTFOLIO // 2026', PIX(32), DARK, anchor='mm')
            if int((t - 1.0) * 6) % 2 == 0:
                text(d, (W // 2, H // 2 + 220), 'PRESS START', PIX(40), DARKEST, anchor='mm')
        text(d, (W // 2, H - 70), '(C) FAWWAD ZAHEER RIZVI', PIX(20), DARK, anchor='mm')
        return img

    return 60, render, 4


def scene_title():
    portrait = Image.open(os.path.join(MEDIA, 'fawwad-portrait.jpg')).convert('RGB')
    ph = 700
    pw = int(portrait.width * ph / portrait.height)
    portrait = portrait.resize((pw, ph), Image.LANCZOS)

    def render(i, t):
        img = grid_bg(t)
        d = ImageDraw.Draw(img)
        # portrait card slides in
        p = ease_back(prog(t, 0.0, 0.5))
        px = int(-pw - 100 + (180 + pw + 100) * p)
        py = 190
        box(d, (px - 12, py - 12, px + pw + 12, py + ph + 12), LIGHTEST, None, 0, LIGHT, 18)
        img.paste(portrait, (px, py))
        d.rectangle((px - 12, py + ph - 70, px + pw + 12, py + ph + 12), fill=DARKEST)
        text(d, (px + pw // 2, py + ph - 24), 'PLAYER 1', PIX(24), LIGHT, anchor='mm')

        x = 860
        text(d, (x, 190), typed('> NEW CHALLENGER', t, 0.1, 30), PIX(24), LIGHT)
        for k, line in enumerate(['FAWWAD', 'ZAHEER', 'RIZVI']):
            text(d, (x, 260 + k * 110), typed(line, t, 0.15 + k * 0.12, 36), PIX(88), LIGHTEST, DARK, 8)
        role = 'Game developer  //  3D artist'
        text(d, (x, 610), typed(role, t, 1.6, 40), MONO(44, True), LIGHTEST)
        edu = 'BS CS (Gaming & Animation), NED University'
        text(d, (x, 672), typed(edu, t, 2.4, 50), MONO(32), LIGHT)
        cx = x
        for k, lab in enumerate(['UNITY + C#', 'UNREAL ENGINE 5', 'BLENDER']):
            tp = 0.5 + k * 0.5
            if t >= tp:
                q = ease_back(prog(t, tp, 0.2))
                f = PIX(24)
                yy = 780 + int(40 * (1 - q))
                cx = chip(d, cx, yy, lab, f, DARKEST, LIGHT if k != 1 else LIGHTEST, DARKEST, (20, 16), DARKEST) + 24
        return img

    return 120, render, 4


GAMES = {
    'ship': dict(
        label='STAGE 01', title='Ship Brawl', engine='UNREAL ENGINE 5', kind='3D NAVAL COMBAT', team=True,
        items=['Ship movement & controls', 'Enemy combat AI & cannon fire', 'Ship + cannon models in Blender'],
        clips=[
            ('games/ship-brawl/video.mp4', 12.0, '', 1.05, 1.2, 0.5, 0.45),
            ('games/ship-brawl/video.mp4', 23.0, '', 1.2, 1.05, 0.5, 0.5),
            ('games/ship-brawl/video.mp4', 34.0, '', 1.05, 1.25, 0.55, 0.45),
        ]),
    'bd': dict(
        label='STAGE 02', title='Base Defenders', engine='UNITY + C#', kind='2D TOWER DEFENSE', team=False,
        items=['Turret placement system', 'Enemy wave logic', 'UI, menus & balancing'],
        clips=[
            ('games/base-defenders/video.mp4', 104.5, '', 1.0, 1.12, 0.55, 0.5),
            ('games/base-defenders/video.mp4', 111.0, '', 1.8, 2.0, 0.58, 0.36),
            ('games/base-defenders/video.mp4', 132.0, '', 1.9, 1.6, 0.42, 0.32),
        ]),
    'de': dict(
        label='STAGE 03', title='Dungeon Escape', engine='UNITY + C#', kind='2D STEALTH PLATFORMER', team=True,
        items=['Player movement & platforming', 'Stealth gameplay', 'UI, menus & game flow'],
        clips=[
            ('games/dungeon-escape/video.mp4', 29.0, 'eq=gamma=1.45:brightness=0.04:saturation=1.15', 1.3, 1.4, 0.53, 0.6),
            ('games/dungeon-escape/video.mp4', 31.6, 'eq=gamma=1.45:brightness=0.04:saturation=1.15', 1.4, 1.3, 0.62, 0.55),
            ('games/dungeon-escape/video.mp4', 57.0, 'eq=gamma=1.45:brightness=0.04:saturation=1.15', 1.25, 1.4, 0.58, 0.62),
        ]),
}


def scene_game(key, idx):
    g = GAMES[key]
    clips = [(Clip(rel, ss, 2.0, eq=eq), z0, z1, cx, cy) for rel, ss, eq, z0, z1, cx, cy in g['clips']]

    def render(i, t):
        k = min(2, i // 60)
        clip, z0, z1, cx, cy = clips[k]
        lt = (i % 60) / 60
        img = kenburns(clip.next(), lt, z0, z1, cx, cy)
        # darken the lower-left so the panel reads well
        shade = Image.new('RGB', (W, H), DARKEST)
        img = Image.composite(shade, img, GRADIENT)
        lower_third(img, t, g['title'], g['kind'], g['engine'], g['items'], g['team'])
        hud(img, t, '', f"{g['label']}/03", 6.0)
        stage_card(img, t, g['label'], g['title'].upper())
        return img

    return 180, render, 4


def _gradient():
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    a = np.clip((yy / H - 0.45) * 1.6, 0, 1) * np.clip(1.25 - xx / W, 0, 1) * 0.75
    return Image.fromarray((a * 255).astype(np.uint8), 'L')


GRADIENT = None


def scene_models():
    grid = [
        ('LOW-POLY AXE', Clip('models/low-poly-axe/video.mp4', 1.0, 1.6, pre='crop=676:380:302:100', size=(960, 540), speed=1.5)),
        ('LOW-POLY PISTOL', Clip('models/low-poly-pistol/video.mp4', 5.0, 1.6, pre='crop=660:371:330:100', size=(960, 540), speed=1.6)),
        ('LOW-POLY SHIP', Clip('models/low-poly-ship/video.mp4', 1.0, 1.6, pre='crop=790:444:90:110', size=(960, 540), speed=1.5)),
        ('RIGGED CHARACTER', Clip('models/low-poly-character/video.mp4', 2.0, 1.6, pre='crop=551:310:390:92', size=(960, 540), speed=1.2)),
    ]
    big = [
        ('LOW-POLY CHARACTER // Armature + weight painting', 'Rigged, weight-painted and animated in Blender',
         Clip('models/low-poly-character/video.mp4', 6.0, 2.0, pre='crop=551:310:390:92', size=(1280, 720))),
        ('LOW-POLY SHIP // The ship from Ship Brawl', 'Box modeling + booleans, exported to Unreal Engine',
         Clip('models/low-poly-ship/video.mp4', 16.2, 2.0, pre='crop=790:444:90:110', size=(1280, 720))),
    ]

    def render(i, t):
        img = grid_bg(t)
        d = ImageDraw.Draw(img)
        if t < 2.0:
            text(d, (W // 2, 70), '3D MODELS // MADE IN BLENDER', PIX(40), LIGHTEST, DARK, 6, anchor='mm')
            cw, ch = 716, 454
            for k, (name, clip) in enumerate(grid):
                fr = clip.next() if t >= 0.45 + k * 0.25 else None
                if fr is None:
                    continue
                x = (W - (cw * 2 + 40)) // 2 + (k % 2) * (cw + 40)
                y = 125 + (k // 2) * (ch + 26)
                window(img, (x, y, x + cw, y + ch), name, fr, 0.45 + k * 0.25, t)
        else:
            k = 0 if t < 4.0 else 1
            title, sub, clip = big[k]
            lt = t - (2.0 if k == 0 else 4.0)
            fr = kenburns(clip.next(), lt / 2, 1.0, 1.08, out=(1280, 720))
            rect = (90, 150, 90 + 1250, 150 + 52 + 703 + 5)
            window(img, rect, title.split(' // ')[0], fr, 0.0, lt + 0.3)
            # side caption
            x = 1410
            text(d, (x, 330), 'BLENDER', PIX(32), LIGHT)
            for j, line in enumerate(wrap(title.split(' // ')[1], 20)):
                text(d, (x, 400 + j * 52), typed(line, lt, 0.15, 40), MONO(36, True), LIGHTEST)
            for j, line in enumerate(wrap(sub, 26)):
                text(d, (x, 520 + j * 46), typed(line, lt, 0.5 + j * 0.25, 50), MONO(30), LIGHT)
        stage_card(img, t, 'BONUS STAGE', '3D MODELS')
        return img

    return 180, render, 4


def wrap(s, n):
    out, line = [], ''
    for w in s.split():
        if len(line) + len(w) + 1 > n and line:
            out.append(line)
            line = w
        else:
            line = (line + ' ' + w).strip()
    out.append(line)
    return out


def scene_stats():
    portrait = Image.open(os.path.join(MEDIA, 'fawwad-portrait.jpg')).convert('RGB')
    portrait = portrait.resize((360, 480), Image.LANCZOS)
    skills = [
        'Unity + C# gameplay programming',
        'Unreal Engine 5 + Blueprints',
        'Player movement, AI & combat',
        'UI, menus & game flow',
        'Blender: modeling, rigging, weights',
    ]

    def render(i, t):
        img = grid_bg(t)
        d = ImageDraw.Draw(img)
        p = ease_out(prog(t, 0.0, 0.35))
        # character sheet frame
        fx = int(-200 * (1 - p)) + 120
        box(d, (fx, 120, fx + 1680, 960), DARKEST, LIGHT, 6, (0, 0, 0), 14)
        d.rectangle((fx, 120, fx + 1680, 190), fill=LIGHT)
        d.text((fx + 30, 140), 'CHARACTER SHEET // PLAYER 1', font=PIX(32), fill=DARKEST)
        # left column
        img.paste(portrait, (fx + 60, 240))
        d.rectangle((fx + 60, 240, fx + 420, 720), outline=LIGHTEST, width=6)
        text(d, (fx + 60, 760), 'FAWWAD Z. RIZVI', PIX(24), LIGHTEST)
        text(d, (fx + 60, 810), 'CLASS: GAME DEVELOPER', MONO(30, True), LIGHT)
        text(d, (fx + 60, 852), 'GUILD: NED UNIVERSITY', MONO(30, True), LIGHT)
        text(d, (fx + 60, 894), 'BS CS (GAMING & ANIMATION) 2023-27', MONO(24), LIGHT)
        # skills
        x = fx + 520
        text(d, (x, 240), 'SKILLS UNLOCKED', PIX(40), LIGHTEST, DARK, 6)
        for k, s in enumerate(skills):
            ts = 1.0 + k * 0.5
            if t < ts:
                continue
            q = ease_back(prog(t, ts, 0.2))
            yy = 340 + k * 96
            xx = x + int(60 * (1 - q))
            d.rectangle((xx, yy, xx + 1060, yy + 74), fill=mix(DARKEST, DARK, 0.45), outline=DARK, width=3)
            pixel_check(d, xx + 24, yy + 22, 5, LIGHT)
            d.text((xx + 90, yy + 14), s, font=MONO(38, True), fill=LIGHTEST)
        # achievement toast
        if t >= 4.0:
            q = ease_back(prog(t, 4.0, 0.35))
            tw, th = 1060, 170
            tx = W - 90 - tw
            ty = int(H + 20 - (th + 20 + 70) * q)
            box(d, (tx, ty, tx + tw, ty + th), LIGHTEST, DARKEST, 6, DARKEST, 10)
            trophy(d, tx + 36, ty + 48, 9, DARK)
            d.text((tx + 160, ty + 32), 'ACHIEVEMENT UNLOCKED', font=PIX(28), fill=DARKEST)
            d.text((tx + 160, ty + 80), 'Pre-Production, Unreal Certification', font=MONO(34, True), fill=DARKEST)
            d.text((tx + 160, ty + 124), 'CEGA, Center of Excellence in Gaming & Animation', font=MONO(24), fill=DARK)
        return img

    return 180, render, 4


def scene_outro():
    def render(i, t):
        img = Image.new('RGB', (W, H), LIGHTEST)
        d = ImageDraw.Draw(img)
        text(d, (W // 2, 170), typed('READY FOR PLAYER 2?', t, 0.1, 22), PIX(56), DARKEST, LIGHT, 8, anchor='mm')
        if t > 1.0:
            q = ease_out(prog(t, 1.0, 0.3))
            text(d, (W // 2, 330 + int(30 * (1 - q))), 'FAWWAD ZAHEER RIZVI', PIX(64), DARKEST, anchor='mm')
            text(d, (W // 2, 420), 'Game developer  ·  Unity  ·  Unreal Engine 5  ·  Blender', MONO(36, True), DARK, anchor='mm')
        if t > 1.4:
            text(d, (W // 2, 530), typed('syedfawwad100@gmail.com', t, 1.4, 40), MONO(56, True), DARKEST, anchor='mm')
            text(d, (W // 2, 610), typed('github.com/FawwadZaheer', t, 1.6, 40), MONO(40), DARK, anchor='mm')
        if t > 2.0:
            q = ease_back(prog(t, 2.0, 0.3))
            bw, bh = 920, 120
            bx = W // 2 - bw // 2
            by = 720 + int(40 * (1 - q))
            blink = int((t - 2.0) * 3) % 2 == 0 or t > 4.0
            box(d, (bx, by, bx + bw, by + bh), DARKEST, None, 0, DARK, 12)
            d.text((W // 2, by + bh // 2), '> PLAY THE PORTFOLIO' if blink else '  PLAY THE PORTFOLIO',
                   font=PIX(40), fill=LIGHTEST, anchor='mm')
            text(d, (W // 2, by + bh + 60), 'Explore it as a 3D game on my website', MONO(30), DARK, anchor='mm')
        # fade to black over the last second
        f = prog(t, 5.0, 0.95)
        if f > 0:
            img = Image.blend(img, Image.new('RGB', (W, H), (0, 0, 0)), f)
        return img

    return 180, render, 4


SCENES = {
    '01_coldopen': scene_coldopen,
    '02_boot': scene_boot,
    '03_title': scene_title,
    '04_ship': lambda: scene_game('ship', 0),
    '05_bd': lambda: scene_game('bd', 1),
    '06_de': lambda: scene_game('de', 2),
    '07_models': scene_models,
    '08_stats': scene_stats,
    '09_outro': scene_outro,
}


def build(name):
    global GRADIENT
    GRADIENT = _gradient()
    return SCENES[name]()


def render_scene(name, out_dir):
    frames, render, glitch_in = build(name)
    tmp = os.path.join(out_dir, f'{name}.part.mp4')
    final = os.path.join(out_dir, f'{name}.mp4')
    enc = subprocess.Popen(
        ['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS),
         '-i', '-', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p',
         '-r', str(FPS), tmp], stdin=subprocess.PIPE)
    for i in range(frames):
        img = render(i, i / FPS)
        g = max(0.0, 1 - i / glitch_in) if glitch_in else 0.0
        enc.stdin.write(post(img, g, seed=i).tobytes())
    enc.stdin.close()
    if enc.wait() == 0:
        os.replace(tmp, final)
        print('done', name, flush=True)
    else:
        raise SystemExit(f'encode failed: {name}')


def still(name, t, out):
    frames, render, _ = build(name)
    n = int(t * FPS)
    img = None
    for i in range(n + 1):
        img = render(i, i / FPS)
    Image.fromarray(post(img)).save(out)


if __name__ == '__main__':
    out_dir = sys.argv[2]
    os.makedirs(out_dir, exist_ok=True)
    if len(sys.argv) > 3 and sys.argv[3] == '--still':
        still(sys.argv[4], float(sys.argv[5]), os.path.join(out_dir, f'still_{sys.argv[4]}_{sys.argv[5]}.png'))
    else:
        names = sys.argv[3:] or list(SCENES)
        for n in names:
            render_scene(n, out_dir)
