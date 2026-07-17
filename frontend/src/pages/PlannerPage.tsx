import React, { useState, useEffect } from 'react';
import { usePlannerStore } from '../store/plannerStore';
import { CircularTimetable } from '../components/Timetable/CircularTimetable';
import { TimeSlotModal } from '../components/Timetable/TimeSlotModal';
import { KakaoMap } from '../components/Map/KakaoMap';
import { ChatWindow } from '../components/Chat/ChatWindow';
import { LoginForm } from '../components/Auth/LoginForm';
import type { Schedule } from '../types';
import { getScheduleColor } from '../utils/colorUtils';
import {
  Share2, LogIn, LogOut, Plus, Trash2, Calendar, User,
  MapPin, Clock, Edit3, ShieldAlert, ArrowLeft
} from 'lucide-react';

interface PlannerPageProps {
  shareCode: string;
  onGoBack: () => void;
}

export const PlannerPage: React.FC<PlannerPageProps> = ({ shareCode, onGoBack }) => {
  const {
    planner,
    participants,
    currentUser,
    days,
    schedules,
    activeDayId,
    logout,
    addDay,
    deletePlanner,
    loadPlanner,
  } = usePlannerStore();

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [defaultStartTime, setDefaultStartTime] = useState<string | null>(null);
  const [defaultEndTime, setDefaultEndTime] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copied, setCopied] = useState(false);

  // Load planner when shareCode changes
  useEffect(() => {
    const success = loadPlanner(shareCode);
    if (!success) {
      alert('유효하지 않거나 삭제된 플래너 코드입니다.');
      onGoBack();
    }
  }, [shareCode]);

  // Prompt login if no user is logged in yet
  useEffect(() => {
    if (planner && !currentUser) {
      setShowLoginModal(true);
    }
  }, [planner, currentUser]);

  if (!planner) {
    return (
      <div style={loadingContainerStyle}>
        <div style={loadingSpinnerStyle} />
        <span>플래너 데이터를 불러오는 중...</span>
      </div>
    );
  }

  // Handle soft delete screen
  if (planner.isDeleted) {
    return (
      <div style={deletedContainerStyle}>
        <div className="glass-panel" style={deletedCardStyle}>
          <ShieldAlert size={48} color="#ef4444" style={{ marginBottom: '16px' }} />
          <h2 style={deletedTitleStyle}>삭제된 플래너입니다</h2>
          <p style={deletedDescStyle}>
            이 플래너는 소유자(Owner)에 의해 삭제되었거나 존재하지 않는 링크입니다.
          </p>
          <button onClick={onGoBack} className="btn btn-primary" style={{ marginTop: '8px' }}>
            <ArrowLeft size={16} />
            메인 화면으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const handleShare = () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?planner=${shareCode}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const activeDay = days.find(d => d.id === activeDayId);
  const sortedSchedules = schedules
    .filter(s => s.dayId === activeDayId)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const handleAddSlotTrigger = (startTime: string, endTime: string) => {
    setEditingSchedule(null);
    setDefaultStartTime(startTime);
    setDefaultEndTime(endTime);
    setShowSlotModal(true);
  };

  const handleEditSlotTrigger = (schedule: Schedule) => {
    setDefaultStartTime(null);
    setDefaultEndTime(null);
    setEditingSchedule(schedule);
    setShowSlotModal(true);
  };

  const handleDeletePlanner = () => {
    deletePlanner();
    setShowDeleteConfirm(false);
  };

  return (
    <div style={layoutStyle}>
      {/* Top Header */}
      <header className="glass-panel" style={headerStyle}>
        <div style={headerLeftStyle}>
          <h2 style={plannerTitleStyle}>{planner.title}</h2>
          <span style={codeBadgeStyle}>CODE: {shareCode}</span>
        </div>

        <div style={headerRightStyle}>
          <button onClick={handleShare} className="btn btn-secondary" style={actionBtnStyle}>
            <Share2 size={14} />
            {copied ? '복사 완료!' : '공유 링크 복사'}
          </button>

          {currentUser ? (
            <div style={userBadgeStyle}>
              <span style={{ ...userDotStyle, backgroundColor: currentUser.color }} />
              <span style={userNameStyle}>{currentUser.name} ({currentUser.role === 'owner' ? '방장' : '참여자'})</span>
              <button onClick={logout} style={logoutBtnStyle} title="로그아웃">
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <button onClick={() => setShowLoginModal(true)} className="btn btn-primary" style={actionBtnStyle}>
              <LogIn size={14} />
              참여하기 (로그인)
            </button>
          )}
        </div>
      </header>

      {/* Main 3-Column Content Layout */}
      <main style={mainContentStyle}>
        {/* Left Sidebar: Days & Participants */}
        <section style={sidebarLeftStyle}>
          {/* Day list */}
          <div className="glass-panel" style={panelStyle}>
            <div style={panelHeaderStyle}>
              <Calendar size={16} style={{ color: '#94a3b8' }} />
              <h3 style={panelTitleStyle}>일차 선택</h3>
            </div>
            <div style={dayListStyle}>
              {days.map((day) => (
                <button
                  key={day.id}
                  onClick={() => usePlannerStore.setState({ activeDayId: day.id })}
                  style={{
                    ...dayBtnStyle,
                    backgroundColor: activeDayId === day.id ? '#cbd5e1' : '#ffffff',
                  }}
                >
                  <span>{day.label}</span>
                </button>
              ))}
              {currentUser ? (
                <button onClick={addDay} className="btn btn-secondary" style={addDayBtnStyle}>
                  <Plus size={14} />
                  일차 추가
                </button>
              ) : (
                <div style={readOnlyWarningStyle}>로그인 후 일차를 추가할 수 있습니다.</div>
              )}
            </div>
          </div>

          {/* Participants list */}
          <div className="glass-panel" style={panelStyle}>
            <div style={panelHeaderStyle}>
              <User size={16} style={{ color: '#94a3b8' }} />
              <h3 style={panelTitleStyle}>참여자 목록 ({participants.length})</h3>
            </div>
            <div style={participantListStyle}>
              {participants.map((p) => (
                <div key={p.id} style={participantItemStyle}>
                  <span style={{ ...participantColorDotStyle, backgroundColor: p.color }} />
                  <span style={participantNameTextStyle}>{p.name}</span>
                  {p.role === 'owner' && <span style={ownerTagStyle}>방장</span>}
                </div>
              ))}
              {participants.length === 0 && (
                <div style={noParticipantsStyle}>참여자가 없습니다.</div>
              )}
            </div>
          </div>

          {/* Delete planner button (owner only) */}
          <div className="glass-panel" style={{ ...panelStyle, marginTop: 'auto' }}>
            <div style={panelHeaderStyle}>
              <ShieldAlert size={16} style={{ color: '#94a3b8' }} />
              <h3 style={panelTitleStyle}>방 관리</h3>
            </div>
            {currentUser?.role === 'owner' ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="btn btn-secondary"
                style={deletePlannerBtnStyle}
              >
                <Trash2 size={14} color="#ef4444" />
                <span>플래너 삭제하기</span>
              </button>
            ) : (
              <div style={ownerOnlyNoticeStyle}>
                플래너 삭제는 최초 생성자(방장)만 가능합니다.
              </div>
            )}
          </div>
        </section>

        {/* Center: Timetable and Timeline list */}
        <section style={centerPanelStyle}>
          <div className="glass-panel" style={{ ...panelStyle, flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={panelHeaderStyle}>
              <Clock size={16} style={{ color: '#94a3b8' }} />
              <h3 style={panelTitleStyle}>
                {activeDay?.label || '일차'} 시간표
              </h3>
            </div>

            <div style={timetableContainerStyle}>
              <CircularTimetable
                onAddSlot={handleAddSlotTrigger}
                onEditSlot={handleEditSlotTrigger}
              />
            </div>

            <hr style={dividerStyle} />

            {/* Chronological Timeline Details list */}
            <div style={timelineWrapperStyle}>
              <h4 style={timelineHeaderStyle}>상세 일정표</h4>
              <div style={timelineListStyle}>
                {sortedSchedules.map((schedule) => {
                  const creator = participants.find(p => p.id === schedule.createdBy);
                  return (
                    <div
                      key={schedule.id}
                      style={timelineItemStyle}
                      onClick={() => currentUser && handleEditSlotTrigger(schedule)}
                    >
                      <div style={{ ...timelineIndicatorStyle, backgroundColor: getScheduleColor(schedule.id) }} />
                      <div style={timelineContentStyle}>
                        <div style={timelineRowStyle}>
                          <strong style={timelinePlaceStyle}>
                            {schedule.placeName || '(장소 미지정)'}
                          </strong>
                          <span style={timelineTimeStyle}>
                            {schedule.startTime} - {schedule.endTime}
                          </span>
                        </div>
                        {schedule.content && <p style={timelineMemoStyle}>{schedule.content}</p>}
                        <div style={timelineCreatorRowStyle}>
                          <span style={{ ...timelineDotStyle, backgroundColor: getScheduleColor(schedule.id) }} />
                          <span>등록: {creator?.name || '알수없음'}</span>
                        </div>
                      </div>
                      {currentUser && (
                        <button style={editIconStyle}>
                          <Edit3 size={12} />
                        </button>
                      )}
                    </div>
                  );
                })}
                {sortedSchedules.length === 0 && (
                  <div style={noSchedulesStyle}>
                    등록된 일정이 없습니다. 시간표나 더하기 버튼을 통해 추가하세요.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Right Sidebar: Kakao Map link */}
        <section style={sidebarRightStyle}>
          <div className="glass-panel" style={{ ...panelStyle, flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={panelHeaderStyle}>
              <MapPin size={16} style={{ color: '#94a3b8' }} />
              <h3 style={panelTitleStyle}>지도 연동</h3>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <KakaoMap />
            </div>
          </div>
        </section>
      </main>

      {/* Floating Chat Widget */}
      <ChatWindow />

      {/* Login Modal */}
      {showLoginModal && (
        <LoginForm onClose={() => setShowLoginModal(false)} />
      )}

      {/* Add / Edit Time Slot Modal */}
      {showSlotModal && (
        <TimeSlotModal
          schedule={editingSchedule}
          defaultStartTime={defaultStartTime}
          defaultEndTime={defaultEndTime}
          onClose={() => setShowSlotModal(false)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div style={modalOverlayStyle}>
          <div className="glass-panel" style={modalContentStyle}>
            <h3 style={modalTitleStyle}>플래너 삭제 확인</h3>
            <p style={modalDescStyle}>
              정말로 이 플래너를 삭제하시겠습니까? 이 작업은 되돌릴 수 없으며, 모든 일정, 채팅 기록, 참여자 정보가 영구히 소멸됩니다.
            </p>
            <div style={modalButtonGroupStyle}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn btn-secondary"
                style={modalBtnStyle}
              >
                취소
              </button>
              <button
                onClick={handleDeletePlanner}
                className="btn btn-primary"
                style={{ ...modalBtnStyle, background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)' }}
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Styling structures
const loadingContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '80vh',
  gap: '12px',
  color: '#475569',
  fontSize: '0.9rem',
};

const loadingSpinnerStyle: React.CSSProperties = {
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  border: '3px solid rgba(15, 23, 42, 0.1)',
  borderTopColor: '#6366f1',
  animation: 'pulse-glow 1.5s infinite',
};

const deletedContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '85vh',
  padding: '20px',
};

const deletedCardStyle: React.CSSProperties = {
  maxWidth: '420px',
  padding: '36px',
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  backgroundColor: '#ffffff',
  border: '1px solid rgba(15, 23, 42, 0.08)',
  boxShadow: 'var(--shadow-lg)',
};

const deletedTitleStyle: React.CSSProperties = {
  fontSize: '1.25rem',
  fontWeight: 700,
  color: '#0f172a',
  marginBottom: '8px',
};

const deletedDescStyle: React.CSSProperties = {
  fontSize: '0.85rem',
  color: '#475569',
  lineHeight: 1.5,
  marginBottom: '20px',
};

const layoutStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  minHeight: '100vh',
  gap: '16px',
  padding: '16px',
  maxWidth: '1200px',
  margin: '0 auto',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 24px',
  backgroundColor: 'rgba(255, 255, 255, 0.95)',
  border: '3px solid #0f172a',
  borderRadius: '8px',
  boxShadow: '4px 4px 0px #0f172a',
  flexWrap: 'wrap',
  gap: '12px',
};

const headerLeftStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
};



const plannerTitleStyle: React.CSSProperties = {
  fontSize: '1.1rem',
  fontWeight: 700,
  color: '#0f172a',
};

const codeBadgeStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: '#64748b',
  backgroundColor: 'rgba(15, 23, 42, 0.04)',
  padding: '2px 6px',
  borderRadius: '4px',
  fontFamily: 'monospace',
};

const headerRightStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
};

const actionBtnStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  padding: '8px 14px',
  borderRadius: '8px',
};

const userBadgeStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  backgroundColor: '#ffffff',
  border: '3px solid #0f172a',
  padding: '8px 14px',
  borderRadius: '8px',
  fontSize: '0.8rem',
  fontWeight: 700,
  color: '#0f172a',
  boxShadow: '4px 4px 0px #0f172a',
};

const userDotStyle: React.CSSProperties = {
  width: '8px',
  height: '8px',
  borderRadius: '50%',
};

const userNameStyle: React.CSSProperties = {
  color: '#0f172a',
  fontWeight: 700,
};

const logoutBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#0f172a',
  cursor: 'pointer',
  padding: '2px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginLeft: '4px',
};

const mainContentStyle: React.CSSProperties = {
  display: 'flex',
  gap: '16px',
  flex: 1,
  width: '100%',
};

// Sidebar column styling
const sidebarLeftStyle: React.CSSProperties = {
  width: '240px',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  flexShrink: 0,
};

const sidebarRightStyle: React.CSSProperties = {
  width: '360px',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  flexShrink: 0,
};

const centerPanelStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  minWidth: '400px',
};

const panelStyle: React.CSSProperties = {
  padding: '18px',
  backgroundColor: '#ffffff',
  border: '3px solid #0f172a',
  borderRadius: '12px',
  boxShadow: '6px 6px 0px #0f172a',
  display: 'flex',
  flexDirection: 'column',
  gap: '14px',
};

const panelHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  borderBottom: '3px solid #0f172a',
  paddingBottom: '8px',
};

