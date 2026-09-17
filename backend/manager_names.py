"""
Bibit Investment Manager Normalization & Short Names
Maps full corporate legal names of Investment Managers (Manajer Investasi)
to clean short brand names matching Bibit's UI convention.
"""

import re

# Canonical mapping for all known Bibit investment managers
MANAGER_SHORT_NAMES: dict[str, str] = {
    # 17 managers explicitly shown in Bibit UI
    "avrist asset management, pt": "Avrist",
    "bni asset management, pt": "BNI",
    "bnp paribas asset management, pt": "BNP",
    "bri manajemen investasi, pt": "BRI",
    "bahana tcw investment management, pt": "Bahana",
    "batavia prosperindo aset manajemen, pt": "Batavia",
    "eastspring investments indonesia, pt": "Eastspring",
    "grow investments indonesia, pt": "Grow",
    "jarvis aset manajemen, pt": "Jarvis",
    "majoris asset management, pt": "Majoris",
    "mandiri manajemen investasi, pt": "Mandiri",
    "manulife aset manajemen indonesia, pt": "Manulife",
    "principal asset management, pt": "Principal",
    "schroder investment management indonesia, pt": "Schroder",
    "sinarmas asset management, pt": "Sinarmas",
    "sucorinvest asset management, pt": "Sucorinvest",
    "trimegah asset management, pt": "Trimegah",

    # Additional managers in catalog
    "mega asset management, pt": "Mega",
    "phillip asset management, pt": "Phillip",
    "pinnacle persada investama, pt": "Pinnacle",
    "sea aset manajemen, pt": "Sea",
    "victoria manajemen investasi, pt": "Victoria",
    "ashmore asset management indonesia, pt": "Ashmore",
    "danareksa investment management, pt": "Danareksa",
    "insight investments management, pt": "Insight",
    "panin asset management, pt": "Panin",
    "syailendra capital, pt": "Syailendra",
}

# Also map lowercase short names to their canonical casing (idempotent)
for _short in list(MANAGER_SHORT_NAMES.values()):
    MANAGER_SHORT_NAMES[_short.lower()] = _short

KNOWN_BRANDS = [
    ("BNP Paribas", "BNP"),
    ("Bahana TCW", "Bahana"),
    ("Batavia Prosperindo", "Batavia"),
    ("Grow Investments", "Grow"),
    ("Eastspring", "Eastspring"),
    ("Sucorinvest", "Sucorinvest"),
    ("Trimegah", "Trimegah"),
    ("Schroder", "Schroder"),
    ("Sinarmas", "Sinarmas"),
    ("Manulife", "Manulife"),
    ("Mandiri", "Mandiri"),
    ("Principal", "Principal"),
    ("Majoris", "Majoris"),
    ("Jarvis", "Jarvis"),
    ("BRI", "BRI"),
    ("BNI", "BNI"),
    ("Avrist", "Avrist"),
    ("Pinnacle", "Pinnacle"),
    ("Phillip", "Phillip"),
    ("Mega", "Mega"),
    ("Sea", "Sea"),
    ("Victoria", "Victoria"),
    ("Ashmore", "Ashmore"),
    ("Danareksa", "Danareksa"),
    ("Insight", "Insight"),
    ("Panin", "Panin"),
    ("Syailendra", "Syailendra"),
]


def shorten_manager_name(name: str | None) -> str:
    """
    Returns short brand name for an investment manager matching Bibit UI conventions.
    E.g. 'Sucorinvest Asset Management, PT' -> 'Sucorinvest'
         'BNP Paribas Asset Management, PT' -> 'BNP'
         'Bahana TCW Investment Management, PT' -> 'Bahana'
    """
    if not name:
        return ""

    cleaned = name.strip()
    key = cleaned.lower()
    if key in MANAGER_SHORT_NAMES:
        return MANAGER_SHORT_NAMES[key]

    # Strip prefix 'PT' / 'PT.' and suffix ', PT' / ' PT' / ', PT.'
    no_pt = re.sub(r"^(?:pt\.?|pt)\s+", "", cleaned, flags=re.IGNORECASE)
    no_pt = re.sub(r",?\s+(?:pt\.?|pt)$", "", no_pt, flags=re.IGNORECASE).strip()
    if no_pt.lower() in MANAGER_SHORT_NAMES:
        return MANAGER_SHORT_NAMES[no_pt.lower()]

    # Check known multi-word / special brands
    for brand, short in KNOWN_BRANDS:
        if re.search(r"\b" + re.escape(brand) + r"\b", no_pt, re.IGNORECASE):
            return short

    # Generic institutional suffix stripping
    stripped = re.sub(
        r"\b(asset management|aset manajemen|investment management|investments|"
        r"manajemen investasi|persada investama|indonesia|capital)\b",
        "",
        no_pt,
        flags=re.IGNORECASE,
    )
    stripped = re.sub(r"^[\s,.-]+|[\s,.-]+$", "", stripped).strip()
    words = stripped.split()
    return words[0] if words else cleaned
