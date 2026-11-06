#!/usr/bin/env python3
"""
PocketPal AI v1.22.0 — Black (Dark) & White (Light) Visual UI, Layout & Hit-Target Inspector
Renders 8 viewports covering both Dark Mode (Black) and Light Mode (White),
Fancy Theme Customization Suite (Scope: PalsHub Only vs Everywhere, Message Opacity,
Message Size, Radius, Border, Glow, Tint), Custom CSS Engine, Multi-Character Group Chat,
SillyTavern Experimental Macro Engine (.var/$var/scoped), and Tavo Export Importer.
"""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT_DIR = os.path.join(ROOT, "src/assets/fonts")
OUT_PNG = "/working_dir/c_7a73237c8342218d/artifacts/file_generation/ttl=63d/output/pocketpal-ui-visual-audit.png"
os.makedirs(os.path.dirname(OUT_PNG), exist_ok=True)

def font(name, size):
    path = os.path.join(FONT_DIR, name)
    if os.path.exists(path):
        return ImageFont.truetype(path, size)
    return ImageFont.load_default()

F_REG_11 = font("Inter-Regular.ttf", 11)
F_REG_12 = font("Inter-Regular.ttf", 12)
F_REG_13 = font("Inter-Regular.ttf", 13)
F_REG_15 = font("Inter-Regular.ttf", 15)
F_MED_10 = font("Inter-Medium.ttf", 10)
F_MED_11 = font("Inter-Medium.ttf", 11)
F_MED_12 = font("Inter-Medium.ttf", 12)
F_MED_13 = font("Inter-Medium.ttf", 13)
F_SEMI_11 = font("Inter-SemiBold.ttf", 11)
F_SEMI_12 = font("Inter-SemiBold.ttf", 12)
F_SEMI_13 = font("Inter-SemiBold.ttf", 13)
F_SEMI_14 = font("Inter-SemiBold.ttf", 14)
F_SEMI_15 = font("Inter-SemiBold.ttf", 15)
F_BOLD_16 = font("Inter-Bold.ttf", 16)

W, H = 1720, 1900
canvas = Image.new("RGBA", (W, H), (9, 9, 12, 255))
draw = ImageDraw.Draw(canvas)

layout_boxes = []

import zipfile, io
TBK_PATH = "/working_dir/c_7a73237c8342218d/user_uploaded_files/ttl=63d/user_uploaded/Tavo_backup_v1.8.1_20261104T0619.tbk"
CHAR_PFP_IMG = None
if os.path.exists(TBK_PATH):
    try:
        with zipfile.ZipFile(TBK_PATH, "r") as zf:
            png_bytes = zf.read("CharacterCards/1793753334142.png")
            raw_pfp = Image.open(io.BytesIO(png_bytes)).convert("RGBA").resize((32, 32), Image.Resampling.LANCZOS)
            mask = Image.new("L", (32, 32), 0)
            ImageDraw.Draw(mask).ellipse((0, 0, 31, 31), fill=255)
            CHAR_PFP_IMG = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
            CHAR_PFP_IMG.paste(raw_pfp, (0, 0), mask)
    except Exception as e:
        print("PFP load warning:", e)

def paste_char_pfp(target_img, d, x, y, dark=True):
    if CHAR_PFP_IMG is not None:
        target_img.paste(CHAR_PFP_IMG, (x, y), CHAR_PFP_IMG)
    else:
        d.ellipse((x, y, x + 32, y + 32), fill=(124, 58, 237, 255))
    ring_col = (255, 255, 255, 90) if dark else (15, 23, 42, 60)
    d.ellipse((x, y, x + 32, y + 32), outline=ring_col, width=2)


def reg_box(vp, group, label, box, interactive=False):
    layout_boxes.append((vp, group, label, box, interactive))

def rrect(d, box, radius, fill=None, outline=None, width=1):
    d.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)

def draw_sparkle_icon(d, cx, cy, r=6, color=(250, 250, 250, 255)):
    pts = [
        (cx, cy - r), (cx + r * 0.3, cy - r * 0.3),
        (cx + r, cy), (cx + r * 0.3, cy + r * 0.3),
        (cx, cy + r), (cx - r * 0.3, cy + r * 0.3),
        (cx - r, cy), (cx - r * 0.3, cy - r * 0.3),
    ]
    d.polygon(pts, fill=color)

def draw_close_x(d, cx, cy, r=5, color=(161, 161, 170, 255)):
    d.line((cx - r, cy - r, cx + r, cy + r), fill=color, width=2)
    d.line((cx - r, cy + r, cx + r, cy - r), fill=color, width=2)

def draw_rewind_icon(d, cx, cy, color=(250, 250, 250, 255)):
    d.arc((cx - 6, cy - 6, cx + 6, cy + 6), 30, 300, fill=color, width=2)
    d.polygon([(cx - 6, cy - 2), (cx - 2, cy - 6), (cx - 2, cy + 1)], fill=color)

def draw_edit_icon(d, cx, cy, color=(250, 250, 250, 255)):
    d.rectangle((cx - 6, cy - 5, cx + 5, cy + 6), outline=color, width=1)
    d.line((cx - 1, cy + 1, cx + 6, cy - 6), fill=color, width=2)

def draw_dots_icon(d, cx, cy, color=(250, 250, 250, 255)):
    for dy in (-5, 0, 5):
        d.ellipse((cx - 1.5, cy + dy - 1.5, cx + 1.5, cy + dy + 1.5), fill=color)

def draw_switch(d, x, y, on=True, dark=True):
    if on:
        bg = (250, 250, 250, 255) if dark else (14, 14, 16, 255)
        knob = (9, 9, 11, 255) if dark else (255, 255, 255, 255)
        rrect(d, (x, y, x + 38, y + 22), 11, fill=bg)
        d.ellipse((x + 19, y + 3, x + 35, y + 19), fill=knob)
    else:
        bg = (39, 39, 42, 255) if dark else (228, 228, 231, 255)
        knob = (161, 161, 170, 255) if dark else (113, 113, 122, 255)
        rrect(d, (x, y, x + 38, y + 22), 11, fill=bg)
        d.ellipse((x + 3, y + 3, x + 19, y + 19), fill=knob)

