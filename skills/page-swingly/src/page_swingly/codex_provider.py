"""Run signed-in Codex's built-in generator without using API credentials."""
import os
import shutil
import subprocess
from pathlib import Path
from .errors import UserError


def generate_with_codex(prompt: str, destination: Path, size: int) -> Path:
    executable = shutil.which(os.environ.get("PAGE_SWINGLY_CODEX_BIN", "codex"))
    if not executable:
        raise UserError("Codex CLI was not found. Install Codex in this shell or set PAGE_SWINGLY_CODEX_BIN to its executable path.")
    environment = os.environ.copy()
    environment.pop("OPENAI_API_KEY", None)
    try:
        login = subprocess.run([executable, "login", "status"], capture_output=True, text=True, env=environment, timeout=30)
        if login.returncode or "chatgpt" not in (login.stdout + login.stderr).lower():
            raise UserError("Sign in to Codex with ChatGPT using `codex login` in this shell. Subscription mode requires ChatGPT login, not an API key.")
        instruction = (
            "Generate exactly one PNG with your built-in image generation tool and transparent_background=true. "
            "Do not use an API key, Python image API, paid API fallback, browser automation, or another generator. "
            "Do not edit project code. If unavailable or refused, stop and report the reason; do not retry or rephrase. "
            f"Request a {size}x{size} canvas. Save or copy the generated PNG to {destination.resolve()}. "
            "Only create this image. The following is the artwork description:\n\n" + prompt
        )
        result = subprocess.run(
            [executable, "exec", "--enable", "image_generation", "--sandbox", "workspace-write", "--skip-git-repo-check", "--ephemeral", "--color", "never", "-"],
            input=instruction, cwd=destination.parent, capture_output=True, text=True, env=environment, timeout=600,
        )
    except subprocess.TimeoutExpired as error:
        raise UserError("Codex timed out. Check your Codex login and image-tool availability, then try again.") from error
    if result.returncode or not destination.is_file():
        output = (result.stdout + result.stderr).lower()
        if "failed to decode models response" in output or "unknown variant" in output:
            raise UserError("Your installed Codex CLI cannot read the current model list. Update Codex in this shell, then retry. No image was generated or API fallback attempted.")
        if "not supported when using codex with a chatgpt account" in output:
            raise UserError("Codex selected a model unavailable for your ChatGPT login. Update Codex and select a supported model in Codex, then retry. No API fallback was attempted.")
        if "moderation_blocked" in output or "rejected by the safety" in output:
            raise UserError("Codex image generation was declined by the safety system. No image was imported.")
        raise UserError("Codex did not save an image. Check image-tool availability and subscription limits in Codex. No API fallback was attempted.")
    return destination
