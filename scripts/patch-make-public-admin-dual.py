#!/usr/bin/env python3
"""Stage an idempotent TSCMS admin-module hook in the CURRENT make_public.py.

The actual pipeline generator lives outside this GitHub repository. This
utility patches only a copy unless --write is explicitly set, and refuses
unexpected generator layouts rather than replacing them with an older copy.

Usage:
  python scripts/patch-make-public-admin-dual.py /path/to/make_public.py
  python scripts/patch-make-public-admin-dual.py /path/to/make_public.py --write

Without --write: syntax-checks the proposed change, prints a focused diff,
and leaves the source untouched.
"""
import argparse
import ast
import difflib
from pathlib import Path

MARKER_START = "    # PR41 BEGIN: generator-protected personal Admin module"
MARKER_END = "    # PR41 END: generator-protected personal Admin module"

# Inject into make_public.main() AFTER admin_html is minified but BEFORE its
# file write. Do not add this to the homepage (index.html). If an existing
# module tag was already generated, preserve it instead of duplicating it.
BLOCK = r'''    # PR41 BEGIN: generator-protected personal Admin module
    # Admin uploader is imported by tscms-admin-dual.js, so keep that
    # authenticated module on every freshly generated admin.html.
    admin_dual_re = re.compile(
        r"<script\b[^>]*\bsrc\s*=\s*['\"](?:\./)?tscms-admin-dual\.js(?:\?[^'\"]*)?['\"][^>]*>\s*</script>",
        flags=re.I,
    )
    if not admin_dual_re.search(admin_html):
        assert '</body>' in admin_html, 'admin.html closing body missing'
        admin_html = admin_html.replace(
            '</body>',
            '<script type="module" src="tscms-admin-dual.js?v=promo-20261111"></script></body>',
            1,
        )
    admin_dual_tags = admin_dual_re.findall(admin_html)
    assert len(admin_dual_tags) == 1, (
        'admin.html must contain exactly one tscms-admin-dual.js module'
    )
    assert re.search(r"\btype\s*=\s*['\"]module['\"]", admin_dual_tags[0], re.I), (
        'tscms-admin-dual.js must load as a module'
    )
    # PR41 END: generator-protected personal Admin module
'''

# Exact anchor from the verified archived November 2 make_public.py; the
# current private generator may differ. If so, STOP rather than guess.
ANCHOR = '    with open(os.path.join(FILES, "admin.html"), "w") as f:'


def patch_source(source):
    if MARKER_START in source:
        if source.count(MARKER_START) != 1 or source.count(MARKER_END) != 1:
            raise ValueError("Existing PR41 generator block is incomplete/duplicated.")
        ast.parse(source)
        return source
    if MARKER_END in source:
        raise ValueError("Found PR41 end marker without its start marker.")
    if source.count(ANCHOR) != 1:
        raise ValueError(
            'Current generator does not match the verified admin write anchor. '
            'Inspect its admin_html output stage; do not patch blindly.'
        )
    if 'import re' not in source and 'from re import' not in source:
        raise ValueError("Generator must import re before using this block.")
    before, after = source.split(ANCHOR, 1)
    # Ensure the anchor applies to admin_html after it is produced, not a
    # different string or a write within an unrelated function.
    if 'admin_html' not in before or 'def main():' not in before:
        raise ValueError("Cannot establish generator admin_html context.")
    result = before + BLOCK + ANCHOR + after
    ast.parse(result)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("make_public", type=Path, help="Actual current generator source")
    parser.add_argument("--write", action="store_true",
                        help="Explicitly apply the verified patch to this path")
    args = parser.parse_args()
    original = args.make_public.read_text(encoding="utf-8")
    updated = patch_source(original)
    if updated == original:
        print("ALREADY STAGED: no duplicate block added.")
        return
    diff = ''.join(difflib.unified_diff(
        original.splitlines(keepends=True),
        updated.splitlines(keepends=True),
        fromfile=str(args.make_public),
        tofile=str(args.make_public) + ' (PR41 staged)',
    ))
    print(diff)
    if args.write:
        args.make_public.write_text(updated, encoding="utf-8")
        print("PATCH WRITTEN. Run isolated rebuild + preservation checks before PR merge.")
    else:
        print("DRY RUN ONLY: generator was not modified. Use --write after reviewing this diff.")


if __name__ == "__main__":
    main()
