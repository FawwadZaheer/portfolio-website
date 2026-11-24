"""Chiptune soundtrack for the promo reel: 120 BPM (1 beat = 0.5 s, 1 bar = 2 s), 44 s, A minor.
Section map (seconds) matches the video timeline in make_promo.py.
Usage: python make_music.py out.wav
"""
import sys
import wave
import numpy as np

SR = 44100
BPM = 120
BEAT = 60 / BPM
BAR = BEAT * 4
LENGTH = 44.0
N = int(SR * (LENGTH + 0.2))

rng = np.random.default_rng(7)
L = np.zeros(N)
R = np.zeros(N)


def mf(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def env(n, a=0.004, d=0.08, s=0.6, r=0.05, length=None):
    length = n if length is None else length
    t = np.arange(n) / SR
    e = np.ones(n) * s
    ai = int(a * SR)
    di = int(d * SR)
    if ai:
        e[:ai] = np.linspace(0, 1, ai)
    if di:
        e[ai:ai + di] = np.linspace(1, s, min(di, max(0, n - ai)))[: max(0, min(di, n - ai))]
    ri = int(r * SR)
    if ri and n > ri:
        e[-ri:] *= np.linspace(1, 0, ri)
    return e


def square(f, n, duty=0.5, vib=0.0):
    t = np.arange(n) / SR
    ph = f * t + (vib * np.sin(2 * np.pi * 5.5 * t) * (t > 0.12) * f * 0.004 / 5.5 if vib else 0)
    return np.where((ph % 1.0) < duty, 1.0, -1.0)


def tri(f, n):
    t = np.arange(n) / SR
    p = (f * t) % 1.0
    return 4 * np.abs(p - 0.5) - 1


def add(sig, t0, vol=1.0, pan=0.0):
    i = int(t0 * SR)
    if i < 0:
        sig = sig[-i:]
        i = 0
    if i >= N:
        return
    sig = sig[: N - i]
    gl = vol * np.sqrt((1 - pan) / 2) * 1.41
    gr = vol * np.sqrt((1 + pan) / 2) * 1.41
    L[i:i + len(sig)] += sig * gl
    R[i:i + len(sig)] += sig * gr


def note(m, t0, dur, vol, kind='sq', duty=0.5, pan=0.0, vib=False, rel=0.04):
    n = int(dur * SR)
    if kind == 'sq':
        s = square(mf(m), n, duty, vib)
        e = env(n, d=0.12, s=0.55, r=rel)
    else:
        s = tri(mf(m), n)
        e = env(n, a=0.002, d=0.05, s=0.85, r=rel)
    add(s * e, t0, vol, pan)


# ---------------- drums ----------------
def kick(t0, vol=0.9):
    n = int(0.22 * SR)
    t = np.arange(n) / SR
    f = 150 * np.exp(-t * 28) + 42
    ph = 2 * np.pi * np.cumsum(f) / SR
    add(np.sin(ph) * np.exp(-t * 14), t0, vol)


def snare(t0, vol=0.45):
    n = int(0.18 * SR)
    t = np.arange(n) / SR
    noise = rng.uniform(-1, 1, n)
    body = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30)
    add((noise * np.exp(-t * 18) * 0.8 + body * 0.5), t0, vol)


def hat(t0, vol=0.12, open_=False):
    n = int((0.12 if open_ else 0.04) * SR)
    t = np.arange(n) / SR
    noise = rng.uniform(-1, 1, n)
    noise = np.diff(noise, prepend=0)  # crude high-pass
    add(noise * np.exp(-t * (25 if open_ else 90)), t0, vol, pan=0.25)


def crash(t0, vol=0.25):
    n = int(1.4 * SR)
    t = np.arange(n) / SR
    noise = np.diff(rng.uniform(-1, 1, n), prepend=0)
    add(noise * np.exp(-t * 3.2), t0, vol)


def riser(t0, dur, vol=0.2):
    n = int(dur * SR)
    t = np.arange(n) / SR
    noise = rng.uniform(-1, 1, n)
    sweep = square(1, n)  # placeholder shape
    f = 200 + 1800 * (t / dur) ** 2
    tone = np.where((np.cumsum(f) / SR) % 1 < 0.5, 1, -1) * 0.25
    add((noise * 0.6 + tone) * (t / dur) ** 2, t0, vol)


def whoosh(t0, vol=0.18):
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    noise = rng.uniform(-1, 1, n)
    e = np.sin(np.pi * t / 0.35) ** 2
    add(noise * e, t0 - 0.2, vol)


