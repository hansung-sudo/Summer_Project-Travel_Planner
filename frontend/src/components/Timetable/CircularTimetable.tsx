import React, { useState, useRef, useEffect } from 'react';
import { usePlannerStore } from '../../store/plannerStore';
import type { Schedule, Participant } from '../../types';
import { Eye, Edit3, Trash2 } from 'lucide-react';
import { getScheduleColor } from '../../utils/colorUtils';

interface CircularTimetableProps {
  onAddSlot: (startTime: string, endTime: string) => void;
  onEditSlot: (schedule: Schedule) => void;
  size?: number; // 시계 지름(px). 좁은 슬롯에서는 작게 전달.
}

export const CircularTimetable: React.FC<CircularTimetableProps> = ({ onAddSlot, onEditSlot, size = 380 }) => {
  const {
    schedules,
    activeDayId,
    showGridLines,
    participants,
    currentUser,
    updateSchedule,
    addSchedule,
    deleteSchedule
  } = usePlannerStore();

  // SVG parameters (지름 size에 비례해 스케일)
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = size * 0.382;
  const rInner = size * 0.25;

  // Filter schedules for the current active day
  const activeSchedules = schedules.filter(s => s.dayId === activeDayId);

  // Helper to find the nearest occupied intervals around a targetHour
  const getFreeInterval = (targetHour: number) => {
    let minAllowed = 0;
    let maxAllowed = 24;

    activeSchedules.forEach(s => {
      const start = timeToDecimal(s.startTime);
      let end = timeToDecimal(s.endTime);
      if (end < start) end = 24; // Treat 00:00 end as 24:00

      if (end <= targetHour) {
        minAllowed = Math.max(minAllowed, end);
      }
      if (start >= targetHour) {
        maxAllowed = Math.min(maxAllowed, start);
      }
    });

    return { minAllowed, maxAllowed };
  };

  const getResizingInterval = (scheduleId: string) => {
    let minAllowed = 0;
    let maxAllowed = 24;

    const targetSched = activeSchedules.find(s => s.id === scheduleId);
    if (!targetSched) return { minAllowed, maxAllowed };

    const targetStart = timeToDecimal(targetSched.startTime);
    let targetEnd = timeToDecimal(targetSched.endTime);
    if (targetEnd < targetStart) targetEnd = 24; // Treat 00:00 end as 24:00

    activeSchedules.forEach(s => {
      if (s.id === scheduleId) return;

      const start = timeToDecimal(s.startTime);
      let end = timeToDecimal(s.endTime);
      if (end < start) end = 24; // Treat 00:00 end as 24:00

      if (end <= targetStart) {
        minAllowed = Math.max(minAllowed, end);
      }
      if (start >= targetEnd) {
        maxAllowed = Math.min(maxAllowed, start);
      }
    });

    return { minAllowed, maxAllowed };
  };

  const [hoveredSchedule, setHoveredSchedule] = useState<Schedule | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  const [activeDrag, setActiveDrag] = useState<{
    scheduleId: string;
    type: 'start' | 'end';
  } | null>(null);

  const [dragToCreate, setDragToCreate] = useState<{
    startHour: number;
    currentHour: number;
  } | null>(null);

  const [selectedScheduleMenu, setSelectedScheduleMenu] = useState<{
    schedule: Schedule;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    if (!activeDrag && !dragToCreate) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - cx;
      const y = e.clientY - rect.top - cy;

      let angle = (Math.atan2(y, x) * 180) / Math.PI;
      if (angle < 0) angle += 360;

      const alignedAngle = (angle + 90) % 360;
      let decimalHour = alignedAngle / 15;

      // Round to nearest 1 hour
      decimalHour = Math.round(decimalHour);
      if (decimalHour >= 24) decimalHour -= 24;

      if (activeDrag) {
        const schedule = schedules.find(s => s.id === activeDrag.scheduleId);
        if (!schedule) return;

        const { minAllowed, maxAllowed } = getResizingInterval(activeDrag.scheduleId);
        let rawHour = decimalHour;

        if (activeDrag.type === 'start') {
          const endDec = timeToDecimal(schedule.endTime) || 24;
          const clampedHour = Math.max(minAllowed, Math.min(endDec - 1, rawHour));
          const timeStr = `${clampedHour.toString().padStart(2, '0')}:00`;
          updateSchedule({
            ...schedule,
            startTime: timeStr,
          });
        } else {
          if (rawHour === 0 && timeToDecimal(schedule.startTime) >= 12) {
            rawHour = 24;
          }
          const startDec = timeToDecimal(schedule.startTime);
          const clampedHour = Math.max(startDec + 1, Math.min(maxAllowed, rawHour));
          const timeStr = clampedHour === 24 ? '00:00' : `${clampedHour.toString().padStart(2, '0')}:00`;
          updateSchedule({
            ...schedule,
            endTime: timeStr,
          });
        }
      } else if (dragToCreate) {
        const { minAllowed, maxAllowed } = getFreeInterval(dragToCreate.startHour);
        let rawHour = decimalHour;
        if (decimalHour === 0 && dragToCreate.startHour >= 12) {
          rawHour = 24;
        }
        const clampedHour = Math.max(minAllowed, Math.min(maxAllowed, rawHour));

        setDragToCreate(prev => {
          if (!prev) return null;
          return {
            ...prev,
            currentHour: clampedHour
          };
        });
      }
    };

    const handleMouseUp = () => {
      if (dragToCreate) {
        let start = Math.min(dragToCreate.startHour, dragToCreate.currentHour);
        let end = Math.max(dragToCreate.startHour, dragToCreate.currentHour);

        if (start === end) {
          const { minAllowed, maxAllowed } = getFreeInterval(start);
          if (maxAllowed - start >= 1) {
            end = start + 1;
          } else if (start - minAllowed >= 1) {
            start = start - 1;
          } else {
            setDragToCreate(null);
            setActiveDrag(null);
            return;
          }
        }

        // Overlap safety check
        const hasOverlap = activeSchedules.some(s => {
          const sStart = timeToDecimal(s.startTime);
          let sEnd = timeToDecimal(s.endTime);
          if (sEnd < sStart) sEnd = 24; // Treat 00:00 as 24:00

          return start < sEnd && sStart < end;
        });

        if (!hasOverlap) {
          const startHour = Math.floor(start);
          const startTimeStr = `${startHour.toString().padStart(2, '0')}:00`;

          const endHour = Math.floor(end);
          const endTimeStr = endHour === 24 || endHour === 0 ? "00:00" : `${endHour.toString().padStart(2, '0')}:00`;

          addSchedule({
            startTime: startTimeStr,
            endTime: endTimeStr,
            placeName: '',
            content: '',
          });
        }

        setDragToCreate(null);
      }
      setActiveDrag(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [activeDrag, dragToCreate, schedules, cx, cy, addSchedule, activeSchedules]);

  // Helper to convert decimal hour (0-24) to angles (degrees, starting from -90 deg at top)
  const hourToAngle = (hour: number) => {
    return (hour * 15 - 90);
  };

  // Convert polar coordinates to Cartesian coordinates
  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians)
    };
  };

  // Generate SVG path for a donut slice representing a schedule slot
  const getDonutPath = (startHour: number, endHour: number) => {
    // If endHour is less than startHour (e.g. overnight), wrap it or cap at 24
    const end = endHour < startHour ? 24 : endHour;
    const startAngle = hourToAngle(startHour);
    const endAngle = hourToAngle(end);

    const largeArcFlag = end - startHour > 12 ? 1 : 0;

    const outerStart = polarToCartesian(cx, cy, rOuter, startAngle);
    const outerEnd = polarToCartesian(cx, cy, rOuter, endAngle);
    const innerEnd = polarToCartesian(cx, cy, rInner, endAngle);
    const innerStart = polarToCartesian(cx, cy, rInner, startAngle);

    return `
      M ${outerStart.x} ${outerStart.y}
      A ${rOuter} ${rOuter} 0 ${largeArcFlag} 1 ${outerEnd.x} ${outerEnd.y}
      L ${innerEnd.x} ${innerEnd.y}
      A ${rInner} ${rInner} 0 ${largeArcFlag} 0 ${innerStart.x} ${innerStart.y}
      Z
    `;
  };



  // Helper to parse time string "HH:MM" to decimal
  const timeToDecimal = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h + m / 60;
  };

  // Handle mouse down on SVG clock to start dragging to create or edit
  const handleSvgMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!currentUser) return; // Read-only mode
    if (!svgRef.current) return;
    e.preventDefault();

    // Close menu if open
    setSelectedScheduleMenu(null);

    // Get click coordinates relative to SVG
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - cx;
    const y = e.clientY - rect.top - cy;

    // Calculate angle in degrees
    let angle = (Math.atan2(y, x) * 180) / Math.PI;
    if (angle < 0) angle += 360;

    // Align angle so 0 deg is at the top (subtracting -90 deg rotation)
    const alignedAngle = (angle + 90) % 360;

    // Snap to nearest 1 hour on click (first/second half hour logic)
    let clickedHour = alignedAngle / 15;
    clickedHour = Math.round(clickedHour);
    if (clickedHour >= 24) clickedHour -= 24;

    // Check if clicked on an existing schedule arc
    const dist = Math.sqrt(x * x + y * y);

    // If clicked the center area ("클릭하여 일정 추가" label)
    if (dist < rInner - 10) {
      onAddSlot("09:00", "10:00");
      return;
    }

    if (dist >= rInner - 15 && dist <= rOuter + 20) {
      // Check if click is near outer edge handle of any existing schedule slot
      for (const s of activeSchedules) {
        const startDec = timeToDecimal(s.startTime);
        let endDec = timeToDecimal(s.endTime);
        if (endDec === 0 || endDec < startDec) endDec = 24;

        const startAngle = hourToAngle(startDec);
        const endAngle = hourToAngle(endDec);

        const startPos = polarToCartesian(cx, cy, rOuter, startAngle);
        const endPos = polarToCartesian(cx, cy, rOuter, endAngle);

        const distToStart = Math.hypot(x - (startPos.x - cx), y - (startPos.y - cy));
        const distToEnd = Math.hypot(x - (endPos.x - cx), y - (endPos.y - cy));

        if (distToStart <= 18) {
          setActiveDrag({ scheduleId: s.id, type: 'start' });
          return;
        }
        if (distToEnd <= 18) {
          setActiveDrag({ scheduleId: s.id, type: 'end' });
          return;
        }
      }

      // Find if we clicked inside an existing schedule body
      const clickedSched = activeSchedules.find(s => {
        const start = timeToDecimal(s.startTime);
        let end = timeToDecimal(s.endTime);
        if (end === 0 || end < start) end = 24;
        const currentDecimal = (alignedAngle / 15);
        return currentDecimal >= start && currentDecimal < end;
      });

      if (clickedSched) {
        setSelectedScheduleMenu({
          schedule: clickedSched,
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
        return;
      }

      // Start drag-to-create on empty area
      setDragToCreate({
        startHour: clickedHour,
        currentHour: clickedHour
      });
    }
  };

  const handleMouseEnterSlot = (e: React.MouseEvent, schedule: Schedule) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    setTooltipPos({
      x: e.clientX - rect.left + 15,
      y: e.clientY - rect.top + 15
    });
    setHoveredSchedule(schedule);
  };

  const handleMouseMoveSlot = (e: React.MouseEvent) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    setTooltipPos({
      x: e.clientX - rect.left + 15,
      y: e.clientY - rect.top + 15
    });
  };

  const getCreator = (id: string): Participant | undefined => {
    return participants.find(p => p.id === id);
  };

  return (
    <div style={containerStyle}>


      <div style={controlRowStyle}>
        {!currentUser && (
          <div style={readOnlyBadgeStyle}>
            <Eye size={12} />
            <span>조회 모드 (편집 불가)</span>
          </div>
        )}
      </div>

      <div style={wheelWrapperStyle}>
        {/* The Circular Timetable SVG */}
        <svg
          ref={svgRef}
          width={size}
          height={size}
          style={svgStyle}
          onMouseDown={handleSvgMouseDown}
        >
          {/* Inner space click zone / info & Double faint circular borders */}
          <circle cx={cx} cy={cy} r={rInner} fill="rgba(15, 23, 42, 0.03)" stroke="rgba(15, 23, 42, 0.08)" strokeWidth={1} />
          <circle cx={cx} cy={cy} r={rOuter} fill="none" stroke="rgba(15, 23, 42, 0.08)" strokeWidth={1} />

          <text
            x={cx}
            y={cy - 10}
            textAnchor="middle"
            style={centerTitleStyle}
          >
            24H WHEEL
          </text>

          <text
            x={cx}
            y={cy + 15}
            textAnchor="middle"
            style={centerSubtitleStyle}
          >
            {currentUser ? '클릭하여 일정 추가' : '로그인 후 추가 가능'}
          </text>

          {/* Hour labels (00, 03, 06, 09, 12, 15, 18, 21) */}
          {[0, 3, 6, 9, 12, 15, 18, 21].map((hour) => {
            const angle = hourToAngle(hour);
            const pos = polarToCartesian(cx, cy, rOuter + size * 0.058, angle);
            return (
              <text
                key={hour}
                x={pos.x}
                y={pos.y + 4}
                textAnchor="middle"
                style={hourLabelStyle}
              >
                {hour.toString().padStart(2, '0')}
              </text>
            );
          })}

          {/* All 24 hour grid lines */}
          {showGridLines && Array.from({ length: 24 }).map((_, hour) => {
            const angle = hourToAngle(hour);
            const pStart = polarToCartesian(cx, cy, rInner, angle);
            const pEnd = polarToCartesian(cx, cy, rOuter, angle);
            return (
              <line
                key={hour}
                x1={pStart.x}
                y1={pStart.y}
                x2={pEnd.x}
                y2={pEnd.y}
                stroke="rgba(15, 23, 42, 0.08)"
                strokeWidth={1}
              />
            );
          })}

          {/* Render temporary drag-to-create preview arc */}
          {dragToCreate && (
            <path
              d={getDonutPath(
                Math.min(dragToCreate.startHour, dragToCreate.currentHour),
                Math.max(dragToCreate.startHour, dragToCreate.currentHour) || (dragToCreate.startHour + 1)
              )}
              fill="#cbd5e1"
              fillOpacity={0.6}
              stroke="#0f172a"
              strokeWidth={3}
              strokeDasharray="4 4"
              style={{ pointerEvents: 'none' }}
            />
          )}

          {/* Render schedule arcs */}
          {activeSchedules.map((schedule) => {
            const slotColor = getScheduleColor(schedule.id);
            const isHovered = hoveredSchedule?.id === schedule.id;
            const isDraggingThis = activeDrag?.scheduleId === schedule.id;

            const startAngle = hourToAngle(timeToDecimal(schedule.startTime));
            const endAngle = hourToAngle(timeToDecimal(schedule.endTime));

            const startHandlePos = polarToCartesian(cx, cy, rOuter, startAngle);
            const endHandlePos = polarToCartesian(cx, cy, rOuter, endAngle);

            return (
              <g key={schedule.id}>
                <path
                  d={getDonutPath(timeToDecimal(schedule.startTime), timeToDecimal(schedule.endTime))}
                  fill={slotColor}
                  fillOpacity={isHovered || isDraggingThis ? 1.0 : 0.8}
                  stroke="#0f172a"
                  strokeWidth={isHovered || isDraggingThis ? 3 : 2}
                  style={arcStyle}
                  onMouseEnter={(e) => handleMouseEnterSlot(e, schedule)}
                  onMouseMove={handleMouseMoveSlot}
                  onMouseLeave={() => setHoveredSchedule(null)}
                />

                {/* Drag handles at outer corners */}
                {currentUser && (
                  <g style={{ opacity: isHovered || isDraggingThis ? 1.0 : 0.85 }}>
                    {/* Start handle */}
                    <g
                      style={{ cursor: 'ew-resize' }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setActiveDrag({ scheduleId: schedule.id, type: 'start' });
                      }}
                    >
                      <circle cx={startHandlePos.x} cy={startHandlePos.y} r={14} fill="transparent" />
                      <circle
                        cx={startHandlePos.x}
                        cy={startHandlePos.y}
                        r={isHovered || isDraggingThis ? 7.5 : 5.5}
                        fill="#38bdf8"
                        stroke="#0f172a"
                        strokeWidth={2}
                      />
                      <circle
                        cx={startHandlePos.x}
                        cy={startHandlePos.y}
                        r={2}
                        fill="#ffffff"
                      />
                    </g>
                    {/* End handle */}
                    <g
                      style={{ cursor: 'ew-resize' }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setActiveDrag({ scheduleId: schedule.id, type: 'end' });
                      }}
                    >
                      <circle cx={endHandlePos.x} cy={endHandlePos.y} r={14} fill="transparent" />
                      <circle
                        cx={endHandlePos.x}
                        cy={endHandlePos.y}
                        r={isHovered || isDraggingThis ? 7.5 : 5.5}
                        fill="#f43f5e"
                        stroke="#0f172a"
                        strokeWidth={2}
                      />
                      <circle
                        cx={endHandlePos.x}
                        cy={endHandlePos.y}
                        r={2}
                        fill="#ffffff"
                      />
                    </g>
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip */}
        {hoveredSchedule && !selectedScheduleMenu && (
          <div
            style={{
              ...tooltipStyle,
              left: `${tooltipPos.x}px`,
              top: `${tooltipPos.y}px`
            }}
          >
            <div style={tooltipHeaderStyle}>
              <span style={{
                ...tooltipDotStyle,
                backgroundColor: getScheduleColor(hoveredSchedule.id)
              }} />
              <strong style={tooltipTimeStyle}>
                {hoveredSchedule.startTime} - {hoveredSchedule.endTime}
              </strong>
            </div>
            <div style={tooltipTitleStyle}>{hoveredSchedule.placeName || '(장소 미정)'}</div>
            {hoveredSchedule.content && (
              <div style={tooltipMemoStyle}>{hoveredSchedule.content}</div>
            )}
            <div style={tooltipCreatorStyle}>
              작성자: {getCreator(hoveredSchedule.createdBy)?.name || '알수없음'}
            </div>
          </div>
        )}

        {/* Schedule Action Menu Popover (수정하기 / 삭제하기) */}
        {selectedScheduleMenu && (
          <div
            style={{
              position: 'absolute',
              left: `${Math.min(size - 190, Math.max(10, selectedScheduleMenu.x - 95))}px`,
              top: `${Math.min(size - 120, Math.max(10, selectedScheduleMenu.y - 45))}px`,
              backgroundColor: '#ffffff',
              border: '3px solid #0f172a',
              borderRadius: '12px',
              padding: '12px',
              zIndex: 1000,
              boxShadow: '6px 6px 0px #0f172a',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              minWidth: '190px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: getScheduleColor(selectedScheduleMenu.schedule.id) }} />
                <strong style={{ fontSize: '0.825rem', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '130px' }}>
                  {selectedScheduleMenu.schedule.placeName || '(장소 미정)'}
                </strong>
              </div>
              <button
                onClick={() => setSelectedScheduleMenu(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '0.8rem', padding: '0 2px', fontWeight: 700 }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: '0.725rem', color: '#64748b', fontFamily: 'monospace' }}>
              시간: {selectedScheduleMenu.schedule.startTime} - {selectedScheduleMenu.schedule.endTime}
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button
                onClick={() => {
                  const sched = selectedScheduleMenu.schedule;
                  setSelectedScheduleMenu(null);
                  onEditSlot(sched);
                }}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  padding: '6px 8px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  backgroundColor: '#ffffff',
                  border: '2px solid #0f172a',
                  borderRadius: '6px',
                  boxShadow: '2px 2px 0px #0f172a',
                  cursor: 'pointer',
                }}
              >
                <Edit3 size={12} />
                수정하기
              </button>

              <button
                onClick={() => {
                  deleteSchedule(selectedScheduleMenu.schedule.id);
                  setSelectedScheduleMenu(null);
                }}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  padding: '6px 8px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#ffffff',
                  backgroundColor: '#ef4444',
                  border: '2px solid #0f172a',
                  borderRadius: '6px',
                  boxShadow: '2px 2px 0px #0f172a',
                  cursor: 'pointer',
                }}
              >
                <Trash2 size={12} />
                삭제하기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Styling definitions - keeping it clean and simple
const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  width: '100%',
  gap: '16px',
};

const controlRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  width: '100%',
  maxWidth: '380px',
  padding: '0 10px',
};


const readOnlyBadgeStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  fontSize: '0.75rem',
  color: '#475569',
  backgroundColor: 'rgba(15, 23, 42, 0.03)',
  border: '1px solid rgba(15, 23, 42, 0.08)',
  padding: '4px 8px',
  borderRadius: '4px',
};

