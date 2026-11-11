#!/usr/bin/env python3
"""Build `MinecraftSC-Regular.{ttf,woff2}` in this directory from GNU Unifont.

The font contains only:
  * printable ASCII (English letters, digits, punctuation)
  * GB2312 Simplified Chinese (6763 hanzi + Chinese punctuation)

Unifont draws every Han glyph on a 16x16 grid, but the ink is narrower than
16px for many characters (e.g. 自 is 9px wide) while every glyph advances a
full 16px.  In running text that reads as uneven letter-spacing.  This script
gives every Han glyph an advance of `ink width + 1px` and left-aligns the ink,
so the visible gap between any two characters is exactly one pixel.

Usage:
    python3 minecraft-sc-src/build-minecraft-sc-font.py            # download + build
    python3 minecraft-sc-src/build-minecraft-sc-font.py --cjk unifont.otf

Requires fontTools >= 4.40 (and brotli for WOFF2):
    python3 -m pip install --user fonttools brotli
"""

from __future__ import annotations

import argparse
import sys
import urllib.request
from pathlib import Path

from fontTools.misc.roundTools import otRound
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont, newTable
from fontTools.ttLib.scaleUpem import scale_upem

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
OUT_DIR = HERE
CACHE_DIR = ROOT / "node_modules" / ".cache" / "minecraft-sc"

# Unifont's own grid: 16px per em, 4 units per pixel at its native UPM of 64.
# Scaling x16 gives 64 units per pixel, i.e. a clean 1024 UPM.
TARGET_UPEM = 1024
PIXEL = TARGET_UPEM // 16          # 64 units
HAN_GAP = 1 * PIXEL                # one blank pixel between Han glyphs

SOURCE = (
    "https://unifoundry.com/pub/unifont/unifont-18.0.01/font-builds/unifont-18.0.01.otf"
)

# GB2312 rows that matter for Simplified Chinese text:
#   A1-A3  punctuation, symbols, fullwidth ASCII
#   B0-F7  the 6763 hanzi
# Rows A4-A9 (kana, Greek, Cyrillic, box drawing) are deliberately skipped.
GB2312_ROWS = ((0xA1, 0xA3), (0xB0, 0xF7))

# Printable ASCII is added on top of GB2312.
ASCII = range(0x20, 0x7F)

# Common Chinese marks that are not in GB2312's mapping.
EXTRA_CODEPOINTS = {
    0x00B7,  # ·
    0x2014,  # — (Chinese —— is typed as two of these)
}

# Han ideographs get proportional (ink-based) advances.
HAN_RANGES = ((0x4E00, 0x9FFF),)

# Fullwidth punctuation keeps its 16px advance.  Like system CJK fonts, closing
# marks (，。》！？) sit at the left of the cell and opening marks (（《“) at the
# right, so the ink hugs the neighbouring text; only … and · are centred.
PUNCT_RANGES = ((0x3000, 0x303F), (0xFF00, 0xFFEF), (0x2010, 0x2027))

OPENING_PUNCT = {
    0x2018, 0x201C,                                      # ‘ “
    0x3008, 0x300A, 0x300C, 0x300E, 0x3010,              # 〈 《 「 『 【
    0x3014, 0x3016, 0x3018, 0x301A,                      # 〔 〖 〘 〚
    0xFF08, 0xFF3B, 0xFF5B,                              # （ ［ ｛
}

CLOSING_PUNCT = {
    0x2019, 0x201D,                                      # ’ ”
    0x3001, 0x3002, 0x3009, 0x300B, 0x300D, 0x300F,      # 、 。 〉 》 」 』
    0x3011, 0x3015, 0x3017, 0x3019, 0x301B,              # 】 〕 〗 〙 〛
    0xFF01, 0xFF09, 0xFF0C, 0xFF0E, 0xFF1A, 0xFF1B, 0xFF1F,  # ！ ） ， ． ： ； ？
    0xFF3D, 0xFF5D,                                      # ］ ｝
}

# One-pixel bearings, matching how the system CJK fonts place their marks.
PUNCT_BEARING = 1 * PIXEL

# Unifont draws these on a half-width cell, but Chinese typography gives them
# a full 1em box (the ink sits at one side of it).
WIDEN_TO_FULL = {0x2018, 0x2019, 0x201C, 0x201D, 0x2026}


