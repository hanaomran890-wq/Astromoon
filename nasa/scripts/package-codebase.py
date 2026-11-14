#!/usr/bin/env python3
"""
AstroMoon — Standalone Codebase Packaging Script
Creates a clean, self-contained distribution zip of the AstroMoon project
with uniform timestamps and without build artifacts or local caches.
"""
import datetime
import os
import zipfile


def package_astromoon():
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    out_dir = os.path.join(root_dir, 'public')
    os.makedirs(out_dir, exist_ok=True)
    zip_path = os.path.join(out_dir, 'astromoon-source-code.zip')

    exclude_dirs = {
        'node_modules',
        'dist',
        '__pycache__',
    }

    exclude_files = {
        'metadata.json',
        'bun.lock',
        'astromoon-source-code.zip',
    }

    now = datetime.datetime.now()
    uniform_time = (now.year, now.month, now.day, now.hour, now.minute, now.second)

    print(f"Creating standalone AstroMoon package at: {zip_path}")
    count = 0
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as z:
        for root, dirs, files in os.walk(root_dir):
            dirs[:] = sorted(d for d in dirs if d not in exclude_dirs and not d.startswith('.'))
            for file in sorted(files):
                if (
                    file in exclude_files
                    or file.startswith('.DS_Store')
                    or file.endswith('.pyc')
                    or file.endswith('.zip')
                ):
                    continue
                abs_file = os.path.join(root, file)
                rel_path = os.path.relpath(abs_file, root_dir)
                archive_name = os.path.join('astromoon-landing-planner', rel_path)
                info = zipfile.ZipInfo(archive_name, date_time=uniform_time)
                info.compress_type = zipfile.ZIP_DEFLATED
                info.external_attr = 0o644 << 16
                with open(abs_file, 'rb') as f:
                    z.writestr(info, f.read())
                count += 1

    size_mb = os.path.getsize(zip_path) / (1024 * 1024)
    print(f"Successfully packaged {count} files into {zip_path} ({size_mb:.2f} MB)")


if __name__ == '__main__':
    package_astromoon()
