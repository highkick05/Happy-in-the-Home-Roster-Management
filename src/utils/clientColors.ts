export const CLIENT_BORDER_PALETTE = [
  '#dc2626', // 0: Bright Crimson Red (only red - no maroon/brown/burgundy)
  '#1e3a8a', // 1: Deep Navy Blue
  '#facc15', // 2: Bright Sunshine Yellow
  '#7e22ce', // 3: Deep Royal Purple
  '#ffffff', // 4: Pure White
  '#064e3b', // 5: Deep Forest Pine Green
  '#ff2a85', // 6: Hot Neon Pink
  '#09090b', // 7: Jet Black
  '#00e5ff', // 8: Electric Cyan / Aqua
  '#ff8c00', // 9: Bright Golden Orange
  '#c4b5fd', // 10: Soft Pastel Lavender
  '#64748b', // 11: Steel Slate Grey
  '#fda4af', // 12: Pastel Coral Peach
  '#0d9488', // 13: Rich Teal
  '#e879f9', // 14: Bright Orchid
  '#fef08a', // 15: Pale Buttercream Yellow
  '#38bdf8', // 16: Ice Sky Blue
  '#4ade80', // 17: Mint Emerald
];

export function buildClientColorMap(
  clients: any[] = [],
  extraClientIds: (number | string | undefined | null)[] = []
): Map<number, string> {
  const map = new Map<number, string>();
  const activeIds = new Set<number>();
  const suspendedIds = new Set<number>();

  clients.forEach((c: any) => {
    const numId = Number(c?.id);
    if (c?.id != null && !isNaN(numId)) {
      if (c.status === 'SUSPENDED') {
        suspendedIds.add(numId);
      } else {
        activeIds.add(numId);
      }
    }
  });

  const sortedActiveIds = Array.from(activeIds).sort((a, b) => a - b);
  sortedActiveIds.forEach((id, idx) => {
    map.set(id, CLIENT_BORDER_PALETTE[idx % CLIENT_BORDER_PALETTE.length]);
  });

  let nextIndex = sortedActiveIds.length;
  const sortedSuspendedIds = Array.from(suspendedIds)
    .filter((id) => !map.has(id))
    .sort((a, b) => a - b);
  sortedSuspendedIds.forEach((id) => {
    map.set(id, CLIENT_BORDER_PALETTE[nextIndex % CLIENT_BORDER_PALETTE.length]);
    nextIndex++;
  });

  const remainingExtraIds = Array.from(
    new Set(
      extraClientIds
        .map((id) => Number(id))
        .filter((id) => !isNaN(id) && id > 0 && !map.has(id))
    )
  ).sort((a, b) => a - b);

  remainingExtraIds.forEach((id) => {
    map.set(id, CLIENT_BORDER_PALETTE[nextIndex % CLIENT_BORDER_PALETTE.length]);
    nextIndex++;
  });

  return map;
}

export function getClientColor(
  clientId: number | string | undefined | null,
  clientName: string | undefined | null,
  colorMap?: Map<number, string>
): string {
  if (clientId != null && !isNaN(Number(clientId))) {
    const numId = Number(clientId);
    if (colorMap && colorMap.has(numId)) {
      return colorMap.get(numId)!;
    }
    const idx = Math.abs(numId) % CLIENT_BORDER_PALETTE.length;
    return CLIENT_BORDER_PALETTE[idx];
  }
  const nameStr = String(clientName || '');
  let hash = 0;
  for (let i = 0; i < nameStr.length; i++) {
    hash = (hash * 31 + nameStr.charCodeAt(i)) | 0;
  }
  return CLIENT_BORDER_PALETTE[Math.abs(hash) % CLIENT_BORDER_PALETTE.length];
}
