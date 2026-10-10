import io
import unittest
from contextlib import redirect_stdout, redirect_stderr
from unittest.mock import patch
from rich.console import Console
from page_swingly import ui

class PresentationTests(unittest.TestCase):
    def test_redirected_output_is_literal_and_errors_use_stderr(self):
        output, errors = io.StringIO(), io.StringIO()
        with redirect_stdout(output), redirect_stderr(errors):
            ui.panel('[red]literal[/red]', title='Prompt')
            ui.panel('failure', title='Error', error=True)
            with ui.status('Working'):
                pass
        self.assertIn('[red]literal[/red]', output.getvalue())
        self.assertNotIn('failure', output.getvalue())
        self.assertIn('Error: failure', errors.getvalue())
        self.assertNotIn('\x1b', output.getvalue() + errors.getvalue())

    def test_terminal_panel_preserves_user_markup(self):
        output = io.StringIO()
        terminal = Console(file=output, force_terminal=True, color_system=None, width=60)
        with patch.object(ui, 'console', terminal):
            ui.panel('[bold]my character[/bold]', title='Prompt')
        self.assertIn('[bold]my character[/bold]', output.getvalue())
        self.assertIn('Prompt', output.getvalue())