const panelTitleStyle: React.CSSProperties = {
  fontSize: '0.85rem',
  fontWeight: 700,
  color: '#0f172a',
};

const dayListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const dayBtnStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: '8px',
  border: '3px solid #0f172a',
  color: '#0f172a',
  textAlign: 'left',
  fontSize: '0.85rem',
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'all 0.1s ease',
  boxShadow: '2px 2px 0px #0f172a',
};

const addDayBtnStyle: React.CSSProperties = {
  padding: '8px',
  fontSize: '0.8rem',
  width: '100%',
};

const readOnlyWarningStyle: React.CSSProperties = {
  fontSize: '0.7rem',
  color: '#64748b',
  textAlign: 'center',
  padding: '8px 4px',
};

const participantListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  maxHeight: '180px',
  overflowY: 'auto',
};

const participantItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '6px 8px',
  borderRadius: '6px',
  backgroundColor: 'rgba(15, 23, 42, 0.02)',
  border: '1px solid rgba(15, 23, 42, 0.05)',
};

const participantColorDotStyle: React.CSSProperties = {
  width: '8px',
  height: '8px',
  borderRadius: '50%',
};

const participantNameTextStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  color: '#334155',
  fontWeight: 500,
};

const ownerTagStyle: React.CSSProperties = {
  fontSize: '0.65rem',
  backgroundColor: 'rgba(245, 158, 11, 0.08)',
  border: '1px solid rgba(245, 158, 11, 0.25)',
  color: '#f59e0b',
  padding: '1px 5px',
  borderRadius: '4px',
  marginLeft: 'auto',
};

const noParticipantsStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: '#64748b',
  textAlign: 'center',
  padding: '8px 0',
};

const deletePlannerBtnStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  fontSize: '0.75rem',
  fontWeight: 700,
  color: '#b91c1c',
  backgroundColor: '#fee2e2',
  border: '3px solid #0f172a',
  borderRadius: '8px',
  boxShadow: '2px 2px 0px #0f172a',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  cursor: 'pointer',
  transition: 'all 0.1s ease',
};

const ownerOnlyNoticeStyle: React.CSSProperties = {
  fontSize: '0.7rem',
  color: '#64748b',
  lineHeight: 1.4,
  textAlign: 'center',
};

const timetableContainerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  padding: '12px 0',
};

const dividerStyle: React.CSSProperties = {
  border: 'none',
  borderTop: '3px solid #0f172a',
  margin: '12px 0',
};

// Timeline elements
const timelineWrapperStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  flex: 1,
};

const timelineHeaderStyle: React.CSSProperties = {
  fontSize: '0.825rem',
  fontWeight: 700,
  color: '#0f172a',
};

const timelineListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  maxHeight: '280px',
  overflowY: 'auto',
  paddingRight: '4px',
};

const timelineItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'stretch',
  backgroundColor: 'rgba(15, 23, 42, 0.02)',
  border: '1px solid rgba(15, 23, 42, 0.06)',
  borderRadius: '8px',
  overflow: 'hidden',
  cursor: 'pointer',
  transition: 'border-color 0.15s ease, background-color 0.15s ease',
};