const wheelWrapperStyle: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  width: '100%',
};

const svgStyle: React.CSSProperties = {
  cursor: 'crosshair',
  overflow: 'visible',
  userSelect: 'none',
};

const centerTitleStyle: React.CSSProperties = {
  fill: '#0f172a',
  fontSize: '0.75rem',
  fontWeight: 700,
  letterSpacing: '0.1em',
  opacity: 0.8,
  userSelect: 'none',
};

const centerSubtitleStyle: React.CSSProperties = {
  fill: '#64748b',
  fontSize: '0.7rem',
  fontWeight: 400,
  userSelect: 'none',
};

const hourLabelStyle: React.CSSProperties = {
  fill: '#475569',
  fontSize: '0.75rem',
  fontWeight: 600,
  fontFamily: 'monospace',
  userSelect: 'none',
};

const arcStyle: React.CSSProperties = {
  cursor: 'pointer',
  transition: 'fill-opacity 0.15s, stroke-width 0.15s',
};



// Tooltip Styling
const tooltipStyle: React.CSSProperties = {
  position: 'absolute',
  backgroundColor: '#ffffff',
  border: '1px solid rgba(15, 23, 42, 0.12)',
  borderRadius: '6px',
  padding: '10px 12px',
  zIndex: 999,
  pointerEvents: 'none',
  minWidth: '180px',
  boxShadow: 'var(--shadow-lg)',
};

const tooltipHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  marginBottom: '4px',
};

const tooltipDotStyle: React.CSSProperties = {
  width: '8px',
  height: '8px',
  borderRadius: '50%',
};

const tooltipTimeStyle: React.CSSProperties = {
  color: '#475569',
  fontSize: '0.75rem',
  fontFamily: 'monospace',
};

const tooltipTitleStyle: React.CSSProperties = {
  color: '#0f172a',
  fontSize: '0.85rem',
  fontWeight: 600,
  marginBottom: '4px',
};

const tooltipMemoStyle: React.CSSProperties = {
  color: '#475569',
  fontSize: '0.75rem',
  marginBottom: '6px',
  borderLeft: '2px solid rgba(15, 23, 42, 0.12)',
  paddingLeft: '6px',
};

const tooltipCreatorStyle: React.CSSProperties = {
  color: '#64748b',
  fontSize: '0.7rem',
};
