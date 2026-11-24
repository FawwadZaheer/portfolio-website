import bpy
import os

print("--- STARTING PROMO VIDEO ASSEMBLY ---")
bpy.ops.wm.read_factory_settings(use_empty=True)

scene = bpy.context.scene
se = scene.sequence_editor_create()

# Render & Video output settings
scene.render.resolution_x = 1920
scene.render.resolution_y = 1080
scene.render.resolution_percentage = 100
scene.render.fps = 30
scene.frame_start = 1
total_frames = 1100
scene.frame_end = total_frames

scene.render.image_settings.file_format = 'FFMPEG'
scene.render.ffmpeg.format = 'MPEG4'
scene.render.ffmpeg.codec = 'H264'
scene.render.ffmpeg.audio_codec = 'AAC'
scene.render.ffmpeg.constant_rate_factor = 'MEDIUM'
scene.render.ffmpeg.ffmpeg_preset = 'VERYFAST'
scene.render.filepath = r"C:\Web3D_SemProject\public\video\promo.mp4"

# Media Paths
base_dir = r"C:\Web3D_SemProject"
portrait_path = os.path.join(base_dir, "public", "media", "fawwad-portrait.jpg")
ship_brawl_video = os.path.join(base_dir, "public", "media", "games", "ship-brawl", "video.mp4")
base_defenders_video = os.path.join(base_dir, "public", "media", "games", "base-defenders", "video.mp4")
dungeon_escape_video = os.path.join(base_dir, "public", "media", "games", "dungeon-escape", "video.mp4")
ship_model_video = os.path.join(base_dir, "public", "media", "models", "low-poly-ship", "video.mp4")
char_model_video = os.path.join(base_dir, "public", "media", "models", "low-poly-character", "video.mp4")
soundtrack_path = os.path.join(base_dir, "public", "video", "soundtrack.wav")

DARK_GREEN = (0.03, 0.09, 0.125) # #081820
LIGHT_GREEN = (0.88, 0.97, 0.82) # #e0f8d0
MID_GREEN = (0.53, 0.75, 0.44)   # #88c070

def add_title(text, frame_start, length, y_pos=0.15, size=46, color=LIGHT_GREEN):
    t = se.strips.new_effect(name=f"Text_{text[:8]}", type='TEXT', channel=3, frame_start=frame_start, length=length)
    t.text = text
    t.font_size = size
    t.color = (color[0], color[1], color[2], 1.0)
    t.location = (0.5, y_pos)
    t.alignment_x = 'CENTER'
    t.use_box = True
    t.box_color = (DARK_GREEN[0], DARK_GREEN[1], DARK_GREEN[2], 0.85)
    t.box_margin = 0.08
    t.use_shadow = True
    t.shadow_color = (0.0, 0.0, 0.0, 0.9)
    return t

def add_subtitle(text, frame_start, length, y_pos=0.08, size=28, color=MID_GREEN):
    t = se.strips.new_effect(name=f"Sub_{text[:8]}", type='TEXT', channel=4, frame_start=frame_start, length=length)
    t.text = text
    t.font_size = size
    t.color = (color[0], color[1], color[2], 1.0)
    t.location = (0.5, y_pos)
    t.alignment_x = 'CENTER'
    t.use_box = True
    t.box_color = (DARK_GREEN[0], DARK_GREEN[1], DARK_GREEN[2], 0.80)
    t.box_margin = 0.06
    return t

# -------------------------------------------------------------
# 1. SCENE 1: INTRO (Frames 1 - 150 = 5.0s)
# -------------------------------------------------------------
bg1 = se.strips.new_effect(name="Bg_Intro", type='COLOR', channel=1, frame_start=1, length=150)
bg1.color = DARK_GREEN

port = se.strips.new_image(name="Portrait", filepath=portrait_path, channel=2, frame_start=1, fit_method='FIT')
port.frame_final_duration = 150
port.transform.offset_x = -320 # Shift left to balance with text
port.transform.scale_x = 0.95
port.transform.scale_y = 0.95

