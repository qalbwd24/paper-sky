"""Create portable ASCII-entry ZIP/tar.gz and verify actual extracted packages.
Run in the source project, after `node build.cjs`. Original source names are kept.
"""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tarfile
import tempfile
import zipfile

project = Path(__file__).resolve().parent.parent
latest = json.loads((project / '联机交付' / 'latest.json').read_text(encoding='utf-8-sig'))
release = Path(latest['directory']).resolve()
version = latest['version']
assert release.parent == (project / '联机交付').resolve()
assert release.name == version and version.isascii()
files = sorted(p for p in release.rglob('*') if p.is_file())
for p in files:
    assert p.relative_to(release).as_posix().isascii(), str(p)
node = shutil.which('node')
assert node, 'Node is required for the archive acceptance check'

archives = [release.with_name(version + '.zip'), release.with_name(version + '.tar.gz')]
for archive in archives:
    if archive.exists():
        raise FileExistsError('Create a new release instead of overwriting: ' + str(archive))

with zipfile.ZipFile(archives[0], 'x', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for p in files:
        entry = zipfile.ZipInfo(version + '/' + p.relative_to(release).as_posix())
        entry.create_system = 3
        entry.external_attr = 0o100644 << 16
        entry.compress_type = zipfile.ZIP_DEFLATED
        z.writestr(entry, p.read_bytes())

with tarfile.open(archives[1], 'x:gz', format=tarfile.USTAR_FORMAT) as t:
    for p in files:
        entry = t.gettarinfo(str(p), arcname=version + '/' + p.relative_to(release).as_posix())
        entry.uid = entry.gid = 0
        entry.uname = entry.gname = ''
        entry.mode = 0o644
        with p.open('rb') as content:
            t.addfile(entry, content)

report = {'version': version, 'asciiPaths': True, 'archives': []}
for archive in archives:
    with tempfile.TemporaryDirectory(prefix='paper-chase-package-') as temp:
        if archive.suffix == '.zip':
            with zipfile.ZipFile(archive) as z:
                assert z.testzip() is None
                assert all(i.filename.isascii() and '\\' not in i.filename for i in z.infolist())
                z.extractall(temp)
        else:
            with tarfile.open(archive, 'r:gz') as t:
                assert all(i.name.isascii() and i.isfile() for i in t.getmembers())
                t.extractall(temp, filter='data')
        extracted = Path(temp) / version
        subprocess.run([node, str(extracted / 'verify.cjs')], check=True)
        manifest = json.loads((extracted / 'SHA256.json').read_text(encoding='utf-8'))
        # Independently validate Unicode-free paths and bytes, not only the Node verifier.
        assert set(manifest) == {p.relative_to(extracted).as_posix() for p in extracted.rglob('*') if p.is_file() and p.name != 'SHA256.json'}
        for name, expected in manifest.items():
            assert name.isascii()
            assert hashlib.sha256((extracted / name).read_bytes()).hexdigest() == expected
        original = project / 'assets' / 'paperplane-original' / '来源与转换说明.md'
        assert original.read_bytes() == (extracted / 'assets/paperplane-original/SOURCE-AND-CONVERSION.md').read_bytes()
        # Test the extracted code, dependencies and adaptation script, not the source tree.
        subprocess.run([node, '--test', 'test.cjs', 'test-proxy.cjs', 'test-pursuit.cjs'], cwd=extracted / 'online', check=True)
        subprocess.run([sys.executable, 'test-server-patch.py'], cwd=extracted / 'online', check=True)
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    archive.with_name(archive.name + '.sha256').write_text(digest + '  ' + archive.name + '\n', encoding='ascii')
    report['archives'].append({'name': archive.name, 'bytes': archive.stat().st_size, 'sha256': digest, 'verifiedFiles': len(files), 'extractionAndTests': 'passed'})

(release.parent / (version + '.packaging-check.json')).write_text(json.dumps(report, indent=2), encoding='utf-8')
latest.update({'zip': str(archives[0]), 'tarGz': str(archives[1]), 'verified': True})
(project / '联机交付' / 'latest.json').write_text(json.dumps(latest, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(report, indent=2))


