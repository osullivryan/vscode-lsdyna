#!/usr/bin/env python3
"""Generate snippets/lsdyna.json from keyword files in keywords/."""

import glob
import json
import re
from pathlib import Path

KEYWORDS_DIR = Path(__file__).parent
OUTPUT_FILE = KEYWORDS_DIR.parent / 'snippets' / 'lsdyna.json'


def process_keywords():
    overall_keywords = {}

    for file_path in sorted(KEYWORDS_DIR.glob('*/*.k')):
        lines = file_path.read_text().splitlines(keepends=True)
        if not lines:
            continue

        keyword_name = lines[0].strip()

        if 'helper' in str(file_path):
            lines = lines[1:]

        if '--BOF--' in keyword_name:
            continue

        tab_inc = [1]

        def replace(match):
            ret = f' ${tab_inc[0]} '
            tab_inc[0] += 1
            return ret

        keyword_snippet = []
        for line in lines:
            if '?' in line:
                if '?title?' in line:
                    line = line.replace('?title?', f'${tab_inc[0]}')
                    tab_inc[0] += 1
                if '?function?' in line:
                    line = line.replace('?function?', '')
                if '?path?' in line:
                    line = line.replace('?path?', f'${tab_inc[0]}')
                    tab_inc[0] += 1
                if '?' in line:
                    line = re.sub(r'\s\?', replace, line)
            keyword_snippet.append(line.rstrip())

        overall_keywords[keyword_name] = {
            'body': keyword_snippet,
            'prefix': [keyword_name, keyword_name.replace('*', '')],
            'description': keyword_name[1:]
        }

    with open(OUTPUT_FILE, 'w') as f:
        json.dump(overall_keywords, f, sort_keys=True, indent=5)

    print(f'Generated {OUTPUT_FILE} with {len(overall_keywords)} keywords')


if __name__ == '__main__':
    process_keywords()
