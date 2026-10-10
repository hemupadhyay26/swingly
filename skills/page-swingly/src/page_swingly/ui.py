"""Rich presentation only; generation and asset contracts stay unchanged."""
import argparse
from contextlib import nullcontext

from rich.console import Console
from rich.panel import Panel
from rich.text import Text
from rich.theme import Theme

THEME = Theme({
    "heading": "bold bright_cyan",
    "prompt": "bright_magenta",
    "info": "bright_blue",
    "success": "bold bright_green",
    "error": "bold bright_red",
    "muted": "dim cyan",
})
console = Console(theme=THEME, markup=False, highlight=False, emoji=False)
error_console = Console(theme=THEME, stderr=True, markup=False, highlight=False, emoji=False)


def message(text: str, *, style: str = "") -> None:
    style = {"green": "success", "dim": "muted"}.get(style, style or "info")
    console.print(text, style=style, soft_wrap=True)


def panel(text: str, *, title: str, error: bool = False) -> None:
    target = error_console if error else console
    accent = "bright_red" if error else ("bright_magenta" if title == "Generation prompt" else "bright_cyan")
    if target.is_terminal:
        target.print(Panel(
            Text(text, style="bright_red" if error else "white"),
            title=Text(title, style=f"bold {accent}"),
            title_align="left",
            border_style=accent,
            padding=(1, 2),
        ))
    else:
        target.print(f"{title}: {text}", soft_wrap=True)


def status(text: str):
    # No live animation or cursor controls when redirected or running in CI.
    return console.status(Text(text, style="bold bright_cyan"), spinner="dots", spinner_style="bright_magenta") if console.is_terminal else nullcontext()

class HelpParser(argparse.ArgumentParser):
    """Color argparse help without changing argument parsing or usage errors."""

    def print_help(self, file=None) -> None:
        target = Console(file=file, theme=THEME, markup=False, highlight=False, emoji=False)
        help_text = Text(self.format_help(), style="bright_blue")
        help_text.highlight_regex(r"(?m)^usage:|^[\w ][\w /-]*:$", style="bold bright_cyan")
        help_text.highlight_regex(r"(?<!\w)--?[a-zA-Z][a-zA-Z0-9-]*", style="bold bright_magenta")
        help_text.highlight_regex(r"\b(?:NAME|DESCRIPTION|PROVIDER|IMAGE|OUT|SIZE|MODEL|QUALITY)\b", style="bright_yellow")
        target.print(help_text, soft_wrap=True, end="")