"""Background music, island ambience and sound effects for game mode.

Music and ambience are rendered into a *circular* buffer (anything that runs past the
end wraps to the start), so each file is exactly one seamless loop. The game plays them
with plain <audio loop> elements. Each is written as Ogg Opus (gapless in Chrome, Edge
and Firefox) plus an MP3 fallback for Safari.

Sound effects are short WAV files played with plain <audio> elements too.

Usage: python make_game_audio.py <out_dir>
  -> music-island.ogg/.mp3, ambience-island.ogg/.mp3, sfx/*.wav
"""
import os
import subprocess
import sys
import wave

import numpy as np

SR = 44100
rng = np.random.default_rng(11)


def mf(m):
    return 440.0 * 2 ** ((m - 69) / 12)


class Loop:
    def __init__(self, seconds):
        self.n = int(seconds * SR)
        self.L = np.zeros(self.n, np.float32)
        self.R = np.zeros(self.n, np.float32)

    def add(self, sig, t0, vol=1.0, pan=0.0):
        i = int(t0 * SR) % self.n
        idx = (np.arange(len(sig)) + i) % self.n
        np.add.at(self.L, idx, sig * vol * np.sqrt((1 - pan) / 2) * 1.41)
        np.add.at(self.R, idx, sig * vol * np.sqrt((1 + pan) / 2) * 1.41)

    def write(self, base, kbps=128):
        """base = path without extension; writes base.ogg (Opus) and base.mp3, exactly one loop long."""
        mix = np.stack([self.L, self.R], 1)
        mix /= np.max(np.abs(mix)) / 0.8
        wav = base + '.wav'
        with wave.open(wav, 'wb') as w:
            w.setnchannels(2)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes((mix * 32767).astype('<i2').tobytes())
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wav, '-c:a', 'libopus', '-b:a', f'{kbps}k', base + '.ogg'], check=True)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wav, '-c:a', 'libmp3lame', '-b:a', f'{kbps}k', base + '.mp3'], check=True)
        os.remove(wav)
        print('wrote', base, f'loop {self.n / SR:.2f}s')


# ------------------------------------------------------------------ music
def env_adsr(n, a=0.01, d=0.15, s=0.5, r=0.12):
    e = np.full(n, s, np.float32)
    ai, di, ri = int(a * SR), int(d * SR), int(r * SR)
    e[:ai] = np.linspace(0, 1, ai)
    e[ai:ai + di] = np.linspace(1, s, len(e[ai:ai + di]))
    if n > ri:
        e[-ri:] *= np.linspace(1, 0, ri)
    return e


def pulse(f, n, duty=0.5, vib=0.0):
    t = np.arange(n) / SR
    ph = f * t
    if vib:
        ph = ph + vib * np.sin(2 * np.pi * 5 * t) * np.clip((t - 0.15) * 4, 0, 1)
    return np.where(ph % 1 < duty, 1.0, -1.0).astype(np.float32)


def tri(f, n):
    p = (f * np.arange(n) / SR) % 1
    return (4 * np.abs(p - 0.5) - 1).astype(np.float32)


def soft(sig, cutoff=2400):
    # one-pole low-pass to take the edge off square waves
    a = np.exp(-2 * np.pi * cutoff / SR)
    out = np.empty_like(sig)
    y = 0.0
    for i in range(0, len(sig), 1):
        y = (1 - a) * sig[i] + a * y
        out[i] = y
    return out


