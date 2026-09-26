from .style import ART_STYLE, THREAD_LENGTH_FRACTION


def main_pose_prompt(name: str, description: str) -> str:
    thread_pct = round(THREAD_LENGTH_FRACTION * 100)
    return (
        f"{name}: {description}. {ART_STYLE} "
        "Show it hanging naturally, as if suspended from a thread, web, rope, "
        "or string attached near the top of the frame. The thread should be "
        f"clearly visible and span roughly the top {thread_pct}% of the "
        "canvas height before reaching the character — not just a tiny knot "
        "stub — since the runtime extends this same thread dynamically to "
        "whatever length it needs at render time. The thread's length and "
        "the character's size are independent: keep the character itself "
        "large and clearly legible at its natural size regardless of how "
        "much thread is shown — do not shrink the character to force both "
        "to fit inside the frame together. It is fine for the thread and/or "
        "the character to run off the top or bottom edge of the square "
        "canvas if needed. Transparent background, centered horizontally."
    )


def expression_sheet_prompt(name: str, description: str) -> str:
    moods = "Hi/Hello, Happy, Love, Surprise, Cool, Confused, Sleepy, Charming, Waving"
    return (
        f"{name}: {description}. {ART_STYLE} "
        "A single sprite sheet split into a 3x3 grid of 9 equal cells, filled "
        "left-to-right, top-to-bottom, the same subject each time in the same "
        f"style and framing, just shifting mood across the 9 cells: {moods} — "
        "expressed however feels natural for the subject, whether that's a "
        "pose or expression, or a more stylized cue like glow, sparkle, "
        "motion, or a shift in shape. Transparent background, no grid lines "
        "or text anywhere in the image."
    )
