import base64
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
    def test_documented_signing_secret_formats(self):
        for size in range(24, 65):
            value = 'v1,whsec_' + base64.b64encode(bytes([251]) * size).decode()
            self.assertTrue(helper.valid_hook_secret(value))
        for value in ['v2,whsec_' + 'A' * 32, 'v1,whsec_AA==', 'v1,whsec_' + 'A' * 88,
                      'v1,whsec_' + base64.b64encode(bytes(32)).decode().rstrip('='),
                      'v1,whsec_' + 'A' * 42 + 'B=', 'v1,whsec_' + '-' * 32]:
            self.assertFalse(helper.valid_hook_secret(value))

    def test_symlink_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            link = Path(tmp) / 'link'
            link.symlink_to(tmp, target_is_directory=True)
            with self.assertRaises(ValueError):
                helper.save_private({'SYNTHETIC': 'nothing'}, link / 'private')

if __name__ == '__main__':
    unittest.main()
