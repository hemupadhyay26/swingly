import base64
import io
import tempfile
import unittest
from contextlib import redirect_stderr
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock

from openai import BadRequestError, AuthenticationError, RateLimitError, InternalServerError, APIConnectionError, APITimeoutError
from PIL import Image
from page_swingly.errors import UserError, error_message, run_cli
from page_swingly.generator import CharacterRequest, generate_character
from page_swingly.prompts import main_pose_prompt

def api_error(cls, status, code=None):
    response = SimpleNamespace(status_code=status, request=Mock(), headers={'x-request-id': 'req_test'})
    return cls('secret raw response', response=response, body={'code': code, 'param': 'size'})

class GenerationTests(unittest.TestCase):
    def test_api_errors(self):
        request = Mock()
        cases = [(api_error(BadRequestError, 400, 'moderation_blocked'), 'content rules'), (api_error(AuthenticationError, 401), 'OPENAI_API_KEY'), (api_error(RateLimitError, 429, 'insufficient_quota'), 'billing'), (api_error(RateLimitError, 429), 'Wait'), (api_error(BadRequestError, 400), '--size'), (api_error(InternalServerError, 500), 'service error'), (APIConnectionError(request=request), 'connection'), (APITimeoutError(request=request), 'timed out')]
        for error, expected in cases:
            with self.subTest(expected=expected):
                self.assertIn(expected, error_message(error))
                self.assertNotIn('secret raw response', error_message(error))

    def test_cli_exit_and_debug(self):
        for debug in (False, True):
            output = io.StringIO()
            with redirect_stderr(output), self.assertRaises(SystemExit) as caught:
                run_cli(lambda: (_ for _ in ()).throw(api_error(BadRequestError, 400, 'moderation_blocked')), debug=debug)
            self.assertEqual(caught.exception.code, 1)
            self.assertIn('req_test', output.getvalue())
            self.assertEqual('Traceback' in output.getvalue(), debug)
        with redirect_stderr(io.StringIO()), self.assertRaises(SystemExit) as caught:
            run_cli(lambda: (_ for _ in ()).throw(KeyboardInterrupt()))
        self.assertEqual(caught.exception.code, 130)

    def test_existing_api_flow(self):
        with tempfile.TemporaryDirectory() as directory:
            output = io.BytesIO()
            # Existing API flow continues accepting its image without new filters.
            Image.new('RGBA', (16, 16), (255, 0, 0, 255)).save(output, format='PNG')
            client = Mock()
            client.images.generate.return_value = SimpleNamespace(data=[SimpleNamespace(b64_json=base64.b64encode(output.getvalue()).decode())])
            out = Path(directory) / 'charm'
            manifest = generate_character(client, CharacterRequest('Charm', 'glass charm', out))
            self.assertTrue(manifest.is_file())
            kwargs = client.images.generate.call_args.kwargs
            self.assertEqual(kwargs['size'], '1024x1024')
            self.assertEqual(kwargs['background'], 'transparent')
            self.assertEqual(kwargs['n'], 1)
            self.assertIn('75%', kwargs['prompt'])

    def test_codex_import_no_api(self):
        for transparent in (True, False):
            with self.subTest(transparent=transparent), tempfile.TemporaryDirectory() as directory:
                source = Path(directory) / 'source.png'
                Image.new('RGBA', (16, 16), (255, 0, 0, 0 if transparent else 255)).save(source)
                out = Path(directory) / 'charm'
                client = Mock()
                request = CharacterRequest('Charm', 'glass charm', out, source_image=source)
                if transparent:
                    self.assertTrue(generate_character(client, request).is_file())
                    self.assertEqual((out / 'charm.png').read_bytes(), source.read_bytes())
                else:
                    with self.assertRaises(UserError):
                        generate_character(client, request)
                    self.assertFalse((out / 'manifest.json').exists())
                client.images.generate.assert_not_called()

    def test_codex_cli_generates_without_api_credentials(self):
        from unittest.mock import patch
        from contextlib import redirect_stdout
        from page_swingly.swingly import main
        with tempfile.TemporaryDirectory() as directory:
            out = Path(directory) / 'charm'
            args = ['page-swingly', '--provider', 'codex', '--name', 'Charm', '--description', 'glass charm', '--out', str(out)]
            def fake_generate(prompt, destination, size):
                Image.new('RGBA', (16, 16), (255, 0, 0, 0)).save(destination)
                return destination
            with patch('sys.argv', args), patch('page_swingly.swingly.load_dotenv'), patch.dict('os.environ', {}, clear=True), patch('page_swingly.swingly.OpenAI') as client, patch('page_swingly.swingly.generate_with_codex', side_effect=fake_generate) as generation, redirect_stdout(io.StringIO()):
                main()
            client.assert_not_called()
            generation.assert_called_once()
            self.assertTrue((out / 'manifest.json').exists())
            self.assertIn('75%', generation.call_args.args[0])

    def test_prompt_preserves_planned_structure(self):
        from page_swingly.style import THREAD_LENGTH_FRACTION, ANCHOR_POINT
        prompt = main_pose_prompt('Lantern', 'red paper')
        self.assertEqual(THREAD_LENGTH_FRACTION, 0.75)
        self.assertEqual(ANCHOR_POINT, {'x': 0.5, 'y': 0.05})
        for expected in ('red paper', '75%', 'do not shrink', 'run off', 'Transparent background', 'centered horizontally'):
            self.assertIn(expected, prompt)