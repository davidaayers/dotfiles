"""Retention and safety tests; all CLI calls are mocked, databases are temporary."""

import contextlib
import importlib.machinery
import importlib.util
import io
import json
import os
from pathlib import Path
import sqlite3
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch


SCRIPT = Path(__file__).resolve().parents[1] / 'bin' / 'opencode-cleanup'
loader = importlib.machinery.SourceFileLoader('cleanup', str(SCRIPT))
spec = importlib.util.spec_from_loader(loader.name, loader)
cleanup = importlib.util.module_from_spec(spec)
loader.exec_module(cleanup)


def session(sid, updated=0, parent=None, **extra):
    return dict(id=sid, time={'updated': updated}, parentID=parent, **extra)


class RetentionTests(unittest.TestCase):
    def test_recent_descendant_keeps_all_ancestors_but_not_old_sibling(self):
        rows = [session('ses_root'), session('ses_parent', parent='ses_root'),
                session('ses_recent', 100, 'ses_parent'),
                session('ses_old', parent='ses_root'),
                session('ses_grandchild', parent='ses_old')]
        self.assertEqual(cleanup.make_plan({s['id']: s for s in rows}, 100),
                         (['ses_old'], 2))

    def test_old_subtrees_across_projects_and_archives(self):
        rows = [session('ses_a', projectID='one'),
                session('ses_b', parent='ses_a', projectID='one'),
                session('ses_c', projectID='two', time_archived=10)]
        self.assertEqual(cleanup.make_plan({s['id']: s for s in rows}, 100),
                         (['ses_a', 'ses_c'], 3))

    def test_empty_plan(self):
        self.assertEqual(cleanup.make_plan({}, 100), ([], 0))

    def test_missing_parent_and_cycle_fail_closed(self):
        for rows in ([session('ses_a', parent='ses_missing')],
                     [session('ses_a', parent='ses_b'), session('ses_b', parent='ses_a')]):
            with self.subTest(rows=rows), self.assertRaises(cleanup.CleanupError):
                cleanup.make_plan({s['id']: s for s in rows}, 100)


class PaginationTests(unittest.TestCase):
    def test_all_pages_including_children(self):
        pages = [{'data': [session('ses_a')], 'cursor': {'next': 'a+/='}},
                 {'data': [session('ses_b', parent='ses_a')], 'cursor': {}}]
        with patch.object(cleanup, 'api', side_effect=pages) as api:
            self.assertEqual(set(cleanup.list_sessions()), {'ses_a', 'ses_b'})
        self.assertEqual(api.call_args_list[0].args, ('/api/session?limit=100&order=asc',))
        self.assertIn('cursor=a%2B%2F%3D', api.call_args_list[1].args[0])

    def test_bad_pages_fail_closed(self):
        for page in ({'data': []}, {'data': [], 'cursor': None},
                     {'data': [None], 'cursor': {}},
                     {'data': [session('ses_a', float('nan'))], 'cursor': {}},
                     {'data': [session('invalid')], 'cursor': {}}):
            with self.subTest(page=page), patch.object(cleanup, 'api', return_value=page):
                with self.assertRaises(cleanup.CleanupError):
                    cleanup.list_sessions()

    def test_repeated_cursor_and_duplicate_sessions_fail_closed(self):
        for pages in (
            [{'data': [], 'cursor': {'next': 'a'}}] * 2,
            [{'data': [session('ses_a')], 'cursor': {'next': 'a'}},
             {'data': [session('ses_a')], 'cursor': {}}],
        ):
            with patch.object(cleanup, 'api', side_effect=pages):
                with self.assertRaises(cleanup.CleanupError):
                    cleanup.list_sessions()


class SafetyTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.db = Path(self.temp.name) / 'opencode.db'
        self.db.touch()
        self.lock = Path(str(self.db) + '.cleanup.lock')

    def invoke(self, *args, version='opencode v2.2.6', delete_error=False):
        def run(*command):
            if command == ('opencode', '--version'):
                return version
            if command == ('opencode', 'debug', 'paths', 'db'):
                return str(self.db)
            if delete_error:
                raise cleanup.CleanupError('delete failed')
            return ''
        with patch('sys.argv', [str(SCRIPT), *args]), \
                patch.object(cleanup.shutil, 'which', return_value='/mock/bin'), \
                patch.object(cleanup, 'run', side_effect=run) as commands, \
                patch.object(cleanup, 'list_sessions', return_value={'ses_old': session('ses_old')}) as listing, \
                contextlib.redirect_stdout(io.StringIO()):
            cleanup.main()
        return commands, listing

    def test_preview_never_deletes_vacuums_locks_or_checks_idle(self):
        with patch.object(cleanup, 'assert_idle') as idle, \
                patch.object(cleanup, 'vacuum_database') as vacuum:
            commands, _ = self.invoke('--dry-run', '--vacuum')
        self.assertEqual(commands.call_count, 2)
        idle.assert_not_called()
        vacuum.assert_not_called()
        self.assertFalse(self.lock.exists())

    def test_busy_database_refused_before_listing(self):
        with patch.object(cleanup, 'assert_idle', side_effect=cleanup.CleanupError('busy')):
            with self.assertRaisesRegex(cleanup.CleanupError, 'busy'):
                self.invoke()
        self.assertFalse(self.lock.exists())

    def test_delete_uses_private_server_and_releases_lock(self):
        with patch.object(cleanup, 'assert_idle') as idle:
            commands, _ = self.invoke()
        self.assertEqual(idle.call_count, 2)
        commands.assert_any_call('opencode', 'session', 'delete', '--standalone', 'ses_old')
        self.assertFalse(self.lock.exists())

    def test_failed_deletion_never_vacuums(self):
        with patch.object(cleanup, 'assert_idle'), \
                patch.object(cleanup, 'vacuum_database') as vacuum:
            with self.assertRaisesRegex(cleanup.CleanupError, 'delete failed'):
                self.invoke('--vacuum', delete_error=True)
        vacuum.assert_not_called()
        self.assertFalse(self.lock.exists())

    def test_existing_lock_not_removed(self):
        self.lock.mkdir()
        with self.assertRaisesRegex(cleanup.CleanupError, 'Cleanup lock exists'):
            self.invoke()
        self.assertTrue(self.lock.exists())

    def test_other_versions_rejected(self):
        for version in ('1.2.3', 'opencode v3.0.0'):
            with self.subTest(version=version), self.assertRaises(cleanup.CleanupError):
                self.invoke('--dry-run', version=version)

    def test_lsof_error_and_holders(self):
        for code, stdout, stderr in ((0, '123\n', ''), (2, '', 'error'), (1, '', 'warning')):
            result = subprocess.CompletedProcess([], code, stdout, stderr)
            with patch.object(cleanup.subprocess, 'run', return_value=result):
                with self.assertRaises(cleanup.CleanupError):
                    cleanup.assert_idle(self.db)

    def test_api_uses_private_server(self):
        with patch.object(cleanup, 'run', return_value='{}') as run:
            cleanup.api('/api/session')
        run.assert_called_once_with('opencode', 'api', '--standalone', 'get', '/api/session')

    def test_vacuum_reclaims_fixture_pages(self):
        with sqlite3.connect(str(self.db)) as connection:
            connection.execute('CREATE TABLE fixture (data BLOB)')
            connection.execute('INSERT INTO fixture VALUES (zeroblob(1048576))')
            connection.execute('DELETE FROM fixture')
        before = self.db.stat().st_size
        with patch.object(cleanup, 'assert_idle'):
            cleanup.vacuum_database(self.db)
        self.assertLess(self.db.stat().st_size, before)

    def test_vacuum_refuses_low_space(self):
        with patch.object(cleanup, 'assert_idle'), \
                patch.object(cleanup.shutil, 'disk_usage') as usage:
            usage.return_value.free = 0
            with self.assertRaisesRegex(cleanup.CleanupError, 'Not enough free space'):
                cleanup.vacuum_database(self.db)


@unittest.skipUnless(os.environ.get('OPENCODE_CLEANUP_INTEGRATION') == '1',
                     'Set OPENCODE_CLEANUP_INTEGRATION=1 for disposable real-V2 integration test')
class V2IntegrationTests(unittest.TestCase):
    def test_real_v2_retention_deletion_and_vacuum(self):
        with tempfile.TemporaryDirectory(prefix='opencode-cleanup-test-') as tmp:
            env = dict(os.environ, PYTHONDONTWRITEBYTECODE='1')
            for key, child in [('XDG_DATA_HOME', 'data'), ('XDG_STATE_HOME', 'state'),
                               ('XDG_CACHE_HOME', 'cache'), ('XDG_CONFIG_HOME', 'config')]:
                env[key] = str(Path(tmp) / child)
            env['OPENCODE_DB'] = str(Path(tmp) / 'fixture.db')

            def command(*args):
                result = subprocess.run(args, env=env, cwd=tmp, text=True,
                                        capture_output=True, timeout=40)
                self.assertEqual(result.returncode, 0, result.stderr)
                return result.stdout.strip()

            def api(method, path, body=None):
                args = ['opencode', 'api', '--standalone', method, path]
                if body is not None:
                    args += ['--data', json.dumps(body)]
                output = command(*args)
                return json.loads(output) if output else None

            def create(parent=None):
                body = {'parentID': parent} if parent else {'location': {'directory': tmp}}
                return api('post', '/api/session', body)['data']['id']

            parent = create()
            recent = create(parent)
            sibling = create(parent)
            archived = create()
            old_root = create()
            old_child = create(old_root)
            api('patch', '/api/session/' + archived, {'archived': True})
            self.assertEqual(len(api('get', '/api/session?limit=100')['data']), 6)
            # Deliberately age only disposable fixture projections, never user data.
            with contextlib.closing(sqlite3.connect(env['OPENCODE_DB'])) as db:
                db.execute('UPDATE session_v2 SET time_updated = 0 WHERE id != ?', (recent,))
                db.commit()
            preview = command(sys.executable, str(SCRIPT), '--dry-run')
            self.assertIn('4 old sessions in 3 deletable subtree(s); 2 retained.', preview)
            self.assertEqual(len(api('get', '/api/session?limit=100')['data']), 6)
            output = command(sys.executable, str(SCRIPT), '--vacuum')
            self.assertIn('Vacuum complete.', output)
            rows = api('get', '/api/session?limit=100')['data']
            self.assertEqual({s['id'] for s in rows}, {parent, recent})
            self.assertNotIn(old_child, {s['id'] for s in rows})
            self.assertFalse(Path(env['OPENCODE_DB'] + '.cleanup.lock').exists())


if __name__ == '__main__':
    unittest.main()
