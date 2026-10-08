#!/usr/bin/env python3
"""Local terminal only: never uploads credentials or contacts a service."""
import getpass
import os
from pathlib import Path
import re
import secrets
import sys
from urllib.parse import urlsplit

DIRECTORY = Path('/projects/daytona-private/preview-auth-hook')

def save_private(values, directory=DIRECTORY):
    # Reject symlink ancestors; never follow a path into Git or an unrelated location.
    for parent in [directory, *directory.parents]:
        if parent.is_symlink():
            raise ValueError('Private directory must not contain symlinks.')
    directory.mkdir(mode=0o700, parents=True, exist_ok=True)
    if directory.stat().st_uid != os.getuid():
        raise ValueError('Private directory must be owned by the current user.')
    os.chmod(directory, 0o700)
    path = directory / ('preview-auth-' + secrets.token_hex(8) + '.env')
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW
    fd = os.open(path, flags, 0o600)
    with os.fdopen(fd, 'w') as output:
        for key, value in values.items():
            if '\n' in value or '\r' in value or '"' in value:
                raise ValueError('Unexpected configuration characters.')
            output.write(key + '="' + value + '"\n')
    return path

def main():
    if not sys.stdin.isatty():
        raise ValueError('Use your private interactive terminal; do not pipe secrets.')
    origin = input('Actual HTTPS Vercel branch origin (blank keeps hook unconfigured): ').strip()
    if origin:
        u = urlsplit(origin)
        if (u.scheme != 'https' or not (u.hostname or '').endswith('.vercel.app') or
            u.username or u.password or u.port or u.path or u.query or u.fragment):
            raise ValueError('Enter the actual HTTPS branch origin without a trailing slash.')
    key = getpass.getpass('Paste the saved daytona-preview-auth Resend key (hidden): ')
    if not re.fullmatch(r're_[A-Za-z0-9_-]{10,}', key):
        raise ValueError('Invalid Resend key format; value was not saved.')
    hook = getpass.getpass('Supabase Send Email Hook signing secret (hidden; blank if not generated yet): ')
    if hook and not re.fullmatch(r'v1,whsec_[A-Za-z0-9+/]{43}=', hook):
        raise ValueError('Expected the full Supabase v1,whsec_ signing secret; value was not saved.')
    path = save_private({
        'DCR_AUTH_RESEND_KEY': key,
        'DCR_AUTH_HOOK_SIGNING_SECRET': hook,
        'DCR_AUTH_HOOK_ORIGIN': origin,
        'DCR_AUTH_HOOK_ENV': 'preview',
        'DCR_AUTH_HOOK_ENABLED': 'false',
        'DCR_AUTH_TEST_EMAILS': 'msooijir@gmail.com',
    })
    print('Saved owner-only configuration outside Git: ' + str(path))
    print('Hook remains disabled. No credentials uploaded, deployment made, or email sent.')

if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, KeyboardInterrupt, EOFError):
        print('Private setup not completed. No secret values displayed.', file=sys.stderr)
        sys.exit(1)
