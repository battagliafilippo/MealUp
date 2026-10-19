from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "tools" / "food-portrait-pipeline" / "assets"
SOURCE = ASSETS / "gauge-canonical-a07-master.png"
CROP = (700, 60, 1210, 480)
PIVOT = (248, 232)
SCALE = 2
REPAIR_SOURCE = ROOT / "docs" / "food-portrait-pipeline" / "candidates" / "do08-yogurt-cheesecake-dessert-mold-approved-001.webp"


def clean_needle(size):
    factor = 4
    canvas = Image.new("RGBA", (size[0] * factor, size[1] * factor), (0, 0, 0, 0))
    shaft = [(110, 149), (118, 142), (132, 145), (236, 210), (232, 223), (119, 157)]
    scaled = [(x * factor, y * factor) for x, y in shaft]
    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.polygon([(x + 2 * factor, y + 3 * factor) for x, y in scaled], fill=(83, 62, 47, 105))
    shadow = shadow.filter(ImageFilter.GaussianBlur(2.2 * factor))
    canvas = Image.alpha_composite(canvas, shadow)
    draw = ImageDraw.Draw(canvas)
    draw.polygon(scaled, fill=(65, 63, 60, 255))
    draw.line([(121 * factor, 145 * factor), (232 * factor, 212 * factor)],
              fill=(119, 114, 108, 210), width=1 * factor)
    return canvas.resize(size, Image.Resampling.LANCZOS)


def silhouette_mask(size):
    # Gauge-only silhouette traced around the approved a07 gauge. The lower-left
    # edge turns above the plate so food pixels cannot enter the runtime layer.
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    draw.polygon([
        (20,170),(27,116),(58,77),(110,47),(176,28),(250,21),
        (326,31),(389,58),(442,107),(478,169),(495,238),(491,305),
        (466,359),(426,398),(392,411),(364,399),(340,360),(315,349),
        (286,370),(236,376),(198,363),(169,337),(153,302),(146,260),
        (128,221),(112,211),(95,230),(67,232),(42,214)
    ],fill=255)
    return mask.filter(ImageFilter.GaussianBlur(1.0))


def blank_text(image):
    pixels = np.asarray(image.convert("RGB")).astype(np.float32).copy()
    height, width = pixels.shape[:2]
    yy, xx = np.mgrid[:height, :width]
    value_area = (xx >= 168) & (xx <= 326) & (yy >= 263) & (yy <= 352)
    neutral_dark = (pixels.max(axis=2) < 190) & ((pixels.max(axis=2)-pixels.min(axis=2)) < 75)
    mask = value_area & neutral_dark
    # Expand only around glyph pixels; do not replace the whole dial.
    expanded = mask.copy()
    for _ in range(4):
        expanded |= np.roll(expanded, 1, 0) | np.roll(expanded, -1, 0)
        expanded |= np.roll(expanded, 1, 1) | np.roll(expanded, -1, 1)
    mask = expanded
    work = pixels.copy()
    work[mask] = np.array([245, 211, 169], dtype=np.float32)
    for _ in range(260):
        average = (np.roll(work, 1, 0) + np.roll(work, -1, 0) +
                   np.roll(work, 1, 1) + np.roll(work, -1, 1)) / 4
        work[mask] = average[mask]
    filled = Image.fromarray(np.clip(work, 0, 255).astype(np.uint8), "RGB").convert("RGBA")
    feather = Image.fromarray((mask.astype(np.uint8) * 255), "L").filter(ImageFilter.GaussianBlur(1.1))
    image.paste(filled, (0, 0), feather)
    return image


