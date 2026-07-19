import React, { useState } from 'react';
import { usePlannerStore } from '../store/plannerStore';
import { ArrowRight, HelpCircle } from 'lucide-react';

interface MainPageProps {
  onNavigateToPlanner: (shareCode: string) => void;
}

export const MainPage: React.FC<MainPageProps> = ({ onNavigateToPlanner }) => {
  const { createPlanner } = usePlannerStore();
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [isBtnHovered, setIsBtnHovered] = useState(false);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('여행 일정을 설명하는 이름을 입력해 주세요.');
      return;
    }

    try {
      const shareCode = createPlanner(title.trim());
      onNavigateToPlanner(shareCode);
    } catch (err) {
      setError('플래너 생성 중 오류가 발생했습니다.');
    }
  };

  return (
    <div style={containerStyle}>
      <div style={mainWrapperStyle}>
        
        {/* Title Box (Matches sketch upper box) */}
        <div style={titleCardStyle}>
          <div style={titleHeaderStyle}>
            <h1 style={titleStyle}>여행 플래너</h1>
          </div>
        </div>

        {/* Input & Create Button Row (Matches sketch lower boxes) */}
        <form onSubmit={handleCreate} style={formStyle}>
          {error && <div style={errorStyle}>{error}</div>}

          <div style={controlsRowStyle}>
            <input
              id="trip-title"
              type="text"
              style={inputStyle}
              placeholder="planner name"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={50}
              required
            />
            <button
              type="submit"
              style={{
                ...btnStyle,
                transform: isBtnHovered ? 'translate(2px, 2px)' : 'none',
                boxShadow: isBtnHovered ? '2px 2px 0px #0f172a' : '4px 4px 0px #0f172a',
              }}
              onMouseEnter={() => setIsBtnHovered(true)}
              onMouseLeave={() => setIsBtnHovered(false)}
            >
              create
              <ArrowRight size={16} />
            </button>
          </div>
        </form>



        {/* Help Tip footer */}
        <div style={footerStyle}>
          <HelpCircle size={14} style={{ marginRight: '6px', flexShrink: 0 }} />
          <span>링크를 공유하면 받은 사람도 별도 가입 없이 해당 플래너에 즉시 참여할 수 있습니다.</span>
        </div>
      </div>
    </div>
  );
};

// Styling using a Premium Neo-Brutalist / Outline concept
const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  padding: '24px',
  backgroundColor: '#ffffff', // Set container background to pure white
};

const mainWrapperStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '480px',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
};

// Upper shaded card for Title (concept: "여행 플래너")
const titleCardStyle: React.CSSProperties = {
  backgroundColor: '#e2e8f0', // Clean warm light-grey background (resembling sketch)
  border: '3px solid #0f172a',
  borderRadius: '8px',
  padding: '24px',
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '6px',
  boxShadow: '6px 6px 0px #6366f1', // Vibrant offset shadow for a premium feel
};

const titleHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const titleStyle: React.CSSProperties = {
  fontSize: '2rem',
  fontWeight: 800,
  color: '#0f172a',
  margin: 0,
  letterSpacing: '-0.02em',
};



// Lower form wrapper
const formStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

// Horizontally aligned layout (concept: [ planner name ] [ create ])
const controlsRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '12px',
  width: '100%',
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  padding: '14px 16px',
  fontSize: '1rem',
  fontWeight: 500,
  backgroundColor: '#ffffff',
  color: '#0f172a',
  border: '3px solid #0f172a',
  borderRadius: '8px',
  outline: 'none',
  boxShadow: '4px 4px 0px #0f172a',
  transition: 'all 0.15s ease',
};

const btnStyle: React.CSSProperties = {
  padding: '14px 20px',
  fontSize: '1rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  backgroundColor: '#cbd5e1', // Slightly shaded button matching sketch concept
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

const errorStyle: React.CSSProperties = {
  backgroundColor: '#fee2e2',
  border: '2px solid #ef4444',
  color: '#b91c1c',
  padding: '10px',
  borderRadius: '8px',
  fontSize: '0.85rem',
  fontWeight: 600,
  textAlign: 'center',
};

const footerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '0.75rem',
  fontWeight: 500,
  color: '#475569', // Dark grey text
  textAlign: 'center',
  lineHeight: 1.4,
  padding: '8px 16px',
};
