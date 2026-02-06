#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Fix corrupted emoji encoding in UserManagementScreen.tsx - Round 2
This fixes the remaining corrupted emojis after first pass.
"""
import codecs

file_path = r'frontend\screens\admin\UserManagementScreen.tsx'

# Read raw bytes
with open(file_path, 'rb') as f:
    raw_bytes = f.read()

# Decode as UTF-8
content = raw_bytes.decode('utf-8')

# Count remaining corrupted patterns before fixing
corrupted_patterns = [
    'ðŸ'¤',  # user
    'ðŸ"š',  # books  
    'âœï¸',  # pencil
    'ðŸ"'',  # key
    'ðŸ—'ï¸',  # wastebasket
    'ðŸ"…',  # calendar
    'âŒ',   # cross mark
    'âš ï¸',  # warning
    'ðŸ"„',  # reload
    'ðŸš«',  # prohibited
    'ðŸ"ž',  # telephone
    'ðŸ†"',  # ID
    'ðŸ'ï¸'   # eye
]

found_count = sum(content.count(p) for p in corrupted_patterns)
print(f"Found {found_count} corrupted emoji patterns to fix")

# Apply fixes
fixes = 0

# User emoji (admin tab)
if 'ðŸ'¤' in content:
    count = content.count('ðŸ'¤')
    content = content.replace('ðŸ'¤', '👤')
    fixes += count
    print(f"  Fixed {count} user emojis (👤)")

# Books emoji (student tab)
if 'ðŸ"š' in content:
    count = content.count('ðŸ"š')
    content = content.replace('ðŸ"š', '📚')
    fixes += count
    print(f"  Fixed {count} books emojis (📚)")

# Pencil emoji (edit button)
if 'âœï¸' in content:
    count = content.count('âœï¸')
    content = content.replace('âœï¸', '✏️')
    fixes += count
    print(f"  Fixed {count} pencil emojis (✏️)")

# Key emoji (reset password)
if 'ðŸ"'' in content:
    count = content.count('ðŸ"'')
    content = content.replace('ðŸ"'', '🔑')
    fixes += count
    print(f"  Fixed {count} key emojis (🔑)")

# Wastebasket emoji (delete)
if 'ðŸ—'ï¸' in content:
    count = content.count('ðŸ—'ï¸')
    content = content.replace('ðŸ—'ï¸', '🗑️')
    fixes += count
    print(f"  Fixed {count} wastebasket emojis (🗑️)")

# Calendar emoji
if 'ðŸ"…' in content:
    count = content.count('ðŸ"…')
    content = content.replace('ðŸ"…', '📅')
    fixes += count
    print(f"  Fixed {count} calendar emojis (📅)")

# Cross mark emoji (deactivate)
if 'âŒ' in content:
    count = content.count('âŒ')
    content = content.replace('âŒ', '❌')
    fixes += count  
    print(f"  Fixed {count} cross mark emojis (❌)")

# Warning emoji
if 'âš ï¸' in content:
    count = content.count('âš ï¸')
    content = content.replace('âš ï¸', '⚠️')
    fixes += count
    print(f"  Fixed {count} warning emojis (⚠️)")

# Reload emoji
if 'ðŸ"„' in content:
    count = content.count('ðŸ"„')
    content = content.replace('ðŸ"„', '🔄')
    fixes += count
    print(f"  Fixed {count} reload emojis (🔄)")

# Prohibited emoji
if 'ðŸš«' in content:
    count = content.count('ðŸš«')
    content = content.replace('ðŸš«', '🚫')
    fixes += count
    print(f"  Fixed {count} prohibited emojis (🚫)")

# Telephone emoji
if 'ðŸ"ž' in content:
    count = content.count('ðŸ"ž')
    content = content.replace('ðŸ"ž', '📞')
    fixes += count
    print(f"  Fixed {count} telephone emojis (📞)")

# ID emoji
if 'ðŸ†"' in content:
    count = content.count('ðŸ†"')
    content = content.replace('ðŸ†"', '🆔')
    fixes += count
    print(f"  Fixed {count} ID emojis (🆔)")

# Eye emoji
if 'ðŸ'ï¸' in content:
    count = content.count('ðŸ'ï¸')
    content = content.replace('ðŸ'ï¸', '👁️')
    fixes += count
    print(f"  Fixed {count} eye emojis (👁️)")

# Write back
with open(file_path, 'w', encoding='utf-8', newline='\n') as f:
    f.write(content)

print(f"\n✅ Successfully fixed {fixes} more emoji encodings in UserManagementScreen.tsx")
