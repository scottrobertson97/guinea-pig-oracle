#!/usr/bin/env python3
"""Generate deterministic SVG art for each oracle card.

This script:
1) reads deck.json
2) writes cards/<card-id>.svg for every card
3) sets each card's image path to ./cards/<card-id>.svg
"""

from __future__ import annotations

import argparse
import hashlib
import html
import json
from pathlib import Path
from typing import Any


PALETTES: list[dict[str, str]] = [
    {
        "bg_a": "#f7eddc",
        "bg_b": "#e7d4b5",
        "ink": "#4f3a2a",
        "accent": "#c78554",
        "accent_soft": "#f2c7a2",
        "fur": "#b9845f",
        "ear": "#dbac89",
        "nose": "#7a4e43",
        "ground": "#d7c0a1",
    },
    {
        "bg_a": "#eef6ee",
        "bg_b": "#d4e7cf",
        "ink": "#2f4a35",
        "accent": "#6ea06f",
        "accent_soft": "#b8dcb8",
        "fur": "#8ba86e",
        "ear": "#b9cf9b",
        "nose": "#48633e",
        "ground": "#bfd5b7",
    },
    {
        "bg_a": "#eef5fb",
        "bg_b": "#d0e0ef",
        "ink": "#2d455c",
        "accent": "#5f8fb8",
        "accent_soft": "#b8d1e6",
        "fur": "#86a6bf",
        "ear": "#bdd3e4",
        "nose": "#4b6982",
        "ground": "#c4d7e6",
    },
    {
        "bg_a": "#fbeef0",
        "bg_b": "#f0d2d9",
        "ink": "#5a3641",
        "accent": "#b86a80",
        "accent_soft": "#e7b5c4",
        "fur": "#c88ca0",
        "ear": "#e7b9c7",
        "nose": "#8e5264",
        "ground": "#e5c0cb",
    },
    {
        "bg_a": "#f3eff9",
        "bg_b": "#d9d0ea",
        "ink": "#403b5e",
        "accent": "#7f73ab",
        "accent_soft": "#c3bddd",
        "fur": "#978ebe",
        "ear": "#cbc5e2",
        "nose": "#5f5986",
        "ground": "#cec7e1",
    },
    {
        "bg_a": "#f6f1e9",
        "bg_b": "#e6dccd",
        "ink": "#504433",
        "accent": "#a48458",
        "accent_soft": "#d8c2a2",
        "fur": "#b69772",
        "ear": "#d9bf9c",
        "nose": "#7a664d",
        "ground": "#d8ccb8",
    },
    {
        "bg_a": "#eef8f6",
        "bg_b": "#cfe7df",
        "ink": "#2d4f4b",
        "accent": "#4f9f90",
        "accent_soft": "#a8d9d0",
        "fur": "#6fae9f",
        "ear": "#abd3cb",
        "nose": "#44746d",
        "ground": "#bad8d0",
    },
    {
        "bg_a": "#fbf1e8",
        "bg_b": "#edd6c3",
        "ink": "#584133",
        "accent": "#c47f4e",
        "accent_soft": "#efc59f",
        "fur": "#c08e67",
        "ear": "#e2b995",
        "nose": "#865846",
        "ground": "#dfc3a8",
    },
]


