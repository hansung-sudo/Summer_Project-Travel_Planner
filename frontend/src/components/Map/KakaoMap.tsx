import React, { useEffect, useRef, useState } from 'react';
import { usePlannerStore } from '../../store/plannerStore';
import { loadKakao } from '../../utils/kakaoLoader';
import { isKakaoKeySet } from '../../config/kakao';
import { getScheduleColor } from '../../utils/colorUtils';
import { Search, MapPin, Navigation, Info, AlertTriangle, Plus } from 'lucide-react';

interface SearchResult {
  name: string;
  addr: string;
  lat: number;
  lng: number;
}

// 지도 가로:세로 비율 (작은/큰 버전 동일하게 유지). 폭에 맞춰 높이 자동 계산.
const MAP_ASPECT = '5 / 4';

// 장소 선택 → 상세 일정표(일정)에 추가하도록 이벤트 전파.
// PlannerPage 가 이 이벤트를 받아 일정 추가 모달을 (장소가 채워진 채로) 연다.
const emitPlaceSelected = (name: string, lat: number, lng: number) => {
  window.dispatchEvent(
    new CustomEvent('tripsync_place_selected', { detail: { name, lat, lng } })
  );
};

export const KakaoMap: React.FC = () => {
  const { schedules, activeDayId, currentUser } = usePlannerStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const placesRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]); // 마커/경로선 등 정리 대상
  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;

  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  // 이 일차의 장소가 있는 일정만, 시간순(= 상세 일정표 순서)으로 정렬
  const activeSchedules = schedules
    .filter(
      (s) =>
        s.dayId === activeDayId &&
        s.placeLat != null &&
        s.placeLng != null
    )
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  // 지도 초기화 (한 번)
  useEffect(() => {
    if (!isKakaoKeySet()) {
      setError('카카오 지도 키가 설정되지 않았습니다.');
      return;
    }
    let canceled = false;
    loadKakao()
      .then((kakao) => {
        if (canceled || !containerRef.current) return;
        const map = new kakao.maps.Map(containerRef.current, {
          center: new kakao.maps.LatLng(33.3617, 126.5292), // 제주 한라산 기준
          level: 9,
        });
        mapRef.current = map;
        placesRef.current = new kakao.maps.services.Places();
        geocoderRef.current = new kakao.maps.services.Geocoder();

        // 지도 클릭 → 좌표를 주소로 변환 후 일정 추가 이벤트 전파
        kakao.maps.event.addListener(map, 'click', (mouseEvent: any) => {
          if (!currentUserRef.current) return; // 조회 모드
          const latlng = mouseEvent.latLng;
          const lat = latlng.getLat();
          const lng = latlng.getLng();
          geocoderRef.current.coord2Address(lng, lat, (res: any, status: any) => {
            let name = '지정한 위치';
            if (status === kakao.maps.services.Status.OK && res[0]) {
              name =
                res[0].road_address?.building_name ||
                res[0].road_address?.address_name ||
                res[0].address?.address_name ||
                name;
            }
            emitPlaceSelected(name, lat, lng);
          });
        });

        setReady(true);
      })
      .catch(() => {
        setError('지도를 불러오지 못했습니다. 카카오 JS 키와 플랫폼 도메인 등록을 확인해 주세요.');
      });
    return () => {
      canceled = true;
    };
  }, []);

  // 일정 변경 시 마커 + 경로선 다시 그림
  useEffect(() => {
    const kakao = (window as any).kakao;
    if (!ready || !kakao || !mapRef.current) return;
    const map = mapRef.current;

    overlaysRef.current.forEach((o) => o.setMap(null));
    overlaysRef.current = [];

    const path: any[] = [];
    activeSchedules.forEach((s) => {
      const pos = new kakao.maps.LatLng(s.placeLat, s.placeLng);
      path.push(pos);
      // 상세 일정표와 동일한 색의 위치 핀
      const color = getScheduleColor(s.id);
      const content = document.createElement('div');
      content.title = s.placeName || '';
      content.style.cssText = 'line-height:0; filter: drop-shadow(0 2px 2px rgba(15,23,42,0.55));';
      content.innerHTML = `
        <svg width="22" height="29" viewBox="0 0 24 32" overflow="visible" style="overflow:visible" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 0 C5.373 0 0 5.373 0 12 c0 8.4 12 20 12 20 s12 -11.6 12 -20 C24 5.373 18.627 0 12 0 Z"
                fill="${color}" stroke="#0f172a" stroke-width="3"/>
          <circle cx="12" cy="12" r="4.6" fill="#ffffff" stroke="#0f172a" stroke-width="1"/>
        </svg>`;
      // 핀 끝(하단)이 좌표를 가리키도록 앵커
      const overlay = new kakao.maps.CustomOverlay({
        position: pos,
        content,
        xAnchor: 0.5,
        yAnchor: 1,
        zIndex: 5,
      });
      overlay.setMap(map);
      overlaysRef.current.push(overlay);
    });

    // 상세 일정표 순서대로 이동 경로선
    if (path.length > 1) {
      const polyline = new kakao.maps.Polyline({
        path,
        strokeWeight: 2.5,
        strokeColor: '#0f172a',
        strokeOpacity: 1,
        strokeStyle: 'shortdash', // 얇고 촘촘한 점선(파선)
      });
      polyline.setMap(map);
      overlaysRef.current.push(polyline);
    }

    // 장소들이 모두 보이도록 지도 범위 맞춤
    if (path.length > 0) {
      const bounds = new kakao.maps.LatLngBounds();
      path.forEach((p) => bounds.extend(p));
      map.setBounds(bounds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, schedules, activeDayId]);

  // 실제 카카오 로컬 키워드 검색
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (!q.trim() || !placesRef.current) {
      setSearchResults([]);
      return;
    }
    const kakao = (window as any).kakao;
    placesRef.current.keywordSearch(q, (data: any[], status: any) => {
      if (status === kakao.maps.services.Status.OK) {
        setSearchResults(
          data.slice(0, 12).map((d) => ({
            name: d.place_name,
            addr: d.road_address_name || d.address_name || '',
            lat: parseFloat(d.y),
            lng: parseFloat(d.x),
          }))
        );
      } else {
        setSearchResults([]);
      }
    });
  };

  const handleSelectResult = (place: SearchResult) => {
    setSearchQuery(place.name);
    setSearchResults([]);
    const kakao = (window as any).kakao;
    if (mapRef.current && kakao) {
      mapRef.current.panTo(new kakao.maps.LatLng(place.lat, place.lng));
    }
    if (currentUser) emitPlaceSelected(place.name, place.lat, place.lng);
  };

  const showMapError = !!error;

  return (
    <div style={containerStyle}>
      {/* 검색 */}
      <div style={searchContainerStyle}>
        <div style={searchInputWrapperStyle}>
          <Search size={16} style={searchIconStyle} />
          <input
            type="text"
            className="glass-input"
            style={searchInputStyle}
            value={searchQuery}
            onChange={handleSearch}
            placeholder={currentUser ? '장소 검색 (예: 성산일출봉)' : '장소 조회 모드'}
            disabled={!currentUser || !ready}
          />
        </div>
      </div>

      {/* 지도 (위) */}
      <div style={mapWrapperStyle}>
        <div ref={containerRef} style={mapDivStyle} />
        {showMapError && (
          <div style={mapErrorStyle}>
            <AlertTriangle size={20} color="#f59e0b" />
            <span style={{ fontWeight: 700 }}>지도를 표시할 수 없습니다</span>
            <span style={mapErrorDescStyle}>{error}</span>
          </div>
        )}
        {!ready && !showMapError && <div style={mapLoadingStyle}>지도를 불러오는 중...</div>}
      </div>

      {/* 검색 결과 목록 (지도 아래) */}
      {searchResults.length > 0 && (
        <div style={searchResultsStyle}>
          {searchResults.map((place, idx) => (
            <div key={idx} style={resultItemStyle} onClick={() => handleSelectResult(place)}>
              <MapPin size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={resultNameStyle}>{place.name}</div>
                <div style={resultDescStyle}>{place.addr}</div>
              </div>
              {currentUser && <Plus size={14} style={{ color: '#4f46e5', flexShrink: 0 }} />}
            </div>
          ))}
        </div>
      )}

      {currentUser && ready && (
        <div style={hintStyle}>
          <Info size={11} /> 지도를 클릭하거나 검색 결과를 누르면 상세 일정표에 장소를 추가할 수 있어요.
        </div>
      )}

      {/* 경로 분석 (상세 일정표 순서) */}
      <div style={routeInfoContainerStyle}>
        <div style={routeInfoHeaderStyle}>
          <Navigation size={14} style={{ color: '#6366f1' }} />
          <span style={routeInfoTitleStyle}>이동 경로 ({activeSchedules.length}곳)</span>
        </div>
        {activeSchedules.length > 0 ? (
          <div style={routeListStyle}>
            {activeSchedules.map((s) => (
              <div key={s.id} style={routeItemStyle}>
                <svg width="20" height="27" viewBox="0 0 24 32" overflow="visible" style={{ flexShrink: 0, overflow: 'visible' }}>
                  <path
                    d="M12 0 C5.373 0 0 5.373 0 12 c0 8.4 12 20 12 20 s12 -11.6 12 -20 C24 5.373 18.627 0 12 0 Z"
                    fill={getScheduleColor(s.id)}
                    stroke="#0f172a"
                    strokeWidth="3"
                  />
                  <circle cx="12" cy="12" r="4.6" fill="#ffffff" stroke="#0f172a" strokeWidth="1" />
                </svg>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={placeTitleStyle}>{s.placeName}</div>
                  <div style={placeTimeStyle}>
                    {s.startTime} ~ {s.endTime}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={noRoutesStyle}>
            <Info size={14} style={{ marginRight: '4px' }} />
            등록된 일정 장소가 없습니다. 지도를 클릭하거나 검색해서 추가해 보세요.
          </div>
        )}
      </div>
    </div>
  );
};

/* ---- Styles ---- */
const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  gap: '10px',
};

const searchContainerStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
};

const searchInputWrapperStyle: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
};

