import React, { useState, useEffect, useRef } from 'react';
import { usePlannerStore } from '../../store/plannerStore';
import { ChatMessage } from './ChatMessage';
import { Send, MessageSquare, Minimize2 } from 'lucide-react';

export const ChatWindow: React.FC = () => {
  const { 
    messages, 
    participants, 
    currentUser, 
    sendMessage 
  } = usePlannerStore();

  const [input, setInput] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  
  // Dragging state
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const mouseDownPos = useRef({ x: 0, y: 0 });
  const windowRef = useRef<HTMLDivElement>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (!isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isMinimized]);

  // Handle dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag with left click and when not clicking buttons
    if (e.button !== 0 || (e.target as HTMLElement).closest('button')) return;
    
    setIsDragging(true);
    // Track relative start positions
    dragStart.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
    mouseDownPos.current = {
      x: e.clientX,
      y: e.clientY
    };
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const newX = e.clientX - dragStart.current.x;
      const newY = e.clientY - dragStart.current.y;
      
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = (e: MouseEvent) => {
      setIsDragging(false);
      
      // Calculate distance moved
      const dist = Math.sqrt(
        Math.pow(e.clientX - mouseDownPos.current.x, 2) +
        Math.pow(e.clientY - mouseDownPos.current.y, 2)
      );
      
      // If we just clicked (moved less than 5px) while minimized, maximize the window
      if (isMinimized && dist < 5) {
        setIsMinimized(false);
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isMinimized]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !currentUser) return;
    sendMessage(input.trim());
    setInput('');
  };



  // Base position offset (starts near bottom-right)
  const windowStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    transform: `translate(${position.x}px, ${position.y}px)`,
    width: '320px',
    zIndex: 1000,
    boxShadow: '4px 4px 0px #0f172a',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    border: '3px solid #0f172a',
    borderRadius: '12px',
    transition: isDragging ? 'none' : 'transform 0.15s ease-out',
  };

  if (isMinimized) {
    return (
      <div 
        className="glass-panel"
        style={{
          ...windowStyle,
          width: 'auto',
          cursor: isDragging ? 'grabbing' : 'grab',
          borderRadius: '30px',
          padding: '10px 18px',
        }}
        onMouseDown={handleMouseDown}
      >
        <div style={minimizedHeaderStyle}>
          <MessageSquare size={16} style={{ color: '#6366f1' }} />
          <span style={minimizedTitleStyle}>채팅창 ({messages.filter(m => m.participantId !== 'system').length})</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={windowRef} 
      className="glass-panel" 
      style={windowStyle}
    >
      {/* Chat Drag Handle / Header */}
      <div 
        style={{ 
          ...headerStyle, 
          cursor: isDragging ? 'grabbing' : 'grab' 
        }}
        onMouseDown={handleMouseDown}
      >
        <MessageSquare size={16} style={{ color: '#94a3b8' }} />
        <span style={headerTitleStyle}>실시간 채팅</span>
        
        <button 
          onClick={() => setIsMinimized(true)} 
          style={{ ...minimizeBtnStyle, marginLeft: 'auto' }}
        >
          <Minimize2 size={14} />
        </button>
      </div>

      {/* Message List */}
      <div style={messageListStyle}>
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            participants={participants}
            isCurrentUser={currentUser ? msg.participantId === currentUser.id : false}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <form onSubmit={handleSend} style={inputFormStyle}>
        {currentUser ? (
          <div style={inputContainerStyle}>
            <input
              type="text"
              className="glass-input"
              style={inputStyle}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="메시지를 입력하세요..."
              maxLength={200}
            />
            <button type="submit" className="btn btn-primary" style={sendBtnStyle}>
              <Send size={14} />
            </button>
          </div>
        ) : (
          <div style={chatDisabledStyle}>
            닉네임 로그인 후 채팅 참여 가능
          </div>
        )}
      </form>
    </div>
  );
};

// Styling definitions
const minimizedHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const minimizedTitleStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  fontWeight: 600,
  color: '#0f172a',
};



const headerStyle: React.CSSProperties = {
  padding: '12px 14px',
  borderBottom: '1px solid rgba(15, 23, 42, 0.08)',
  backgroundColor: 'rgba(15, 23, 42, 0.02)',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  userSelect: 'none',
};

const headerTitleStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  fontWeight: 600,
  color: '#0f172a',
};



const minimizeBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#64748b',
  cursor: 'pointer',
  padding: '2px',
  display: 'flex',
  alignItems: 'center',
};

const messageListStyle: React.CSSProperties = {
  height: '240px',
  overflowY: 'auto',
  padding: '12px',
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
};

const inputFormStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderTop: '1px solid rgba(15, 23, 42, 0.08)',
  backgroundColor: 'rgba(15, 23, 42, 0.02)',
};

const inputContainerStyle: React.CSSProperties = {
  display: 'flex',
  gap: '6px',
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  fontSize: '0.8rem',
  padding: '8px 10px',
  backgroundColor: '#ffffff',
  border: '3px solid #0f172a',
  borderRadius: '8px',
  boxShadow: '1px 1px 0px #0f172a',
  color: '#0f172a',
  fontWeight: 500,
  outline: 'none',
};

const sendBtnStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: '8px',
  border: '3px solid #0f172a',
  boxShadow: '2px 2px 0px #0f172a',
  fontWeight: 700,
};

const chatDisabledStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: '#64748b',
  textAlign: 'center',
  padding: '6px',
};
