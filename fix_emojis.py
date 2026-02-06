#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fix corrupted emojis in UserManagementScreen.tsx"""

import sys

file_path = r'c:\Projects\DRIVE_ALIVE\frontend\screens\admin\UserManagementScreen.tsx'

try:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace corrupted emojis with correct ones
    replacements = {
        'âœï¸ Edit': '✉️ Edit',
        'ðŸ"' Reset PW': '🔑 Reset PW',
        'ðŸ—'ï¸ Delete': '🗑️ Delete',
        'ðŸ"…': '📅',
        'ðŸ'° Manage Fee': '💰 Manage Fee',
        'âŒ Deactivate': '⚡️ Deactivate',
    }
    
    for old, new in replacements.items():
        content = content.replace(old, new)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✅ Successfully fixed all emojis!")
    
except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)
