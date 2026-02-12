"""
Generate RoadReady app icon and splash screen assets.

Assets:
  - icon.png (1024x1024) — "RR" monogram on teal circle
  - adaptive-icon.png (1024x1024) — "RR" monogram with safe-zone padding
  - favicon.png (48x48) — small "RR" monogram
  - splash.png (1284x2778) — RoadReady logo on teal gradient
"""

import os

from PIL import Image, ImageDraw, ImageFont

# ── Colours ──────────────────────────────────────────────────────────
TEAL_600 = (13, 148, 136)       # #0D9488
TEAL_700 = (15, 118, 110)       # #0F766E
TEAL_800 = (17, 94, 89)         # #115E59
TEAL_900 = (19, 78, 74)         # #134E4A
WHITE    = (255, 255, 255)
AMBER    = (245, 158, 11)       # #F59E0B  (accent)

# Output paths
ICONS_DIR  = os.path.join("frontend", "assets", "icons")
IMAGES_DIR = os.path.join("frontend", "assets", "images")


def draw_rounded_rect(draw, xy, radius, fill):
    """Draw a rounded rectangle (Pillow < 10 compat)."""
    x0, y0, x1, y1 = xy
    r = radius
    draw.rectangle([x0 + r, y0, x1 - r, y1], fill=fill)
    draw.rectangle([x0, y0 + r, x1, y1 - r], fill=fill)
    draw.pieslice([x0, y0, x0 + 2 * r, y0 + 2 * r], 180, 270, fill=fill)
    draw.pieslice([x1 - 2 * r, y0, x1, y0 + 2 * r], 270, 360, fill=fill)
    draw.pieslice([x0, y1 - 2 * r, x0 + 2 * r, y1], 90, 180, fill=fill)
    draw.pieslice([x1 - 2 * r, y1 - 2 * r, x1, y1], 0, 90, fill=fill)


def draw_rr_monogram(draw, cx, cy, size, color=WHITE, weight=None):
    """Draw a stylised 'RR' monogram using geometric shapes.
    
    Each R is built from:
      - A vertical stem (rectangle)
      - A bowl (arc at the top right)
      - A diagonal leg (polygon)
    """
    if weight is None:
        weight = max(2, int(size * 0.12))

    letter_h = int(size * 0.60)
    letter_w = int(size * 0.30)
    gap = int(size * 0.04)

    # Position two R letters side by side
    left_x = cx - letter_w - gap // 2
    right_x = cx + gap // 2
    top_y = cy - letter_h // 2

    for lx in (left_x, right_x):
        _draw_letter_r(draw, lx, top_y, letter_w, letter_h, weight, color)


