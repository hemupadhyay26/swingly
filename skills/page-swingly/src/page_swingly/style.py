"""Shared constants for the Swingly asset contract.

These values must stay in sync with the asset contract described in
`.claude/PRD.md` (Sections 3.1 and 6.1): a `main.png` with a fixed anchor
point, and a 3x3 `expressions.png` grid with a fixed row-major label order.
"""

ART_STYLE = (
    "Classic hand-drawn 2D theatrical cartoon style, expressive exaggerated "
    "poses, squash-and-stretch animation aesthetics, bold clean outlines, "
    "vintage cel shading, playful slapstick character design."
)

# Row-major, left-to-right, top-to-bottom order for the 3x3 expression grid.
EXPRESSION_LABELS = [
    "hi",
    "happy",
    "love",
    "surprise",
    "cool",
    "confused",
    "sleepy",
    "charming",
    "waving",
]

# Normalized (0-1) point on `main.png` where the runtime's dynamic thread
# should visually attach.
ANCHOR_POINT = {"x": 0.5, "y": 0.05}

# Fraction of the square canvas height that the visible thread/cord segment
# should occupy in the generated artwork, above the character itself. The
# runtime (HangingCharacter) draws its own thread dynamically at any length,
# but the art still needs enough of a drawn cord near the top to sell the
# "hanging from something long" look rather than a bare stub/knot.
# This is independent of character size — a long thread should NOT shrink
# the character to make both fit inside the canvas; the composition is free
# to crop the thread and/or character against the square canvas instead.
THREAD_LENGTH_FRACTION = 0.75

DEFAULT_SIZE = 1024

# Override via OPENAI_IMAGE_MODEL / OPENAI_IMAGE_QUALITY in .env, or
# --model / --quality on the CLI.
DEFAULT_MODEL = "gpt-image-2.5-sunburst"
DEFAULT_QUALITY = "high"
