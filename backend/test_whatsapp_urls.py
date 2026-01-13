"""Test WhatsApp URL generation"""

import re

test_phones = [
    "+27611154598",  # Martin
    "+27622265863",  # Koos Pompies
    "+27611154511",  # LEEN
    "+27611154332",  # gary
]

print("Testing WhatsApp URL generation:\n")
for phone in test_phones:
    # Remove all non-digits
    formatted = re.sub(r"\D", "", phone)

    # Construct URL
    url = f"https://wa.me/{formatted}"

    print(f"Original: {phone}")
    print(f"Formatted: {formatted}")
    print(f"Length: {len(formatted)}")
    print(f"Starts with 27: {formatted.startswith('27')}")
    print(f"URL: {url}")
    print("-" * 60)
