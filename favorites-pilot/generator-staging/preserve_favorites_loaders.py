#!/usr/bin/env python3
"""TEST-ONLY Favorites loader preservation companion for private make_public.py.

Source-of-truth loader tags: draft PR #28, Oct 23 2026. This does NOT edit the
current private pipeline and must not be run on a production directory.
"""
from __future__ import annotations
import argparse
import os
import re
from pathlib import Path

FAVORITES_CSS = '<link rel="stylesheet" href="./tscms-favorites.css">'
FAVORITES_JS = '<script type="module" src="./tscms-favorites.js"></script>'
OWNER_JS = '<script type="module" src="./tscms-favorites-owner.js"></script>'

def number_of_loaders(page: str, filename: str) -> int:
    # Count actual tags, including pre-existing querystring / optional ./ variants.
    name = re.escape(filename)
    pattern = rf'<(?:link|script)\\b[^>]*\\b(?:href|src)\\s*=\\s*["\\\'](?:\\./)?{name}(?:\\?[^"\\\']*)?["\\\'][^>]*>'
    return len(re.findall(pattern, page, flags=re.I | re.S))

def ensure_tag(page: str, filename: str, tag: str) -> str:
    n = number_of_loaders(page, filename)
    if n > 1:
        raise ValueError(f'{filename}: {n} loader tags; refusing duplicate')
    if n == 0:
        if page.count('</body>') != 1:
            raise ValueError(f'{filename}: expected exactly one </body>')
        page = page.replace('</body>', tag + '</body>', 1)
    if number_of_loaders(page, filename) != 1:
        raise ValueError(f'{filename}: loader count not exactly one after preservation')
    return page

def preserve(html_by_name: dict[str, str]) -> dict[str, str]:
    expected = ('index.html', 'tscms-today.html', 'admin.html')
    if set(html_by_name) != set(expected):
        raise ValueError('All three exact generated pages are required')
    result = {}
    for name in ('index.html', 'tscms-today.html'):
        html = html_by_name[name]
        if html.count('</head>') != 1 or html.count('</body>') != 1:
            raise ValueError(f'{name}: missing/duplicate structural HTML boundaries')
        # Do NOT add static hearts or doors. Existing loader is idempotently retained.
        if re.search(r'class\\s*=\\s*["\\\'][^"\\\']*\\btc-fav-(?:heart|door)\\b', html):
            raise ValueError(f'{name}: static Favorites control violates signed-out gate')
        html = ensure_tag(html, 'tscms-favorites.css', FAVORITES_CSS)
        html = ensure_tag(html, 'tscms-favorites.js', FAVORITES_JS)
        csspos = html.find('tscms-favorites.css')
        jspos = html.find('tscms-favorites.js')
        if csspos >= jspos:
            raise ValueError(f'{name}: stylesheet must load before module')
        result[name] = html
    admin = html_by_name['admin.html']
    if admin.count('</body>') != 1:
        raise ValueError('admin.html: structural body missing/duplicated')
    # Never "repair" a legacy tabbed/admin build by injecting a count widget:
    # the modern authenticated Control Room must already be present.
    if 'tscms-admin-dual.js' not in admin or 'TSCMS BROADCAST CONTROL ROOM' not in admin:
        raise ValueError('admin.html is not the current secured Control Room; STOP')
    result['admin.html'] = ensure_tag(admin, 'tscms-favorites-owner.js', OWNER_JS)
    return result

def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--root', required=True, help='A scratch staging folder with 3 generated HTML pages')
    ap.add_argument('--write', action='store_true', help='Write ONLY to scratch staging directory')
    args = ap.parse_args()
    root = Path(args.root).resolve()
    paths = {n: root / n for n in ('index.html', 'tscms-today.html', 'admin.html')}
    for name, path in paths.items():
        if not path.is_file() or path.is_symlink():
            raise SystemExit(f'Cannot validate {name}: absent, not regular, or symlink')
    old = {n: p.read_text(encoding='utf8') for n, p in paths.items()}
    new = preserve(old)  # preflight ALL pages before any write
    changed = [n for n in paths if new[n] != old[n]]
    if args.write:
        if not root.name.startswith('favorites-staging-'):
            raise SystemExit('Refusing --write: root must be named favorites-staging-*')
        if (root / '.git').exists() or (root / 'CNAME').exists():
            raise SystemExit('Refusing --write on repo or deployed-site directory')
        for name in changed:
            paths[name].write_text(new[name], encoding='utf8')
    print(('STAGING-WRITTEN ' if args.write else 'DRY-RUN ') +
          ', '.join(changed or ['unchanged']) + '; 3/3 strict loader checks PASS')

if __name__ == '__main__':
    main()