def wanted_codepoints() -> set[int]:
    out: set[int] = set(ASCII) | EXTRA_CODEPOINTS
    for first, last in GB2312_ROWS:
        for hi in range(first, last + 1):
            for lo in range(0xA1, 0xFF):
                try:
                    out.add(ord(bytes((hi, lo)).decode("gb2312")))
                except UnicodeDecodeError:
                    pass
    return out


def download(url: str, dest: Path) -> Path:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if not dest.exists():
        print(f"downloading {url}")
        urllib.request.urlretrieve(url, dest)
    return dest


def cff_to_truetype(font: TTFont, max_err: float = 1.0) -> TTFont:
    """Convert CFF outlines to quadratic `glyf` outlines in place."""
    glyph_order = font.getGlyphOrder()
    glyph_set = font.getGlyphSet()

    glyf = newTable("glyf")
    glyf.glyphOrder = glyph_order
    glyf.glyphs = {}
    max_components = 0
    for name in glyph_order:
        pen = TTGlyphPen(glyph_set)
        glyph_set[name].draw(Cu2QuPen(pen, max_err, reverse_direction=True))
        glyph = pen.glyph()
        glyph.recalcBounds(glyf)
        glyf.glyphs[name] = glyph
        max_components = max(max_components, len(getattr(glyph, "components", [])))

    del font["CFF "]
    for tag in ("VORG", "DSIG", "FFTM", "GDEF", "GPOS", "GSUB"):
        if tag in font:
            del font[tag]
    font["glyf"] = glyf
    font["loca"] = newTable("loca")

    maxp = newTable("maxp")
    maxp.tableVersion = 0x00010000
    maxp.numGlyphs = len(glyph_order)
    maxp.maxPoints = max(
        (len(g.coordinates) for g in glyf.glyphs.values() if g.numberOfContours > 0),
        default=0,
    )
    maxp.maxContours = max(
        (g.numberOfContours for g in glyf.glyphs.values() if g.numberOfContours > 0),
        default=0,
    )
    maxp.maxCompositePoints = 0
    maxp.maxCompositeContours = 0
    maxp.maxComponentElements = max_components
    maxp.maxComponentDepth = 0
    maxp.maxZones = 1
    maxp.maxTwilightPoints = 0
    maxp.maxStorage = 0
    maxp.maxFunctionDefs = 0
    maxp.maxInstructionDefs = 0
    maxp.maxStackElements = 0
    maxp.maxSizeOfInstructions = 0
    font["maxp"] = maxp

    font["head"].glyphDataFormat = 0
    font.sfntVersion = "\x00\x01\x00\x00"
    return font


def tighten_han_spacing(font: TTFont) -> None:
    """Left-align Han ink and advance it by (ink width + one pixel)."""
    glyf = font["glyf"]
    hmtx = font["hmtx"]
    cmap = font.getBestCmap()
    changed = 0

    for cp, name in cmap.items():
        if not any(lo <= cp <= hi for lo, hi in HAN_RANGES):
            continue
        glyph = glyf[name]
        if glyph.numberOfContours <= 0:
            continue
        ink = glyph.xMax - glyph.xMin
        glyph.coordinates.translate((-glyph.xMin, 0))
        glyph.recalcBounds(glyf)
        hmtx[name] = (otRound(ink + HAN_GAP), 0)
        changed += 1
    print(f"re-spaced {changed} Han glyphs")


def place_wide_punctuation(font: TTFont) -> None:
    """Align punctuation ink the way system CJK fonts do (see OPENING/CLOSING)."""
    glyf = font["glyf"]
    hmtx = font["hmtx"]
    cmap = font.getBestCmap()
    changed = 0

    for cp, name in cmap.items():
        if cp == 0x3000 or not any(lo <= cp <= hi for lo, hi in PUNCT_RANGES):
            continue
        glyph = glyf[name]
        if glyph.numberOfContours <= 0:
            continue
        advance = hmtx[name][0]
        if cp in WIDEN_TO_FULL:
            advance = 16 * PIXEL
        ink = glyph.xMax - glyph.xMin
        if ink >= advance:
            continue
        if cp in OPENING_PUNCT:
            left = advance - ink - PUNCT_BEARING
        elif cp in CLOSING_PUNCT:
            left = PUNCT_BEARING
        else:
            left = otRound((advance - ink) / 2 / PIXEL) * PIXEL
        glyph.coordinates.translate((left - glyph.xMin, 0))
        glyph.recalcBounds(glyf)
        hmtx[name] = (advance, left)
        changed += 1
    print(f"placed {changed} punctuation glyphs")


