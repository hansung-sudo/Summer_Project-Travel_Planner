import React, { useState } from 'react';
import { usePlannerStore } from '../../store/plannerStore';
import { LogIn } from 'lucide-react';

interface LoginFormProps {
  onClose?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onClose }) => {
  const { joinPlanner, participants } = usePlannerStore();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const [isPrimaryHovered, setIsPrimaryHovered] = useState(false);

  const isFirstParticipant = participants.length === 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('이름을 입력해 주세요.');
      return;
    }

    try {
      // First joining user automatically gets 'owner' role
      joinPlanner(name.trim(), isFirstParticipant ? 'owner' : 'member');
      if (onClose) onClose();
    } catch (err) {
      setError('로그인에 실패했습니다.');
    }
  };

  return (
    <div style={modalOverlayStyle}>
      <div className="glass-panel" style={modalContentStyle}>
        <div style={headerStyle}>
          <h3 style={titleStyle}>플래너 참여하기</h3>
          <p style={subtitleStyle}>
            이름을 입력하여 여행 일정 편집 및 채팅에 참여해 보세요.
          </p>
        </div>

        {error && <div style={errorStyle}>{error}</div>}

        <form onSubmit={handleSubmit} style={formStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>닉네임 / 이름</label>
            <input
              type="text"
              className="glass-input"
              style={inputStyle}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 홍길동"
              maxLength={20}
              required
            />
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>비밀번호</label>
            <input
              type="password"
              className="glass-input"
              style={inputStyle}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="추후 재접속 인증용"
              maxLength={20}
            />
          </div>



          <div style={buttonGroupStyle}>
            <button 
              type="submit" 
              style={{
                ...primaryBtnStyle,
                transform: isPrimaryHovered ? 'translate(2px, 2px)' : 'none',
                boxShadow: isPrimaryHovered ? '2px 2px 0px #0f172a' : '4px 4px 0px #0f172a',
              }}
              onMouseEnter={() => setIsPrimaryHovered(true)}
              onMouseLeave={() => setIsPrimaryHovered(false)}
            >
              <LogIn size={16} />
              참여하기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Simple clean CSS-in-JS styles keeping code modular
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
  zIndex: 1000,
  backdropFilter: 'blur(8px)',
};

const modalContentStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '420px',
  padding: '30px',
  display: 'flex',
  flexDirection: 'column',
  gap: '20px',
  backgroundColor: '#ffffff',
  borderColor: 'rgba(15, 23, 42, 0.12)',
  boxShadow: 'var(--shadow-lg)',
};

const headerStyle: React.CSSProperties = {
  textAlign: 'center',
};

const titleStyle: React.CSSProperties = {
  fontSize: '1.25rem',
  fontWeight: 600,
  color: '#0f172a',
  marginBottom: '8px',
};

const subtitleStyle: React.CSSProperties = {
  fontSize: '0.875rem',
  color: '#475569',
  lineHeight: 1.5,
};

const formStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
};

const inputGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
};

const labelStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  fontWeight: 500,
  color: '#475569',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const inputStyle: React.CSSProperties = {
  backgroundColor: 'rgba(15, 23, 42, 0.02)',
  borderColor: 'rgba(15, 23, 42, 0.08)',
  padding: '10px 12px',
  color: '#0f172a',
};

const errorStyle: React.CSSProperties = {
  backgroundColor: '#fee2e2',
  border: '1px solid #ef4444',
  color: '#b91c1c',
  padding: '10px',
  borderRadius: '6px',
  fontSize: '0.85rem',
  textAlign: 'center',
};



const buttonGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  marginTop: '10px',
};

const primaryBtnStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px',
  fontSize: '0.9rem',
  fontWeight: 700,
  backgroundColor: '#cbd5e1', // Same grey as create button
  color: '#0f172a',
  border: '3px solid #0f172a',
  borderRadius: '8px',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  transition: 'all 0.1s ease',
};