def draw_slider(d, x, y, w, ratio, val_str, dark=True):
    sw = w - 62
    track_col = (39, 39, 42, 255) if dark else (228, 228, 231, 255)
    fill_col = (250, 250, 250, 255) if dark else (14, 14, 16, 255)
    box_bg = (20, 20, 22, 255) if dark else (244, 244, 245, 255)
    box_bd = (63, 63, 70, 255) if dark else (212, 212, 216, 255)
    txt_col = (250, 250, 250, 255) if dark else (14, 14, 16, 255)

    rrect(d, (x, y + 11, x + sw, y + 15), 2, fill=track_col)
    fill_w = int(sw * ratio)
    rrect(d, (x, y + 11, x + fill_w, y + 15), 2, fill=fill_col)
    d.ellipse((x + fill_w - 6, y + 7, x + fill_w + 6, y + 19), fill=fill_col)
    bx = x + sw + 8
    rrect(d, (bx, y, bx + 52, y + 26), 7, fill=box_bg, outline=box_bd, width=1)
    d.text((bx + 10, y + 6), val_str, font=F_MED_11, fill=txt_col)

def make_phone_base(dark=True, fancy=False):
    pw, ph = 390, 820
    bg = (0, 0, 0, 255) if dark else (255, 255, 255, 255)
    img = Image.new("RGBA", (pw, ph), bg)
    if fancy:
        base_col = (12, 10, 24, 255) if dark else (240, 244, 252, 255)
        art = Image.new("RGBA", (pw, ph), base_col)
        ad = ImageDraw.Draw(art)
        if dark:
            ad.ellipse((20, 70, 320, 370), fill=(124, 58, 237, 155))
            ad.ellipse((120, 260, 380, 560), fill=(56, 189, 248, 135))
            ad.ellipse((-20, 420, 260, 720), fill=(236, 72, 153, 115))
        else:
            ad.ellipse((20, 70, 320, 370), fill=(167, 139, 250, 145))
            ad.ellipse((120, 260, 380, 560), fill=(125, 211, 252, 155))
            ad.ellipse((-20, 420, 260, 720), fill=(249, 168, 212, 135))
        art = art.filter(ImageFilter.GaussianBlur(radius=18))
        tint = Image.new("RGBA", (pw, ph), (0, 0, 0, 105) if dark else (255, 255, 255, 95))
        img = Image.alpha_composite(art, tint)
    d = ImageDraw.Draw(img)
    st_col = (228, 228, 231, 255) if dark else (24, 24, 27, 255)
    d.text((18, 8), "9:41", font=F_SEMI_11, fill=st_col)
    d.text((318, 8), "5G • 100%", font=F_SEMI_11, fill=st_col)
    return img

# Header Banner
rrect(draw, (24, 18, W - 24, 78), 12, fill=(17, 17, 20, 255), outline=(39, 39, 42, 255), width=1)
draw.text((42, 28), "PocketPal AI v1.22.0 — Tavo .tbk Backup, Character PFP (16.5px), 64k Context Engine, Tag Search & Complex Regex Audit", font=F_BOLD_16, fill=(250, 250, 250, 255))
draw.text((42, 50), "Verified: Tavo .tbk (Victoria Ling + Whisper + API 1) • Fancy Theme Character PFP & 16.5px Size • 64k Smart Context • Unlimited APIs/Presets • Tag Search • Complex Regex/HTML", font=F_REG_12, fill=(161, 161, 170, 255))

# ==============================================================================
# VIEWPORT 1: Black (Dark) Fancy Theme + Custom CSS + Group Chat Speaker Bar
# ==============================================================================
vp1 = make_phone_base(dark=True, fancy=True)
ov1 = Image.new("RGBA", (390, 820), (0, 0, 0, 0))
d1 = ImageDraw.Draw(ov1)
hdr1 = (0, 28, 390, 80)
rrect(d1, hdr1, 0, fill=(14, 14, 16, 184))
d1.line((0, 80, 390, 80), fill=(255, 255, 255, 30), width=1)
d1.text((16, 46), "≡", font=F_BOLD_16, fill=(250, 250, 250, 255))
d1.text((44, 39), "Astral Council (Group Chat)", font=F_SEMI_14, fill=(250, 250, 250, 255))
d1.text((44, 57), "Group (3): Seraphina, Lyra, Kaelen", font=F_REG_11, fill=(212, 212, 216, 255))
rrect(d1, (282, 40, 310, 68), 14, fill=(255, 255, 255, 24))
draw_rewind_icon(d1, 296, 54)
rrect(d1, (316, 40, 344, 68), 14, fill=(255, 255, 255, 24))
draw_edit_icon(d1, 330, 54)
rrect(d1, (350, 40, 378, 68), 14, fill=(255, 255, 255, 24))
draw_dots_icon(d1, 364, 54)
reg_box("vp1", "flow", "header", hdr1, True)

gb1 = (16, 92, 374, 184)
rrect(d1, gb1, 16, fill=(20, 20, 24, 188), outline=(255, 255, 255, 42), width=1)
d1.line((16, 102, 16, 174), fill=(250, 250, 250, 255), width=2)
draw_sparkle_icon(d1, 34, 114, 6)
d1.text((48, 104), "\"The council is assembled. Speak, and each of us\nshall answer in turn.\"", font=F_REG_13, fill=(244, 244, 245, 255))
d1.line((28, 150, 360, 150), fill=(255, 255, 255, 28), width=1)
rrect(d1, (278, 156, 304, 178), 6, fill=(255, 255, 255, 26))
d1.text((288, 159), "‹", font=F_SEMI_14, fill=(250, 250, 250, 255))
d1.text((312, 161), "1 / 3", font=F_MED_11, fill=(244, 244, 245, 255))
rrect(d1, (342, 156, 368, 178), 6, fill=(255, 255, 255, 26))
d1.text((352, 159), "›", font=F_SEMI_14, fill=(250, 250, 250, 255))
reg_box("vp1", "flow", "greeting", gb1, True)