def space_ascii(font: TTFont) -> None:
    """Give ASCII proportional advances (ink width + one pixel each side).

    Unifont's ASCII is monospaced on an 8px grid, which leaves e.g. 4px of
    dead space before "[" and 3px around ".".  System Latin fonts set spacing
    from the glyph's actual ink instead.
    """
    glyf = font["glyf"]
    hmtx = font["hmtx"]
    cmap = font.getBestCmap()
    bearing = 1 * PIXEL
    changed = 0

    for cp in range(0x21, 0x7F):
        name = cmap.get(cp)
        if name is None:
            continue
        glyph = glyf[name]
        if glyph.numberOfContours <= 0:
            continue
        ink = glyph.xMax - glyph.xMin
        glyph.coordinates.translate((bearing - glyph.xMin, 0))
        glyph.recalcBounds(glyf)
        hmtx[name] = (ink + 2 * bearing, bearing)
        changed += 1

    space = cmap.get(0x20)
    if space is not None:
        hmtx[space] = (4 * PIXEL, 0)  # 0.25em, like Songti SC
    print(f"re-spaced {changed} ASCII glyphs")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--cjk", type=Path, help="unifont.otf")
    ap.add_argument("--out", type=Path, default=OUT_DIR / "MinecraftSC-Regular.ttf")
    args = ap.parse_args()

    cjk_path = args.cjk or download(SOURCE, CACHE_DIR / "unifont.otf")
    cjk = TTFont(cjk_path, recalcBBoxes=False, recalcTimestamp=False)
    print(f"unifont: {len(cjk.getGlyphOrder())} glyphs, upem {cjk['head'].unitsPerEm}")

    codepoints = wanted_codepoints() & set(cjk.getBestCmap())
    print(f"subset: {len(codepoints)} codepoints")

    opts = Options()
    opts.hinting = False
    opts.desubroutinize = True
    opts.layout_features = []
    opts.name_IDs = ["*"]
    opts.name_legacy = True
    opts.notdef_outline = True
    opts.recalc_bounds = True
    opts.drop_tables += ["DSIG"]
    subsetter = Subsetter(options=opts)
    subsetter.populate(unicodes=codepoints)
    subsetter.subset(cjk)

    scale_upem(cjk, TARGET_UPEM)
    cff_to_truetype(cjk)
    tighten_han_spacing(cjk)
    space_ascii(cjk)
    place_wide_punctuation(cjk)

    # --- identity -------------------------------------------------------
    family = "Minecraft SC"
    ps_name = "MinecraftSC-Regular"
    names = {
        0: "Copyright © 1998-2026 Roman Czyborra, Paul Hardy, et al. (GNU Unifont)",
        1: family,
        2: "Regular",
        3: f"{family}; Version 1.0; {ps_name}",
        4: family,
        6: ps_name,
        16: family,
        17: "Regular",
    }
    name_table = cjk["name"]
    for name_id in names:
        name_table.removeNames(nameID=name_id)
    for name_id, value in names.items():
        name_table.setName(value, name_id, 3, 1, 0x409)  # Windows / Unicode BMP
        name_table.setName(value, name_id, 1, 0, 0)      # Mac / Roman

    os2 = cjk["OS/2"]
    os2.fsType = 0                    # installable embedding
    os2.achVendID = "MOON"
    os2.sTypoAscender = 896
    os2.sTypoDescender = -128
    os2.sTypoLineGap = 0
    os2.usWinAscent = 896
    os2.usWinDescent = 128
    os2.panose.bFamilyType = 2
    os2.panose.bProportion = 9

    hhea = cjk["hhea"]
    hhea.ascent = 896
    hhea.descent = -128
    hhea.lineGap = 0

    cjk["head"].unitsPerEm = TARGET_UPEM
    cjk["head"].macStyle = 0
    cjk["head"].flags = 3

    post = cjk["post"]
    post.formatType = 3.0
    post.extraNames = []
    post.mapping = {}

    out_path: Path = args.out
    out_path.parent.mkdir(parents=True, exist_ok=True)
    cjk.save(out_path)
    print(f"wrote {out_path} ({out_path.stat().st_size:,} bytes)")

    cjk.flavor = "woff2"
    woff2_path = out_path.with_suffix(".woff2")
    cjk.save(woff2_path)
    print(f"wrote {woff2_path} ({woff2_path.stat().st_size:,} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