def blip(t0, m=84, vol=0.08):
    note(m, t0, 0.06, vol, duty=0.25)


def coin(t0, vol=0.12):
    note(83, t0, 0.08, vol, duty=0.5)
    note(88, t0 + 0.08, 0.3, vol, duty=0.5, rel=0.2)


def boot_ding(t0, vol=0.22):
    # the classic handheld boot "pling": two quick high notes
    note(84, t0, 0.09, vol, duty=0.5)
    note(96, t0 + 0.09, 0.9, vol, duty=0.5, rel=0.7)


# ---------------- harmony ----------------
CHORDS = {  # root midi (bass octave), chord tones (midi, mid octave)
    'Am': (45, [69, 72, 76]),
    'F': (41, [65, 69, 72]),
    'C': (48, [67, 72, 76]),
    'G': (43, [67, 71, 74]),
    'Dm': (50, [69, 74, 77]),
    'E': (40, [68, 71, 76]),
}
PROG = ['Am', 'F', 'C', 'G']

# lead motif per chord, 8 eighth notes (None = rest)
MOTIF = {
    'Am': [69, None, 72, 76, 74, 72, 69, None],
    'F': [72, None, 69, 72, 77, 76, 72, None],
    'C': [76, None, 79, 76, 74, 72, 74, None],
    'G': [74, None, 71, 74, 79, 77, 76, 74],
}
MOTIF_HI = {k: [m + 12 if m else None for m in v] for k, v in MOTIF.items()}


def bar_bass(t0, chord, pattern='drive', vol=0.42):
    root = CHORDS[chord][0]
    if pattern == 'drive':
        for i in range(8):
            m = root + (12 if i % 2 else 0)
            note(m, t0 + i * BEAT / 2, BEAT / 2 * 0.9, vol, kind='tri')
    elif pattern == 'half':
        note(root, t0, BEAT * 1.9, vol, kind='tri')
        note(root + 7, t0 + BEAT * 2, BEAT * 0.9, vol, kind='tri')
        note(root + 12, t0 + BEAT * 3, BEAT * 0.9, vol, kind='tri')
    elif pattern == 'whole':
        note(root, t0, BAR * 0.98, vol, kind='tri', rel=0.3)


def bar_arp(t0, chord, vol=0.07, rate=16, pan=0.35):
    tones = CHORDS[chord][1] + [CHORDS[chord][1][0] + 12]
    seq = tones + tones[-2:0:-1]
    step = BAR / rate
    for i in range(rate):
        note(seq[i % len(seq)] + 12, t0 + i * step, step * 0.85, vol, duty=0.125, pan=pan)


def bar_lead(t0, chord, vol=0.13, hi=False, pan=-0.25):
    mot = (MOTIF_HI if hi else MOTIF)[chord]
    i = 0
    while i < 8:
        m = mot[i]
        if m is None:
            i += 1
            continue
        j = i + 1
        while j < 8 and mot[j] is None:
            j += 1
        note(m, t0 + i * BEAT / 2, (j - i) * BEAT / 2 * 0.92, vol, duty=0.5, pan=pan, vib=True)
        i = j


def bar_drums(t0, style='full', fill=False):
    if style == 'full':
        for b in range(4):
            if b in (0, 2):
                kick(t0 + b * BEAT)
            if b in (1, 3):
                snare(t0 + b * BEAT)
        kick(t0 + 3.5 * BEAT, 0.6)
        for i in range(8):
            hat(t0 + i * BEAT / 2, 0.10 if i % 2 else 0.14)
    elif style == 'half':
        kick(t0)
        snare(t0 + 2 * BEAT)
        for i in range(4):
            hat(t0 + i * BEAT, 0.1)
    elif style == 'four':
        for b in range(4):
            kick(t0 + b * BEAT)
            hat(t0 + b * BEAT + BEAT / 2, 0.14, open_=True)
        snare(t0 + BEAT, 0.3)
        snare(t0 + 3 * BEAT, 0.3)
    if fill:
        for k in range(4):
            snare(t0 + 3 * BEAT + k * BEAT / 4, 0.25 + 0.08 * k)


# ================= arrangement =================
# 0-2  cold open: hits on every beat (= each montage cut), riser into boot
for b in range(4):
    kick(b * BEAT, 1.0)
    note(CHORDS['Am'][0] if b < 3 else CHORDS['E'][0], b * BEAT, BEAT * 0.8, 0.45, kind='tri')
    note(81 if b < 3 else 80, b * BEAT, 0.12, 0.10, duty=0.25)
    whoosh(b * BEAT + 0.02, 0.12)
