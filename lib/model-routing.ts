const ALIASES: Record<string, string> = {
  "tablet-stand": "laptop-stand",
  "phone-dock": "phone-stand",
  "monitor-stand": "cable-tray",
  "vesa-tray": "vesa-shelf",
  "ip65-box": "enclosure-ip65",
};

export function canonicalModelSlug(value = "") {
  const slug = value.trim().toLowerCase().replace(/_/g, "-");
  return ALIASES[slug] || slug;
}

export function normalizeModelSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}
