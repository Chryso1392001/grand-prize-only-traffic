# utils/plate_validator.py
# NEW FILE — validate Rwanda plates before logging
# Rwanda format: RAB 123A  (3 letters · 3 digits · 1 letter)
# Place this file inside a folder called "utils" in your project root
# Also create an empty utils/__init__.py

import re

_OCR_FIXES = str.maketrans({
    "O": "0", "I": "1", "l": "1", "S": "5", "Z": "2",
})

_RWA = re.compile(r"^([A-Z]{3})\s?(\d{3})([A-Z])$")


def validate_rwanda_plate(raw: str) -> dict:
    """
    Returns {"valid": bool, "plate": "RAB 123A" or None, "confidence": "high"/"low"/None}
    """
    cleaned = "".join(c for c in raw.upper() if c.isalnum() or c == " ").strip()

    m = _RWA.match(cleaned)
    conf = "high"
    if not m:
        m    = _RWA.match(cleaned.translate(_OCR_FIXES))
        conf = "low"

    if m:
        letters, digits, suffix = m.groups()
        return {"valid": True,  "plate": f"{letters} {digits}{suffix}", "confidence": conf}

    return {"valid": False, "plate": None, "confidence": None}


if __name__ == "__main__":
    tests = ["RAB 123A", "RAB123A", "XYZ999Z", "GARBAGE", "12345"]
    for t in tests:
        r = validate_rwanda_plate(t)
        print("✅" if r["valid"] else "❌", t, "→", r["plate"])