riser(1.0, 1.0, 0.18)

# 2-4  boot screen: silence, boot ding at 3.0 ("FZR" logo lands)
boot_ding(3.0)
note(57, 3.0, 1.0, 0.25, kind='tri', rel=0.5)

# 4-8  title: groove starts (half-time drums, arps)
crash(4.0, 0.2)
for k, ch in enumerate(['Am', 'F']):
    t0 = 4.0 + k * BAR
    bar_bass(t0, ch, 'half')
    bar_arp(t0, ch, 0.06)
    bar_drums(t0, 'half', fill=(k == 1))

# 8-26  three stages, 3 bars each = 9 bars, full groove
stage_prog = ['Am', 'F', 'C', 'G', 'Am', 'F', 'C', 'G', 'Am']
for k, ch in enumerate(stage_prog):
    t0 = 8.0 + k * BAR
    bar_bass(t0, ch, 'drive')
    bar_arp(t0, ch, 0.05)
    bar_lead(t0, ch, 0.12, hi=(k >= 4))
    last_of_stage = k in (2, 5, 8)
    bar_drums(t0, 'full', fill=last_of_stage)
for t0 in (8.0, 14.0, 20.0):
    crash(t0)

# 26-32  bonus stage (3D models): lighter, four-on-the-floor, new chords
crash(26.0, 0.22)
for k, ch in enumerate(['Dm', 'F', 'E']):
    t0 = 26.0 + k * BAR
    bar_bass(t0, ch, 'half', 0.4)
    bar_arp(t0, ch, 0.07, rate=16, pan=-0.3)
    bar_arp(t0 + BEAT / 4, ch, 0.04, rate=16, pan=0.4)  # echo
    bar_drums(t0, 'four', fill=(k == 2))

# 32-38  stats screen: groove back with high lead
crash(32.0, 0.22)
for k, ch in enumerate(['Am', 'F', 'G']):
    t0 = 32.0 + k * BAR
    bar_bass(t0, ch, 'drive', 0.38)
    bar_arp(t0, ch, 0.05)
    bar_lead(t0, ch, 0.10, hi=True)
    bar_drums(t0, 'full', fill=(k == 2))

# 38-44  outro: last phrase, big final chord at 42, ring out
crash(38.0, 0.25)
for k, ch in enumerate(['F', 'G']):
    t0 = 38.0 + k * BAR
    bar_bass(t0, ch, 'drive', 0.38)
    bar_arp(t0, ch, 0.05)
    bar_lead(t0, ch, 0.11, hi=(k == 1))
    bar_drums(t0, 'full', fill=(k == 1))
kick(42.0, 1.0)
crash(42.0, 0.3)
for m in (57, 69, 72, 76, 81):
    note(m, 42.0, 1.9, 0.10 if m > 60 else 0.4, kind='sq' if m > 60 else 'tri', duty=0.25, rel=1.4)

# ---------------- sound effects synced to the picture ----------------
SFX = [
    *[(t, 'blip') for t in (4.5, 5.0, 5.5)],         # title chips pop
    *[(t, 'whoosh') for t in (8.0, 14.0, 20.0, 26.0, 32.0, 38.0)],
    *[(t + 0.5, 'blip') for t in (8.0, 14.0, 20.0)],  # stage card
    *[(t, 'blip') for t in (33.0, 33.5, 34.0, 34.5, 35.0)],  # skills list
    (36.0, 'coin'),                                    # achievement unlocked
    (40.0, 'coin'),
]
for t, kind in SFX:
    {'blip': blip, 'whoosh': whoosh, 'coin': coin}[kind](t)

# ---------------- master ----------------
# simple stereo echo on everything for space
d = int(BEAT * 0.75 * SR)
L2 = L.copy()
R2 = R.copy()
L2[d:] += R[:-d] * 0.18
R2[d:] += L[:-d] * 0.18
mix = np.stack([L2, R2], axis=1)
mix = np.tanh(mix * 0.9)  # soft limiter
# fade the last 0.6 s
fade = int(0.6 * SR)
end = int(LENGTH * SR)
mix = mix[:end]
mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
mix /= np.max(np.abs(mix)) / 0.89
pcm = (mix * 32767).astype('<i2')

with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print('wrote', sys.argv[1], f'{len(pcm) / SR:.2f}s')
