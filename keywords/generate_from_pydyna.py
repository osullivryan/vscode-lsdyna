#!/usr/bin/env python3
"""Generate VSCode snippets and hover field data from the pydyna kwd.json keyword database.

Usage:
    python keywords/generate_from_pydyna.py [path/to/kwd.json]

If no path is given, looks for ../pydyna/codegen/kwd.json relative to the repo root.
Outputs:
    snippets/lsdyna.json      — VSCode snippet definitions
    keywords/field_data.json  — compact field metadata for hover support
"""

import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent
DEFAULT_KWD = REPO_ROOT.parent / "pydyna" / "codegen" / "kwd.json"
OUTPUT_SNIPPETS = REPO_ROOT / "snippets" / "lsdyna.json"
OUTPUT_FIELDS = REPO_ROOT / "keywords" / "field_data.json"

WIDE_FIELD_THRESHOLD = 40  # fields wider than this are treated as free-text (title cards)


def keyword_name(key: str) -> str:
    """Convert kwd.json key to LS-DYNA keyword name.

    PART_PART -> PART  (doubled single-word keywords)
    SECTION_SHELL -> SECTION_SHELL  (unchanged)
    """
    tokens = key.split("_")
    if len(tokens) == 2 and tokens[0] == tokens[1]:
        return tokens[0]
    return key


def comment_header(fields: list) -> str:
    # "$#" occupies the first 2 chars, so each field name is right-aligned
    # within the column range [pos, pos+width), with the "$#" consuming 2 chars
    # from the start of the line.
    line = "$#"
    written = 2
    for f in fields:
        pos = f.get("position", 0)
        w = f.get("width", 10)
        available = (pos + w) - written
        if available <= 0:
            continue
        name = f["name"].lower()[:available]
        line += name.rjust(available)
        written = pos + w
    return line


def data_line(fields: list, tab_start: int) -> tuple[str, int]:
    """Build a snippet data line with tab stops. Returns (line, next_tab_n)."""
    line = ""
    cursor = 0
    n = tab_start
    for f in fields:
        pos = f.get("position", cursor)
        w = f.get("width", 10)
        default = f.get("default")

        if pos > cursor:
            line += " " * (pos - cursor)

        placeholder = (str(default) if default is not None else f["name"])[:w]
        placeholder = placeholder.rjust(w)
        line += f"${{{n}:{placeholder}}}"
        n += 1
        cursor = pos + w

    return line, n


def build_snippet(key: str, cards: list) -> dict:
    full_kw = f"*{keyword_name(key)}"
    body = [full_kw]
    tab_n = 1

    for card in cards:
        fields = card.get("fields", [])
        if not fields:
            continue

        # Title card: single wide string field (e.g. heading)
        if len(fields) == 1 and fields[0].get("width", 0) >= WIDE_FIELD_THRESHOLD:
            body.append(f'${{{tab_n}:{fields[0]["name"]}}}')
            tab_n += 1
            continue

        body.append(comment_header(fields))
        line, tab_n = data_line(fields, tab_n)
        body.append(line)

    body.append("$0")
    name = keyword_name(key)
    return {
        "prefix": [full_kw, name],
        "body": body,
        "description": name,
    }


def load_repeating_keywords(manifest_path: Path) -> set:
    """Return the set of keyword names whose last card repeats (table-card / series-card)."""
    if not manifest_path.exists():
        return set()
    with open(manifest_path) as f:
        manifest = json.load(f)
    repeating = set()
    for key, val in manifest.items():
        if key == "WILDCARDS" or not isinstance(val, dict):
            continue
        opts = val.get("generation-options", {})
        if "table-card" in opts or "series-card" in opts or "table-card-group" in opts:
            repeating.add(keyword_name(key))
    return repeating


def build_field_data(raw: dict, repeating: set) -> dict:
    """Build compact field metadata keyed by LS-DYNA keyword name.

    Structure:
      Normal:    { "SECTION_SHELL": { "c": [[card0_fields], ...] } }
      Repeating: { "DEFINE_CURVE":  { "c": [[card0_fields], ...], "r": 1 } }

    Each field: { "n": name, "p": position, "w": width, "h": help, "t": type }
    """
    field_data = {}
    for key, cards in raw.items():
        if not isinstance(cards, list) or not cards:
            continue
        name = keyword_name(key)
        card_list = []
        for card in cards:
            fields = card.get("fields", [])
            card_list.append([
                {
                    "n": f["name"],
                    "p": f.get("position", 0),
                    "w": f.get("width", 10),
                    "h": f.get("help", ""),
                    "t": f.get("type", ""),
                }
                for f in fields
            ])
        entry = {"c": card_list}
        if name in repeating:
            entry["r"] = 1
        field_data[name] = entry
    return field_data


def main():
    kwd_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_KWD

    if not kwd_path.exists():
        print(f"Error: {kwd_path} not found", file=sys.stderr)
        print("Usage: python keywords/generate_from_pydyna.py [path/to/kwd.json]", file=sys.stderr)
        sys.exit(1)

    print(f"Loading {kwd_path} ...")
    with open(kwd_path) as f:
        raw = json.load(f)

    print(f"Generating snippets for {len(raw)} keywords ...")
    snippets = {}
    for key, cards in raw.items():
        if not isinstance(cards, list) or not cards:
            continue
        full_kw = f"*{keyword_name(key)}"
        snippets[full_kw] = build_snippet(key, cards)

    OUTPUT_SNIPPETS.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_SNIPPETS, "w") as f:
        json.dump(snippets, f, indent=4)
    print(f"Written {len(snippets)} snippets to {OUTPUT_SNIPPETS}")

    manifest_path = kwd_path.parent / "manifest.json"
    repeating = load_repeating_keywords(manifest_path)
    print(f"Found {len(repeating)} repeating-card keywords from manifest ...")

    print("Generating hover field data ...")
    field_data = build_field_data(raw, repeating)
    with open(OUTPUT_FIELDS, "w") as f:
        json.dump(field_data, f, separators=(",", ":"))
    size_kb = OUTPUT_FIELDS.stat().st_size // 1024
    print(f"Written {len(field_data)} keyword definitions to {OUTPUT_FIELDS} ({size_kb} KB)")


if __name__ == "__main__":
    main()
