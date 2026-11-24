"""Mix the gameplay sound of every clip in the promo under the chiptune soundtrack.

The clip list mirrors make_promo.py (promo time -> source video + source time), so each
sound lines up with its picture. Music is ducked while gameplay is on screen.

Usage: python mix_promo_audio.py <project_root> soundtrack.wav out.wav
"""
import os
import subprocess
import sys
import wave

import numpy as np

SR = 44100
ROOT, MUSIC, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
G = os.path.join(ROOT, 'public', 'media', 'games')

# (promo_start, duration, source video, source_start, gain)
CLIPS = [
    # cold open: 0.5 s per cut
    (0.0, 0.5, 'ship-brawl', 34.4, 0.9),
    (0.5, 0.5, 'dungeon-escape', 29.5, 0.9),
    (1.0, 0.5, 'base-defenders', 132.0, 0.9),
    # Stage 01: Ship Brawl
    (8.0, 2.0, 'ship-brawl', 12.0, 1.0),
    (10.0, 2.0, 'ship-brawl', 23.0, 1.0),
    (12.0, 2.0, 'ship-brawl', 34.0, 1.0),
    # Stage 02: Base Defenders
    (14.0, 2.0, 'base-defenders', 104.5, 1.0),
    (16.0, 2.0, 'base-defenders', 111.0, 1.0),
    (18.0, 2.0, 'base-defenders', 132.0, 1.0),
    # Stage 03: Dungeon Escape
    (20.0, 2.0, 'dungeon-escape', 29.0, 1.0),
    (22.0, 2.0, 'dungeon-escape', 31.6, 1.0),
    (24.0, 2.0, 'dungeon-escape', 57.0, 1.0),
]
DUCK = [(0.0, 1.5, 0.75), (8.0, 26.0, 0.62)]  # (from, to, music gain) while gameplay plays


def read_wav(path):
    with wave.open(path) as w:
        assert w.getframerate() == SR and w.getnchannels() == 2
        a = np.frombuffer(w.readframes(w.getnframes()), '<i2').reshape(-1, 2)
    return a.astype(np.float32) / 32768


def decode(video, start, dur):
    cmd = ['ffmpeg', '-v', 'error', '-ss', f'{start:.3f}', '-t', f'{dur:.3f}', '-i', os.path.join(G, video, 'video.mp4'),
           '-vn', '-ac', '2', '-ar', str(SR), '-f', 's16le', '-']
    raw = subprocess.run(cmd, check=True, capture_output=True).stdout
    return np.frombuffer(raw, '<i2').reshape(-1, 2).astype(np.float32) / 32768


music = read_wav(MUSIC)
n = len(music)
game = np.zeros_like(music)

for t0, dur, vid, ss, gain in CLIPS:
    seg = decode(vid, ss, dur)
    # short fades so hard cuts don't click
    f = min(len(seg) // 4, int(0.02 * SR))
    env = np.ones(len(seg), np.float32)
    env[:f] = np.linspace(0, 1, f)
    env[-f:] = np.linspace(1, 0, f)
    seg = seg * env[:, None] * gain
    i = int(t0 * SR)
    game[i:i + len(seg)] += seg[: n - i]

# smooth music ducking curve
g = np.ones(n, np.float32)
for a, b, lvl in DUCK:
    g[int(a * SR):int(b * SR)] = lvl
k = int(0.12 * SR)
g = np.convolve(g, np.ones(k) / k, mode='same').astype(np.float32)

# game audio sits a little under the music
game *= 1.5
mix = music * g[:, None] + game
mix = np.tanh(mix * 1.05)
mix /= max(1.0, np.max(np.abs(mix)) / 0.89)

with wave.open(OUT, 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype('<i2').tobytes())
print('wrote', OUT)
