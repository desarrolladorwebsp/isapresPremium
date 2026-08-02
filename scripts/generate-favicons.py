#!/usr/bin/env python3
"""Genera favicons y assets PWA desde el icono oficial de Cotizador Premium."""

from __future__ import annotations

import shutil
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public" / "images" / "icono-logo-cotizador-premium.png"
PUBLIC = ROOT / "public"
APP = ROOT / "src" / "app"

PNG_SIZES: dict[str, int] = {
    "favicon-16x16.png": 16,
    "favicon-32x32.png": 32,
    "favicon-48x48.png": 48,
    "apple-touch-icon.png": 180,
    "android-chrome-192x192.png": 192,
    "android-chrome-512x512.png": 512,
    "icon-192.png": 192,
    "icon-512.png": 512,
}

ICO_SIZES = (16, 32, 48)


def load_square_logo() -> Image.Image:
    image = Image.open(SOURCE).convert("RGBA")
    width, height = image.size
    side = min(width, height)
    left = (width - side) // 2
    top = (height - side) // 2
    return image.crop((left, top, left + side, top + side))


def save_png(image: Image.Image, path: Path, size: int) -> None:
    resized = image.resize((size, size), Image.Resampling.LANCZOS)
    resized.save(path, format="PNG", optimize=True)


def save_ico(image: Image.Image, path: Path) -> None:
    frames = [
        image.resize((size, size), Image.Resampling.LANCZOS) for size in ICO_SIZES
    ]
    frames[0].save(
        path,
        format="ICO",
        sizes=[(frame.width, frame.height) for frame in frames],
        append_images=frames[1:],
    )


def main() -> None:
    if not SOURCE.exists():
        raise FileNotFoundError(f"No se encontró el icono: {SOURCE}")

    logo = load_square_logo()
    PUBLIC.mkdir(parents=True, exist_ok=True)
    APP.mkdir(parents=True, exist_ok=True)

    for filename, size in PNG_SIZES.items():
        save_png(logo, PUBLIC / filename, size)
        print(f"  {filename} ({size}x{size})")

    save_ico(logo, PUBLIC / "favicon.ico")
    print("  favicon.ico (16, 32, 48)")

    # Next.js App Router — detección automática de iconos
    save_png(logo, APP / "icon.png", 32)
    save_png(logo, APP / "apple-icon.png", 180)
    shutil.copy2(PUBLIC / "favicon.ico", APP / "favicon.ico")

    print("\nFavicons generados desde icono-logo-cotizador-premium.png")


if __name__ == "__main__":
    main()