def music():
    BPM = 96
    beat = 60 / BPM
    bar = beat * 4
    bars = 16
    lp = Loop(bar * bars)
    # calm, hopeful progression (C major / A minor)
    prog = ['C', 'Am', 'F', 'G', 'C', 'Am', 'F', 'G', 'Am', 'F', 'C', 'G', 'Am', 'F', 'Dm', 'G']
    chords = {
        'C': (48, [60, 64, 67]), 'Am': (45, [57, 60, 64]), 'F': (41, [57, 60, 65]),
        'G': (43, [59, 62, 67]), 'Dm': (50, [57, 62, 65]),
    }
    # lead melody (8th notes per bar, None = rest, '-' = hold)
    mel = [
        [76, '-', 79, '-', 76, 74, 72, '-'], [72, '-', 71, 72, 74, '-', None, None],
        [72, '-', 69, '-', 72, 74, 76, '-'], [74, '-', '-', '-', None, None, 71, 72],
        [76, '-', 79, '-', 81, 79, 76, '-'], [76, '-', 74, 72, 74, '-', None, None],
        [72, 74, 76, '-', 77, 76, 74, '-'], [74, '-', '-', '-', None, None, None, None],
        [None, None, 76, 77, 79, '-', 76, '-'], [77, '-', 76, 74, 72, '-', None, None],
        [None, None, 72, 74, 76, '-', 79, '-'], [79, '-', 77, 76, 74, '-', None, None],
        [76, '-', 72, '-', 74, 76, 72, '-'], [69, '-', 72, '-', 77, '-', 76, 74],
        [74, '-', 77, '-', 76, 74, 72, '-'], [71, '-', '-', '-', 74, '-', 79, '-'],
    ]
    e8 = beat / 2
    for b, ch in enumerate(prog):
        t0 = b * bar
        root, tones = chords[ch]
        # bass: root on 1, fifth on 3 (triangle)
        for k, (m, d) in enumerate([(root, 2 * beat), (root + 7, beat), (root + 12, beat)]):
            n = int(d * 0.95 * SR)
            lp.add(tri(mf(m), n) * env_adsr(n, 0.005, 0.1, 0.8, 0.08), t0 + [0, 2, 3][k] * beat, 0.32)
        # arpeggio, 8ths, quiet 12.5% pulse
        seq = tones + [tones[0] + 12] + tones[::-1][:-1]
        for k in range(8):
            n = int(e8 * 0.8 * SR)
            s = soft(pulse(mf(seq[k % len(seq)] + 12), n, 0.125), 3000)
            lp.add(s * env_adsr(n, 0.003, 0.06, 0.4, 0.04), t0 + k * e8, 0.05, pan=0.3)
        # pad: soft sustained chord (very quiet, wide)
        n = int(bar * SR)
        pad = sum(tri(mf(m), n) for m in tones) / 3
        lp.add(pad * env_adsr(n, 0.4, 0.3, 0.7, 0.5), t0, 0.07, pan=-0.2)
        # lead
        row = mel[b]
        k = 0
        while k < 8:
            m = row[k]
            if m is None or m == '-':
                k += 1
                continue
            j = k + 1
            while j < 8 and row[j] == '-':
                j += 1
            n = int((j - k) * e8 * 0.95 * SR)
            s = soft(pulse(mf(m), n, 0.5, vib=0.08 * mf(m) / 100), 2200)
            lp.add(s * env_adsr(n, 0.01, 0.2, 0.55, 0.1), t0 + k * e8, 0.075, pan=-0.15)
            k = j
        # gentle percussion: soft "tick" hats on off-beats, a muted kick on 1
        for k in range(4):
            n = int(0.03 * SR)
            hat = np.diff(rng.uniform(-1, 1, n + 1)).astype(np.float32) * np.exp(-np.arange(n) / SR * 120)
            lp.add(hat, t0 + k * beat + beat / 2, 0.05, pan=0.2)
        n = int(0.18 * SR)
        t = np.arange(n) / SR
        kick = np.sin(2 * np.pi * np.cumsum(110 * np.exp(-t * 25) + 45) / SR) * np.exp(-t * 18)
        lp.add(kick.astype(np.float32), t0, 0.22)
    # stereo echo (circular, so it wraps too)
    d = int(beat * 0.75 * SR)
    L, R = lp.L.copy(), lp.R.copy()
    lp.L += np.roll(R, d) * 0.22
    lp.R += np.roll(L, d) * 0.22
    return lp


# ------------------------------------------------------------------ ambience
def shaped_noise(n, lo, hi, tilt=-1.0):
    """Circular band-limited noise via FFT (seamless by construction)."""
    spec = np.fft.rfft(rng.normal(size=n))
    f = np.fft.rfftfreq(n, 1 / SR)
    band = ((f > lo) & (f < hi)).astype(float)
    band *= np.clip(f, 1, None) ** (tilt / 2)
    x = np.fft.irfft(spec * band, n)
    return (x / np.max(np.abs(x))).astype(np.float32)


