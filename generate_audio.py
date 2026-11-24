import wave
import struct
import math
import random

sample_rate = 44100
duration_sec = 46.0
num_samples = int(sample_rate * duration_sec)

bpm = 128.0
beat_dur = 60.0 / bpm
sixteenth_dur = beat_dur / 4.0

# Chord progression (Cm -> Ab -> Bb -> Gm)
chords = [
    [261.63, 311.13, 392.00, 523.25],  # C4, Eb4, G4, C5
    [207.65, 261.63, 311.13, 415.30],  # Ab3, C4, Eb4, Ab4
    [233.08, 293.66, 349.23, 466.16],  # Bb3, D4, F4, Bb4
    [196.00, 246.94, 293.66, 392.00],  # G3, B3, D4, G4
]

bass_notes = [130.81, 103.83, 116.54, 98.00] # C3, Ab2, Bb2, G2

def square_wave(phase, duty=0.5):
    p = phase % (2.0 * math.pi)
    return 1.0 if p < (2.0 * math.pi * duty) else -1.0

def triangle_wave(phase):
    p = (phase / (2.0 * math.pi)) % 1.0
    return 4.0 * abs(p - 0.5) - 1.0

samples_left = []
samples_right = []

for i in range(num_samples):
    t = float(i) / sample_rate
    
    # Measure & chord index
    bar_index = int(t / (4.0 * beat_dur)) % len(chords)
    chord = chords[bar_index]
    bass_freq = bass_notes[bar_index]
    
    # Arpeggio note (16th note arpeggio)
    arp_step = int(t / sixteenth_dur) % len(chord)
    arp_freq = chord[arp_step]
    
    # Arp envelope (decay on each 16th note)
    t_in_step = (t % sixteenth_dur) / sixteenth_dur
    arp_env = math.exp(-3.0 * t_in_step)
    
    # Main lead arpeggio (square wave)
    arp_val = square_wave(2.0 * math.pi * arp_freq * t, 0.25) * arp_env * 0.18
    
    # Bassline (pumping 8th note bass, triangle wave)
    eighth_step = int(t / (beat_dur / 2.0))
    t_in_eighth = (t % (beat_dur / 2.0)) / (beat_dur / 2.0)
    bass_env = math.exp(-2.0 * t_in_eighth)
    bass_val = triangle_wave(2.0 * math.pi * bass_freq * t) * bass_env * 0.25
    
    # Subtle percussion (noise burst on beats 2 and 4 for snare, 8th note noise ticks for hi-hat)
    beat_step = int(t / beat_dur) % 4
    t_in_beat = (t % beat_dur) / beat_dur
    drum_val = 0.0
    if beat_step in [1, 3] and t_in_beat < 0.12:
        snare_env = math.exp(-20.0 * t_in_beat)
        drum_val += (random.random() * 2.0 - 1.0) * snare_env * 0.15
    elif (t % (beat_dur / 2.0)) < 0.04:
        hihat_env = math.exp(-40.0 * (t % (beat_dur / 2.0)))
        drum_val += (random.random() * 2.0 - 1.0) * hihat_env * 0.06

    # Master fade out in last 2 seconds
    fade = 1.0
    if t > (duration_sec - 2.5):
        fade = max(0.0, (duration_sec - t) / 2.5)

    mixed = (arp_val + bass_val + drum_val) * fade
    # Clamp
    mixed = max(-0.95, min(0.95, mixed))
    
    samples_left.append(mixed)
    samples_right.append(mixed)

out_wav = r"C:\Web3D_SemProject\public\video\soundtrack.wav"
with wave.open(out_wav, 'wb') as wf:
    wf.setnchannels(2)
    wf.setsampwidth(2)
    wf.setframerate(sample_rate)
    packed_frames = bytearray()
    for l, r in zip(samples_left, samples_right):
        val_l = int(l * 32767.0)
        val_r = int(r * 32767.0)
        packed_frames.extend(struct.pack('<hh', val_l, val_r))
    wf.writeframes(packed_frames)

print(f"Generated soundtrack: {out_wav} ({duration_sec}s)")
