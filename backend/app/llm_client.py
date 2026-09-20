import logging
import os

import requests
from dotenv import load_dotenv

load_dotenv()

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini")
OPENROUTER_SITE_URL = os.getenv("OPENROUTER_SITE_URL", "http://localhost:3000")
OPENROUTER_SITE_NAME = os.getenv("OPENROUTER_SITE_NAME", "Local AI Chat")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


def _request(messages: list[dict]) -> str:
    if not OPENROUTER_API_KEY:
        return "OpenRouter is not configured. Set OPENROUTER_API_KEY and restart the backend."

    try:
        response = requests.post(
            OPENROUTER_URL,
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": OPENROUTER_SITE_URL,
                "X-Title": OPENROUTER_SITE_NAME,
            },
            json={"model": OPENROUTER_MODEL, "messages": messages, "temperature": 0.2},
            timeout=90,
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]
    except requests.exceptions.Timeout:
        return "Error: OpenRouter request timed out."
    except (requests.exceptions.RequestException, KeyError, IndexError, TypeError) as error:
        logger.exception("OpenRouter request failed: %s", error)
        return f"Error connecting to OpenRouter: {error}"


def connect_ollama_db(db_config: dict, fetch_mode: bool = False):
    """Keep the database UI usable without pretending to connect to a database."""
    if fetch_mode:
        return {"status": "success", "databases": [db_config.get("MYSQL_DATABASE", "")]}
    return {"status": "connected", "message": "AI-only mode; no live database connection."}


def disconnect_ollama_db():
    return {"status": "disconnected"}


def query_ollama(file_text: str, user_query: str, mode: str):
    if mode == "image":
        return "Image generation is not configured for this OpenRouter text client."

    if mode == "file":
        messages = [
            {"role": "system", "content": "Answer only from the supplied file. Say when the answer is not present."},
            {"role": "user", "content": f"File content:\n{file_text}\n\nQuestion:\n{user_query}"},
        ]
    else:
        messages = [
            {"role": "system", "content": "Answer as a database assistant. No live database is connected. Do not claim to execute SQL or inspect real records."},
            {"role": "user", "content": user_query},
        ]

    return _request(messages)