const timelineIndicatorStyle: React.CSSProperties = {
  width: '4px',
  flexShrink: 0,
};

const timelineContentStyle: React.CSSProperties = {
  padding: '10px 12px',
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
};

const timelineRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  gap: '10px',
};

const timelinePlaceStyle: React.CSSProperties = {
  fontSize: '0.85rem',
  color: '#0f172a',
};

const timelineTimeStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: '#64748b',
  fontFamily: 'monospace',
};

const timelineMemoStyle: React.CSSProperties = {
  fontSize: '0.775rem',
  color: '#475569',
  lineHeight: 1.4,
  margin: '2px 0 4px 0',
  borderLeft: '2px solid rgba(15, 23, 42, 0.12)',
  paddingLeft: '6px',
};

const timelineCreatorRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  fontSize: '0.7rem',
  color: '#64748b',
};

const timelineDotStyle: React.CSSProperties = {
  width: '6px',
  height: '6px',
  borderRadius: '50%',
};

const editIconStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#64748b',
  padding: '12px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const noSchedulesStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: '#64748b',
  textAlign: 'center',
  padding: '30px 20px',
  backgroundColor: 'rgba(15, 23, 42, 0.01)',
  border: '1px dashed rgba(15, 23, 42, 0.1)',
  borderRadius: '8px',
};

// Modal specific styling (Delete Confirm)
const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(15, 23, 42, 0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1200,
  backdropFilter: 'blur(6px)',
};

const modalContentStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '380px',
  padding: '24px',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  backgroundColor: '#ffffff',
  borderColor: 'rgba(15, 23, 42, 0.12)',
  boxShadow: 'var(--shadow-lg)',
};

const modalTitleStyle: React.CSSProperties = {
  fontSize: '1.1rem',
  fontWeight: 700,
  color: '#f8fafc',
};

const modalDescStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  color: '#94a3b8',
  lineHeight: 1.5,
};

const modalButtonGroupStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '8px',
  marginTop: '8px',
};

const modalBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  fontSize: '0.8rem',
};
