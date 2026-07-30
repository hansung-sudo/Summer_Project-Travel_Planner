import { KAKAO_MAP_KEY } from '../config/kakao';

// 카카오 지도 SDK를 한 번만 로드한다. services 라이브러리(장소 검색/좌표 변환) 포함.
let loadPromise: Promise<any> | null = null;

export const loadKakao = (): Promise<any> => {
  const w = window as any;
  if (w.kakao && w.kakao.maps && w.kakao.maps.services) {
    return Promise.resolve(w.kakao);
  }
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src =
      `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_MAP_KEY}` +
      `&libraries=services&autoload=false`;
    script.async = true;
    script.onload = () => {
      const kakao = (window as any).kakao;
      if (!kakao || !kakao.maps) {
        reject(new Error('Kakao SDK 로드 실패'));
        return;
      }
      kakao.maps.load(() => resolve(kakao));
    };
    script.onerror = () =>
      reject(new Error('Kakao SDK 스크립트를 불러오지 못했습니다 (키/도메인 확인)'));
    document.head.appendChild(script);
  });

  return loadPromise;
};
