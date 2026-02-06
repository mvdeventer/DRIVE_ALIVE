# Fix corrupted emojis in UserManagementScreen.tsx
# Uses hex codes to avoid encoding issues in this script file

file_path = r'frontend\screens\admin\UserManagementScreen.tsx'

# Read as bytes
with open(file_path, 'rb') as f:
    data = f.read()

# Decode as UTF-8
text = data.decode('utf-8')

# Create replacement pairs from hex
# Format: (corrupted_hex_sequence, correct_emoji_unicode)
hex_replacements = [
    # User emoji: corrupted bytes C3 B0 C5 B8 E2 80 99 C2 A4 -> U+1F464
    (bytes.fromhex('C3B0C5B8E28099C2A4').decode('utf-8'), '\U0001f464'),  # 👤
    # Books emoji: corrupted bytes C3 B0 C5 B8 E2 80 9C C5 A1 -> U+1F4DA
    (bytes.fromhex('C3B0C5B8E2809CC5A1').decode('utf-8'), '\U0001f4da'),  # 📚
    # Pencil: corrupted bytes C3 A2 C5 93 C3 AF C2 B8 -> U+270F U+FE0F
    (bytes.fromhex('C3A2C593C3AFC2B8').decode('utf-8'), '\u270f\ufe0f'),  # ✏️
    # Key: corrupted bytes C3 B0 C5 B8 E2 80 9C E2 80 99 -> U+1F511
    (bytes.fromhex('C3B0C5B8E2809CE28099').decode('utf-8'), '\U0001f511'),  # 🔑
    # Wastebasket: corrupted bytes C3 B0 C5 B8 E2 80 94 E2 80 99 C3 AF C2 B8 -> U+1F5D1 U+FE0F
    (bytes.fromhex('C3B0C5B8E28094E28099C3AFC2B8').decode('utf-8'), '\U0001f5d1\ufe0f'),  # 🗑️
    # Calendar: corrupted bytes C3 B0 C5 B8 E2 80 9C E2 80 A6 -> U+1F4C5
    (bytes.fromhex('C3B0C5B8E2809CE280A6').decode('utf-8'), '\U0001f4c5'),  # 📅
    # Cross mark: corrupted bytes C3 A2 C5 92 -> U+274C
    (bytes.fromhex('C3A2C592').decode('utf-8'), '\u274c'),  # ❌
    # Warning: corrupted bytes C3 A2 C5 A1 20 C3 AF C2 B8 -> U+26A0 U+FE0F
    (bytes.fromhex('C3A2C5A120C3AFC2B8').decode('utf-8'), '\u26a0\ufe0f'),  # ⚠️
    # Reload: corrupted bytes C3 B0 C5 B8 E2 80 9C E2 80 9E -> U+1F504
    (bytes.fromhex('C3B0C5B8E2809CE2809E').decode('utf-8'), '\U0001f504'),  # 🔄
    # Prohibited: corrupted bytes C3 B0 C5 B8 C5 A1 C2 AB -> U+1F6AB
    (bytes.fromhex('C3B0C5B8C5A1C2AB').decode('utf-8'), '\U0001f6ab'),  # 🚫
    # Telephone: corrupted bytes C3 B0 C5 B8 E2 80 9C C5 BE -> U+1F4DE
    (bytes.fromhex('C3B0C5B8E2809CC5BE').decode('utf-8'), '\U0001f4de'),  # 📞
    # ID: corrupted bytes C3 B0 C5 B8 E2 80 A0 E2 80 9C -> U+1F194
    (bytes.fromhex('C3B0C5B8E280A0E2809C').decode('utf-8'), '\U0001f194'),  # 🆔
    # Eye: corrupted bytes C3 B0 C5 B8 E2 80 99 C3 AF C2 B8 -> U+1F441 U+FE0F
    (bytes.fromhex('C3B0C5B8E28099C3AFC2B8').decode('utf-8'), '\U0001f441\ufe0f'),  # 👁️
]

fixes = 0
for corrupted, correct in hex_replacements:
    count = text.count(corrupted)
    if count > 0:
        text = text.replace(corrupted, correct)
        fixes += count
        print(f"Fixed {count} instances of {correct}")

# Write back
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(text)

print(f"\n✅ Successfully fixed {fixes} emoji encodings")
