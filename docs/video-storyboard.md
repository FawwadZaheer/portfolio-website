# Promotional Video Storyboard (v2)

- **Project**: Interactive 3D Web Portfolio, Fawwad Zaheer Rizvi
- **File**: `public/video/promo.mp4` (soundtrack: `public/video/soundtrack.wav`)
- **Duration**: 44 s · 1920x1080 · 30 fps · H.264 + AAC 192 kbps
- **Source**: After Effects project `tools/promo/ae/Fawwad_Promo.aep` (built by `tools/promo/ae/build_promo_ae.jsx`; see its README). The same edit is also rendered from code by `tools/promo/make_promo.py` (picture) and `tools/promo/make_music.py` (music).

## Direction

- **Concept**: The reel plays like booting a handheld console. It moves through a cold open, a boot screen, a "new challenger" title, three game *stages*, a *bonus stage* for the 3D models, a *character sheet*, and a "Ready for Player 2?" contact screen.
- **Palette**: the site's Game Boy colours `#e0f8d0` / `#88c070` / `#346856` / `#081820`, plus scanlines and a vignette on every frame.
- **Type**: *Press Start 2P* for headings and *IBM Plex Mono* for body text. Both are sized for 1080p and readable on a phone.
- **Sound**: each gameplay clip keeps its own game audio (cannons, footsteps, UI), mixed under the music with the music ducked during the stages (`tools/promo/mix_promo_audio.py`).
- **Music**: original 120 BPM chiptune in A minor (square lead, triangle bass, noise drums). One bar lasts 2 s, so every scene change and every cut lands on a downbeat. Blips, whooshes and coin sounds are timed to the on-screen pops.
- **Footage rules**: gameplay only, with no menus, settings screens or credits. Blender clips are cropped to the 3D viewport, removing the UI panels and the Windows taskbar. Dungeon Escape is brightened for legibility.

## Shot list

| Time | Scene | Picture | Text on screen | Audio |
|---|---|---|---|---|
| 0:00–0:02 | Cold open | 4 hard cuts, one per beat (Ship Brawl, Dungeon Escape, Base Defenders, ship model), recoloured to the 4-colour palette with dithering, white flash on each cut | CODE · PLAY · DESIGN · MODEL | Bass hit + whoosh per cut, riser |
| 0:02–0:04 | Boot | "FZR" logo scrolls down a light screen, like a console boot | PORTFOLIO // 2026 · PRESS START (blinking) | Boot "pling" when the logo lands |
| 0:04–0:08 | Title | Portrait card slides in over a scrolling pixel grid | > NEW CHALLENGER · FAWWAD ZAHEER RIZVI (typed) · Game developer // 3D artist · BS CS (Gaming & Animation), NED University · chips: UNITY + C#, UNREAL ENGINE 5, BLENDER | Half-time groove; a blip per chip |
| 0:08–0:14 | Stage 01: Ship Brawl | "STAGE 01" card, then 3 × 2 s gameplay shots with slow push-ins | Lower third: UNREAL ENGINE 5 · 3D NAVAL COMBAT · TEAM PROJECT; ✓ Ship movement & controls ✓ Enemy combat AI & cannon fire ✓ Ship + cannon models in Blender | Full groove, crash on the card |
| 0:14–0:20 | Stage 02: Base Defenders | Card, then wide shot → zoom on turret fights in waves 3 and 4 | UNITY + C# · 2D TOWER DEFENSE; ✓ Turret placement system ✓ Enemy wave logic ✓ UI, menus & balancing | Groove continues |
| 0:20–0:26 | Stage 03: Dungeon Escape | Card, then stealth radius, ladder climb, dungeon exit | UNITY + C# · 2D STEALTH PLATFORMER · TEAM PROJECT; ✓ Player movement & platforming ✓ Stealth gameplay ✓ UI, menus & game flow | Groove with drum fill |
| 0:26–0:32 | Bonus stage: 3D models | Card, then a 2×2 grid of retro windows (axe, pistol, ship, rigged character), then full windows for the character rig and the ship | 3D MODELS // MADE IN BLENDER · captions per model | Four-on-the-floor variation |
| 0:32–0:38 | Character sheet | Portrait, class/guild info; skills unlock one per beat; achievement toast | SKILLS UNLOCKED (5 items) · ACHIEVEMENTS UNLOCKED: Pre-Production Certification and Unreal Engine Certification (CEGA) | Blip per skill, coin on the achievement |
| 0:38–0:44 | Outro | Light "Game Boy screen" contact card | READY FOR PLAYER 2? · name · email · GitHub · > PLAY THE PORTFOLIO | Final phrase, last chord at 0:42, fade to black |

## Rebuilding

```bash
cd tools/promo
python make_music.py soundtrack.wav
python make_promo.py ../.. scenes            # renders scenes/01_coldopen.mp4 … 09_outro.mp4
# join + add sound
(for f in scenes/0*.mp4; do echo "file '$PWD/$f'"; done) > list.txt
ffmpeg -f concat -safe 0 -i list.txt -c copy video_only.mp4
python mix_promo_audio.py ../.. soundtrack.wav promo_mix.wav   # gameplay sound under the music
ffmpeg -i video_only.mp4 -i promo_mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart ../../public/video/promo.mp4
```

Needs Python 3 with Pillow and NumPy, plus ffmpeg on PATH. To check one moment as a PNG: `python make_promo.py ../.. stills --still 04_ship 4.5`.
