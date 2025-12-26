# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec file for Drive Alive Backend
Builds a standalone executable with all dependencies
"""

import os
import sys
from PyInstaller.utils.hooks import collect_data_files, collect_submodules

block_cipher = None

# Get version
version_file = os.path.join('..', 'VERSION')
if os.path.exists(version_file):
    with open(version_file, 'r') as f:
        VERSION = f.read().strip()
else:
    VERSION = '1.0.0'

# Collect all app modules
app_modules = collect_submodules('app')

# Collect data files
datas = [
    ('../VERSION', '.'),
    ('../version.json', '.'),
    ('app', 'app'),
]

# Add alembic migrations
datas.extend(collect_data_files('alembic'))

# Hidden imports
hiddenimports = [
    'uvicorn.logging',
    'uvicorn.loops',
    'uvicorn.loops.auto',
    'uvicorn.protocols',
    'uvicorn.protocols.http',
    'uvicorn.protocols.http.auto',
    'uvicorn.protocols.websockets',
    'uvicorn.protocols.websockets.auto',
    'uvicorn.lifespan',
    'uvicorn.lifespan.on',
    'sqlalchemy.ext.asyncio',
    'sqlalchemy.dialects.postgresql',
    'pydantic',
    'passlib.handlers.bcrypt',
    'jose',
    'stripe',
] + app_modules

a = Analysis(
    ['app/main.py'],
    pathex=[],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='drive-alive-api',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    version='file_version_info.txt',
    icon='../image/logo.ico' if os.path.exists('../image/logo.ico') else None,
)
