import logging
import os
import base64
import time

import requests
from dotenv import load_dotenv

load_dotenv()

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini")
AI_HORDE_API_URL = "https://aihorde.net/api/v2"
AI_HORDE_API_KEY = os.getenv("AI_HORDE_API_KEY") or "0000000000"
AI_HORDE_MODEL = os.getenv("AI_HORDE_MODEL", "").strip()
AI_HORDE_IMAGE_MODEL = AI_HORDE_MODEL or "AI Horde (community workers)"
AI_HORDE_MAX_WAIT_SECONDS = max(30, int(os.getenv("AI_HORDE_MAX_WAIT_SECONDS", "180")))
OPENROUTER_SITE_URL = os.getenv("OPENROUTER_SITE_URL", "http://localhost:3000")
OPENROUTER_SITE_NAME = os.getenv("OPENROUTER_SITE_NAME", "Local AI Chat")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


def generate_horde_image(prompt: str) -> dict:
    started_at = time.monotonic()
    headers = {
        "apikey": AI_HORDE_API_KEY,
        "Client-Agent": "LocalAIChat:1.0:github.com/Haidra-Org/AI-Horde",
        "Content-Type": "application/json",
    }
    payload = {
        "prompt": prompt,
        "params": {"width": 512, "height": 512, "steps": 20, "n": 1},
        "nsfw": False,
        "censor_nsfw": True,
        "r2": True,
    }
    if AI_HORDE_MODEL:
        payload["models"] = [AI_HORDE_MODEL]

    try:
        response = requests.post(
            f"{AI_HORDE_API_URL}/generate/async",
            headers=headers,
            json=payload,
            timeout=30,
        )
        response.raise_for_status()
        request_id = response.json().get("id")
        if not request_id:
            raise RuntimeError("AI Horde did not return a generation request ID.")

        deadline = time.monotonic() + AI_HORDE_MAX_WAIT_SECONDS
        while time.monotonic() < deadline:
            remaining = deadline - time.monotonic()
            status_response = requests.get(
                f"{AI_HORDE_API_URL}/generate/check/{request_id}",
                headers=headers,
                timeout=min(15, max(1, remaining)),
            )
            status_response.raise_for_status()
            status = status_response.json()
            if status.get("faulted"):
                raise RuntimeError("AI Horde could not complete this image request. Please try again.")
            if status.get("done"):
                result_response = requests.get(
                    f"{AI_HORDE_API_URL}/generate/status/{request_id}",
                    headers=headers,
                    timeout=min(15, max(1, deadline - time.monotonic())),
                )
                result_response.raise_for_status()
                generations = result_response.json().get("generations", [])
                image_url = generations[0].get("img") if generations else None
                if not image_url:
                    raise RuntimeError("AI Horde completed the request without returning an image.")
                image_response = requests.get(image_url, timeout=30)
                image_response.raise_for_status()
                content_type = image_response.headers.get("Content-Type", "image/webp").split(";", 1)[0]
                if not content_type.startswith("image/"):
                    raise RuntimeError("AI Horde returned an invalid image download.")
                persistent_image = (
                    f"data:{content_type};base64,"
                    + base64.b64encode(image_response.content).decode("ascii")
                )
                return {
                    "image_url": persistent_image,
                    "usage": None,
                    "generation_time_seconds": round(time.monotonic() - started_at, 1),
                }
            time.sleep(min(3, max(0, deadline - time.monotonic())))

        try:
            requests.delete(
                f"{AI_HORDE_API_URL}/generate/status/{request_id}",
                headers=headers,
                timeout=5,
            ).raise_for_status()
        except requests.RequestException:
            logger.warning("Could not cancel timed-out AI Horde request %s", request_id)
        wait_limit = (
            f"{AI_HORDE_MAX_WAIT_SECONDS // 60} minutes"
            if AI_HORDE_MAX_WAIT_SECONDS >= 60
            else f"{AI_HORDE_MAX_WAIT_SECONDS} seconds"
        )
        raise RuntimeError(
            f"AI Horde did not finish within {wait_limit}. "
            "The request was cancelled; please try again later."
        )
    except Exception as error:
        logger.exception("AI Horde image generation failed")
        detail = str(error).strip()
        raise RuntimeError(detail or "AI Horde image generation failed. Please try again.") from error


def _result(content: str, usage: dict | None = None) -> dict:
    return {"content": content, "usage": usage}


def _request(messages: list[dict], api_key: str | None = None) -> dict:
    effective_api_key = api_key or OPENROUTER_API_KEY
    if not effective_api_key:
        return _result("OpenRouter is not configured. Set OPENROUTER_API_KEY and restart the backend.")

    try:
        response = requests.post(
            OPENROUTER_URL,
            headers={
                "Authorization": f"Bearer {effective_api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": OPENROUTER_SITE_URL,
                "X-Title": OPENROUTER_SITE_NAME,
            },
            json={"model": OPENROUTER_MODEL, "messages": messages, "temperature": 0.2, "usage": {"include": True}},
            timeout=90,
        )
        response.raise_for_status()
        payload = response.json()
        return _result(payload["choices"][0]["message"]["content"], payload.get("usage"))
    except requests.exceptions.Timeout:
        return _result("Error: OpenRouter request timed out.")
    except (requests.exceptions.RequestException, KeyError, IndexError, TypeError) as error:
        logger.exception("OpenRouter request failed: %s", error)
        return _result(f"Error connecting to OpenRouter: {error}")


def connect_ollama_db(db_config: dict, fetch_mode: bool = False):
    """Keep the database UI usable without pretending to connect to a database."""
    if fetch_mode:
        return {"status": "success", "databases": [db_config.get("MYSQL_DATABASE", "")]}
    return {"status": "connected", "message": "AI-only mode; no live database connection."}


def disconnect_ollama_db():
    return {"status": "disconnected"}


def query_ollama(
    file_text: str | None,
    user_query: str,
    mode: str,
    conversation_history: list[dict] | None = None,
    api_key: str | None = None,
):
    if mode == "image":
        return _result("Image generation is not configured for this OpenRouter text client.")

    if mode == "file":
        messages = [
            {"role": "system", "content": "Answer only from the supplied file. Say when the answer is not present."},
            {"role": "user", "content": f"File content:\n{file_text}\n\nQuestion:\n{user_query}"},
        ]
    elif mode == "chat":
        messages = [
            {"role": "system", "content": "You are a helpful assistant. Answer clearly and conversationally."},
            *(conversation_history or []),
            {"role": "user", "content": user_query},
        ]
    else:
        messages = [
            {"role": "system", "content": "Answer as a database assistant. No live database is connected. Do not claim to execute SQL or inspect real records."},
            {"role": "user", "content": user_query},
        ]

    return _request(messages, api_key=api_key)