# Intro text (right-aligned area)
t_name = se.strips.new_effect(name="Intro_Name", type='TEXT', channel=3, frame_start=1, length=150)
t_name.text = "FAWWAD ZAHEER RIZVI"
t_name.font_size = 56
t_name.color = (LIGHT_GREEN[0], LIGHT_GREEN[1], LIGHT_GREEN[2], 1.0)
t_name.location = (0.62, 0.65)
t_name.alignment_x = 'LEFT'
t_name.use_shadow = True

t_role = se.strips.new_effect(name="Intro_Role", type='TEXT', channel=3, frame_start=1, length=150)
t_role.text = "GAME DEVELOPER // 3D ARTIST"
t_role.font_size = 32
t_role.color = (MID_GREEN[0], MID_GREEN[1], MID_GREEN[2], 1.0)
t_role.location = (0.62, 0.54)
t_role.alignment_x = 'LEFT'

t_stack = se.strips.new_effect(name="Intro_Stack", type='TEXT', channel=3, frame_start=1, length=150)
t_stack.text = "Unity (C#) · Unreal Engine 5 (Blueprints) · Blender"
t_stack.font_size = 24
t_stack.color = (LIGHT_GREEN[0], LIGHT_GREEN[1], LIGHT_GREEN[2], 1.0)
t_stack.location = (0.62, 0.44)
t_stack.alignment_x = 'LEFT'

t_edu = se.strips.new_effect(name="Intro_Edu", type='TEXT', channel=3, frame_start=1, length=150)
t_edu.text = "NED University · BS CS (Gaming & Animation)"
t_edu.font_size = 22
t_edu.color = (MID_GREEN[0], MID_GREEN[1], MID_GREEN[2], 0.9)
t_edu.location = (0.62, 0.35)
t_edu.alignment_x = 'LEFT'

# -------------------------------------------------------------
# 2. SCENE 2: SHIP BRAWL (Frames 151 - 420 = 9.0s)
# -------------------------------------------------------------
m_ship = se.strips.new_movie(name="ShipBrawl", filepath=ship_brawl_video, channel=1, frame_start=151, fit_method='FIT')
m_ship.frame_final_duration = 270
add_title("FEATURED PROJECT: SHIP BRAWL", 151, 270, y_pos=0.15, size=42)
add_subtitle("Unreal Engine 5 · Naval Combat · Custom Blender Ship Model", 151, 270, y_pos=0.08, size=24)

# -------------------------------------------------------------
# 3. SCENE 3: BASE DEFENDERS (Frames 421 - 660 = 8.0s)
# -------------------------------------------------------------
m_base = se.strips.new_movie(name="BaseDefenders", filepath=base_defenders_video, channel=1, frame_start=421, fit_method='FIT')
m_base.frame_final_duration = 240
add_title("BASE DEFENDERS", 421, 240, y_pos=0.15, size=42)
add_subtitle("Unity 2D · C# Gameplay Programming · Wave Logic & Turret Combat", 421, 240, y_pos=0.08, size=24)

# -------------------------------------------------------------
# 4. SCENE 4: DUNGEON ESCAPE (Frames 661 - 870 = 7.0s)
# -------------------------------------------------------------
m_dung = se.strips.new_movie(name="DungeonEscape", filepath=dungeon_escape_video, channel=1, frame_start=661, fit_method='FIT')
m_dung.frame_final_duration = 210
add_title("DUNGEON ESCAPE", 661, 210, y_pos=0.15, size=42)
add_subtitle("Unity 2D · Stealth Platformer · Movement & Jump Physics", 661, 210, y_pos=0.08, size=24)

# -------------------------------------------------------------
# 5. SCENE 5: 3D MODELING REEL (Frames 871 - 1000 = 4.3s)
# -------------------------------------------------------------
m_mship = se.strips.new_movie(name="LowPolyShip", filepath=ship_model_video, channel=1, frame_start=871, fit_method='FIT')
m_mship.frame_final_duration = 65
add_title("3D ASSET DESIGN: GAME-READY SHIP", 871, 65, y_pos=0.15, size=38)
add_subtitle("Blender 5.0 · Box Modeling & Modular Cannons for UE5", 871, 65, y_pos=0.08, size=24)