const searchIconStyle: React.CSSProperties = {
  position: 'absolute',
  left: '12px',
  color: '#64748b',
};

const searchInputStyle: React.CSSProperties = {
  width: '100%',
  paddingLeft: '36px',
  backgroundColor: '#ffffff',
  border: '3px solid #0f172a',
  borderRadius: '8px',
  boxShadow: '2px 2px 0px #0f172a',
  fontSize: '0.85rem',
  color: '#0f172a',
  fontWeight: 500,
  outline: 'none',
};

const searchResultsStyle: React.CSSProperties = {
  marginTop: '8px',
  backgroundColor: '#ffffff',
  border: '3px solid #0f172a',
  borderRadius: '8px',
  boxShadow: '2px 2px 0px #0f172a',
  maxHeight: '200px',
  overflowY: 'auto',
};

const resultItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '9px 12px',
  cursor: 'pointer',
  borderBottom: '1px solid rgba(15, 23, 42, 0.08)',
};

const resultNameStyle: React.CSSProperties = {
  fontSize: '0.83rem',
  color: '#0f172a',
  fontWeight: 600,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const resultDescStyle: React.CSSProperties = {
  fontSize: '0.72rem',
  color: '#64748b',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const mapWrapperStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  aspectRatio: MAP_ASPECT, // 폭에 맞춰 높이 자동 → 작은/큰 버전 비율 동일
  border: '2px solid #0f172a',
  borderRadius: '10px',
  overflow: 'hidden',
  backgroundColor: '#eef2f6',
};

const mapDivStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  // 카카오 지도 기본 컬러 그대로 (필터 없음)
};

const mapErrorStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  padding: '20px',
  textAlign: 'center',
  backgroundColor: '#fffbeb',
  color: '#0f172a',
  fontSize: '0.8rem',
};

const mapErrorDescStyle: React.CSSProperties = {
  fontSize: '0.72rem',
  color: '#64748b',
  lineHeight: 1.4,
};

const mapLoadingStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '0.8rem',
  color: '#64748b',
};

const hintStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  fontSize: '0.68rem',
  color: '#64748b',
  lineHeight: 1.3,
};

const routeInfoContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const routeInfoHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
};

const routeInfoTitleStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  fontWeight: 700,
  color: '#0f172a',
};

const routeListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '9px',
};

const routeItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  backgroundColor: 'rgba(15, 23, 42, 0.02)',
  border: '1px solid rgba(15, 23, 42, 0.06)',
  borderRadius: '6px',
  padding: '8px 10px',
};

const placeTitleStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  color: '#0f172a',
  fontWeight: 600,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const placeTimeStyle: React.CSSProperties = {
  fontSize: '0.7rem',
  color: '#64748b',
};

const noRoutesStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: '#64748b',
  display: 'flex',
  alignItems: 'center',
  padding: '10px',
  backgroundColor: 'rgba(15, 23, 42, 0.01)',
  borderRadius: '6px',
};
