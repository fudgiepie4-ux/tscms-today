#!/usr/bin/env python3
"""Offline regression: make_public.py injects Admin authentication module safely."""
import ast
import importlib.util
from pathlib import Path
import re
import textwrap

root = Path(__file__).resolve().parent
path = root / "patch-make-public-admin-dual.py"
spec = importlib.util.spec_from_file_location("promo_admin_generator_patch", path)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

fixture = '''import os
import re

FILES = "/tmp/not-written"
def minify_html(src, extract_assets=False, js_name="site.js"):
    return src
def main():
    src = '<html><head></head><body><div id="adminbody">Admin</div></body></html>'
    admin_html = minify_html(src, extract_assets=True, js_name="admin-site.js")
    with open(os.path.join(FILES, "admin.html"), "w") as f:
        f.write(admin_html)
'''
patched = module.patch_source(fixture)
assert patched != fixture
assert module.MARKER_START in patched
assert patched.count(module.MARKER_START) == 1
assert module.patch_source(patched) == patched, "Repatch must be idempotent"
assert patched.replace(module.BLOCK, "") == fixture, "Unrelated generator lines changed"
ast.parse(patched)
print("PASS — Targeted generator patch compiles, preserves all other source, and is idempotent.")

block = textwrap.dedent(module.BLOCK)
assert 'tscms-promo-admin.js' not in block, "Uploader must arrive via authenticated dual module"
def render(admin_html):
    context = {'admin_html': admin_html, 're': re}
    exec(block, context, context)
    return context['admin_html']

missing = '<html><body><div id="adminbody">Admin panel</div></body></html>'
added = render(missing)
tag = '<script type="module" src="tscms-admin-dual.js?v=promo-20261111"></script>'
assert added == missing.replace('</body>', tag + '</body>')
assert added.count('tscms-admin-dual.js') == 1
assert render(added) == added, "Existing module must not duplicate on second pass"
print("PASS — Fresh generated admin.html injects exactly one correct module and survives second pass.")

existing = '<html><body><main id="adminbody"></main><script defer type="module" src="./tscms-admin-dual.js?v=original"></script></body></html>'
assert render(existing) == existing, "Existing correctly configured module must stay byte-for-byte intact"
print("PASS — Existing hand-managed module remains unchanged; never create duplicate script.")

try:
    render('<html><body>' + tag + tag + '</body></html>')
except AssertionError:
    print("PASS — Duplicate personal admin modules block generated output.")
else:
    raise AssertionError("Duplicate scripts were silently accepted")

try:
    render('<html><div id="adminbody"></div>')
except AssertionError:
    print("PASS — Missing closing body blocks release.")
else:
    raise AssertionError("Malformed document incorrectly accepted")

try:
    render('<html><body><script src="tscms-admin-dual.js"></script></body></html>')
except AssertionError:
    print("PASS — Non-module JavaScript tag blocks release.")
else:
    raise AssertionError("Non-module script was incorrectly accepted")

try:
    module.patch_source('import re\n\ndef main():\n    pass\n')
except ValueError:
    print("PASS — Unknown generator layout refuses patch rather than overwriting current source.")
else:
    raise AssertionError("Generator with unknown layout was patched")

print("PASS — PR41 Admin generator hook test suite.")