def ambience():
    secs = 24.0
    lp = Loop(secs)
    n = lp.n
    t = np.arange(n) / SR
    # ocean: low/mid noise with slow periodic swells (periods divide 24 s exactly)
    for ch, ph in ((0, 0.0), (1, 1.3)):
        surf = shaped_noise(n, 80, 2500, tilt=-1.2)
        swell = 0.55 + 0.25 * np.sin(2 * np.pi * t / 8 + ph) + 0.15 * np.sin(2 * np.pi * t / 6 + 2 * ph) + 0.05 * np.sin(2 * np.pi * t / 4.8)
        hiss = shaped_noise(n, 2500, 9000, tilt=-0.5) * np.clip(np.sin(2 * np.pi * t / 8 + ph - 0.6), 0, 1) ** 2
        sig = surf * swell * 0.7 + hiss * 0.12
        if ch == 0:
            lp.L += sig
        else:
            lp.R += sig
    # wind: very low, slowly breathing
    wind = shaped_noise(n, 150, 900, tilt=-2)
    wind_env = 0.5 + 0.5 * np.sin(2 * np.pi * t / 12)
    lp.L += wind * wind_env * 0.25
    lp.R += np.roll(wind, SR // 3) * wind_env * 0.25
    # birds: a few short chirps at fixed times, panned around
    def chirp(f0, f1, dur):
        k = int(dur * SR)
        tt = np.arange(k) / SR
        f = f0 + (f1 - f0) * (tt / dur)
        s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / dur) ** 2
        return s.astype(np.float32)

    for t0, pan in ((2.1, -0.6), (2.35, -0.6), (7.8, 0.5), (8.0, 0.5), (8.2, 0.5), (13.4, -0.2), (17.9, 0.7), (18.1, 0.7), (21.6, -0.7)):
        f0 = 2800 + rng.uniform(-400, 600)
        lp.add(chirp(f0, f0 + rng.uniform(800, 1600), rng.uniform(0.07, 0.13)), t0, 0.05, pan)
    return lp


# ------------------------------------------------------------------ sound effects
def sfx_file(path, notes):
    """notes: (freq, start, dur, vol, slide, wave) — the same chip tones the game used to synthesise live."""
    total = max(st + d for _, st, d, _, _, _ in notes) + 0.05
    out = np.zeros(int(total * SR), np.float32)
    for f, st, d, vol, slide, kind in notes:
        n = int(d * SR)
        t = np.arange(n) / SR
        freq = f * (np.maximum(40, f + slide) / f) ** (t / d) if slide else np.full(n, f)
        ph = np.cumsum(freq) / SR
        osc = np.where(ph % 1 < 0.5, 1.0, -1.0) if kind == 'sq' else 4 * np.abs(ph % 1 - 0.5) - 1
        env = vol * np.exp(np.log(0.0001 / vol) * t / d)
        i = int(st * SR)
        out[i:i + n] += (osc * env).astype(np.float32)
    out = np.tanh(out * 1.2) * 0.9
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((out * 32767).astype('<i2').tobytes())


SFX = {
    'blip': [(880, 0, 0.05, 0.3, 0, 'sq')],
    'jump': [(300, 0, 0.14, 0.35, 500, 'sq')],
    'coin': [(988, 0, 0.07, 0.4, 0, 'sq'), (1319, 0.07, 0.18, 0.4, 0, 'sq')],
    'open': [(523, 0, 0.06, 0.35, 0, 'sq'), (784, 0.06, 0.1, 0.35, 0, 'sq')],
    'close': [(392, 0, 0.08, 0.3, -150, 'sq')],
    'warp': [(200, 0, 0.3, 0.5, 900, 'tri')],
    'start': [(f, i * 0.09, 0.12, 0.4, 0, 'sq') for i, f in enumerate([523, 659, 784, 1047])],
    'fanfare': [(f, i * 0.11, 0.14, 0.45, 0, 'sq') for i, f in enumerate([784, 988, 1175, 1568, 1175, 1568])],
}

if __name__ == '__main__':
    out = sys.argv[1]
    os.makedirs(os.path.join(out, 'sfx'), exist_ok=True)
    music().write(os.path.join(out, 'music-island'), 112)
    ambience().write(os.path.join(out, 'ambience-island'), 80)
    for name, notes in SFX.items():
        sfx_file(os.path.join(out, 'sfx', f'{name}.wav'), notes)
    print('wrote sfx:', ', '.join(SFX))
