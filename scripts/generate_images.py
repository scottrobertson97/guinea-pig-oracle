#!/usr/bin/env python3
"""Batch-generate card art via the OpenAI Images API."""

from __future__ import annotations

import argparse
import base64
import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

API_URL = "https://api.openai.com/v1/images/generations"
DEFAULT_MODEL = "gpt-image-1"
DEFAULT_SIZE = "1024x1024"
DEFAULT_QUALITY = "auto"
ENV_PATH = Path(".env")
ENV_FALLBACK_PATH = Path(".env.example")


def load_deck(path: Path) -> list[dict[str, Any]]:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def save_deck(path: Path, deck: list[dict[str, Any]]) -> None:
    with path.open("w", encoding="utf-8") as handle:
        json.dump(deck, handle, ensure_ascii=False, indent=2)
        handle.write("\n")


def api_request(payload: dict[str, Any], api_key: str) -> bytes:
    data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        API_URL,
        data=data,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(request) as response:
        return response.read()


def generate_image(
    prompt: str,
    model: str,
    size: str,
    quality: str,
    output_format: str,
    api_key: str,
) -> bytes:
    payload = {
        "model": model,
        "prompt": prompt,
        "size": size,
        "quality": quality,
    }
    if output_format:
        payload["output_format"] = output_format
    raw = api_request(payload, api_key)
    data = json.loads(raw.decode("utf-8"))
    image_b64 = data["data"][0]["b64_json"]
    return base64.b64decode(image_b64)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate deck images via OpenAI API.")
    parser.add_argument("--deck", default="deck.json", help="Path to deck.json")
    parser.add_argument("--out", default="cards", help="Output folder for images")
    parser.add_argument("--model", default=DEFAULT_MODEL, help="Image model")
    parser.add_argument("--size", default=DEFAULT_SIZE, help="Image size, e.g. 1024x1024")
    parser.add_argument("--quality", default=DEFAULT_QUALITY, help="Image quality")
    parser.add_argument("--output-format", default="", help="png, jpeg, or webp")
    parser.add_argument("--limit", type=int, default=0, help="Max number of cards to generate")
    parser.add_argument("--force", action="store_true", help="Overwrite existing images")
    parser.add_argument("--sleep", type=float, default=0.8, help="Seconds to wait between requests")
    parser.add_argument("--max-retries", type=int, default=3, help="Retry attempts per card")
    return parser.parse_args()


def load_env_file(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        key = key.strip()
        value = value.strip().strip("\"'")
        os.environ.setdefault(key, value)


def main() -> None:
    load_env_file(ENV_PATH)
    load_env_file(ENV_FALLBACK_PATH)
    args = parse_args()
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise SystemExit("OPENAI_API_KEY is not set in the environment.")

    deck_path = Path(args.deck)
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    deck = load_deck(deck_path)
    generated = 0

    for card in deck:
        if args.limit and generated >= args.limit:
            break

        card_id = card.get("id")
        prompt = card.get("prompt")
        if not card_id or not prompt:
            continue

        output_path = out_dir / f"{card_id}.png"
        card_image_path = f"cards/{card_id}.png"

        if output_path.exists() and not args.force:
            if not card.get("image"):
                card["image"] = card_image_path
            continue

        attempt = 0
        while True:
            attempt += 1
            try:
                image_bytes = generate_image(
                    prompt,
                    args.model,
                    args.size,
                    args.quality,
                    args.output_format,
                    api_key,
                )
                output_path.write_bytes(image_bytes)
                card["image"] = card_image_path
                generated += 1
                break
            except urllib.error.HTTPError as exc:
                if attempt >= args.max_retries:
                    error_body = ""
                    try:
                        error_body = exc.read().decode("utf-8", errors="replace")
                    except Exception:
                        error_body = "<unable to read error body>"
                    raise SystemExit(
                        f"OpenAI API error {exc.code} for {card_id}: {error_body}"
                    ) from exc
                wait_for = args.sleep * attempt
                print(f"Retrying {card_id} after HTTP {exc.code} ({attempt}/{args.max_retries})...")
                time.sleep(wait_for)
            except urllib.error.URLError:
                if attempt >= args.max_retries:
                    raise
                wait_for = args.sleep * attempt
                print(f"Retrying {card_id} after network error ({attempt}/{args.max_retries})...")
                time.sleep(wait_for)

        time.sleep(args.sleep)

    save_deck(deck_path, deck)
    print(f"Generated {generated} image(s).")


if __name__ == "__main__":
    main()
