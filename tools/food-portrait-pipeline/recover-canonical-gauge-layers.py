from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "tools" / "food-portrait-pipeline" / "assets"
SOURCE = ASSETS / "gauge-canonical-a07-master.png"
REPAIR_SOURCE = ROOT / "docs" / "food-portrait-pipeline" / "candidates" / "d32-parmigiana-baking-dish-approved-001.webp"
CROP = (700, 60, 1210, 480)
PIVOT = (248, 232)


def needle_mask(size):
    # The broad geometry follows the exact a07 needle. Pixel filtering removes
    # the cream background so the rotated layer cannot carry a rectangular halo.
    source = np.asarray(Image.open(SOURCE).convert("RGB"))
    broad = Image.new("L", size, 0)
    draw = ImageDraw.Draw(broad)
    draw.polygon([(105, 111), (139, 112), (247, 207), (255, 232),
                  (226, 230), (103, 139)], fill=255)
    broad_np = np.asarray(broad) > 0
    spread = source.max(axis=2) - source.min(axis=2)
    dark = (source.max(axis=2) < 190) & (spread < 80)
    exact = broad_np & dark
    green = ((source[:, :, 1] > source[:, :, 0] * 1.08) &
             (source[:, :, 1] > source[:, :, 2] * 1.12))
    exact &= ~green
    return Image.fromarray((exact.astype(np.uint8) * 255), "L")


def shaft_repair_mask(size):
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    draw.polygon([(96, 103), (145, 104), (251, 198), (263, 225),
                  (239, 241), (212, 225), (95, 145)], fill=255)
    return mask.filter(ImageFilter.GaussianBlur(1.0))


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


def blank_number(image):
    pixels = np.asarray(image.convert("RGB")).astype(np.float32).copy()
    height, width = pixels.shape[:2]
    yy, xx = np.mgrid[:height, :width]
    mask = (((xx - 247) / 92) ** 2 + ((yy - 314) / 52) ** 2) <= 1
    work = pixels.copy()
    boundary = pixels[mask == 0].mean(axis=0)
    work[mask] = boundary
    for _ in range(700):
        average = (np.roll(work, 1, 0) + np.roll(work, -1, 0) +
                   np.roll(work, 1, 1) + np.roll(work, -1, 1)) / 4
        work[mask] = average[mask]
    filled = Image.fromarray(np.clip(work, 0, 255).astype(np.uint8), "RGB").convert("RGBA")
    feather = Image.fromarray((mask.astype(np.uint8) * 255), "L").filter(ImageFilter.GaussianBlur(2.0))
    image.paste(filled, (0, 0), feather)
    return image


def main():
    ASSETS.mkdir(parents=True, exist_ok=True)
    source = Image.open(SOURCE).convert("RGBA")
    repair = Image.open(REPAIR_SOURCE).convert("RGBA").crop(CROP)
    nmask = needle_mask(source.size)
    repair_mask = shaft_repair_mask(source.size)

    needle = Image.new("RGBA", source.size, (0, 0, 0, 0))
    needle.paste(source, (0, 0), nmask)
    shell = source.copy()
    shell.paste(repair, (0, 0), repair_mask)
    shell = blank_number(shell)
    recomposed = Image.alpha_composite(shell, needle)

    gauge_alpha = silhouette_mask(source.size)
    shell.putalpha(Image.fromarray(np.minimum(np.asarray(shell.getchannel("A")),
                                               np.asarray(gauge_alpha)).astype(np.uint8)))
    shell.save(ASSETS / "gauge-shell-canonical.png", optimize=False)
    needle.save(ASSETS / "gauge-needle-canonical.png", optimize=False)
    recomposed.save(ASSETS / "gauge-a07-recomposition-proof.png", optimize=False)


if __name__ == "__main__":
    main()
