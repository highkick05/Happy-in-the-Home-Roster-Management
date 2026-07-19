import multiavatar from '@multiavatar/multiavatar';

export function getAvatarUrl(seedOrUrl: string): string {
  if (!seedOrUrl) return `data:image/svg+xml;utf8,${encodeURIComponent(multiavatar('Staff'))}`;
  
  // If it's already a data URI, just return it
  if (seedOrUrl.startsWith('data:')) return seedOrUrl;

  // If it's an api.multiavatar.com URL, extract the seed
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
  }

  const svgCode = multiavatar(seed);
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgCode)}`;
}
