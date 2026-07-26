// 토스 미니앱(.ait) 번들은 정적 파일을 Cloudflare Pages와 다른 origin에서 서빙하므로,
// 이 API는 크로스 오리진으로 호출된다. CORS 허용 헤더가 없으면 브라우저가 응답을 막는다.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...CORS_HEADERS,
  },
});

export const corsPreflight = () => new Response(null, { status: 204, headers: CORS_HEADERS });

export function parseDataUrl(value, maxCharacters = 4_500_000) {
  if (typeof value !== 'string' || value.length > maxCharacters) return null;
  const match = value.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return null;
  return { mimeType: match[1], base64: match[2] };
}

export function base64ToBlob({ mimeType, base64 }) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mimeType });
}