ICON_BY_ID = {
    "hay-horizon": "horizon",
    "popcorning": "burst",
    "rumble-strut": "footsteps",
    "pea-flake-pact": "leaves-pair",
    "cozy-burrow": "tunnel",
    "tunnel-vision": "target",
    "snack-alarm": "bell",
    "whisker-compass": "compass",
    "nose-boop": "boop",
    "sunbeam-sprawl": "sunbeam",
    "midnight-zoomies": "moon-zoom",
    "herd-harmony": "trio",
    "chitter-chat": "chat",
    "mellow-munch": "hay",
    "gentle-groom": "brush",
    "curiosity-nibble": "magnifier",
    "soft-bedding": "pillow",
    "brave-squeak": "squeak",
    "water-bottle-wisdom": "bottle",
    "the-great-hide": "hide",
    "paper-crinkle": "crinkle",
    "quiet-corner": "corner",
    "herd-check-in": "checkin",
    "treat-trail": "trail",
    "nibble-and-rest": "balance",
    "sprig-of-mint": "mint",
    "slow-chew": "chew",
    "the-long-stretch": "stretch",
    "cozy-lap": "lap",
    "paws-and-pause": "paw-pause",
    "window-watch": "window",
    "seed-of-trust": "seed",
    "new-hideout": "hideout",
    "squeak-of-truth": "truth",
    "the-burrow-map": "map",
    "pillow-pile": "pillow-stack",
    "meadow-mind": "meadow",
    "homecoming-hop": "home-hop",
    "saint-whisker": "halo",
    "lady-nibble": "flower",
    "gnawshade": "shadow-leaf",
    "munch-mask": "mask",
    "queen-shiver": "crown-snow",
    "clover-crown": "clover",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate SVG art for oracle cards.")
    parser.add_argument("--deck", default="deck.json", help="Path to deck data JSON")
    parser.add_argument("--cards-dir", default="cards", help="Output directory for SVG files")
    return parser.parse_args()


def load_deck(deck_path: Path) -> list[dict[str, Any]]:
    with deck_path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def save_deck(deck_path: Path, deck: list[dict[str, Any]]) -> None:
    with deck_path.open("w", encoding="utf-8") as handle:
        json.dump(deck, handle, ensure_ascii=False, indent=2)
        handle.write("\n")


def seed_for(value: str) -> int:
    digest = hashlib.sha256(value.encode("utf-8")).hexdigest()
    return int(digest[:16], 16)


def pick_palette(seed: int) -> dict[str, str]:
    return PALETTES[seed % len(PALETTES)]


def n(seed: int, offset: int, minimum: int, maximum: int) -> int:
    span = max(1, maximum - minimum)
    value = (seed >> offset) & 0xFFFF
    return minimum + (value % (span + 1))


def sparkles(seed: int, color: str) -> str:
    circles = []
    for index in range(8):
        x = n(seed, index * 7 + 1, 100, 1100)
        y = n(seed, index * 9 + 3, 70, 420)
        radius = n(seed, index * 5 + 11, 5, 14)
        opacity_value = 0.12 + (n(seed, index * 4 + 13, 0, 20) / 100)
        circles.append(
            f'<circle cx="{x}" cy="{y}" r="{radius}" fill="{color}" opacity="{opacity_value:.2f}" />'
        )
    return "".join(circles)


def icon_markup(icon: str, ink: str, accent: str, accent_soft: str) -> str:
    stroke = (
        f'stroke="{ink}" stroke-width="12" stroke-linecap="round" '
        'stroke-linejoin="round" fill="none"'
    )
    thin = (
        f'stroke="{ink}" stroke-width="8" stroke-linecap="round" '
        'stroke-linejoin="round" fill="none"'
    )
    base = (
        f'<circle cx="0" cy="0" r="170" fill="{accent_soft}" opacity="0.35" />'
        f'<circle cx="0" cy="0" r="150" {thin} opacity="0.28" />'
    )

    symbol = ""
    if icon == "horizon":
        symbol = (
            f'<circle cx="0" cy="-42" r="34" fill="{accent}" opacity="0.8" />'
            f'<path d="M-122 44 Q0 -50 122 44 Z" fill="{accent}" opacity="0.55" />'
            f'<line x1="-128" y1="44" x2="128" y2="44" {thin} />'
        )
    elif icon == "burst":
        symbol = (
            f'<circle cx="0" cy="0" r="38" fill="{accent}" opacity="0.82" />'
            f'<line x1="-110" y1="0" x2="-62" y2="0" {stroke} />'
            f'<line x1="110" y1="0" x2="62" y2="0" {stroke} />'
            f'<line x1="0" y1="-110" x2="0" y2="-62" {stroke} />'
            f'<line x1="0" y1="110" x2="0" y2="62" {stroke} />'
            f'<line x1="-80" y1="-80" x2="-48" y2="-48" {thin} />'
            f'<line x1="80" y1="-80" x2="48" y2="-48" {thin} />'
            f'<line x1="-80" y1="80" x2="-48" y2="48" {thin} />'
            f'<line x1="80" y1="80" x2="48" y2="48" {thin} />'
        )
    elif icon == "footsteps":
        symbol = (
            f'<ellipse cx="-45" cy="6" rx="32" ry="44" fill="{accent}" opacity="0.72" />'
            f'<ellipse cx="38" cy="-18" rx="28" ry="38" fill="{accent}" opacity="0.72" />'
            f'<circle cx="-68" cy="-40" r="9" fill="{ink}" opacity="0.78" />'
            f'<circle cx="-40" cy="-58" r="8" fill="{ink}" opacity="0.78" />'
            f'<circle cx="22" cy="-66" r="8" fill="{ink}" opacity="0.78" />'
            f'<circle cx="46" cy="-54" r="7" fill="{ink}" opacity="0.78" />'
        )
    elif icon == "leaves-pair":
        symbol = (
            f'<path d="M-84 20 Q-22 -94 0 0 Q-38 30 -84 20 Z" fill="{accent}" opacity="0.78" />'
            f'<path d="M84 20 Q22 -94 0 0 Q38 30 84 20 Z" fill="{accent}" opacity="0.78" />'
            f'<line x1="-70" y1="18" x2="-10" y2="-38" {thin} />'
            f'<line x1="70" y1="18" x2="10" y2="-38" {thin} />'
        )
    elif icon == "tunnel":
        symbol = (
            f'<path d="M-118 82 V16 Q-118 -84 0 -84 Q118 -84 118 16 V82 Z" fill="{accent}" opacity="0.62" />'
            f'<path d="M-78 82 V20 Q-78 -42 0 -42 Q78 -42 78 20 V82 Z" fill="{accent_soft}" opacity="0.72" />'
            f'<path d="M-118 82 V16 Q-118 -84 0 -84 Q118 -84 118 16 V82" {stroke} />'
        )
    elif icon == "target":
        symbol = (
            f'<circle cx="0" cy="0" r="96" fill="{accent}" opacity="0.24" />'
            f'<circle cx="0" cy="0" r="70" {stroke} />'
            f'<circle cx="0" cy="0" r="42" {thin} />'
            f'<circle cx="0" cy="0" r="15" fill="{accent}" />'
        )
    elif icon == "bell":
        symbol = (
            f'<path d="M-78 40 Q-78 -74 0 -84 Q78 -74 78 40 Z" fill="{accent}" opacity="0.68" />'
            f'<path d="M-96 40 H96" {stroke} />'
            f'<circle cx="0" cy="58" r="12" fill="{ink}" />'
            f'<path d="M-78 40 Q-78 -74 0 -84 Q78 -74 78 40" {stroke} />'
        )
    elif icon == "compass":
        symbol = (
            f'<circle cx="0" cy="0" r="90" {thin} />'
            f'<path d="M0 -96 L20 -20 L96 0 L20 20 L0 96 L-20 20 L-96 0 L-20 -20 Z" fill="{accent}" opacity="0.76" />'
            f'<circle cx="0" cy="0" r="14" fill="{ink}" />'
        )
    elif icon == "boop":
        symbol = (
            f'<circle cx="-44" cy="0" r="46" fill="{accent}" opacity="0.68" />'
            f'<circle cx="44" cy="0" r="46" fill="{accent}" opacity="0.68" />'
            f'<path d="M0 48 C30 18 52 6 72 -12 C47 -22 23 -15 0 8 C-23 -15 -47 -22 -72 -12 C-52 6 -30 18 0 48 Z" fill="{ink}" opacity="0.2" />'
            f'<circle cx="0" cy="5" r="11" fill="{ink}" />'
        )
    elif icon == "sunbeam":
        symbol = (
            f'<circle cx="0" cy="-10" r="44" fill="{accent}" opacity="0.82" />'
            f'<path d="M-96 96 L-18 24 H18 L96 96 Z" fill="{accent_soft}" opacity="0.82" />'
            f'<line x1="-110" y1="-10" x2="-70" y2="-10" {thin} />'
            f'<line x1="110" y1="-10" x2="70" y2="-10" {thin} />'
            f'<line x1="0" y1="-120" x2="0" y2="-72" {thin} />'
        )
    elif icon == "moon-zoom":
        symbol = (
            f'<circle cx="-14" cy="-18" r="52" fill="{accent}" opacity="0.78" />'
            f'<circle cx="14" cy="-30" r="46" fill="{accent_soft}" opacity="0.95" />'
            f'<line x1="40" y1="10" x2="120" y2="-10" {stroke} />'
            f'<line x1="28" y1="38" x2="114" y2="18" {thin} />'
            f'<line x1="22" y1="64" x2="96" y2="50" {thin} />'
        )
    elif icon == "trio":
        symbol = (
            f'<circle cx="-56" cy="8" r="34" fill="{accent}" opacity="0.72" />'
            f'<circle cx="56" cy="8" r="34" fill="{accent}" opacity="0.72" />'
            f'<circle cx="0" cy="-28" r="34" fill="{accent}" opacity="0.72" />'
            f'<path d="M-56 8 Q0 72 56 8 Q0 -48 -56 8 Z" fill="{accent_soft}" opacity="0.4" />'
        )
    elif icon == "chat":
        symbol = (
            f'<path d="M-122 -36 H24 Q48 -36 48 -12 V36 Q48 60 24 60 H-32 L-72 96 V60 H-122 Q-146 60 -146 36 V-12 Q-146 -36 -122 -36 Z" fill="{accent}" opacity="0.64" />'
            f'<path d="M18 -74 H120 Q146 -74 146 -48 V8 Q146 34 120 34 H66 L28 68 V34 H18 Q-8 34 -8 8 V-48 Q-8 -74 18 -74 Z" fill="{accent_soft}" opacity="0.88" />'
        )
    elif icon == "hay":
        symbol = (
            f'<path d="M-92 80 L-44 -56 L4 80 Z" fill="{accent}" opacity="0.76" />'
            f'<path d="M-22 80 L28 -72 L74 80 Z" fill="{accent}" opacity="0.66" />'
            f'<line x1="-96" y1="80" x2="96" y2="80" {stroke} />'
        )
    elif icon == "brush":
        symbol = (
            f'<rect x="-20" y="-92" width="40" height="124" rx="18" fill="{accent}" opacity="0.74" />'
            f'<path d="M-70 34 H70 V72 Q0 110 -70 72 Z" fill="{accent_soft}" opacity="0.88" />'
            f'<line x1="-70" y1="34" x2="70" y2="34" {thin} />'
            f'<line x1="-40" y1="58" x2="-20" y2="86" {thin} />'
            f'<line x1="0" y1="58" x2="0" y2="90" {thin} />'
            f'<line x1="40" y1="58" x2="20" y2="86" {thin} />'
        )
    elif icon == "magnifier":
        symbol = (
            f'<circle cx="-22" cy="-10" r="62" fill="{accent_soft}" opacity="0.88" />'
            f'<circle cx="-22" cy="-10" r="62" {stroke} />'
            f'<line x1="26" y1="36" x2="96" y2="102" {stroke} />'
            f'<path d="M-22 8 Q26 -30 58 10 Q16 44 -22 8 Z" fill="{accent}" opacity="0.72" />'
        )
    elif icon == "pillow":
        symbol = (
            f'<rect x="-110" y="-52" width="220" height="118" rx="44" fill="{accent}" opacity="0.64" />'
            f'<path d="M-60 -12 Q0 18 60 -12" {thin} />'
            f'<circle cx="0" cy="8" r="9" fill="{ink}" opacity="0.75" />'
        )
    elif icon == "squeak":
        symbol = (
            f'<path d="M-118 -34 L4 -62 V62 L-118 34 Z" fill="{accent}" opacity="0.72" />'
            f'<line x1="30" y1="-38" x2="88" y2="-58" {thin} />'
            f'<line x1="40" y1="0" x2="106" y2="0" {thin} />'
            f'<line x1="30" y1="38" x2="88" y2="58" {thin} />'
        )
    elif icon == "bottle":
        symbol = (
            f'<rect x="-44" y="-84" width="88" height="152" rx="28" fill="{accent}" opacity="0.66" />'
            f'<rect x="-20" y="-118" width="40" height="40" rx="12" fill="{accent_soft}" />'
            f'<path d="M0 40 C34 40 34 92 0 92 C-34 92 -34 40 0 40 Z" fill="{accent_soft}" opacity="0.92" />'
        )
    elif icon == "hide":
        symbol = (
            f'<path d="M-118 84 Q-70 -86 0 84 Z" fill="{accent}" opacity="0.64" />'
            f'<path d="M0 84 Q50 -94 118 84 Z" fill="{accent_soft}" opacity="0.86" />'
            f'<circle cx="-20" cy="20" r="12" fill="{ink}" opacity="0.7" />'
        )
    elif icon == "crinkle":
        symbol = (
            f'<path d="M-112 -66 L-42 -86 L12 -40 L82 -64 L118 -18 L74 34 L118 78 L44 102 L-16 58 L-76 88 L-122 36 L-78 -10 Z" fill="{accent}" opacity="0.62" />'
            f'<polyline points="-94 -26 -48 -12 -8 -40 30 -8 76 -18" {thin} />'
            f'<polyline points="-86 30 -40 44 0 18 38 46 86 36" {thin} />'
        )
    elif icon == "corner":
        symbol = (
            f'<path d="M-110 -86 H10 V-44 H-62 V98 H-110 Z" fill="{accent}" opacity="0.68" />'
            f'<circle cx="50" cy="10" r="42" fill="{accent_soft}" opacity="0.84" />'
            f'<circle cx="50" cy="10" r="10" fill="{ink}" />'
        )
    elif icon == "checkin":
        symbol = (
            f'<circle cx="0" cy="0" r="92" {thin} />'
            f'<circle cx="-74" cy="-14" r="22" fill="{accent}" opacity="0.8" />'
            f'<circle cx="74" cy="-14" r="22" fill="{accent}" opacity="0.8" />'
            f'<circle cx="0" cy="62" r="22" fill="{accent}" opacity="0.8" />'
            f'<path d="M-52 -10 Q0 20 52 -10" {thin} />'
            f'<path d="M52 -10 Q20 34 0 52" {thin} />'
            f'<path d="M-52 -10 Q-20 34 0 52" {thin} />'
        )
    elif icon == "trail":
        symbol = (
            f'<path d="M-116 64 Q-42 14 8 34 Q62 58 116 16" {stroke} />'
            f'<circle cx="-86" cy="40" r="11" fill="{accent}" />'
            f'<circle cx="-28" cy="28" r="11" fill="{accent}" />'
            f'<circle cx="26" cy="38" r="11" fill="{accent}" />'
            f'<circle cx="86" cy="24" r="11" fill="{accent}" />'
        )
    elif icon == "balance":
        symbol = (
            f'<circle cx="-24" cy="0" r="58" fill="{accent}" opacity="0.66" />'
            f'<circle cx="24" cy="0" r="58" fill="{accent_soft}" opacity="0.92" />'
            f'<circle cx="-24" cy="0" r="10" fill="{ink}" />'
            f'<circle cx="24" cy="0" r="10" fill="{ink}" />'
            f'<path d="M-70 0 H70" {thin} />'
        )
    elif icon == "mint":
        symbol = (
            f'<line x1="0" y1="90" x2="0" y2="-78" {stroke} />'
            f'<path d="M0 -22 Q-88 -58 -96 8 Q-42 22 0 -22 Z" fill="{accent}" opacity="0.74" />'
            f'<path d="M0 -42 Q88 -78 96 -12 Q42 2 0 -42 Z" fill="{accent}" opacity="0.74" />'
            f'<path d="M0 24 Q-64 0 -78 44 Q-38 58 0 24 Z" fill="{accent_soft}" opacity="0.9" />'
            f'<path d="M0 8 Q64 -16 78 26 Q38 40 0 8 Z" fill="{accent_soft}" opacity="0.9" />'
        )
    elif icon == "chew":
        symbol = (
            f'<path d="M-72 24 C-92 -40 -2 -92 54 -60 C96 -36 90 24 40 44 C4 58 -40 44 -56 14 C-66 -8 -56 -24 -38 -24 C-12 -24 -6 12 -26 18" {stroke} />'
            f'<line x1="-96" y1="86" x2="-28" y2="26" {thin} />'
        )
    elif icon == "stretch":
        symbol = (
            f'<path d="M-116 24 Q-14 -76 116 8" {stroke} />'
            f'<path d="M-116 24 L-82 14 L-92 48 Z" fill="{accent}" />'
            f'<path d="M116 8 L82 -2 L92 32 Z" fill="{accent}" />'
        )
    elif icon == "lap":
        symbol = (
            f'<path d="M-110 70 Q-58 12 -8 70" fill="{accent}" opacity="0.7" />'
            f'<path d="M110 70 Q58 12 8 70" fill="{accent}" opacity="0.7" />'
            f'<path d="M0 54 C28 24 56 16 76 -4 C48 -18 22 -8 0 14 C-22 -8 -48 -18 -76 -4 C-56 16 -28 24 0 54 Z" fill="{accent_soft}" opacity="0.95" />'
        )
    elif icon == "paw-pause":
        symbol = (
            f'<ellipse cx="-42" cy="20" rx="42" ry="34" fill="{accent}" opacity="0.72" />'
            f'<circle cx="-76" cy="-18" r="13" fill="{accent}" opacity="0.86" />'
            f'<circle cx="-42" cy="-30" r="13" fill="{accent}" opacity="0.86" />'
            f'<circle cx="-8" cy="-18" r="13" fill="{accent}" opacity="0.86" />'
            f'<rect x="38" y="-38" width="24" height="86" rx="10" fill="{ink}" opacity="0.86" />'
            f'<rect x="78" y="-38" width="24" height="86" rx="10" fill="{ink}" opacity="0.86" />'
        )
    elif icon == "window":
        symbol = (
            f'<rect x="-102" y="-82" width="204" height="164" rx="16" fill="{accent}" opacity="0.58" />'
            f'<line x1="0" y1="-82" x2="0" y2="82" {stroke} />'
            f'<line x1="-102" y1="0" x2="102" y2="0" {stroke} />'
            f'<circle cx="42" cy="20" r="22" fill="{accent_soft}" opacity="0.92" />'
            f'<circle cx="50" cy="20" r="6" fill="{ink}" />'
        )
    elif icon == "seed":
        symbol = (
            f'<ellipse cx="-18" cy="34" rx="44" ry="58" fill="{accent}" opacity="0.74" />'
            f'<path d="M14 12 Q92 -10 82 68 Q24 76 14 12 Z" fill="{accent_soft}" opacity="0.95" />'
            f'<path d="M-6 -22 Q8 -62 42 -78 Q54 -36 20 -12 Z" fill="{accent_soft}" opacity="0.92" />'
        )
    elif icon == "hideout":
        symbol = (
            f'<path d="M-112 44 Q0 -80 112 44 V92 H-112 Z" fill="{accent}" opacity="0.66" />'
            f'<rect x="-58" y="24" width="116" height="68" rx="30" fill="{accent_soft}" opacity="0.9" />'
            f'<circle cx="0" cy="58" r="10" fill="{ink}" />'
        )
    elif icon == "truth":
        symbol = (
            f'<line x1="-110" y1="0" x2="-62" y2="0" {thin} />'
            f'<path d="M-60 0 Q-24 -48 12 0 Q48 48 84 0" {stroke} />'
            f'<path d="M-60 24 Q-24 -24 12 24 Q48 72 84 24" {thin} />'
            f'<path d="M-60 -24 Q-24 -72 12 -24 Q48 24 84 -24" {thin} />'
        )
    elif icon == "map":
        symbol = (
            f'<path d="M-112 -74 L-34 -94 L34 -66 L112 -86 V74 L34 94 L-34 66 L-112 86 Z" fill="{accent}" opacity="0.58" />'
            f'<polyline points="-34 -94 -34 66" {thin} />'
            f'<polyline points="34 -66 34 94" {thin} />'
            f'<path d="M-68 -14 L-24 14 L8 -20 L48 8" {stroke} />'
        )
    elif icon == "pillow-stack":
        symbol = (
            f'<rect x="-104" y="34" width="208" height="66" rx="28" fill="{accent}" opacity="0.58" />'
            f'<rect x="-88" y="-14" width="176" height="66" rx="28" fill="{accent}" opacity="0.7" />'
            f'<rect x="-70" y="-60" width="140" height="62" rx="26" fill="{accent_soft}" opacity="0.95" />'
        )
    elif icon == "meadow":
        symbol = (
            f'<path d="M-122 84 Q-70 34 -16 84 Z" fill="{accent}" opacity="0.72" />'
            f'<path d="M-18 84 Q38 26 98 84 Z" fill="{accent}" opacity="0.58" />'
            f'<line x1="-62" y1="84" x2="-62" y2="8" {thin} />'
            f'<circle cx="-62" cy="-10" r="17" fill="{accent_soft}" />'
            f'<line x1="24" y1="84" x2="24" y2="0" {thin} />'
            f'<circle cx="24" cy="-18" r="19" fill="{accent_soft}" />'
        )
    elif icon == "home-hop":
        symbol = (
            f'<path d="M-102 16 L0 -82 L102 16 V86 H-102 Z" fill="{accent}" opacity="0.64" />'
            f'<rect x="-34" y="22" width="68" height="64" rx="18" fill="{accent_soft}" opacity="0.94" />'
            f'<path d="M-122 -10 Q-24 -118 92 -34" {stroke} />'
        )
    elif icon == "halo":
        symbol = (
            f'<ellipse cx="0" cy="-54" rx="82" ry="24" fill="{accent_soft}" opacity="0.95" />'
            f'<ellipse cx="0" cy="-54" rx="82" ry="24" {thin} />'
            f'<circle cx="0" cy="20" r="54" fill="{accent}" opacity="0.72" />'
            f'<line x1="0" y1="-122" x2="0" y2="-90" {thin} />'
        )
    elif icon == "flower":
        symbol = (
            f'<circle cx="0" cy="0" r="16" fill="{ink}" />'
            f'<circle cx="-40" cy="0" r="24" fill="{accent}" opacity="0.8" />'
            f'<circle cx="40" cy="0" r="24" fill="{accent}" opacity="0.8" />'
            f'<circle cx="0" cy="-40" r="24" fill="{accent}" opacity="0.8" />'
            f'<circle cx="0" cy="40" r="24" fill="{accent}" opacity="0.8" />'
            f'<line x1="0" y1="62" x2="0" y2="108" {thin} />'
        )
    elif icon == "shadow-leaf":
        symbol = (
            f'<circle cx="-18" cy="-6" r="64" fill="{accent}" opacity="0.64" />'
            f'<circle cx="20" cy="-24" r="60" fill="{accent_soft}" opacity="0.95" />'
            f'<path d="M-26 52 Q42 -48 92 44 Q42 56 -26 52 Z" fill="{ink}" opacity="0.22" />'
        )
    elif icon == "mask":
        symbol = (
            f'<path d="M-124 -12 Q-92 -78 -34 -64 H34 Q92 -78 124 -12 Q104 74 0 98 Q-104 74 -124 -12 Z" fill="{accent}" opacity="0.72" />'
            f'<ellipse cx="-44" cy="2" rx="24" ry="16" fill="{ink}" opacity="0.76" />'
            f'<ellipse cx="44" cy="2" rx="24" ry="16" fill="{ink}" opacity="0.76" />'
        )
    elif icon == "crown-snow":
        symbol = (
            f'<path d="M-110 54 L-74 -44 L-16 10 L16 -58 L74 10 L110 -44 L110 54 Z" fill="{accent}" opacity="0.76" />'
            f'<line x1="0" y1="-2" x2="0" y2="68" {thin} />'
            f'<line x1="-30" y1="26" x2="30" y2="26" {thin} />'
            f'<line x1="-20" y1="12" x2="20" y2="40" {thin} />'
            f'<line x1="-20" y1="40" x2="20" y2="12" {thin} />'
        )
    elif icon == "clover":
        symbol = (
            f'<circle cx="-24" cy="-22" r="28" fill="{accent}" opacity="0.82" />'
            f'<circle cx="24" cy="-22" r="28" fill="{accent}" opacity="0.82" />'
            f'<circle cx="0" cy="20" r="28" fill="{accent}" opacity="0.82" />'
            f'<line x1="0" y1="48" x2="0" y2="106" {thin} />'
            f'<path d="M-84 -72 L0 -120 L84 -72 L68 -34 H-68 Z" fill="{accent_soft}" opacity="0.9" />'
        )
    else:
        symbol = (
            f'<circle cx="0" cy="0" r="42" fill="{accent}" opacity="0.85" />'
            f'<line x1="-94" y1="0" x2="-46" y2="0" {thin} />'
            f'<line x1="94" y1="0" x2="46" y2="0" {thin} />'
            f'<line x1="0" y1="-94" x2="0" y2="-46" {thin} />'
            f'<line x1="0" y1="94" x2="0" y2="46" {thin} />'
        )

    return f'<g transform="translate(600 258)">{base}{symbol}</g>'


def pig_markup(seed: int, palette: dict[str, str]) -> str:
    body_shift = n(seed, 17, -12, 12)
    ear_shift = n(seed, 21, -10, 10)
    eye_shift = n(seed, 25, -8, 8)

    return (
        f'<ellipse cx="600" cy="640" rx="338" ry="88" fill="{palette["ground"]}" opacity="0.58" />'
        f'<g transform="translate(0 {body_shift})">'
        f'<ellipse cx="550" cy="528" rx="238" ry="150" fill="{palette["fur"]}" opacity="0.96" />'
        f'<ellipse cx="794" cy="510" rx="150" ry="118" fill="{palette["fur"]}" opacity="0.98" />'
        f'<ellipse cx="866" cy="{422 + ear_shift}" rx="45" ry="56" fill="{palette["ear"]}" opacity="0.95" />'
        f'<ellipse cx="792" cy="{416 - ear_shift}" rx="38" ry="48" fill="{palette["ear"]}" opacity="0.95" />'
        f'<circle cx="{830 + eye_shift}" cy="512" r="10" fill="{palette["ink"]}" />'
        f'<circle cx="876" cy="544" r="8" fill="{palette["nose"]}" />'
        f'<path d="M882 544 C912 536 934 526 954 510" stroke="{palette["ink"]}" stroke-width="7" stroke-linecap="round" fill="none" opacity="0.75" />'
        f'<path d="M882 552 C914 552 934 560 954 574" stroke="{palette["ink"]}" stroke-width="7" stroke-linecap="round" fill="none" opacity="0.75" />'
        f'<path d="M882 560 C914 570 934 592 952 612" stroke="{palette["ink"]}" stroke-width="7" stroke-linecap="round" fill="none" opacity="0.75" />'
        f'<ellipse cx="702" cy="654" rx="64" ry="28" fill="{palette["ear"]}" opacity="0.62" />'
        f'<ellipse cx="548" cy="656" rx="64" ry="28" fill="{palette["ear"]}" opacity="0.62" />'
        "</g>"
    )


def render_svg(card: dict[str, Any]) -> str:
    card_id = str(card.get("id", "card")).strip()
    title = str(card.get("title", card_id)).strip()
    seed = seed_for(card_id)
    palette = pick_palette(seed)
    icon = ICON_BY_ID.get(card_id, "spark")
    offset_x = n(seed, 33, -28, 28)
    offset_y = n(seed, 39, -20, 20)

    description = f"Illustration for {title}"

    return (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="760" viewBox="0 0 1200 760" role="img" aria-labelledby="title desc">'
        f'<title id="title">{html.escape(title)}</title>'
        f'<desc id="desc">{html.escape(description)}</desc>'
        "<defs>"
        '<linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">'
        f'<stop offset="0%" stop-color="{palette["bg_a"]}" />'
        f'<stop offset="100%" stop-color="{palette["bg_b"]}" />'
        "</linearGradient>"
        '<radialGradient id="mist" cx="20%" cy="0%" r="70%">'
        f'<stop offset="0%" stop-color="{palette["accent_soft"]}" stop-opacity="0.72" />'
        '<stop offset="100%" stop-color="#ffffff" stop-opacity="0" />'
        "</radialGradient>"
        "</defs>"
        '<rect width="1200" height="760" rx="36" fill="url(#bg)" />'
        '<rect width="1200" height="760" rx="36" fill="url(#mist)" />'
        f'<rect x="14" y="14" width="1172" height="732" rx="28" fill="none" stroke="{palette["ink"]}" stroke-opacity="0.18" stroke-width="4" />'
        f'<g transform="translate({offset_x} {offset_y})">'
        f"{sparkles(seed, palette['accent'])}"
        f"{icon_markup(icon, palette['ink'], palette['accent'], palette['accent_soft'])}"
        f"{pig_markup(seed, palette)}"
        "</g>"
        "</svg>"
    )


def main() -> None:
    args = parse_args()
    deck_path = Path(args.deck)
    cards_dir = Path(args.cards_dir)
    cards_dir.mkdir(parents=True, exist_ok=True)

    deck = load_deck(deck_path)

    for card in deck:
        card_id = str(card.get("id", "")).strip()
        if not card_id:
            continue
        svg_path = cards_dir / f"{card_id}.svg"
        svg_path.write_text(render_svg(card), encoding="utf-8")
        card["image"] = f"./cards/{card_id}.svg"

    save_deck(deck_path, deck)
    print(f"Generated {len(deck)} SVG files in {cards_dir}.")


if __name__ == "__main__":
    main()