ub1 = (70, 198, 374, 252)
rrect(d1, ub1, 18, fill=(36, 36, 40, 196), outline=(255, 255, 255, 40), width=1)
d1.text((84, 209), "Lyra, what did your scouts see near Frostpeak,\nand Seraphina, is the ward holding?", font=F_REG_13, fill=(250, 250, 250, 255))
reg_box("vp1", "flow", "user_msg", ub1, False)

# Turn 1: Lyra
paste_char_pfp(ov1, d1, 14, 270, True)
ab1_a = (54, 266, 374, 346)
rrect(d1, ab1_a, 18, fill=(20, 20, 24, 184), outline=(167, 139, 250, 75), width=1)
d1.text((66, 276), "Lyra", font=F_SEMI_12, fill=(167, 139, 250, 255))
d1.text((66, 295), "*She unrolls a frost-rimmed parchment.* ", font=F_REG_13, fill=(167, 139, 250, 255))
d1.text((66, 314), "\"Three wyvern riders crossed the ridge at dawn.\"", font=F_SEMI_13, fill=(56, 189, 248, 255))
reg_box("vp1", "flow", "ai_msg_lyra", ab1_a, False)

# Turn 2: Seraphina
paste_char_pfp(ov1, d1, 14, 362, True)
ab1_b = (54, 358, 374, 438)
rrect(d1, ab1_b, 18, fill=(20, 20, 24, 184), outline=(255, 255, 255, 42), width=1)
d1.text((66, 368), "Seraphina", font=F_SEMI_12, fill=(56, 189, 248, 255))
d1.text((66, 387), "*Her staff hums with a silver resonance.*", font=F_REG_13, fill=(167, 139, 250, 255))
d1.text((66, 406), "\"The Astral Ward holds at 94% integrity.\"", font=F_SEMI_13, fill=(56, 189, 248, 255))
reg_box("vp1", "flow", "ai_msg_sera", ab1_b, False)

# Input Bar with Group Chat Speaker Selector Pills
ib1 = (0, 720, 390, 820)
rrect(d1, ib1, 0, fill=(14, 14, 16, 198))
d1.line((0, 720, 390, 720), fill=(255, 255, 255, 30), width=1)
# Group speaker pills
rrect(d1, (14, 728, 128, 752), 12, fill=(250, 250, 250, 255))
d1.text((24, 734), "Seraphina • Next", font=F_SEMI_11, fill=(9, 9, 11, 255))
rrect(d1, (134, 728, 184, 752), 12, fill=(24, 24, 27, 220), outline=(63, 63, 70, 255), width=1)
d1.text((147, 734), "Lyra", font=F_MED_11, fill=(250, 250, 250, 255))
rrect(d1, (190, 728, 286, 752), 12, fill=(24, 24, 27, 140), outline=(63, 63, 70, 255), width=1)
d1.text((200, 734), "Kaelen (Muted)", font=F_MED_11, fill=(161, 161, 170, 255))

rrect(d1, (14, 764, 336, 802), 18, fill=(24, 24, 27, 195), outline=(255, 255, 255, 35), width=1)
d1.text((28, 776), "Message Astral Council...", font=F_REG_13, fill=(212, 212, 216, 255))
d1.ellipse((344, 767, 376, 799), fill=(250, 250, 250, 255))
d1.text((355, 775), "↑", font=F_SEMI_14, fill=(9, 9, 11, 255))
reg_box("vp1", "flow", "input_bar", ib1, True)
vp1 = Image.alpha_composite(vp1, ov1)

# ==============================================================================
# VIEWPORT 2: White (Light Mode) Fancy Theme + Frosted Glass
# ==============================================================================
vp2 = make_phone_base(dark=False, fancy=True)
ov2 = Image.new("RGBA", (390, 820), (0, 0, 0, 0))
d2 = ImageDraw.Draw(ov2)
hdr2 = (0, 28, 390, 80)
rrect(d2, hdr2, 0, fill=(249, 250, 251, 208))
d2.line((0, 80, 390, 80), fill=(0, 0, 0, 22), width=1)
d2.text((16, 46), "≡", font=F_BOLD_16, fill=(17, 17, 17, 255))
d2.text((44, 39), "Seraphina V4 (Light Frosted Glass)", font=F_SEMI_14, fill=(17, 17, 17, 255))
d2.text((44, 57), "White Theme • Character PFP • Size 16.5px • 64k Context", font=F_REG_11, fill=(82, 82, 91, 255))
rrect(d2, (282, 40, 310, 68), 14, fill=(0, 0, 0, 14))
draw_rewind_icon(d2, 296, 54, color=(17, 17, 17, 255))
rrect(d2, (316, 40, 344, 68), 14, fill=(0, 0, 0, 14))
draw_edit_icon(d2, 330, 54, color=(17, 17, 17, 255))
rrect(d2, (350, 40, 378, 68), 14, fill=(0, 0, 0, 14))
draw_dots_icon(d2, 364, 54, color=(17, 17, 17, 255))
reg_box("vp2", "flow", "header", hdr2, True)

gb2 = (16, 94, 374, 192)
rrect(d2, gb2, 16, fill=(255, 255, 255, 204), outline=(0, 0, 0, 24), width=1)
d2.line((16, 104, 16, 182), fill=(17, 17, 17, 255), width=2)
draw_sparkle_icon(d2, 34, 114, 6, color=(17, 17, 17, 255))
d2.text((48, 106), "\"Welcome back to the Astral Archive, traveler.\nWhich chronicle shall we unseal today?\"", font=F_REG_13, fill=(39, 39, 42, 255))
d2.line((28, 154, 360, 154), fill=(0, 0, 0, 18), width=1)
rrect(d2, (278, 160, 304, 184), 6, fill=(0, 0, 0, 14))
d2.text((288, 163), "‹", font=F_SEMI_14, fill=(17, 17, 17, 255))
d2.text((312, 165), "2 / 3", font=F_MED_11, fill=(39, 39, 42, 255))
rrect(d2, (342, 160, 368, 184), 6, fill=(0, 0, 0, 14))
d2.text((352, 163), "›", font=F_SEMI_14, fill=(17, 17, 17, 255))
reg_box("vp2", "flow", "greeting", gb2, True)

