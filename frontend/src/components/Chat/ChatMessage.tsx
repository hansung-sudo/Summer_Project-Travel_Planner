import React from 'react';
import type { Message, Participant } from '../../types';

interface ChatMessageProps {
  message: Message;
  participants: Participant[];
  isCurrentUser: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, participants, isCurrentUser }) => {
  const sender = participants.find(p => p.id === message.participantId);
  const color = sender?.color || '#64748b'; // System messages are styled differently

  const isSystem = message.participantId === 'system';

  if (isSystem) {
    return (
      <div style={systemMessageStyle}>
        <span style={systemContentStyle}>{message.content}</span>
      </div>
    );
  }

  return (
    <div style={{
      ...messageContainerStyle,
      alignSelf: isCurrentUser ? 'flex-end' : 'flex-start',
    }}>
      <div style={{
        ...bubbleStyle,
        borderColor: isCurrentUser ? 'rgba(99, 102, 241, 0.2)' : 'rgba(15, 23, 42, 0.08)',
        backgroundColor: isCurrentUser ? 'rgba(99, 102, 241, 0.06)' : 'rgba(15, 23, 42, 0.03)',
      }}>
        {/* Name prefix: message text */}
        <span style={{ ...senderNameStyle, color }}>
          {message.participantName}
        </span>
        <span style={colonStyle}>:</span>
        <span style={contentStyle}>{message.content}</span>
      </div>
      <span style={timeStyle}>
        {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  );
};

// Clean minimal chat styling
const messageContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  maxWidth: '85%',
  gap: '3px',
  margin: '4px 0',
};

const bubbleStyle: React.CSSProperties = {
  border: '1px solid',
  borderRadius: '8px',
  padding: '8px 12px',
  fontSize: '0.825rem',
  lineHeight: 1.45,
  display: 'inline-flex',
  flexWrap: 'wrap',
  gap: '4px',
};

const senderNameStyle: React.CSSProperties = {
  fontWeight: 600,
};

const colonStyle: React.CSSProperties = {
  color: '#64748b',
  marginRight: '2px',
};

const contentStyle: React.CSSProperties = {
  color: '#0f172a',
  wordBreak: 'break-word',
};

const timeStyle: React.CSSProperties = {
  fontSize: '0.65rem',
  color: '#64748b',
  alignSelf: 'flex-end',
  padding: '0 4px',
};

const systemMessageStyle: React.CSSProperties = {
  alignSelf: 'center',
  margin: '8px 0',
  textAlign: 'center',
  maxWidth: '90%',
};

const systemContentStyle: React.CSSProperties = {
  fontSize: '0.725rem',
  color: '#64748b',
  backgroundColor: 'rgba(15, 23, 42, 0.03)',
  border: '1px solid rgba(15, 23, 42, 0.05)',
  padding: '3px 8px',
  borderRadius: '4px',
};
