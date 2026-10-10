"""Link version-controlled design guidance into this environment's persistent user roots.

No existing file or link is overwritten. Re-run after moving the checkout only
when the old links have been deliberately removed. Repository discovery needs
no installation. Confirm discovery after installation; paths are host-specific.
"""
from pathlib import Path
import os

root = Path(__file__).resolve().parents[2]
source = root / '.agents/skills/design-with-evidence'
if not (source / 'SKILL.md').is_file():
    raise SystemExit('Canonical skill is missing.')
parents = [
    Path(os.environ.get('CODEX_HOME', str(Path.home() / '.codex'))) / 'skills',
    Path(os.environ.get('OH_PERSISTENCE_DIR', str(Path.home() / '.openhands'))) / 'skills',
]
for parent in parents:
    target = parent / source.name
    if target.exists() or target.is_symlink():
        if target.is_symlink() and target.resolve() == source:
            print(f'Already linked: {target}')
            continue
        raise SystemExit(f'Refusing to overwrite existing path: {target}')
    parent.mkdir(parents=True, exist_ok=True)
    target.symlink_to(source, target_is_directory=True)
    print(f'Linked: {target}')
