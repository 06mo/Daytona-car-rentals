import importlib.util
from pathlib import Path
import tempfile
import unittest
import stat
spec = importlib.util.spec_from_file_location('helper', Path(__file__).parents[1] / 'scripts/prepare-preview-auth-secrets.py')
helper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helper)

class PrivateEntryTests(unittest.TestCase):
    def test_private_permissions_and_no_overwrite(self):
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp) / 'private'
            one = helper.save_private({'SYNTHETIC': 'not-a-credential'}, directory)
            two = helper.save_private({'SYNTHETIC': 'different'}, directory)
            self.assertNotEqual(one, two)
            self.assertEqual(stat.S_IMODE(directory.stat().st_mode), 0o700)
            self.assertEqual(stat.S_IMODE(one.stat().st_mode), 0o600)
            self.assertEqual(one.read_text(), 'SYNTHETIC="not-a-credential"\n')
    def test_symlink_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            link = Path(tmp) / 'link'
            link.symlink_to(tmp, target_is_directory=True)
            with self.assertRaises(ValueError):
                helper.save_private({'SYNTHETIC': 'nothing'}, link / 'private')

if __name__ == '__main__':
    unittest.main()
