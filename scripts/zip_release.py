from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / 'release'
OUT_DIR.mkdir(exist_ok=True)
ZIP_PATH = OUT_DIR / 'manala_repo_release.zip'

with zipfile.ZipFile(ZIP_PATH, 'w', zipfile.ZIP_DEFLATED) as zf:
    for path in ROOT.rglob('*'):
        if path.is_dir() or 'release' in path.parts:
            continue
        zf.write(path, path.relative_to(ROOT))

print(f'Created: {ZIP_PATH}')
