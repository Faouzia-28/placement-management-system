const rawApiBaseUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : '');
const apiOrigin = rawApiBaseUrl.replace(/\/api\/?$/, '');

export function toAssetUrl(assetPath) {
  if (!assetPath) return '#';
  if (/^https?:\/\//i.test(assetPath)) return assetPath;

  const normalizedPath = assetPath.startsWith('/') ? assetPath : `/${assetPath}`;
  const fullPath = apiOrigin ? `${apiOrigin}${normalizedPath}` : normalizedPath;
  return encodeURI(fullPath);
}