def _draw_letter_r(draw, x, y, w, h, stroke, color):
    """Draw a single capital R letter using thick lines."""
    mid_y = y + h * 0.48

    # Vertical stem
    draw.rectangle([x, y, x + stroke, y + h], fill=color)

    # Top horizontal bar
    draw.rectangle([x, y, x + w * 0.65, y + stroke], fill=color)

    # Middle horizontal bar
    draw.rectangle([x, y + int(h * 0.48) - stroke // 2,
                    x + w * 0.65, y + int(h * 0.48) + stroke // 2], fill=color)

    # Right vertical of bowl
    bowl_right = x + int(w * 0.65)
    draw.rectangle([bowl_right - stroke, y, bowl_right, y + int(h * 0.48)], fill=color)

    # Diagonal leg — from middle to bottom right
    leg_top_x = x + stroke
    leg_top_y = int(mid_y)
    leg_bot_x = x + w
    leg_bot_y = y + h

    # Draw thick diagonal as polygon
    dx = stroke * 0.7
    draw.polygon([
        (leg_top_x, leg_top_y - stroke // 2),
        (leg_top_x + stroke, leg_top_y - stroke // 2),
        (leg_bot_x + dx, leg_bot_y),
        (leg_bot_x - dx, leg_bot_y),
    ], fill=color)


def generate_gradient(width, height, top_color, bottom_color):
    """Create a vertical linear gradient image."""
    img = Image.new("RGBA", (width, height))
    for row in range(height):
        ratio = row / (height - 1)
        r = int(top_color[0] + (bottom_color[0] - top_color[0]) * ratio)
        g = int(top_color[1] + (bottom_color[1] - top_color[1]) * ratio)
        b = int(top_color[2] + (bottom_color[2] - top_color[2]) * ratio)
        for col in range(width):
            img.putpixel((col, row), (r, g, b, 255))
    return img


def generate_gradient_fast(width, height, top_color, bottom_color):
    """Create a vertical linear gradient image (fast, line-by-line)."""
    img = Image.new("RGB", (width, height))
    draw = ImageDraw.Draw(img)
    for row in range(height):
        ratio = row / max(1, height - 1)
        r = int(top_color[0] + (bottom_color[0] - top_color[0]) * ratio)
        g = int(top_color[1] + (bottom_color[1] - top_color[1]) * ratio)
        b = int(top_color[2] + (bottom_color[2] - top_color[2]) * ratio)
        draw.line([(0, row), (width, row)], fill=(r, g, b))
    return img


# ── Icon (1024×1024) ─────────────────────────────────────────────────
def make_icon(size=1024):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Teal rounded-square background
    margin = int(size * 0.02)
    radius = int(size * 0.22)
    draw_rounded_rect(draw, (margin, margin, size - margin, size - margin),
                      radius, TEAL_600)

    # Subtle inner shadow / darker bottom half for depth
    for row in range(size // 2, size - margin):
        ratio = (row - size // 2) / (size // 2)
        alpha = int(25 * ratio)
        draw.line([(margin, row), (size - margin, row)],
                  fill=(0, 0, 0, alpha))

    # "RR" monogram
    draw_rr_monogram(draw, size // 2, size // 2, int(size * 0.6), WHITE)

    # Small amber accent bar under the letters
    bar_w = int(size * 0.30)
    bar_h = int(size * 0.035)
    bar_x = (size - bar_w) // 2
    bar_y = size // 2 + int(size * 0.24)
    draw_rounded_rect(draw,
                      (bar_x, bar_y, bar_x + bar_w, bar_y + bar_h),
                      bar_h // 2, AMBER)

    return img


# ── Adaptive Icon (1024×1024) — more padding for Android safe zone ──
def make_adaptive_icon(size=1024):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Full teal background (Android applies its own mask)
    draw.rectangle([0, 0, size, size], fill=TEAL_600)

    # "RR" monogram — smaller to stay within 66% safe zone
    mono_size = int(size * 0.42)
    draw_rr_monogram(draw, size // 2, size // 2, mono_size, WHITE)

    # Amber accent bar
    bar_w = int(size * 0.22)
    bar_h = int(size * 0.03)
    bar_x = (size - bar_w) // 2
    bar_y = size // 2 + int(mono_size * 0.38)
    draw_rounded_rect(draw,
                      (bar_x, bar_y, bar_x + bar_w, bar_y + bar_h),
                      bar_h // 2, AMBER)

    return img


# ── Favicon (48×48) ──────────────────────────────────────────────────
def make_favicon(size=48):
    # Generate at high res then scale down for quality
    hi = make_icon(512)
    return hi.resize((size, size), Image.LANCZOS)


# ── Splash (1284×2778) ───────────────────────────────────────────────
def make_splash(width=1284, height=2778):
    # Teal gradient background
    img = generate_gradient_fast(width, height, TEAL_600, TEAL_900)
    draw = ImageDraw.Draw(img)

    cx, cy = width // 2, height // 2 - int(height * 0.04)

    # Large "RR" monogram
    mono_size = int(width * 0.45)
    draw_rr_monogram(draw, cx, cy - int(height * 0.03), mono_size, WHITE,
                     weight=int(mono_size * 0.11))

    # Amber accent bar
    bar_w = int(width * 0.25)
    bar_h = int(width * 0.025)
    bar_x = (width - bar_w) // 2
    bar_y = cy + int(mono_size * 0.30)
    draw_rounded_rect(draw,
                      (bar_x, bar_y, bar_x + bar_w, bar_y + bar_h),
                      bar_h // 2, AMBER)

    # "RoadReady" text below — use a large built-in font
    text = "RoadReady"
    text_y = bar_y + bar_h + int(height * 0.025)

    # Try to use a system font, fall back to default
    font_size = int(width * 0.09)
    try:
        font = ImageFont.truetype("arial.ttf", font_size)
    except (OSError, IOError):
        try:
            font = ImageFont.truetype("DejaVuSans-Bold.ttf", font_size)
        except (OSError, IOError):
            font = ImageFont.load_default()

    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    draw.text((cx - tw // 2, text_y), text, fill=WHITE, font=font)

    # Subtitle
    sub_text = "Your Road to Freedom"
    sub_size = int(width * 0.035)
    try:
        sub_font = ImageFont.truetype("arial.ttf", sub_size)
    except (OSError, IOError):
        try:
            sub_font = ImageFont.truetype("DejaVuSans.ttf", sub_size)
        except (OSError, IOError):
            sub_font = ImageFont.load_default()

    sub_bbox = draw.textbbox((0, 0), sub_text, font=sub_font)
    stw = sub_bbox[2] - sub_bbox[0]
    sub_y = text_y + font_size + int(height * 0.012)
    draw.text((cx - stw // 2, sub_y), sub_text, fill=(*AMBER, ), font=sub_font)

    return img.convert("RGB")


# ── Main ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    os.makedirs(ICONS_DIR, exist_ok=True)
    os.makedirs(IMAGES_DIR, exist_ok=True)

    print("Generating icon.png (1024x1024)...")
    icon = make_icon(1024)
    icon.save(os.path.join(ICONS_DIR, "icon.png"), "PNG")
    print("  ✓ Saved")

    print("Generating adaptive-icon.png (1024x1024)...")
    adaptive = make_adaptive_icon(1024)
    adaptive.save(os.path.join(ICONS_DIR, "adaptive-icon.png"), "PNG")
    print("  ✓ Saved")

    print("Generating favicon.png (48x48)...")
    fav = make_favicon(48)
    fav.save(os.path.join(ICONS_DIR, "favicon.png"), "PNG")
    print("  ✓ Saved")

    print("Generating splash.png (1284x2778)...")
    splash = make_splash(1284, 2778)
    splash.save(os.path.join(IMAGES_DIR, "splash.png"), "PNG")
    print("  ✓ Saved")

    print("\nAll assets generated successfully!")
    print(f"  Icons:  {os.path.abspath(ICONS_DIR)}")
    print(f"  Splash: {os.path.abspath(IMAGES_DIR)}")