def erase_original_pivot(image):
    pixels = np.asarray(image.convert("RGB")).astype(np.float32).copy()
    yy, xx = np.mgrid[:pixels.shape[0], :pixels.shape[1]]
    mask = (((xx - 248) / 39) ** 2 + ((yy - 232) / 39) ** 2) <= 1
    work = pixels.copy()
    work[mask] = np.array([244, 207, 163], dtype=np.float32)
    for _ in range(360):
        average = (np.roll(work, 1, 0) + np.roll(work, -1, 0) +
                   np.roll(work, 1, 1) + np.roll(work, -1, 1)) / 4
        work[mask] = average[mask]
    filled = Image.fromarray(np.clip(work, 0, 255).astype(np.uint8), "RGB").convert("RGBA")
    feather = Image.fromarray((mask.astype(np.uint8) * 255), "L").filter(ImageFilter.GaussianBlur(1.2))
    image.paste(filled, (0, 0), feather)
    return image


def refinish_dial_face(image):
    # The dial face is a simple cream ceramic surface. Rebuilding only its
    # interior at 2x removes text/shaft ghosts while retaining the approved
    # outer rim, housing, coloured arc and shadows untouched.
    width, height = image.size
    yy, xx = np.mgrid[:height, :width]
    top = np.array([251, 222, 184], dtype=np.float32)
    bottom = np.array([242, 188, 135], dtype=np.float32)
    t = np.clip((yy - 174) / 188, 0, 1)[..., None]
    rgb = top * (1 - t) + bottom * t
    highlight = np.clip(1 - np.sqrt(((xx - 236) / 150) ** 2 + ((yy - 238) / 170) ** 2), 0, 1)[..., None]
    rgb = np.clip(rgb + highlight * 4.0, 0, 255).astype(np.uint8)
    face = Image.fromarray(rgb, "RGB").convert("RGBA")
    mask = Image.new("L", image.size, 0)
    ImageDraw.Draw(mask).ellipse((154, 171, 344, 366), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(1.6))
    image.paste(face, (0, 0), mask)
    return image


def clean_shell(source):
    # Keep the approved a07 housing pixel-for-pixel. Replace only its old
    # upper-left shaft with the same area from do08, whose needle is on the
    # opposite side. This avoids a whole-frame blend and its registration halo.
    shell = source.copy()
    repair = Image.open(REPAIR_SOURCE).convert("RGBA").crop(CROP)
    patch = Image.new("L", source.size, 0)
    draw = ImageDraw.Draw(patch)
    draw.polygon([(72, 72), (169, 78), (258, 177), (258, 218),
                  (221, 243), (60, 192)], fill=255)
    patch = patch.filter(ImageFilter.GaussianBlur(5.0))
    shell.paste(repair, (0, 0), patch)
    shell = erase_original_pivot(shell)
    shell = refinish_dial_face(shell)
    # Reuse the same gauge's unobstructed orange secondary button as the pivot.
    # Scaling this approved physical component avoids joining two misaligned
    # half-pivots and removes the last old-needle notch.
    clean_pivot = source.crop((371, 308, 449, 386)).resize((64, 64), Image.Resampling.LANCZOS)
    pivot_mask = Image.new("L", (64, 64), 0)
    ImageDraw.Draw(pivot_mask).ellipse((1, 1, 62, 62), fill=255)
    pivot_mask = pivot_mask.filter(ImageFilter.GaussianBlur(0.55))
    shell.paste(clean_pivot, (216, 200), pivot_mask)
    shell = blank_text(shell)
    shell.putalpha(silhouette_mask(source.size))
    return shell


def main():
    ASSETS.mkdir(parents=True, exist_ok=True)
    source = Image.open(SOURCE).convert("RGBA")
    needle = clean_needle(source.size)
    shell = clean_shell(source)
    recomposed = Image.alpha_composite(shell, needle)

    high_size = (source.width * SCALE, source.height * SCALE)
    shell.resize(high_size, Image.Resampling.LANCZOS).save(
        ASSETS / "gauge-shell-canonical.png", optimize=False)
    needle.resize(high_size, Image.Resampling.LANCZOS).save(
        ASSETS / "gauge-needle-canonical.png", optimize=False)
    recomposed.resize(high_size, Image.Resampling.LANCZOS).save(
        ASSETS / "gauge-a07-recomposition-proof.png", optimize=False)


if __name__ == "__main__":
    main()