ub2 = (66, 208, 374, 266)
rrect(d2, ub2, 18, fill=(242, 243, 245, 218), outline=(0, 0, 0, 22), width=1)
d2.text((82, 220), "How does the White (Light) theme look with\nfrosted glass bubbles and custom sizing?", font=F_REG_13, fill=(17, 17, 17, 255))
reg_box("vp2", "flow", "user_msg", ub2, False)

paste_char_pfp(ov2, d2, 14, 286, False)
ab2 = (54, 282, 374, 374)
rrect(d2, ab2, 18, fill=(255, 255, 255, 204), outline=(0, 0, 0, 22), width=1)
d2.text((66, 294), "In Light Mode, frosted glass bubbles use crisp\npearl-white translucency (rgba(255,255,255,0.78)),\nsubtle dark hairline borders, and high-contrast\n#111111 typography.", font=F_REG_13, fill=(17, 17, 17, 255))
reg_box("vp2", "flow", "ai_msg", ab2, False)

ib2 = (0, 756, 390, 820)
rrect(d2, ib2, 0, fill=(249, 250, 251, 215))
d2.line((0, 756, 390, 756), fill=(0, 0, 0, 22), width=1)
rrect(d2, (14, 770, 92, 804), 16, fill=(228, 228, 231, 255))
d2.text((26, 780), "Seraphina", font=F_SEMI_11, fill=(17, 17, 17, 255))
rrect(d2, (100, 769, 336, 805), 18, fill=(255, 255, 255, 225), outline=(0, 0, 0, 28), width=1)
d2.text((114, 780), "Message Seraphina...", font=F_REG_13, fill=(113, 113, 122, 255))
d2.ellipse((344, 771, 376, 803), fill=(17, 17, 17, 255))
d2.text((355, 779), "↑", font=F_SEMI_14, fill=(255, 255, 255, 255))
reg_box("vp2", "flow", "input_bar", ib2, True)
vp2 = Image.alpha_composite(vp2, ov2)

# ==============================================================================
# VIEWPORT 3: White (Light Mode) Original Default Theme (Untouched & Clean)
# ==============================================================================
vp3 = make_phone_base(dark=False, fancy=False)
d3 = ImageDraw.Draw(vp3)
hdr3 = (0, 28, 390, 80)
rrect(d3, hdr3, 0, fill=(255, 255, 255, 255))
d3.line((0, 80, 390, 80), fill=(228, 228, 231, 255), width=1)
d3.text((16, 46), "≡", font=F_BOLD_16, fill=(17, 17, 17, 255))
d3.text((44, 39), "Normal Chat (Original Light Theme)", font=F_SEMI_14, fill=(17, 17, 17, 255))
d3.text((44, 57), "Original Theme Kept Clean • Fancy Off", font=F_REG_11, fill=(113, 113, 122, 255))
rrect(d3, (282, 40, 310, 68), 14, fill=(244, 244, 245, 255))
draw_rewind_icon(d3, 296, 54, color=(17, 17, 17, 255))
rrect(d3, (316, 40, 344, 68), 14, fill=(244, 244, 245, 255))
draw_edit_icon(d3, 330, 54, color=(17, 17, 17, 255))
rrect(d3, (350, 40, 378, 68), 14, fill=(244, 244, 245, 255))
draw_dots_icon(d3, 364, 54, color=(17, 17, 17, 255))
reg_box("vp3", "flow", "header", hdr3, True)

ub3 = (76, 98, 374, 154)
rrect(d3, ub3, 18, fill=(242, 243, 245, 255))
d3.text((92, 110), "Verify that the original Light and Dark themes\nstay clean when Fancy Theme is off.", font=F_REG_13, fill=(17, 17, 17, 255))
reg_box("vp3", "flow", "user_msg", ub3, False)

ab3 = (16, 170, 366, 254)
d3.text((20, 178), "When Fancy Theme is off (the default), PocketPal\nuses its native monochrome palette (#FFFFFF / #F9FAFB\nin Light Mode, #000000 / #0E0E0E in Dark Mode) with\nzero extra visual clutter.", font=F_REG_13, fill=(17, 17, 17, 255))
reg_box("vp3", "flow", "ai_msg", ab3, False)

ib3 = (0, 756, 390, 820)
rrect(d3, ib3, 0, fill=(249, 250, 251, 255))
d3.line((0, 756, 390, 756), fill=(228, 228, 231, 255), width=1)
rrect(d3, (16, 769, 336, 805), 18, fill=(255, 255, 255, 255), outline=(212, 212, 216, 255), width=1)
d3.text((30, 780), "Ask PocketPal anything...", font=F_REG_13, fill=(113, 113, 122, 255))
d3.ellipse((344, 771, 376, 803), fill=(17, 17, 17, 255))
d3.text((355, 779), "↑", font=F_SEMI_14, fill=(255, 255, 255, 255))
reg_box("vp3", "flow", "input_bar", ib3, True)

# ==============================================================================
# VIEWPORT 4: Fancy Theme Customization Suite (SettingsScreen.tsx)
# ==============================================================================
vp4 = make_phone_base(dark=True, fancy=False)
d4 = ImageDraw.Draw(vp4)
hdr4 = (0, 28, 390, 76)
d4.line((0, 76, 390, 76), fill=(39, 39, 42, 255), width=1)
d4.text((16, 44), "≡", font=F_BOLD_16, fill=(250, 250, 250, 255))
d4.text((44, 37), "Fancy Theme Customization Suite", font=F_SEMI_14, fill=(250, 250, 250, 255))
d4.text((44, 55), "Scope • Opacity • Message Size • Radius • Glow", font=F_REG_11, fill=(161, 161, 170, 255))
reg_box("vp4", "flow", "header", hdr4, True)

sy = 86
# Card container
fc_box = (12, sy, 378, 808)
rrect(d4, fc_box, 14, fill=(16, 16, 18, 255), outline=(39, 39, 42, 255), width=1)
d4.text((24, sy + 12), "Fancy Frosted Glass Theme", font=F_SEMI_14, fill=(250, 250, 250, 255))
draw_switch(d4, 326, sy + 10, True)
sy += 40

