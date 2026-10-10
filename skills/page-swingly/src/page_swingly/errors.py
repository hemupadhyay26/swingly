"""One error-reporting boundary for all command-line tools."""

import re
import sys
import traceback
from collections.abc import Callable

from openai import APIConnectionError, APIError, APIStatusError, APITimeoutError
from .ui import panel


class UserError(Exception):
    """An expected failure whose message is safe to show to the user."""


def error_message(error: Exception) -> str:
    if isinstance(error, UserError):
        return str(error)
    if isinstance(error, APITimeoutError):
        return "OpenAI image generation timed out. Try again later; check your connection if this persists."
    if isinstance(error, APIConnectionError):
        return "Could not connect to OpenAI. Check your internet connection, proxy, and firewall, then try again."
    if isinstance(error, APIStatusError):
        code = getattr(error, "code", None)
        if code in {"moderation_blocked", "content_policy_violation", "safety_violation"}:
            message = (
                "OpenAI declined this image request under its content rules. "
                "Review the subject and description or choose another concept. "
                "This response does not establish that copyright was the cause."
            )
        elif error.status_code == 401:
            message = "OpenAI authentication failed. Check OPENAI_API_KEY and whether the key is still valid."
        elif error.status_code == 403:
            message = "OpenAI denied access. Check your project's permissions and access to the selected image model."
        elif code in {"insufficient_quota", "billing_hard_limit_reached", "billing_not_active"}:
            message = "OpenAI credits or spending limit prevented generation. Check your project's billing and usage limits."
        elif error.status_code == 429:
            message = "OpenAI's rate limit was reached. Wait before trying again or check your project's usage limits."
        elif error.status_code == 404 or code == "model_not_found":
            message = "The selected OpenAI model or endpoint is unavailable. Check --model / OPENAI_IMAGE_MODEL and model access."
        elif error.status_code >= 500:
            message = "OpenAI encountered a service error. Try again later."
        elif error.status_code in {400, 422}:
            message = "OpenAI rejected the request. Check the model's supported --size, --quality, transparent background, and description."
        else:
            message = f"OpenAI returned HTTP {error.status_code}. Check your request settings or try again later."
        # Preserve useful diagnostic identifiers, never the raw response body or key.
        details = []
        for label, value in (("code", code), ("parameter", getattr(error, "param", None)),
                             ("request", getattr(error, "request_id", None))):
            if isinstance(value, str) and re.fullmatch(r"[A-Za-z0-9_.-]{1,100}", value):
                details.append(f"{label}: {value}")
        return message + (f" ({'; '.join(details)})" if details else "")
    if isinstance(error, APIError):
        return "The OpenAI SDK could not complete image generation. Check your SDK version and request settings."
    if isinstance(error, OSError):
        detail = error.strerror or "could not read or write a file"
        return f"Local file operation failed: {detail}. Check the output path, file permissions, and available disk space."
    if isinstance(error, (ValueError, TypeError, KeyError)):
        return "Invalid asset data or configuration. Check the manifest, image data, and command options."
    return f"Unexpected {type(error).__name__}. Run again with --debug for a traceback when troubleshooting locally."


def run_cli(action: Callable[[], None], *, debug: bool = False) -> None:
    try:
        action()
    except KeyboardInterrupt:
        panel("Cancelled.", title="Stopped", error=True)
        raise SystemExit(130) from None
    except Exception as error:
        panel(error_message(error), title="Error", error=True)
        if debug:
            traceback.print_exc()
        raise SystemExit(1) from None
