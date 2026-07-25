import { json } from '../_lib/http.js';

// 개발/QA 중 웹뷰 콘솔 로그가 wrangler 서버 로그로 전달되지 않아서,
// 클라이언트가 진단 정보를 여기로 보내면 서버 콘솔(wrangler 로그)에 남긴다.
export async function onRequestPost({ request }) {
  try {
    const body = await request.json().catch(() => ({}));
    console.log('[client-debug]', JSON.stringify(body));
  } catch (error) {
    console.warn('[client-debug] failed to parse body', error);
  }
  return json({ ok: true });
}

export function onRequestGet() {
  return json({ error: '허용되지 않은 요청 방식입니다.' }, 405);
}