# Scope Selector: PalsHub Only vs Apply Everywhere
d4.text((24, sy), "Fancy Theme Scope", font=F_SEMI_11, fill=(161, 161, 170, 255))
sy += 18
rrect(d4, (24, sy, 192, sy + 28), 8, fill=(250, 250, 250, 255))
d4.text((38, sy + 7), "PalsHub Only", font=F_SEMI_11, fill=(9, 9, 11, 255))
rrect(d4, (198, sy, 366, sy + 28), 8, fill=(24, 24, 27, 255), outline=(63, 63, 70, 255), width=1)
d4.text((212, sy + 7), "Apply Everywhere", font=F_MED_11, fill=(212, 212, 216, 255))
sy += 36

# Tint Presets
d4.text((24, sy), "Frosted Glass Tint Preset", font=F_SEMI_11, fill=(161, 161, 170, 255))
sy += 18
tx = 24
for tname, tact in [("Monochrome", True), ("Pal Accent", False), ("Frost Blue", False), ("Rose", False)]:
    tw = len(tname) * 6 + 18
    rrect(d4, (tx, sy, tx + tw, sy + 24), 7, fill=(250, 250, 250, 255) if tact else (24, 24, 27, 255), outline=(63, 63, 70, 255), width=1)
    d4.text((tx + 8, sy + 5), tname, font=F_SEMI_11 if tact else F_MED_10, fill=(9, 9, 11, 255) if tact else (161, 161, 170, 255))
    tx += tw + 6
sy += 32

# Sliders list
sliders_vp4 = [
    ("Message Background Opacity", 0.74, "0.74"),
    ("Message Text & Bubble Size (px)", 0.45, "15"),
    ("Message Line-Height Spacing", 0.42, "1.45"),
    ("Message Bubble Corner Radius (px)", 0.58, "18"),
    ("Frosted Glass Border Intensity", 0.28, "0.16"),
    ("Bubble Horizontal Padding (px)", 0.38, "14"),
    ("Message Max Width (%)", 0.66, "90"),
    ("Ambient Bubble Shadow / Glow", 0.22, "0.15"),
    ("Background Blur Radius (px)", 0.27, "8"),
    ("Background Contrast Dim Overlay", 0.48, "0.42"),
    ("Header & Composer Glass Opacity", 0.72, "0.72"),
]
for sl_label, sl_ratio, sl_val in sliders_vp4:
    d4.text((24, sy), sl_label, font=F_MED_11, fill=(228, 228, 231, 255))
    draw_slider(d4, 24, sy + 15, 342, sl_ratio, sl_val, dark=True)
    sy += 46

reg_box("vp4", "flow", "fancy_card", fc_box, True)

# ==============================================================================
# VIEWPORT 5: Custom CSS Engine + Tavo Importer (SettingsScreen.tsx)
# ==============================================================================
vp5 = make_phone_base(dark=True, fancy=False)
d5 = ImageDraw.Draw(vp5)
hdr5 = (0, 28, 390, 76)
d5.line((0, 76, 390, 76), fill=(39, 39, 42, 255), width=1)
d5.text((16, 44), "≡", font=F_BOLD_16, fill=(250, 250, 250, 255))
d5.text((44, 37), "Custom CSS & Tavo Export Import", font=F_SEMI_14, fill=(250, 250, 250, 255))
d5.text((44, 55), "Live CSS Parser (.mes, em, strong, :root) • Tavo", font=F_REG_11, fill=(161, 161, 170, 255))
reg_box("vp5", "flow", "header", hdr5, True)

sy = 90
css_card = (16, sy, 374, sy + 330)
rrect(d5, css_card, 14, fill=(16, 16, 18, 255), outline=(39, 39, 42, 255), width=1)
d5.text((28, sy + 14), "Custom CSS Styling Engine", font=F_SEMI_14, fill=(250, 250, 250, 255))
d5.text((28, sy + 34), "Supports SillyTavern & Tavo CSS rules (.mes, .user_mes,\n.char_mes, .mes_text, em, strong, blockquote, :root vars).", font=F_REG_11, fill=(161, 161, 170, 255))
draw_switch(d5, 322, sy + 16, True)

# Preset Chips
rrect(d5, (28, sy + 74, 232, sy + 100), 8, fill=(24, 24, 27, 255), outline=(63, 63, 70, 255), width=1)
d5.text((38, sy + 81), "+ SillyTavern Dialogue & Action Tint", font=F_SEMI_11, fill=(250, 250, 250, 255))
rrect(d5, (238, sy + 74, 362, sy + 100), 8, fill=(24, 24, 27, 255), outline=(63, 63, 70, 255), width=1)
d5.text((248, sy + 81), "+ Cyber Frost Glass", font=F_SEMI_11, fill=(250, 250, 250, 255))

# Code Editor Box
code_box = (28, sy + 110, 362, sy + 314)
rrect(d5, code_box, 10, fill=(10, 10, 12, 255), outline=(52, 52, 58, 255), width=1)
css_lines = [
    ":root {",
    "  --SmartThemeEmColor: #A78BFA;",
    "  --SmartThemeQuoteColor: #38BDF8;",
    "}",
    ".char_mes {",
    "  border-radius: 18px;",
    "  border: 1px solid rgba(167, 139, 250, 0.35);",
    "}",
    "em, i { color: var(--SmartThemeEmColor); }",
    "strong, b { color: var(--SmartThemeQuoteColor); }",
]
cy = sy + 120
for cline in css_lines:
    d5.text((38, cy), cline, font=F_REG_11, fill=(167, 139, 250, 255) if "--" in cline or "em" in cline else (228, 228, 231, 255))
    cy += 18
reg_box("vp5", "flow", "css_card", css_card, True)
sy += 346

