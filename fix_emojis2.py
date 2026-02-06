#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fix corrupted emojis in UserManagementScreen.tsx"""

import sys

file_path = r'c:\Projects\DRIVE_ALIVE\frontend\screens\admin\UserManagementScreen.tsx'

try:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace corrupted emojis with correct Unicode escape sequences
    replacements = [
        ('\u00e2\u009c\u008f\ufe0f Edit', '\u2709\ufe0f Edit'),  # envelope
        ('\u00c3\u00b0\u009f\u201d\u2019 Reset PW', '\U0001f511 Reset PW'),  # key
        ('\u00c3\u00b0\u009f\u2014\u2018\ufe0f Delete', '\U0001f5d1\ufe0f Delete'),  # wastebasket
        ('\u00c3\u00b0\u009f\u201c\u2026', '\U0001f4c5'),  # calendar
        ('\u00c3\u00b0\u009f\u2019\u00b0 Manage Fee', '\U0001f4b0 Manage Fee'),  # money bag
        ('\u00e2\u008c Deactivate', '\u26a1\ufe0f Deactivate'),  # lightning bolt
    ]
    
    for old, new in replacements:
        content = content.replace(old, new)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("Successfully fixed emojis!")
    
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
