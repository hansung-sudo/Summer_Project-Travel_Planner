import React, { useState } from 'react';
import { usePlannerStore } from '../../store/plannerStore';
import { Search, MapPin, Navigation, Info } from 'lucide-react';

// Coordinates scaled to fit our SVG mock map (roughly mapping Jeju coords to 340x260 grid)
// Jeju bounding box approx: Lat 33.1 to 33.6, Lng 126.1 to 127.0
const mapWidth = 340;
const mapHeight = 220;

const convertCoordsToXY = (lat: number, lng: number) => {
  const minLat = 33.15;
  const maxLat = 33.58;
  const minLng = 126.15;
  const maxLng = 127.0;

  // Scale map
  const x = ((lng - minLng) / (maxLng - minLng)) * mapWidth;
  // SVG y is downwards, so invert latitude
  const y = mapHeight - ((lat - minLat) / (maxLat - minLat)) * mapHeight;

  return { x: Math.max(10, Math.min(mapWidth - 10, x)), y: Math.max(10, Math.min(mapHeight - 10, y)) };
};

// Places database for search/autocomplete
const PRESET_PLACES = [
  { name: '성산일출봉', lat: 33.4586, lng: 126.9426, desc: '제주 서귀포시 성산읍' },
  { name: '협재해수욕장', lat: 33.3938, lng: 126.2396, desc: '제주 제주시 한림읍' },
  { name: '한라산 백록담', lat: 33.3617, lng: 126.5292, desc: '제주 제주시 오등동' },
  { name: '동문재래시장', lat: 33.5126, lng: 126.5284, desc: '제주 제주시 일도일동' },
  { name: '오설록 티뮤지엄', lat: 33.3059, lng: 126.2894, desc: '제주 서귀포시 안덕면' },
  { name: '제주국제공항', lat: 33.5104, lng: 126.4913, desc: '제주 제주시 공항로' },
  { name: '섭지코지', lat: 33.4243, lng: 126.9312, desc: '제주 서귀포시 성산읍' },
  { name: '천지연폭포', lat: 33.2447, lng: 126.5546, desc: '제주 서귀포시 천지동' },
  { name: '중문관광단지', lat: 33.2483, lng: 126.4124, desc: '제주 서귀포시 색달동' }
];