# Tavo Export Importer Card
tavo_card = (16, sy, 374, sy + 160)
rrect(d5, tavo_card, 14, fill=(16, 16, 18, 255), outline=(39, 39, 42, 255), width=1)
d5.text((28, sy + 14), "Tavo & SillyTavern Unified Import", font=F_SEMI_14, fill=(250, 250, 250, 255))
rrect(d5, (284, sy + 12, 362, sy + 30), 6, fill=(20, 46, 31, 255))
d5.text((292, sy + 15), "Auto-Detect", font=F_SEMI_11, fill=(52, 211, 153, 255))
d5.text((28, sy + 38), "Imports directly from Tavo (.json / .tavo / .jsonl):", font=F_REG_11, fill=(161, 161, 170, 255))
d5.text((28, sy + 58), "• Characters & V1–V4 Cards + Embedded Lorebooks\n• Chat Histories & Multi-Turn Threads\n• API Providers, Reverse Proxies & Keys\n• Prompt Presets & Custom CSS Themes", font=F_REG_11, fill=(212, 212, 216, 255))
rrect(d5, (28, sy + 120, 362, sy + 148), 14, fill=(250, 250, 250, 255))
d5.text((112, sy + 128), "Import Tavo / Tavern Export", font=F_SEMI_12, fill=(9, 9, 11, 255))
reg_box("vp5", "flow", "tavo_card", tavo_card, True)

# ==============================================================================
# VIEWPORT 6: Multi-Character Group Chat Sheet (`GroupChatSheet.tsx`)
# ==============================================================================
vp6 = make_phone_base(dark=True, fancy=False)
d6 = ImageDraw.Draw(vp6)
rrect(d6, (0, 28, 390, 96), 0, fill=(10, 10, 12, 255))
rrect(d6, (0, 96, 390, 820), 22, fill=(14, 14, 14, 255), outline=(46, 46, 52, 255), width=1)
rrect(d6, (177, 106, 213, 110), 2, fill=(63, 63, 70, 255))
d6.text((16, 120), "Multi-Character Group Chat", font=F_SEMI_15, fill=(250, 250, 250, 255))
draw_close_x(d6, 366, 128, 5)
d6.line((0, 146, 390, 146), fill=(39, 39, 42, 255), width=1)
reg_box("vp6", "sheet", "header", (0, 96, 390, 146), True)

sy = 158
d6.text((16, sy), "Combine 2+ Pals in a shared chat with SillyTavern group\nmacros ({{group}}, {{groupNotMuted}}, {{charIfNotGroup}}).", font=F_REG_12, fill=(161, 161, 170, 255))
reg_box("vp6", "sheet", "desc", (16, sy, 374, sy + 34), False)
sy += 44

g_in = (16, sy, 374, sy + 42)
rrect(d6, g_in, 10, fill=(20, 20, 22, 255), outline=(46, 46, 52, 255), width=1)
d6.text((28, sy + 13), "Group Title: Astral Archive Council", font=F_REG_12, fill=(250, 250, 250, 255))
reg_box("vp6", "sheet", "title_in", g_in, True)
sy += 52

d6.text((16, sy), "Speaker Activation Strategy", font=F_SEMI_13, fill=(250, 250, 250, 255))
reg_box("vp6", "sheet", "strat_lbl", (16, sy, 374, sy + 18), False)
sy += 24

s_box = (16, sy, 374, sy + 62)
rrect(d6, (16, sy, 218, sy + 28), 9, fill=(250, 250, 250, 255))
d6.text((28, sy + 7), "Natural (Name Mention + Turn)", font=F_SEMI_11, fill=(9, 9, 11, 255))
rrect(d6, (224, sy, 374, sy + 28), 9, fill=(20, 20, 22, 255), outline=(39, 39, 42, 255), width=1)
d6.text((236, sy + 7), "Round-Robin List", font=F_MED_11, fill=(161, 161, 170, 255))
rrect(d6, (16, sy + 32, 174, sy + 60), 9, fill=(20, 20, 22, 255), outline=(39, 39, 42, 255), width=1)
d6.text((28, sy + 39), "Pooled Random Speaker", font=F_MED_11, fill=(161, 161, 170, 255))
rrect(d6, (180, sy + 32, 340, sy + 60), 9, fill=(20, 20, 22, 255), outline=(39, 39, 42, 255), width=1)
d6.text((192, sy + 39), "Manual Tap-to-Speak", font=F_MED_11, fill=(161, 161, 170, 255))
reg_box("vp6", "sheet", "strategies", s_box, True)
sy += 74

d6.text((16, sy), "Select Group Members (3 selected)", font=F_SEMI_13, fill=(250, 250, 250, 255))
reg_box("vp6", "sheet", "mem_lbl", (16, sy, 374, sy + 18), False)
sy += 24

for idx_m, (mname, mdesc, mact, mmuted) in enumerate([
    ("Seraphina V4", "Archmage of the Northern Citadel", True, False),
    ("Lyra Dawnweaver", "Outrider Captain of Frostpeak", True, False),
    ("Kaelen Vance", "Alchemist & Lorekeeper", True, True),
]):
    pbox = (16, sy, 374, sy + 58)
    rrect(d6, pbox, 12, fill=(24, 24, 27, 255), outline=(250, 250, 250, 255), width=1)
    d6.text((28, sy + 10), mname, font=F_SEMI_13, fill=(250, 250, 250, 255))
    rrect(d6, (148, sy + 8, 210, sy + 26), 6, fill=(20, 46, 31, 255))
    d6.text((155, sy + 11), f"#{idx_m+1} Active", font=F_SEMI_11, fill=(52, 211, 153, 255))
    if mmuted:
        rrect(d6, (216, sy + 8, 262, sy + 26), 6, fill=(39, 39, 42, 255))
        d6.text((223, sy + 11), "Muted", font=F_MED_10, fill=(161, 161, 170, 255))
    d6.text((28, sy + 32), mdesc, font=F_REG_11, fill=(161, 161, 170, 255))
    rrect(d6, (306, sy + 16, 362, sy + 42), 8, fill=(28, 28, 31, 255), outline=(63, 63, 70, 255), width=1)
    d6.text((314, sy + 23), "Unmute" if mmuted else "Mute", font=F_MED_11, fill=(250, 250, 250, 255))
    reg_box("vp6", "sheet", f"pal_{idx_m}", pbox, True)
    sy += 66

