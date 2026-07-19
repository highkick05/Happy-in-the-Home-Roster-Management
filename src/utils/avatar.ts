export function getAvatarUrl(seedOrUrl: string): string {
  const defaultUrl = `https://api.dicebear.com/9.x/avataaars/svg?seed=Staff&mouth=smile,twinkle&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
  
  if (!seedOrUrl) return defaultUrl;
  
  if (seedOrUrl.startsWith('data:')) {
    return seedOrUrl;
  }
  
  if (seedOrUrl.startsWith('http')) {
     return seedOrUrl;
  }

  let seed = seedOrUrl;
  return `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(seed)}&mouth=smile,twinkle&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}
