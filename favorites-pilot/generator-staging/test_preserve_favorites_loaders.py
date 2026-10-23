#!/usr/bin/env python3
"""Hermetic proof for TEST-ONLY preservation adapter (no production writes)."""
import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from preserve_favorites_loaders import (
    preserve, number_of_loaders, FAVORITES_CSS, FAVORITES_JS, OWNER_JS
)

ADMIN = '<html><body>TSCMS BROADCAST CONTROL ROOM<script src="tscms-admin-dual.js"></script></body></html>'
PUBLIC = '<html><head><title>TSCMS</title></head><body><p>PLAY NOW and Quick Jump stay</p></body></html>'

def fixtures():
    return {'index.html':PUBLIC,'tscms-today.html':PUBLIC,'admin.html':ADMIN}

class PreservationTests(unittest.TestCase):
    def test_injects_missing_tags_once_and_keeps_everything_else(self):
        out=preserve(fixtures())
        for path in ('index.html','tscms-today.html'):
            self.assertEqual(number_of_loaders(out[path],'tscms-favorites.css'),1)
            self.assertEqual(number_of_loaders(out[path],'tscms-favorites.js'),1)
            self.assertIn('PLAY NOW and Quick Jump stay',out[path])
            self.assertLess(out[path].index('tscms-favorites.css'),out[path].index('tscms-favorites.js'))
        self.assertEqual(number_of_loaders(out['admin.html'],'tscms-favorites-owner.js'),1)
        self.assertEqual(number_of_loaders(out['admin.html'],'tscms-favorites.js'),0)

    def test_repeat_run_is_byte_identical(self):
        once=preserve(fixtures())
        self.assertEqual(preserve(once),once)

    def test_existing_cache_busted_tags_are_not_replaced(self):
        x=fixtures()
        x['index.html']=x['index.html'].replace('</body>',
            '<link rel="stylesheet" href="tscms-favorites.css?v=qa">'
            '<script type="module" src="tscms-favorites.js?v=qa"></script></body>')
        out=preserve(x)
        self.assertIn('css?v=qa',out['index.html'])
        self.assertEqual(number_of_loaders(out['index.html'],'tscms-favorites.css'),1)
        self.assertEqual(number_of_loaders(out['index.html'],'tscms-favorites.js'),1)

    def test_multiple_loaders_fail_closed(self):
        x=fixtures()
        x['index.html']=x['index.html'].replace('</body>',FAVORITES_JS+FAVORITES_JS+'</body>')
        with self.assertRaisesRegex(ValueError,'duplicate'):
            preserve(x)

    def test_missing_or_duplicate_body_fails_closed(self):
        x=fixtures()
        x['index.html']=x['index.html'].replace('</body>','')
        with self.assertRaisesRegex(ValueError,'structural'):
            preserve(x)

    def test_signed_out_static_controls_fail_closed(self):
        x=fixtures()
        x['tscms-today.html']=x['tscms-today.html'].replace('</body>',
            '<button class="tc-fav-heart">Heart</button></body>')
        with self.assertRaisesRegex(ValueError,'signed-out'):
            preserve(x)

    def test_insecure_legacy_admin_refused(self):
        x=fixtures()
        x['admin.html']='<html><body>OLD tabbed admin</body></html>'
        with self.assertRaisesRegex(ValueError,'current secured Control Room'):
            preserve(x)

    def test_missing_any_page_refused(self):
        x=fixtures()
        del x['admin.html']
        with self.assertRaisesRegex(ValueError,'three exact'):
            preserve(x)

    def test_owner_count_module_only_in_admin(self):
        out=preserve(fixtures())
        self.assertIn(OWNER_JS,out['admin.html'])
        self.assertNotIn(OWNER_JS,out['index.html'])
        self.assertNotIn(OWNER_JS,out['tscms-today.html'])
        self.assertIn(FAVORITES_CSS,out['index.html'])

    def test_actual_pr28_generated_pages_have_exact_loader_parity(self):
        # Real staged page artifacts, not invented HTML fixture strings.
        repo_root = Path(__file__).resolve().parents[2]
        original = {
            name: (repo_root / name).read_text(encoding='utf8')
            for name in ('index.html', 'tscms-today.html', 'admin.html')
        }
        self.assertEqual(preserve(original), original,
                         'Current PR #28 page artifacts must already pass without edits')
        self.assertEqual(number_of_loaders(original['index.html'],'tscms-favorites.js'),1)
        self.assertEqual(number_of_loaders(original['tscms-today.html'],'tscms-favorites.js'),1)
        self.assertEqual(number_of_loaders(original['admin.html'],'tscms-favorites-owner.js'),1)

if __name__=='__main__':
    unittest.main(verbosity=2)
