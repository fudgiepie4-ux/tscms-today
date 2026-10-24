#!/usr/bin/env python3
"""Fail-closed contract tests for Community Pulse producer (synthetic fixtures)."""
import copy
from datetime import datetime, timedelta, timezone
import json
import hashlib
from pathlib import Path
import tempfile
import unittest
from zoneinfo import ZoneInfo

from build_community_pulse import CoverageError, build_feed, central_days, stage

UTC = timezone.utc
CT = ZoneInfo('America/Chicago')
NOW = datetime(2026, 10, 24, 17, 0, tzinfo=UTC)


def fixture(now=NOW):
    days = central_days(now)
    source_at = now - timedelta(hours=1)
    posts = [
        {'id': 'p1', 'created_time': datetime.combine(days[0], datetime.min.time(), CT).astimezone(UTC).isoformat(), 'comments_count': 2},
        {'id': 'p2', 'created_time': datetime.combine(days[3], datetime.min.time(), CT).astimezone(UTC).isoformat(), 'comments': {'summary': {'total_count': 0}}},
        {'id': 'p3', 'created_time': datetime.combine(days[6], datetime.min.time(), CT).astimezone(UTC).isoformat(), 'comment_count': 4},
    ]
    manifest = {
        'schema_version': 1,
        'collector': {'name': 'synthetic-fixture-collector', 'version': 'test-v1'},
        'collection_id': 'test-run-'+now.date().isoformat(),
        'source_sha256': '0' * 64,
        'pagination': {'posts_exhausted': True, 'pages_fetched': 3},
        'verified_at': now.isoformat(),
        'source_generated': source_at.isoformat(),
        'days': []
    }
    for d in days:
        next_midnight = datetime.combine(d + timedelta(days=1), datetime.min.time(), CT).astimezone(UTC)
        relevant = [p for p in posts if datetime.fromisoformat(p['created_time']).astimezone(CT).date() == d]
        comments = [2 if p['id'] == 'p1' else 4 if p['id'] == 'p3' else 0 for p in relevant]
        manifest['days'].append({
            'date': d.isoformat(), 'posts_complete': True, 'comments_complete': True,
            'post_count': len(relevant), 'comment_total': sum(comments),
            'scanned_through': max(next_midnight, source_at).isoformat(),
        })
    return {'posts': posts, 'generated': source_at.isoformat()}, manifest


