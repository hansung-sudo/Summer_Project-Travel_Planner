import React, { useState, useEffect } from 'react';
import { usePlannerStore } from '../../store/plannerStore';
import type { Schedule } from '../../types';
import { Save, Trash2, X, MapPin } from 'lucide-react';

interface TimeSlotModalProps {
  schedule?: Schedule | null; // If present, we are in Edit mode
  defaultStartTime?: string | null;
  defaultEndTime?: string | null;
  onClose: () => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const END_HOURS = Array.from({ length: 25 }, (_, i) => i.toString().padStart(2, '0')); // 00 to 24
const MINUTES = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

export const TimeSlotModal: React.FC<TimeSlotModalProps> = ({ 
  schedule, 
  defaultStartTime, 
  defaultEndTime, 
  onClose 
}) => {
  const { addSchedule, updateSchedule, deleteSchedule } = usePlannerStore();
  
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('11:00');
  
  const [startHour, setStartHour] = useState('09');
  const [startMin, setStartMin] = useState('00');
  const [endHour, setEndHour] = useState('11');
  const [endMin, setEndMin] = useState('00');
  
  const [placeName, setPlaceName] = useState('');
  const [placeLat, setPlaceLat] = useState<number | undefined>(undefined);
  const [placeLng, setPlaceLng] = useState<number | undefined>(undefined);
  const [content, setContent] = useState('');

  // Synchronize component state with props
  useEffect(() => {
    let sh = '09';
    let sm = '00';
    let eh = '11';
    let em = '00';

    if (schedule) {
      [sh, sm] = schedule.startTime.split(':');
      [eh, em] = schedule.endTime.split(':');
    } else {
      if (defaultStartTime) [sh, sm] = defaultStartTime.split(':');
      if (defaultEndTime) [eh, em] = defaultEndTime.split(':');
    }

    // Treat 00:00 end time as 24:00 if start is after midnight
    if (eh === '00' && em === '00' && (Number(sh) > 0 || Number(sm) > 0)) {
      eh = '24';
      em = '00';
    }

    setStartHour(sh);
    setStartMin(sm);
    setEndHour(eh);
    setEndMin(em);

    setStartTime(`${sh}:${sm}`);
    setEndTime(eh === '24' ? '00:00' : `${eh}:${em}`);
    
    if (schedule) {
      setPlaceName(schedule.placeName || '');
      setPlaceLat(schedule.placeLat);
      setPlaceLng(schedule.placeLng);
      setContent(schedule.content || '');
    } else {
      setPlaceName('');
      setPlaceLat(undefined);
      setPlaceLng(undefined);
      setContent('');
    }
  }, [schedule, defaultStartTime, defaultEndTime]);

  // Hook into window event for place selection from map
  useEffect(() => {
    const handlePlaceSelect = (e: Event) => {
      const customEvent = e as CustomEvent<{ name: string; lat: number; lng: number }>;
      setPlaceName(customEvent.detail.name);
      setPlaceLat(customEvent.detail.lat);
      setPlaceLng(customEvent.detail.lng);
    };

    window.addEventListener('tripsync_place_selected', handlePlaceSelect);
    return () => {
      window.removeEventListener('tripsync_place_selected', handlePlaceSelect);
    };
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const finalEndTime = endHour === '24' ? '00:00' : `${endHour}:${endMin}`;

    if (startTime >= finalEndTime && finalEndTime !== '00:00') {
      alert('종료 시간은 시작 시간보다 늦어야 합니다.');
      return;
    }

    const data = {
      startTime,
      endTime: finalEndTime,
      placeName: placeName.trim() || undefined,
      placeLat,
      placeLng,
      content: content.trim() || undefined,
    };

    if (schedule) {
      updateSchedule({
        ...schedule,
        ...data,
      });
    } else {
      addSchedule(data);
    }
    onClose();
  };

  const handleDelete = () => {
    if (schedule && window.confirm('이 일정을 삭제하시겠습니까?')) {
      deleteSchedule(schedule.id);
      onClose();
    }
  };

  return (
    <div style={overlayStyle}>
      <div className="glass-panel" style={modalStyle}>
        <div style={headerStyle}>
          <h3 style={titleStyle}>
            {schedule ? '📌 일정 수정하기' : '새 일정 추가'}
          </h3>
          <button onClick={onClose} style={closeBtnStyle}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} style={formStyle}>
          <div style={rowStyle}>
            <div style={colStyle}>
              <label style={labelStyle}>시작 시간</label>
              <div style={timePickerWrapperStyle}>
                <select
                  className="glass-input"
                  style={timeSelectStyle}
                  value={startHour}
                  onChange={(e) => {
                    setStartHour(e.target.value);
                    setStartTime(`${e.target.value}:${startMin}`);
                  }}
                >
                  {HOURS.map(h => (
                    <option key={h} value={h}>{h}시</option>
                  ))}
                </select>
                <select
                  className="glass-input"
                  style={timeSelectStyle}
                  value={startMin}
                  onChange={(e) => {
                    setStartMin(e.target.value);
                    setStartTime(`${startHour}:${e.target.value}`);
                  }}
                >
                  {MINUTES.map(m => (
                    <option key={m} value={m}>{m}분</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={colStyle}>
              <label style={labelStyle}>종료 시간</label>
              <div style={timePickerWrapperStyle}>
                <select
                  className="glass-input"
                  style={timeSelectStyle}
                  value={endHour}
                  onChange={(e) => {
                    const newHour = e.target.value;
                    setEndHour(newHour);
                    if (newHour === '24') {
                      setEndMin('00');
                      setEndTime('00:00');
                    } else {
                      setEndTime(`${newHour}:${endMin}`);
                    }
                  }}
                >
                  {END_HOURS.map(h => (
                    <option key={h} value={h}>{h}시</option>
                  ))}
                </select>
                <select
                  className="glass-input"
                  style={timeSelectStyle}
                  value={endMin}
                  disabled={endHour === '24'}
                  onChange={(e) => {
                    setEndMin(e.target.value);
                    setEndTime(`${endHour}:${e.target.value}`);
                  }}
                >
                  {MINUTES.map(m => (
                    <option key={m} value={m}>{m}분</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>장소명</label>
            <div style={placeInputWrapperStyle}>
              <input
                type="text"
                className="glass-input"
                style={{ ...inputStyle, flex: 1 }}
                value={placeName}
                onChange={(e) => setPlaceName(e.target.value)}
                placeholder="지도를 클릭하거나 직접 입력하세요"
              />
              {placeLat && placeLng && (
                <div style={coordBadgeStyle}>
                  <MapPin size={12} />
                  <span>좌표 등록됨</span>
                </div>
              )}
            </div>
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>일정 메모</label>
            <textarea
              className="glass-input"
              style={textareaStyle}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="예: 맛집 방문, 사진 찍기 등 메모"
              rows={3}
            />
          </div>

          <div style={actionRowStyle}>
            {schedule && (
              <button
                type="button"
                className="btn btn-secondary"
                style={deleteBtnStyleFull}
                onClick={handleDelete}
              >
                <Trash2 size={16} color="#ef4444" />
                삭제
              </button>
            )}
            
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ ...saveBtnStyle, marginLeft: 'auto' }}
            >
              <Save size={16} />
              {schedule ? '수정 완료' : '추가하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Modal specific styling
const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(15, 23, 42, 0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1100,
  backdropFilter: 'blur(4px)',
};

const modalStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '440px',
  padding: '24px',
  backgroundColor: '#ffffff',
  border: '3px solid #0f172a',
  borderRadius: '16px',
  boxShadow: '6px 6px 0px #0f172a',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderBottom: '3px solid #0f172a',
  paddingBottom: '12px',
};

const titleStyle: React.CSSProperties = {
  fontSize: '1.1rem',
  fontWeight: 700,
  color: '#0f172a',
};

const closeBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#0f172a',
  cursor: 'pointer',
  padding: '4px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const formStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '16px',
};

const colStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
};

const labelStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  fontWeight: 700,
  color: '#0f172a',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  backgroundColor: '#ffffff',
  border: '3px solid #0f172a',
  borderRadius: '8px',
  boxShadow: '2px 2px 0px #0f172a',
  padding: '10px 12px',
  fontSize: '0.9rem',
  color: '#0f172a',
  fontWeight: 600,
  outline: 'none',
};

const timePickerWrapperStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  width: '100%',
};

const timeSelectStyle: React.CSSProperties = {
  flex: 1,
  backgroundColor: '#ffffff',
  border: '3px solid #0f172a',
  borderRadius: '8px',
  boxShadow: '2px 2px 0px #0f172a',
  padding: '10px 12px',
  fontSize: '0.9rem',
  color: '#0f172a',
  fontWeight: 600,
  outline: 'none',
  cursor: 'pointer',
};

const placeInputWrapperStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  position: 'relative',
};

const coordBadgeStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  fontSize: '0.7rem',
  color: '#10b981',
  backgroundColor: '#ecfdf5',
  border: '1px solid rgba(16, 185, 129, 0.2)',
  padding: '8px 10px',
  borderRadius: '8px',
};

const textareaStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  border: '3px solid #0f172a',
  borderRadius: '8px',
  boxShadow: '2px 2px 0px #0f172a',
  padding: '10px 12px',
  fontFamily: 'inherit',
  resize: 'none',
  color: '#0f172a',
  fontWeight: 500,
  outline: 'none',
};

const actionRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '10px',
  marginTop: '10px',
};

const deleteBtnStyleFull: React.CSSProperties = {
  padding: '10px 16px',
  backgroundColor: '#fee2e2',
  border: '3px solid #0f172a',
  color: '#b91c1c',
  borderRadius: '8px',
  boxShadow: '3px 3px 0px #0f172a',
  fontSize: '0.85rem',
  fontWeight: 700,
  cursor: 'pointer',
};

const saveBtnStyle: React.CSSProperties = {
  padding: '10px 20px',
  fontSize: '0.85rem',
};

const inputGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
};