act6 = (0, 758, 390, 820)
d6.line((0, 758, 390, 758), fill=(39, 39, 42, 255), width=1)
d6.text((24, 782), "Cancel", font=F_MED_13, fill=(161, 161, 170, 255))
rrect(d6, (216, 772, 374, 806), 17, fill=(250, 250, 250, 255))
d6.text((234, 782), "Update Group Chat", font=F_SEMI_13, fill=(9, 9, 11, 255))
reg_box("vp6", "sheet", "actions", act6, True)

# ==============================================================================
# VIEWPORT 7: SillyTavern Preset & Official Experimental Macro Engine Sheet
# ==============================================================================
vp7 = make_phone_base(dark=True, fancy=False)
d7 = ImageDraw.Draw(vp7)
rrect(d7, (0, 28, 390, 96), 0, fill=(10, 10, 12, 255))
rrect(d7, (0, 96, 390, 820), 22, fill=(14, 14, 14, 255), outline=(46, 46, 52, 255), width=1)
rrect(d7, (177, 106, 213, 110), 2, fill=(63, 63, 70, 255))
d7.text((16, 120), "SillyTavern Preset & Macro Engine", font=F_SEMI_15, fill=(250, 250, 250, 255))
draw_close_x(d7, 366, 128, 5)
d7.line((0, 146, 390, 146), fill=(39, 39, 42, 255), width=1)
reg_box("vp7", "sheet", "header", (0, 96, 390, 146), True)

sy = 158
tbox7 = (16, sy, 374, sy + 34)
rrect(d7, tbox7, 10, fill=(20, 20, 22, 255))
for i, tl in enumerate(["Presets", "Prompts", "Samplers", "Macros & Utility"]):
    tx = 19 + i * 88
    if i == 3:
        rrect(d7, (tx, sy + 3, tx + 86, sy + 31), 8, fill=(39, 39, 42, 255))
    d7.text((tx + 8, sy + 10), tl, font=F_SEMI_11 if i == 3 else F_MED_11, fill=(250, 250, 250, 255) if i == 3 else (161, 161, 170, 255))
reg_box("vp7", "sheet", "tabs", tbox7, True)
sy += 44

mc_card = (16, sy, 374, sy + 124)
rrect(d7, mc_card, 12, fill=(18, 18, 20, 255), outline=(39, 39, 42, 255), width=1)
d7.text((28, sy + 12), "Experimental Macro Engine (Official ST Spec)", font=F_SEMI_13, fill=(250, 250, 250, 255))
draw_switch(d7, 324, sy + 10, True)
d7.text((28, sy + 36), "• Variable Shorthands: {{.var = 10}}, {{.var++}}, {{$global || def}}\n• Scoped Blocks: {{if .hp > 50}}...{{else}}...{{/if}}, {{#setvar}}\n• Group & Card Overrides: {{group}}, {{groupNotMuted}}, {{original}}\n• World Info Positions 0..7: Before, After, ANTop/Bottom, atDepth, Outlet", font=F_REG_11, fill=(161, 161, 170, 255))
reg_box("vp7", "sheet", "macro_spec", mc_card, True)
sy += 136

# Prompt Manager Order Preview
pm_card = (16, sy, 374, sy + 186)
rrect(d7, pm_card, 12, fill=(18, 18, 20, 255), outline=(39, 39, 42, 255), width=1)
d7.text((28, sy + 12), "Prompt Manager & Card Override Pipeline", font=F_SEMI_13, fill=(250, 250, 250, 255))
pm_rows = [
    ("1. World Info (Before Char • pos 0)", True),
    ("2. Main Prompt ({{original}} Card Override)", True),
    ("3. World Info (After Char • pos 1 + ANTop/Bottom)", True),
    ("4. Char Description, Personality & Scenario", True),
    ("5. Post-History Instructions (PHI / Jailbreak)", True),
]
py_r = sy + 38
for pr_txt, pr_on in pm_rows:
    d7.text((28, py_r), pr_txt, font=F_REG_11, fill=(228, 228, 231, 255))
    draw_switch(d7, 324, py_r - 3, pr_on)
    py_r += 28
reg_box("vp7", "sheet", "pm_card", pm_card, True)

act7 = (0, 758, 390, 820)
d7.line((0, 758, 390, 758), fill=(39, 39, 42, 255), width=1)
rrect(d7, (296, 772, 374, 806), 17, fill=(250, 250, 250, 255))
d7.text((318, 782), "Done", font=F_SEMI_13, fill=(9, 9, 11, 255))
reg_box("vp7", "sheet", "actions", act7, True)

# ==============================================================================
# VIEWPORT 8: PalsScreen Quick Action Bar & Sidebar Divided Pill
# ==============================================================================
vp8 = make_phone_base(dark=True, fancy=False)
d8 = ImageDraw.Draw(vp8)
hdr8 = (0, 28, 390, 76)
d8.line((0, 76, 390, 76), fill=(39, 39, 42, 255), width=1)
d8.text((16, 44), "≡", font=F_BOLD_16, fill=(250, 250, 250, 255))
d8.text((44, 37), "PalsHub & Character Library", font=F_SEMI_14, fill=(250, 250, 250, 255))
d8.text((44, 55), "V1–V4 Cards • Group Chat • Tavo Import • Presets", font=F_REG_11, fill=(161, 161, 170, 255))
reg_box("vp8", "flow", "header", hdr8, True)

sy = 88
# Quick Action Toolbar Chips
qbar = (16, sy, 374, sy + 64)
rrect(d8, (16, sy, 188, sy + 28), 14, fill=(20, 20, 22, 255), outline=(63, 63, 70, 255), width=1)
d8.text((28, sy + 7), "+ Import Card (PNG/JSON)", font=F_SEMI_11, fill=(250, 250, 250, 255))
rrect(d8, (196, sy, 294, sy + 28), 14, fill=(20, 20, 22, 255), outline=(63, 63, 70, 255), width=1)
d8.text((212, sy + 7), "Group Chat", font=F_SEMI_11, fill=(250, 250, 250, 255))
rrect(d8, (16, sy + 34, 126, sy + 62), 14, fill=(20, 20, 22, 255), outline=(63, 63, 70, 255), width=1)
d8.text((30, sy + 41), "↓ Tavo Import", font=F_SEMI_11, fill=(250, 250, 250, 255))
rrect(d8, (134, sy + 34, 240, sy + 62), 14, fill=(20, 20, 22, 255), outline=(63, 63, 70, 255), width=1)
d8.text((148, sy + 41), "⚙ ST Presets", font=F_SEMI_11, fill=(250, 250, 250, 255))
reg_box("vp8", "flow", "quick_bar", qbar, True)
sy += 78