m_mchar = se.strips.new_movie(name="LowPolyChar", filepath=char_model_video, channel=1, frame_start=936, fit_method='FIT')
m_mchar.frame_final_duration = 65
add_title("3D CHARACTER RIGGING & WEIGHT PAINTING", 936, 65, y_pos=0.15, size=38)
add_subtitle("Blender 5.0 · Custom Armature & Animation Tests", 936, 65, y_pos=0.08, size=24)

# -------------------------------------------------------------
# 6. SCENE 6: OUTRO CARD (Frames 1001 - 1100 = 3.3s)
# -------------------------------------------------------------
bg_out = se.strips.new_effect(name="Bg_Outro", type='COLOR', channel=1, frame_start=1001, length=100)
bg_out.color = DARK_GREEN

port_out = se.strips.new_image(name="Portrait_Out", filepath=portrait_path, channel=2, frame_start=1001, fit_method='FIT')
port_out.frame_final_duration = 100
port_out.transform.offset_x = -320
port_out.transform.scale_x = 0.95
port_out.transform.scale_y = 0.95

t_o1 = se.strips.new_effect(name="Out_Title", type='TEXT', channel=3, frame_start=1001, length=100)
t_o1.text = "FAWWAD ZAHEER RIZVI"
t_o1.font_size = 52
t_o1.color = (LIGHT_GREEN[0], LIGHT_GREEN[1], LIGHT_GREEN[2], 1.0)
t_o1.location = (0.62, 0.65)
t_o1.alignment_x = 'LEFT'

t_o2 = se.strips.new_effect(name="Out_Cert", type='TEXT', channel=3, frame_start=1001, length=100)
t_o2.text = "CEGA Unreal Pre-Production Certified"
t_o2.font_size = 28
t_o2.color = (MID_GREEN[0], MID_GREEN[1], MID_GREEN[2], 1.0)
t_o2.location = (0.62, 0.54)
t_o2.alignment_x = 'LEFT'

t_o3 = se.strips.new_effect(name="Out_Links", type='TEXT', channel=3, frame_start=1001, length=100)
t_o3.text = "github.com/FawwadZaheer\nsyedfawwad100@gmail.com"
t_o3.font_size = 24
t_o3.color = (LIGHT_GREEN[0], LIGHT_GREEN[1], LIGHT_GREEN[2], 1.0)
t_o3.location = (0.62, 0.42)
t_o3.alignment_x = 'LEFT'

t_o4 = se.strips.new_effect(name="Out_Press", type='TEXT', channel=3, frame_start=1001, length=100)
t_o4.text = "PRESS START TO CONNECT"
t_o4.font_size = 26
t_o4.color = (MID_GREEN[0], MID_GREEN[1], MID_GREEN[2], 1.0)
t_o4.location = (0.62, 0.28)
t_o4.alignment_x = 'LEFT'
t_o4.use_box = True
t_o4.box_color = (0.0, 0.0, 0.0, 0.8)

# -------------------------------------------------------------
# 7. AUDIO SOUNDTRACK (Channel 5)
# -------------------------------------------------------------
if os.path.exists(soundtrack_path):
    snd = se.strips.new_sound(name="Chiptune_Soundtrack", filepath=soundtrack_path, channel=5, frame_start=1)
    print("Attached audio soundtrack:", soundtrack_path)

# Save .blend project for academic After Effects / Blender deliverable
blend_out = os.path.join(base_dir, "public", "video", "promo_video.blend")
bpy.ops.wm.save_as_mainfile(filepath=blend_out)
print("Saved video project file:", blend_out)

# Render video
print("Rendering promo.mp4...")
bpy.ops.render.render(animation=True)
print("SUCCESS: Rendered promo.mp4 to", scene.render.filepath)
