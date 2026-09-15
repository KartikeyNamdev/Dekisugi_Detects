"""Local lookup against data/rbi_apps.json.

Returns one of:
- True  -> a confident exact/fuzzy match against the local list
- "NOT_FOUND" -> no confident match either way

This service deliberately never returns a hard False. Per the project
brief, absence from a small local reference list is not proof an app is
unregulated or fraudulent, so we only ever assert a positive match or say
we don't have a reliable answer. (A real production system with a
complete, authoritative dataset could reasonably add a hard-False path;
this hackathon-scope placeholder dataset should not.)
"""

import json
import re
from difflib import SequenceMatcher
from pathlib import Path
from typing import NamedTuple, Optional

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
RBI_APPS_PATH = DATA_DIR / "rbi_apps.json"

_FUZZY_MATCH_THRESHOLD = 0.85


class RbiLookupResult(NamedTuple):
    rbi_regulated: object  # bool | "NOT_FOUND"
    matched_name: Optional[str]
    source: str


def _normalize(name: str) -> str:
    name = name.lower().strip()
    name = re.sub(r"[^a-z0-9\s]", "", name)
    name = re.sub(r"\s+", " ", name)
    # Drop generic trailing/leading words that don't help matching.
    for noise in ("app", "application", "the"):
        name = re.sub(rf"\b{noise}\b", "", name).strip()
    name = re.sub(r"\s+", " ", name).strip()
    return name


def _load_rbi_data() -> dict:
    with open(RBI_APPS_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def check_app(app_name: Optional[str]) -> RbiLookupResult:
    data = _load_rbi_data()
    source = data.get("source", "RBI regulated entity app list")

    if not app_name or not app_name.strip():
        return RbiLookupResult(rbi_regulated=None, matched_name=None, source=source)

    normalized_input = _normalize(app_name)
    if not normalized_input:
        return RbiLookupResult(rbi_regulated="NOT_FOUND", matched_name=None, source=source)

    best_ratio = 0.0
    best_name = None

    for entry in data.get("apps", []):
        candidates = [entry["name"]] + entry.get("aliases", [])
        for candidate in candidates:
            normalized_candidate = _normalize(candidate)
            if not normalized_candidate:
                continue

            if normalized_input == normalized_candidate:
                return RbiLookupResult(rbi_regulated=True, matched_name=entry["name"], source=source)

            if normalized_input in normalized_candidate or normalized_candidate in normalized_input:
                ratio = 0.95
            else:
                ratio = SequenceMatcher(None, normalized_input, normalized_candidate).ratio()

            if ratio > best_ratio:
                best_ratio = ratio
                best_name = entry["name"]

    if best_ratio >= _FUZZY_MATCH_THRESHOLD:
        return RbiLookupResult(rbi_regulated=True, matched_name=best_name, source=source)

    # No confident match either way -> NOT_FOUND, never a hard "False" claim,
    # since this local list is not authoritative/exhaustive.
    return RbiLookupResult(rbi_regulated="NOT_FOUND", matched_name=None, source=source)