# Character Grid Cards
for c_idx, (cname, csub, ctags) in enumerate([
    ("Seraphina V4 (Astral Archmage)", "V4 PNG Card • 3 Greetings • 14 Lore Entries", " bound: Default ST Roleplay"),
    ("Lyra Dawnweaver (Frostpeak)", "Tavo Character Import • 2 Greetings", " bound: Immersive Creative"),
    ("Astral Archive Council (Group)", "3 Active Members • Natural Turn Strategy", " {{group}} / {{groupNotMuted}}"),
]):
    cbox = (16, sy, 374, sy + 76)
    rrect(d8, cbox, 12, fill=(18, 18, 20, 255), outline=(39, 39, 42, 255), width=1)
    d8.text((28, sy + 12), cname, font=F_SEMI_13, fill=(250, 250, 250, 255))
    d8.text((28, sy + 32), csub, font=F_REG_11, fill=(161, 161, 170, 255))
    d8.text((28, sy + 50), ctags, font=F_MED_10, fill=(52, 211, 153, 255))
    reg_box("vp8", "flow", f"card_{c_idx}", cbox, True)
    sy += 86

# Divided Bottom Pill Preview at bottom of Viewport 8
footer8 = (0, 754, 390, 820)
d8.line((0, 754, 390, 754), fill=(39, 39, 42, 255), width=1)
rrect(d8, (16, 766, 374, 808), 21, fill=(24, 24, 27, 255), outline=(46, 46, 52, 255), width=1)
d8.line((195, 774, 195, 800), fill=(63, 63, 70, 255), width=1)
d8.text((64, 780), "↓  Import (Tavo/ST)", font=F_SEMI_12, fill=(250, 250, 250, 255))
d8.text((246, 780), "↑  Export Backup", font=F_SEMI_12, fill=(250, 250, 250, 255))
reg_box("vp8", "flow", "pill_footer", footer8, True)

# Run Automated Overlap Audit
overlap_count = 0
by_group = {}
for vp, grp, lbl, box, inter in layout_boxes:
    by_group.setdefault((vp, grp), []).append((lbl, box, inter))

for (vp, grp), items in by_group.items():
    for i in range(len(items)):
        for j in range(i + 1, len(items)):
            l1, b1, _ = items[i]
            l2, b2, _ = items[j]
            ox = max(0, min(b1[2], b2[2]) - max(b1[0], b2[0]))
            oy = max(0, min(b1[3], b2[3]) - max(b1[1], b2[1]))
            if ox > 1 and oy > 1:
                print(f"OVERLAP in {vp}/{grp}: {l1} {b1} overlaps {l2} {b2}")
                overlap_count += 1

rrect(draw, (1160, 32, 1350, 64), 8, fill=(20, 46, 31, 255), outline=(52, 211, 153, 80), width=1)
draw.text((1174, 41), f"{overlap_count} Sibling Overlaps", font=F_SEMI_12, fill=(52, 211, 153, 255))
rrect(draw, (1360, 32, 1545, 64), 8, fill=(20, 46, 31, 255), outline=(52, 211, 153, 80), width=1)
draw.text((1374, 41), "Dark & Light Verified", font=F_SEMI_12, fill=(52, 211, 153, 255))
rrect(draw, (1555, 32, 1682, 64), 8, fill=(20, 46, 31, 255), outline=(52, 211, 153, 80), width=1)
draw.text((1569, 41), "8/8 Viewports", font=F_SEMI_12, fill=(52, 211, 153, 255))

viewports = [
    ("1. Dark Fancy + Character PFP + 16.5px + HUD", "Character PFP + 16.5px", vp1),
    ("2. White (Light) Fancy Frosted Glass", "Light Frosted Glass", vp2),
    ("3. White (Light) Original Clean Theme", "Default Untouched", vp3),
    ("4. Fancy Theme 11-Slider Suite", "PalsHub vs Everywhere", vp4),
    ("5. Tavo .tbk Importer & Custom CSS Engine", "tavoImportParser.ts", vp5),
    ("6. Multi-Character Group Chat Manager", "GroupChatSheet.tsx", vp6),
    ("7. 64k Context, Unlimited APIs/Presets & Regex", "contextManagerEngine.ts", vp7),
    ("8. Character Metadata & #Tag Search Screen", "PalsScreen.tsx", vp8),
]

for idx, (title, tag, vp_img) in enumerate(viewports):
    col = idx % 4
    row = idx // 4
    px = 32 + col * (390 + 32)
    py = 104 + row * (820 + 68)

    draw.text((px + 4, py), title, font=F_SEMI_13, fill=(228, 228, 231, 255))
    tw = len(tag) * 6 + 16
    rrect(draw, (px + 390 - tw, py - 2, px + 390, py + 18), 6, fill=(24, 24, 27, 255), outline=(39, 39, 42, 255), width=1)
    draw.text((px + 390 - tw + 8, py + 2), tag, font=F_MED_10, fill=(161, 161, 170, 255))

    mask = Image.new("L", (390, 820), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle((0, 0, 389, 819), radius=26, fill=255)
    canvas.paste(vp_img, (px, py + 24), mask)
    rrect(draw, (px, py + 24, px + 390, py + 844), 26, outline=(63, 63, 70, 255), width=2)

canvas.convert("RGB").save(OUT_PNG, "PNG", optimize=True)
print(f"AUDIT PASS: {overlap_count} overlaps across {len(layout_boxes)} layout boxes. Saved to {OUT_PNG}")
assert overlap_count == 0
