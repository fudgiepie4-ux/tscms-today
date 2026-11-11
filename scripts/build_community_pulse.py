#!/usr/bin/env python3
"""Stage a verified Community Pulse feed. No production publication is performed.

The input collector must attest to complete post AND comment coverage for each
Central-time date. Missing days are NOT interpreted as zero activity.
"""
from __future__ import annotations

import argparse
import hashlib
import re
from datetime import date, datetime, time, timedelta, timezone
import json
import os
from pathlib import Path
import sys
import tempfile
from zoneinfo import ZoneInfo

CT = ZoneInfo('America/Chicago')
UTC = timezone.utc
MAX_AGE = timedelta(hours=48)
SKEW = timedelta(minutes=5)
JS_MAX = (1 << 53) - 1


class CoverageError(ValueError):
    """Unsafe or unverified input; do not stage or publish."""


def stamp(value, where: str) -> datetime:
    if isinstance(value, bool):
        raise CoverageError(f'{where}: invalid timestamp')
    if isinstance(value, (int, float)):
        sec = float(value) / (1000 if value > 10**11 else 1)
        if sec < 946684800:
            raise CoverageError(f'{where}: timestamp before year 2000')
        try:
            return datetime.fromtimestamp(sec, tz=UTC)
        except (ValueError, OverflowError, OSError) as exc:
            raise CoverageError(f'{where}: invalid epoch timestamp') from exc
    if not isinstance(value, str) or not value.strip():
        raise CoverageError(f'{where}: missing timestamp')
    try:
        parsed = datetime.fromisoformat(value.strip().replace('Z', '+00:00'))
    except ValueError as exc:
        raise CoverageError(f'{where}: invalid ISO timestamp') from exc
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise CoverageError(f'{where}: timezone offset required')
    return parsed.astimezone(UTC)


def integer(value, where: str) -> int:
    if type(value) is not int or value < 0 or value > JS_MAX:
        raise CoverageError(f'{where}: expected safe, nonnegative integer')
    return value


def field(row: dict, names: tuple[str, ...], where: str):
    available = [n for n in names if n in row]
    if not available:
        raise CoverageError(f'{where}: missing {"/".join(names)}')
    if len(available) > 1 and any(row[n] != row[available[0]] for n in available[1:]):
        raise CoverageError(f'{where}: conflicting fields {available}')
    return row[available[0]]


def post_comment_count(row: dict, where: str) -> int:
    value = field(row, ('comments_count', 'comment_count', 'comments'), where)
    if isinstance(value, dict):
        if isinstance(value.get('summary'), dict):
            value = value['summary'].get('total_count')
        else:
            value = value.get('count')
    return integer(value, f'{where}.comments')


def central_days(now: datetime) -> list[date]:
    today = now.astimezone(CT).date()
    return [today - timedelta(days=i) for i in range(7, 0, -1)]


def fresh(value, now: datetime, where: str):
    ts = stamp(value, where)
    if ts > now + SKEW or now - ts > MAX_AGE:
        raise CoverageError(f'{where}: older than 48 hours or in the future')
    return ts


