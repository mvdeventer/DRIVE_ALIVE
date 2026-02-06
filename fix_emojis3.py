# Fix emojis by reading as binary and replacing byte sequences
import codecs

file_path = r'c:\Projects\DRIVE_ALIVE\frontend\screens\admin\UserManagementScreen.tsx'

# Read file content
with open(file_path, 'rb') as f:
    content = f.read()

# Replace corrupted UTF-8 sequences
# The corrupted text appears to be double-encoded UTF-8
replacements = [
    # Edit button - envelope emoji
    (b'\xc3\xa2\xc2\x9c\xc2\x8f\xc3\xaf\xc2\xb8\xc2\x8f Edit', b'\xe2\x9c\x89\xef\xb8\x8f Edit'),
    # Reset PW - key emoji
    (b'\xc3\xb0\xc2\x9f\xc2\x94\xc2\x91 Reset PW', b'\xf0\x9f\x94\x91 Reset PW'),
    # Delete - wastebasket emoji
    (b'\xc3\xb0\xc2\x9f\xc2\x97\xc2\x91\xc3\xaf\xc2\xb8\xc2\x8f Delete', b'\xf0\x9f\x97\x91\xef\xb8\x8f Delete'),
    # Calendar emoji
    (b'\xc3\xb0\xc2\x9f\xc2\x93\xc2\xa5', b'\xf0\x9f\x93\xa5'),
    # Money bag emoji
    (b'\xc3\xb0\xc2\x9f\xc2\x92\xc2\xb0 Manage Fee', b'\xf0\x9f\x92\xb0 Manage Fee'),
    # Lightning/Deactivate
    (b'\xc3\xa2\xc2\x8c Deactivate', b'\xe2\x9a\xa1\xef\xb8\x8f Deactivate'),
]

for old, new in replacements:
    content = content.replace(old, new)

# Write back
with open(file_path, 'wb') as f:
    f.write(content)

print("Done!")
