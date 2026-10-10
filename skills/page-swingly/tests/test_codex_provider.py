import os
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
from page_swingly.codex_provider import generate_with_codex
from page_swingly.errors import UserError

class CodexProviderTests(unittest.TestCase):
    def test_signed_in_generation_and_no_api_key(self):
        with tempfile.TemporaryDirectory() as directory:
            destination = Path(directory) / 'generated.png'
            def run(command, **kwargs):
                self.assertNotIn('OPENAI_API_KEY', kwargs['env'])
                if command[1] == 'login':
                    return SimpleNamespace(returncode=0, stdout='', stderr='Logged in using ChatGPT')
                self.assertEqual(command[-1], '-')
                self.assertIn('workspace-write', command)
                self.assertIn('image_generation', command)
                self.assertIn('75% cord', kwargs['input'])
                destination.write_bytes(b'fixture')
                return SimpleNamespace(returncode=0, stdout='saved', stderr='')
            with patch('shutil.which', return_value='codex'), patch('subprocess.run', side_effect=run), patch.dict(os.environ, {'OPENAI_API_KEY': 'must-not-pass'}):
                self.assertEqual(generate_with_codex('75% cord', destination, 1024), destination)

    def test_no_cli_and_api_login_fail_clearly(self):
        with patch('shutil.which', return_value=None), self.assertRaises(UserError):
            generate_with_codex('prompt', Path('unused.png'), 1024)
        with patch('shutil.which', return_value='codex'), patch('subprocess.run', return_value=SimpleNamespace(returncode=0, stdout='', stderr='Logged in with API key')) as run, self.assertRaises(UserError):
            generate_with_codex('prompt', Path('unused.png'), 1024)
        self.assertEqual(run.call_count, 1)

    def test_refusal_no_retry(self):
        with tempfile.TemporaryDirectory() as directory:
            responses = [SimpleNamespace(returncode=0, stdout='ChatGPT', stderr=''), SimpleNamespace(returncode=1, stdout='moderation_blocked', stderr='')]
            with patch('shutil.which', return_value='codex'), patch('subprocess.run', side_effect=responses) as run, self.assertRaisesRegex(UserError, 'safety system'):
                generate_with_codex('prompt', Path(directory) / 'generated.png', 1024)
            self.assertEqual(run.call_count, 2)
