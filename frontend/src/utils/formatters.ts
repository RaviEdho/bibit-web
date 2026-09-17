export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return "-";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatAum(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return "-";
  if (value >= 1_000_000_000_000) {
    return `IDR ${(value / 1_000_000_000_000).toFixed(2)} T`;
  }
  if (value >= 1_000_000_000) {
    return `IDR ${(value / 1_000_000_000).toFixed(2)} M`;
  }
  if (value >= 1_000_000) {
    return `IDR ${(value / 1_000_000).toFixed(2)} Jt`;
  }
  return formatCurrency(value);
}

export function formatPercent(value: number | null | undefined, includeSign = true): string {
  if (value === null || value === undefined || isNaN(value)) return "-";
  const sign = includeSign && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(d);
  } catch {
    return dateStr;
  }
}

export const MANAGER_SHORT_NAMES: Record<string, string> = {
  // 17 managers from Bibit UI
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

  // Additional managers in catalog
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
};

// Map lowercase short names to canonical casing for idempotency
for (const shortName of Object.values(MANAGER_SHORT_NAMES)) {
  MANAGER_SHORT_NAMES[shortName.toLowerCase()] = shortName;
}

const KNOWN_BRANDS: [RegExp, string][] = [
  [/\bBNP\s+Paribas\b/i, "BNP"],
  [/\bBahana\s+TCW\b/i, "Bahana"],
  [/\bBatavia\s+Prosperindo\b/i, "Batavia"],
  [/\bGrow\s+Investments\b/i, "Grow"],
  [/\bEastspring\b/i, "Eastspring"],
  [/\bSucorinvest\b/i, "Sucorinvest"],
  [/\bTrimegah\b/i, "Trimegah"],
  [/\bSchroder\b/i, "Schroder"],
  [/\bSinarmas\b/i, "Sinarmas"],
  [/\bManulife\b/i, "Manulife"],
  [/\bMandiri\b/i, "Mandiri"],
  [/\bPrincipal\b/i, "Principal"],
  [/\bMajoris\b/i, "Majoris"],
  [/\bJarvis\b/i, "Jarvis"],
  [/\bBRI\b/i, "BRI"],
  [/\bBNI\b/i, "BNI"],
  [/\bAvrist\b/i, "Avrist"],
  [/\bPinnacle\b/i, "Pinnacle"],
  [/\bPhillip\b/i, "Phillip"],
  [/\bMega\b/i, "Mega"],
  [/\bSea\b/i, "Sea"],
  [/\bVictoria\b/i, "Victoria"],
  [/\bAshmore\b/i, "Ashmore"],
  [/\bDanareksa\b/i, "Danareksa"],
  [/\bInsight\b/i, "Insight"],
  [/\bPanin\b/i, "Panin"],
  [/\bSyailendra\b/i, "Syailendra"],
];

export function formatManagerName(name: string | null | undefined): string {
  if (!name) return "-";
  const cleaned = name.trim();
  const lower = cleaned.toLowerCase();
  if (MANAGER_SHORT_NAMES[lower]) return MANAGER_SHORT_NAMES[lower];

  const noPt = cleaned
    .replace(/^(?:pt\.?|pt)\s+/i, "")
    .replace(/,?\s+(?:pt\.?|pt)$/i, "")
    .trim();
  if (MANAGER_SHORT_NAMES[noPt.toLowerCase()]) return MANAGER_SHORT_NAMES[noPt.toLowerCase()];

  for (const [pattern, shortName] of KNOWN_BRANDS) {
    if (pattern.test(noPt)) return shortName;
  }

  const stripped = noPt
    .replace(
      /\b(asset management|aset manajemen|investment management|investments|manajemen investasi|persada investama|indonesia|capital)\b/gi,
      ""
    )
    .replace(/^[\s,.-]+|[\s,.-]+$/g, "")
    .trim();
  const firstWord = stripped.split(/\s+/)[0];
  return firstWord || cleaned;
}