def build_feed(posts_json, coverage_json=None, *, now: datetime | None = None, source_bytes: bytes | None = None):
    now = now or datetime.now(UTC)
    if now.tzinfo is None or now.utcoffset() is None:
        raise CoverageError('now must be timezone-aware')
    now = now.astimezone(UTC)
    if isinstance(posts_json, list):
        source = {'posts': posts_json}
    elif isinstance(posts_json, dict):
        source = posts_json
    else:
        raise CoverageError('posts_14d.json must be an object or array')
    posts = source.get('posts')
    if not isinstance(posts, list):
        raise CoverageError('posts_14d.json must provide a posts array')

    coverage = coverage_json if coverage_json is not None else source.get('coverage')
    if not isinstance(coverage, dict):
        raise CoverageError('verified collector coverage manifest required (no inferred zero days)')
    # Real collector snapshots can lack a source timestamp. In that case the
    # collector MUST attest its original collection time in the manifest.
    source_time = field(source, ('generated', 'collected_at', 'fetched_at'), 'source') if any(k in source for k in ('generated', 'collected_at', 'fetched_at')) else None
    attested_source_time = coverage.get('source_generated')
    if source_time is None:
        source_time = attested_source_time
    elif attested_source_time is not None and stamp(source_time, 'source.time') != stamp(attested_source_time, 'coverage.source_generated'):
        raise CoverageError('manifest source collection timestamp disagrees with source')
    if source_time is None:
        raise CoverageError('missing original source collection timestamp')
    # Attestation is issued by the actual collector; boolean completeness flags
    # without a run ID, pagination evidence and exact source hash are insufficient.
    if coverage.get('schema_version') != 1:
        raise CoverageError('manifest: schema_version 1 required')
    collector = coverage.get('collector')
    if not isinstance(collector, dict) or not all(isinstance(collector.get(k), str) and collector[k].strip() for k in ('name', 'version')):
        raise CoverageError('manifest: collector name and version required')
    run_id = coverage.get('collection_id')
    if not isinstance(run_id, str) or not run_id.strip():
        raise CoverageError('manifest: genuine collector collection_id required')
    pagination = coverage.get('pagination')
    if not isinstance(pagination, dict) or pagination.get('posts_exhausted') is not True or type(pagination.get('pages_fetched')) is not int or pagination['pages_fetched'] < 1:
        raise CoverageError('manifest: exhausted post pagination and pages_fetched proof required')
    digest = coverage.get('source_sha256')
    if not isinstance(digest, str) or not re.fullmatch(r'[0-9a-f]{64}', digest):
        raise CoverageError('manifest: SHA-256 of exact source file required')
    if source_bytes is not None and hashlib.sha256(source_bytes).hexdigest() != digest:
        raise CoverageError('manifest: source SHA-256 mismatch (wrong or changed snapshot)')
    source_at = fresh(source_time, now, 'source.collection')
    verified_at = fresh(field(coverage, ('generated', 'verified_at'), 'coverage'), now, 'coverage.verified_at')
    if verified_at < source_at - SKEW:
        raise CoverageError('coverage proof predates the source snapshot')

    expected_days = central_days(now)
    by_date: dict[str, dict] = {}
    for i, row in enumerate(coverage.get('days', [])):
        if not isinstance(row, dict):
            raise CoverageError(f'coverage.days[{i}]: expected object')
        day = row.get('date')
        if not isinstance(day, str):
            raise CoverageError(f'coverage.days[{i}]: invalid date')
        try:
            if date.fromisoformat(day).isoformat() != day:
                raise ValueError
        except ValueError as exc:
            raise CoverageError(f'coverage.days[{i}]: invalid date') from exc
        if day in by_date:
            raise CoverageError(f'coverage: duplicate day {day}')
        by_date[day] = row

    expected_iso = [d.isoformat() for d in expected_days]
    if not set(expected_iso).issubset(by_date):
        raise CoverageError('coverage: one or more of the seven completed CT days missing')

    counts = {d: {'posts': 0, 'comments': 0} for d in expected_iso}
    seen_ids = set()
    for i, row in enumerate(posts):
        if not isinstance(row, dict):
            raise CoverageError(f'posts[{i}]: expected object')
        when = stamp(field(row, ('creation_time', 'created_time', 'created_at', 'timestamp', 'published_at'), f'posts[{i}]'), f'posts[{i}].created')
        if when > now + SKEW:
            raise CoverageError(f'posts[{i}]: future post timestamp')
        day = when.astimezone(CT).date().isoformat()
        if day not in counts:
            continue
        # A numeric post id and its Facebook permalink are distinct legitimate
        # fields. Prefer the stable id; use URL only when identifiers are absent.
        if 'id' in row and 'post_id' in row and str(row['id']).strip() != str(row['post_id']).strip():
            raise CoverageError(f'posts[{i}]: conflicting stable post ids')
        ident = next((row[k] for k in ('id', 'post_id', 'post_url') if k in row), None)
        if not isinstance(ident, (str, int)) or isinstance(ident, bool) or not str(ident).strip():
            raise CoverageError(f'posts[{i}]: missing stable post identifier')
        ident = str(ident).strip()
        if ident in seen_ids:
            raise CoverageError(f'posts[{i}]: duplicate post identifier {ident}')
        seen_ids.add(ident)
        comments = post_comment_count(row, f'posts[{i}]')
        counts[day]['posts'] += 1
        counts[day]['comments'] += comments
        if counts[day]['comments'] > JS_MAX:
            raise CoverageError(f'{day}: comment total overflow')

    for day in expected_days:
        key = day.isoformat()
        proof = by_date[key]
        if proof.get('posts_complete') is not True or proof.get('comments_complete') is not True:
            raise CoverageError(f'{key}: source coverage not verified for posts AND comments')
        if integer(proof.get('post_count'), f'{key}.post_count') != counts[key]['posts']:
            raise CoverageError(f'{key}: actual post count disagrees with collector')
        if integer(proof.get('comment_total'), f'{key}.comment_total') != counts[key]['comments']:
            raise CoverageError(f'{key}: actual comment count disagrees with collector')
        boundary = datetime.combine(day + timedelta(days=1), time.min, CT).astimezone(UTC)
        through = stamp(proof.get('scanned_through'), f'{key}.scanned_through')
        if through < boundary or through > now + SKEW:
            raise CoverageError(f'{key}: full Central day not covered by collector')
    return {
        'generated': now.isoformat(timespec='seconds').replace('+00:00', 'Z'),
        'window': {'start': expected_iso[0], 'end': expected_iso[-1]},
        'days': [{'date': key, **counts[key]} for key in expected_iso]
    }


def stage(source: Path, coverage: Path | None, stage_dir: Path) -> Path:
    if not source.is_file():
        raise CoverageError(f'missing source file: {source}')
    source_bytes = source.read_bytes()
    obj = json.loads(source_bytes.decode('utf-8'))
    proof = json.loads(coverage.read_text(encoding='utf-8')) if coverage else None
    payload = build_feed(obj, proof, source_bytes=source_bytes)
    output = stage_dir / 'community-pulse-current.json'
    stage_dir.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(prefix='.pulse-', suffix='.json', dir=stage_dir)
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as fp:
            json.dump(payload, fp, indent=2, ensure_ascii=False)
            fp.write('\n')
            fp.flush()
            os.fsync(fp.fileno())
        os.replace(tmp, output)
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)
    return output


def main():
    ap = argparse.ArgumentParser(description='Stage ONLY a verified 7-day Community Pulse feed; never upload live.')
    ap.add_argument('--posts', type=Path, required=True, help='complete posts_14d.json from trusted collector')
    ap.add_argument('--coverage', type=Path, help='collector coverage attestation JSON; can also be inline under posts.coverage')
    ap.add_argument('--stage-dir', type=Path, required=True, help='isolated staging directory, not public website root')
    opts = ap.parse_args()
    if not any(part.lower().startswith(('stage', 'preview', 'test')) for part in opts.stage_dir.parts):
        ap.error('--stage-dir must be inside an explicitly named staging/preview/test directory')
    try:
        path = stage(opts.posts, opts.coverage, opts.stage_dir)
    except (CoverageError, json.JSONDecodeError, OSError) as exc:
        print(f'BLOCKED; no feed staged: {exc}', file=sys.stderr)
        return 2
    print(f'STAGED ONLY: {path}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