class CommunityPulseTest(unittest.TestCase):
    def test_happy_path_seven_completed_days_and_genuine_zeros(self):
        source, proof = fixture()
        feed = build_feed(source, proof, now=NOW)
        self.assertEqual(feed['window'], {'start': '2026-10-17', 'end': '2026-10-23'})
        self.assertEqual(len(feed['days']), 7)
        self.assertEqual(sum(x['posts'] for x in feed['days']), 3)
        self.assertEqual(sum(x['comments'] for x in feed['days']), 6)
        self.assertEqual([x['date'] for x in feed['days']], [d.isoformat() for d in central_days(NOW)])
        self.assertEqual(sum(1 for x in feed['days'] if x['posts']==0 and x['comments']==0), 4)
        self.assertLessEqual((NOW - datetime.fromisoformat(feed['generated'].replace('Z','+00:00'))).total_seconds(), 48*3600)

    def test_unverified_empty_date_does_not_become_fake_zero(self):
        source, proof = fixture()
        proof['days'][1]['posts_complete'] = False
        with self.assertRaisesRegex(CoverageError, 'not verified'):
            build_feed(source, proof, now=NOW)

    def test_missing_day_blocks_entire_feed(self):
        source, proof = fixture()
        proof['days'].pop(1)
        with self.assertRaisesRegex(CoverageError, 'seven completed'):
            build_feed(source, proof, now=NOW)

    def test_missing_manifest_blocks_inferred_zeros(self):
        source, _ = fixture()
        with self.assertRaisesRegex(CoverageError, 'manifest required'):
            build_feed(source, now=NOW)

    def test_missing_comments_blocks(self):
        source, proof = fixture()
        del source['posts'][0]['comments_count']
        with self.assertRaisesRegex(CoverageError, 'comments'):
            build_feed(source, proof, now=NOW)

    def test_bad_negative_or_fractional_comments_blocks(self):
        for value in (-1, 1.1, '2', True):
            with self.subTest(value=value):
                source, proof = fixture()
                source['posts'][0]['comments_count']=value
                with self.assertRaises(CoverageError):
                    build_feed(source, proof, now=NOW)

    def test_duplicate_post_blocks(self):
        source, proof = fixture()
        source['posts'].append(copy.deepcopy(source['posts'][0]))
        with self.assertRaisesRegex(CoverageError, 'duplicate post'):
            build_feed(source, proof, now=NOW)

    def test_mismatched_collector_post_or_comment_total_blocks(self):
        for key in ('post_count','comment_total'):
            source, proof = fixture()
            proof['days'][0][key] += 1
            with self.subTest(key=key), self.assertRaisesRegex(CoverageError, 'disagrees'):
                build_feed(source, proof, now=NOW)

    def test_stale_source_even_if_output_would_be_fresh_blocks(self):
        source, proof = fixture()
        source['generated']=(NOW - timedelta(hours=49)).isoformat()
        proof['source_generated']=source['generated']
        with self.assertRaisesRegex(CoverageError, 'older than 48'):
            build_feed(source, proof, now=NOW)

    def test_stale_coverage_blocks(self):
        source, proof = fixture()
        proof['verified_at']=(NOW - timedelta(hours=49)).isoformat()
        with self.assertRaisesRegex(CoverageError, 'older than 48'):
            build_feed(source, proof, now=NOW)

    def test_partial_day_scan_blocks(self):
        source, proof = fixture()
        day=central_days(NOW)[-1]
        proof['days'][-1]['scanned_through']=datetime.combine(day, datetime.min.time(), CT).isoformat()
        with self.assertRaisesRegex(CoverageError, 'full Central day'):
            build_feed(source, proof, now=NOW)

    def test_naive_post_timestamp_blocks(self):
        source, proof = fixture()
        source['posts'][0]['created_time']='2026-10-17T00:00:00'
        with self.assertRaisesRegex(CoverageError, 'timezone offset'):
            build_feed(source, proof, now=NOW)

    def test_dst_fall_back_uses_actual_central_midnight(self):
        now=datetime(2026,11,3,18,0,tzinfo=UTC)
        source, proof=fixture(now)
        feed=build_feed(source,proof,now=now)
        self.assertEqual(feed['window'], {'start':'2026-10-27','end':'2026-11-02'})
        self.assertEqual(len(feed['days']),7)
        self.assertIn('2026-11-01', [d['date'] for d in feed['days']])

    def test_offset_boundary_matches_CT_not_UTC(self):
        source, proof = fixture()
        source['posts'].append({'id':'older','created_at':'2026-10-17T04:30:00Z','comments':8})
        result=build_feed(source,proof,now=NOW)
        self.assertEqual(sum(x['posts'] for x in result['days']),3)

    def test_invalid_input_does_not_overwrite_previous_staging_artifact(self):
        source, proof=fixture()
        proof['days'].pop(2)
        with tempfile.TemporaryDirectory(prefix='stage-pulse-test-') as tmp:
            d=Path(tmp)
            src=d/'posts_14d.json'; ver=d/'coverage.json'; out=d/'community-pulse-current.json'
            raw = json.dumps(source).encode('utf-8')
            proof['source_sha256'] = hashlib.sha256(raw).hexdigest()
            src.write_bytes(raw);ver.write_text(json.dumps(proof));out.write_text('DO NOT OVERWRITE')
            with self.assertRaises(CoverageError):
                stage(src, ver, d)
            self.assertEqual(out.read_text(),'DO NOT OVERWRITE')


    def test_real_creation_time_with_distinct_numeric_id_and_url(self):
        source, proof = fixture()
        post = source['posts'][0]
        post['creation_time'] = post.pop('created_time')
        post['id'] = 99881
        post['post_url'] = 'https://facebook.com/groups/example/permalink/99881/'
        feed = build_feed(source, proof, now=NOW)
        self.assertEqual(sum(d['posts'] for d in feed['days']), 3)
        self.assertEqual(sum(d['comments'] for d in feed['days']), 6)

    def test_manifest_must_attest_pagination(self):
        source, proof = fixture()
        del proof['pagination']
        with self.assertRaisesRegex(CoverageError, 'pagination'):
            build_feed(source, proof, now=NOW)

    def test_manifest_must_have_collector_identity(self):
        source, proof = fixture()
        del proof['collector']
        with self.assertRaisesRegex(CoverageError, 'collector name'):
            build_feed(source, proof, now=NOW)

    def test_source_file_hash_prevents_stale_or_wrong_snapshot(self):
        source, proof = fixture()
        actual = json.dumps(source).encode('utf-8')
        proof['source_sha256'] = hashlib.sha256(actual).hexdigest()
        with self.assertRaisesRegex(CoverageError, 'SHA-256 mismatch'):
            build_feed(source, proof, now=NOW, source_bytes=actual+b' ')

    def test_attested_source_timestamp_without_embedded_timestamp(self):
        source, proof = fixture()
        del source['generated']
        feed = build_feed(source, proof, now=NOW)
        self.assertEqual(feed['window']['end'], '2026-10-23')

if __name__ == '__main__':
    unittest.main(verbosity=2)