export const KakaoMap: React.FC = () => {
  const { schedules, activeDayId, participants, currentUser } = usePlannerStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<typeof PRESET_PLACES>([]);
  const [selectedPlace, setSelectedPlace] = useState<typeof PRESET_PLACES[number] | null>(null);

  // Filter and sort active day schedules chronologically by startTime
  const activeSchedules = schedules
    .filter(s => s.dayId === activeDayId && s.placeLat && s.placeLng)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  // Perform search locally
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchQuery(q);
    
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }

    const filtered = PRESET_PLACES.filter(place => 
      place.name.toLowerCase().includes(q.toLowerCase()) || 
      place.desc.toLowerCase().includes(q.toLowerCase())
    );
    setSearchResults(filtered);
  };

  const handleSelectResult = (place: typeof PRESET_PLACES[number]) => {
    setSelectedPlace(place);
    setSearchQuery(place.name);
    setSearchResults([]);

    // Dispatch a custom event to notify the TimeSlotModal if it is open
    const event = new CustomEvent('tripsync_place_selected', {
      detail: { name: place.name, lat: place.lat, lng: place.lng }
    });
    window.dispatchEvent(event);
  };

  // Click directly on the mock map to select a place or set custom coordinates
  const handleMapClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!currentUser) return; // Read-only
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Reverse conversion back to Lat/Lng approx
    const minLat = 33.15;
    const maxLat = 33.58;
    const minLng = 126.15;
    const maxLng = 127.0;

    const lng = minLng + (clickX / mapWidth) * (maxLng - minLng);
    const lat = minLat + ((mapHeight - clickY) / mapHeight) * (maxLat - minLat);

    const customPlace = {
      name: `지정 위치 (Lat: ${lat.toFixed(3)}, Lng: ${lng.toFixed(3)})`,
      lat,
      lng,
      desc: '사용자 지정 핀'
    };

    setSelectedPlace(customPlace);
    setSearchQuery(customPlace.name);

    // Dispatch selection event
    const event = new CustomEvent('tripsync_place_selected', {
      detail: { name: customPlace.name, lat, lng }
    });
    window.dispatchEvent(event);
  };

  // Build the route polyline string
  const getPolylinePoints = () => {
    return activeSchedules
      .map(s => {
        const { x, y } = convertCoordsToXY(s.placeLat!, s.placeLng!);
        return `${x},${y}`;
      })
      .join(' ');
  };

  return (
    <div style={containerStyle}>
      {/* Map Header Search */}
      <div style={searchContainerStyle}>
        <div style={searchInputWrapperStyle}>
          <Search size={16} style={searchIconStyle} />
          <input
            type="text"
            className="glass-input"
            style={searchInputStyle}
            value={searchQuery}
            onChange={handleSearch}
            placeholder={currentUser ? "장소 검색 (예: 성산일출봉)" : "장소 조회 모드"}
            disabled={!currentUser}
          />
        </div>
        
        {searchResults.length > 0 && (
          <div style={searchResultsStyle}>
            {searchResults.map((place, idx) => (
              <div 
                key={idx} 
                style={resultItemStyle}
                onClick={() => handleSelectResult(place)}
              >
                <MapPin size={14} style={{ color: '#94a3b8' }} />
                <div>
                  <div style={resultNameStyle}>{place.name}</div>
                  <div style={resultDescStyle}>{place.desc}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* The Visual Mock Map */}
      <div className="glass-panel" style={mapWrapperStyle}>
        <svg 
          width={mapWidth} 
          height={mapHeight} 
          style={svgStyle}
          onClick={handleMapClick}
        >
          {/* Grid lines to resemble radar or layout map */}
          {Array.from({ length: 6 }).map((_, i) => (
            <line
              key={`h-${i}`}
              x1={0}
              y1={(mapHeight / 6) * i}
              x2={mapWidth}
              y2={(mapHeight / 6) * i}
              stroke="rgba(255, 255, 255, 0.03)"
              strokeWidth={1}
            />
          ))}
          {Array.from({ length: 8 }).map((_, i) => (
            <line
              key={`v-${i}`}
              x1={(mapWidth / 8) * i}
              y1={0}
              x2={(mapWidth / 8) * i}
              y2={mapHeight}
              stroke="rgba(255, 255, 255, 0.03)"
              strokeWidth={1}
            />
          ))}

          {/* Minimal representation of Jeju Island outline */}
          <path
            d="M 40 120 C 60 70, 160 50, 240 60 C 290 70, 310 90, 320 120 C 310 160, 270 180, 220 190 C 150 200, 70 180, 40 120 Z"
            fill="rgba(255, 255, 255, 0.015)"
            stroke="rgba(255, 255, 255, 0.06)"
            strokeWidth={1.5}
          />

          {/* Legend indicator */}
          <text x={12} y={mapHeight - 12} style={legendStyle}>
            JEJU MAP PROTOTYPE
          </text>

          {/* Route path connecting schedules in order */}
          {activeSchedules.length > 1 && (
            <polyline
              points={getPolylinePoints()}
              fill="none"
              stroke="#6366f1"
              strokeWidth={2}
              strokeDasharray="4 4"
              style={{ opacity: 0.8 }}
            />
          )}

          {/* Markers for schedules */}
          {activeSchedules.map((schedule, idx) => {
            const { x, y } = convertCoordsToXY(schedule.placeLat!, schedule.placeLng!);
            const creator = participants.find(p => p.id === schedule.createdBy);
            const markerColor = creator?.color || '#6366f1';

            return (
              <g key={schedule.id}>
                {/* Marker outer pulse */}
                <circle
                  cx={x}
                  cy={y}
                  r={12}
                  fill={markerColor}
                  fillOpacity={0.15}
                />
                {/* Marker body */}
                <circle
                  cx={x}
                  cy={y}
                  r={7}
                  fill={markerColor}
                  stroke="#ffffff"
                  strokeWidth={1.5}
                />
                {/* Index label inside marker */}
                <text
                  x={x}
                  y={y + 3.5}
                  textAnchor="middle"
                  style={markerTextStyle}
                >
                  {idx + 1}
                </text>
              </g>
            );
          })}

          {/* Custom selected search pin */}
          {selectedPlace && (
            <g>
              {(() => {
                const { x, y } = convertCoordsToXY(selectedPlace.lat, selectedPlace.lng);
                return (
                  <>
                    <circle
                      cx={x}
                      cy={y}
                      r={14}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth={1}
                      strokeDasharray="2 2"
                    />
                    <path
                      d={`M ${x} ${y-10} L ${x-4} ${y-4} L ${x+4} ${y-4} Z`}
                      fill="#10b981"
                    />
                    <circle
                      cx={x}
                      cy={y}
                      r={3}
                      fill="#10b981"
                    />
                  </>
                );
              })()}
            </g>
          )}
        </svg>
      </div>

      {/* Schedule Path Info List */}
      <div style={routeInfoContainerStyle}>
        <div style={routeInfoHeaderStyle}>
          <Navigation size={14} style={{ color: '#6366f1' }} />
          <span style={routeInfoTitleStyle}>경로 분석 ({activeSchedules.length}곳)</span>
        </div>
        {activeSchedules.length > 0 ? (
          <div style={routeListStyle}>
            {activeSchedules.map((s, idx) => (
              <div key={s.id} style={routeItemStyle}>
                <div style={routeNumberStyle}>{idx + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={placeTitleStyle}>{s.placeName}</div>
                  <div style={placeTimeStyle}>{s.startTime} ~ {s.endTime}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={noRoutesStyle}>
            <Info size={14} style={{ marginRight: '4px' }} />
            등록된 일정 장소가 없습니다. 일정에 장소를 추가해 보세요.
          </div>
        )}
      </div>
    </div>
  );
};

// Styling definitions
const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  gap: '12px',
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
  position: 'absolute',
  top: '42px',
  left: 0,
  right: 0,
  backgroundColor: '#ffffff',
  border: '1px solid rgba(15, 23, 42, 0.12)',
  borderRadius: '8px',
  zIndex: 10,
  maxHeight: '180px',
  overflowY: 'auto',
  boxShadow: 'var(--shadow-lg)',
};

const resultItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '8px 12px',
  cursor: 'pointer',
  borderBottom: '1px solid rgba(15, 23, 42, 0.05)',
  transition: 'background-color 0.15s ease',
};

const resultNameStyle: React.CSSProperties = {
  fontSize: '0.85rem',
  color: '#0f172a',
  fontWeight: 500,
};

const resultDescStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: '#64748b',
};

const mapWrapperStyle: React.CSSProperties = {
  width: '100%',
  backgroundColor: 'rgba(15, 23, 42, 0.02)',
  borderColor: 'rgba(15, 23, 42, 0.08)',
  borderRadius: '12px',
  overflow: 'hidden',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '10px',
};

const svgStyle: React.CSSProperties = {
  backgroundColor: 'rgba(15, 23, 42, 0.04)',
  borderRadius: '8px',
  cursor: 'crosshair',
};

const legendStyle: React.CSSProperties = {
  fill: '#64748b',
  fontSize: '0.65rem',
  fontFamily: 'monospace',
  fontWeight: 600,
};

const markerTextStyle: React.CSSProperties = {
  fill: '#ffffff',
  fontSize: '0.55rem',
  fontWeight: 700,
  fontFamily: 'sans-serif',
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
  fontWeight: 600,
  color: '#475569',
};

const routeListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  maxHeight: '140px',
  overflowY: 'auto',
  paddingRight: '4px',
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

const routeNumberStyle: React.CSSProperties = {
  width: '18px',
  height: '18px',
  borderRadius: '50%',
  backgroundColor: '#6366f1',
  color: '#ffffff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '0.7rem',
  fontWeight: 700,
};

const placeTitleStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  color: '#0f172a',
  fontWeight: 500,
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
