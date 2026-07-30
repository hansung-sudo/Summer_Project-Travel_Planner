// 카카오 JavaScript 앱 키 — 환경변수(VITE_KAKAO_MAP_APP_KEY)로 주입한다.
// (README 규칙: API 키는 소스에 하드코딩/커밋 금지 → 로컬은 frontend/.env.local, 배포는 Vercel 환경변수 사용)
// 도메인 제한이 걸린 공개 클라이언트 키이며, 사용 도메인을 카카오 콘솔 [플랫폼 > Web 사이트 도메인]에 등록해야 지도가 로드됩니다.
// 환경변수 주입 과정에서 끼어들 수 있는 BOM/공백 등을 제거 (카카오 앱 키는 영숫자)
export const KAKAO_MAP_KEY: string = (import.meta.env.VITE_KAKAO_MAP_APP_KEY || '').replace(/[^a-zA-Z0-9]/g, '');

export const isKakaoKeySet = () => !!KAKAO_MAP_KEY;
