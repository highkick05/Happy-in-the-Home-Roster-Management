export function getAvatarUrl(seedOrUrl: string): string {
  const defaultUrl = `https://api.dicebear.com/9.x/avataaars/svg?seed=Staff&mouth=smile,twinkle,teeth&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
  
  if (!seedOrUrl) return defaultUrl;
  
  if (seedOrUrl.startsWith('data:')) {
    return seedOrUrl;
  }
  
  let seed = seedOrUrl;
  if (seedOrUrl.includes('api.multiavatar.com')) {
    const match = seedOrUrl.match(/api\.multiavatar\.com\/(.+?)\.svg/);
    if (match && match[1]) {
      seed = decodeURIComponent(match[1]);
    }
  } else if (seedOrUrl.includes('api.dicebear.com')) {
    const match = seedOrUrl.match(/seed=([^&]+)/);
    if (match && match[1]) {
      seed = decodeURIComponent(match[1]);
    }
  } else if (seedOrUrl.startsWith('http')) {
     return seedOrUrl;
  }

  return `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(seed)}&mouth=smile,twinkle,teeth,default&accessories=prescription01,prescription02,default&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}
