import React, { useMemo, useState } from 'react';
import type { Participant } from '../../types';
import type { Expense } from './SplitCalculator';
import { X, Save, SlidersHorizontal } from 'lucide-react';

interface ExpenseModalProps {
  participants: Participant[];
  defaultPayerId: string;
  expense?: Expense | null; // 있으면 수정 모드
  onSubmit: (expense: Omit<Expense, 'id'>) => void;
  onClose: () => void;
}

const won = (n: number) => `₩${Math.round(n).toLocaleString('ko-KR')}`;

/**
 * 경비 추가 모달 (참여자 목록 전용).
 * - 1/N: 참여자를 골라 똑같이 나눔
 * - 각자 입력: 참여자마다 실제 부담한 금액을 직접 입력 (예: 11,000 / 17,000)
 * 스타일은 TimeSlotModal 등 기존 모달과 동일한 네오브루탈리즘 톤을 따른다.
 */
export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  participants,
  defaultPayerId,
  expense,
  onSubmit,
  onClose,
}) => {
  const editing = !!expense;
  const [desc, setDesc] = useState(expense?.desc ?? '');
  const [payerId, setPayerId] = useState(
    expense?.payerId || defaultPayerId || participants[0]?.id || ''
  );
  const [mode, setMode] = useState<'equal' | 'custom'>(expense?.splitMode ?? 'equal');

  // 1/N 모드
  const [includedIds, setIncludedIds] = useState<string[]>(
    expense && expense.splitMode === 'equal' ? expense.includedIds : participants.map((p) => p.id)
  );
  const [totalStr, setTotalStr] = useState(
    expense && expense.splitMode === 'equal' ? String(expense.amount) : ''
  );

  // 각자 입력 모드
  const [shares, setShares] = useState<Record<string, string>>(
    expense && expense.splitMode === 'custom'
      ? Object.fromEntries(Object.entries(expense.customShares).map(([k, v]) => [k, String(v)]))
      : {}
  );

  const equalTotal = Math.max(0, Math.round(Number(totalStr)) || 0);
  const perHead = includedIds.length > 0 ? equalTotal / includedIds.length : 0;

  const customTotal = useMemo(
    () =>
      participants.reduce(
        (sum, p) => sum + Math.max(0, Math.round(Number(shares[p.id])) || 0),
        0
      ),
    [shares, participants]
  );

  const total = mode === 'equal' ? equalTotal : customTotal;

  const toggleInclude = (id: string) =>
    setIncludedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const setShare = (id: string, value: string) =>
    setShares((prev) => ({ ...prev, [id]: value }));

  const valid =
    !!payerId &&
    total > 0 &&
    (mode === 'equal' ? includedIds.length > 0 : customTotal > 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;

    if (mode === 'equal') {
      onSubmit({
        desc: desc.trim() || '경비',
        payerId,
        splitMode: 'equal',
        amount: equalTotal,
        includedIds: [...includedIds],
        customShares: {},
      });
    } else {
      const cs: Record<string, number> = {};
      participants.forEach((p) => {
        const v = Math.max(0, Math.round(Number(shares[p.id])) || 0);
        if (v > 0) cs[p.id] = v;
      });
      onSubmit({
        desc: desc.trim() || '경비',
        payerId,
        splitMode: 'custom',
        amount: customTotal,
        includedIds: Object.keys(cs),
        customShares: cs,
      });
    }
    onClose();
  };

  return (
    <div style={overlayStyle}>
      <div className="glass-panel" style={modalStyle}>
        <div style={headerStyle}>
          <h3 style={titleStyle}>{editing ? '경비 수정' : '경비 추가'}</h3>
          <button onClick={onClose} style={closeBtnStyle} aria-label="닫기">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={formStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>내용</label>
            <input
              type="text"
              className="glass-input"
              style={inputStyle}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="예: 저녁 식사, 택시비"
              maxLength={24}
            />
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>결제자</label>
            <select
              className="glass-input"
              style={inputStyle}
              value={payerId}
              onChange={(e) => setPayerId(e.target.value)}
            >
              {participants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>분배 방식</label>
            <div style={segmentedStyle}>
              <button
                type="button"
                onClick={() => setMode('equal')}
                style={{ ...segBtnStyle, ...(mode === 'equal' ? segActiveStyle : {}) }}
              >
                1/N 똑같이
              </button>
              <button
                type="button"
                onClick={() => setMode('custom')}
                style={{ ...segBtnStyle, ...(mode === 'custom' ? segActiveStyle : {}) }}
              >
                <SlidersHorizontal size={14} />
                각자 입력
              </button>
            </div>
          </div>

          {mode === 'equal' ? (
            <>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>총 금액</label>
                <input
                  type="number"
                  className="glass-input"
                  style={inputStyle}
                  value={totalStr}
                  onChange={(e) => setTotalStr(e.target.value)}
                  placeholder="예: 45000"
                  min={0}
                />
              </div>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>나눌 사람</label>
                <div style={personListStyle}>
                  {participants.map((p) => {
                    const on = includedIds.includes(p.id);
                    return (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => toggleInclude(p.id)}
                        style={{ ...chipStyle, ...(on ? chipOnStyle : chipOffStyle) }}
                      >
                        <span style={{ ...dotStyle, backgroundColor: p.color }} />
                        {p.name}
                        <span style={chipAmtStyle}>{on ? won(perHead) : '제외'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div style={inputGroupStyle}>
              <div style={personListStyle}>
                {participants.map((p) => (
                  <div key={p.id} style={shareRowStyle}>
                    <span style={{ ...dotStyle, backgroundColor: p.color }} />
                    <span style={shareNameStyle}>{p.name}</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="glass-input"
                      style={shareInputStyle}
                      value={shares[p.id] ?? ''}
                      onChange={(e) => setShare(p.id, e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={footerStyle}>
            <div style={totalBoxStyle}>
              <span style={totalLabelStyle}>합계</span>
              <span style={totalValueStyle}>{won(total)}</span>
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ ...saveBtnStyle, opacity: valid ? 1 : 0.45 }}
              disabled={!valid}
            >
              <Save size={16} />
              {editing ? '수정 완료' : '추가하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ---- Styles (mirrors TimeSlotModal / LoginForm) ---- */
const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(15, 23, 42, 0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1100,
  backdropFilter: 'blur(4px)',
  padding: '16px',
};

const modalStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '440px',
  maxHeight: '90vh',
  overflowY: 'auto',
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

const segmentedStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
};

const segBtnStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  padding: '10px',
  fontSize: '0.8rem',
  fontWeight: 700,
  color: '#0f172a',
  backgroundColor: '#ffffff',
  border: '3px solid #0f172a',
  borderRadius: '8px',
  boxShadow: '2px 2px 0px #0f172a',
  cursor: 'pointer',
  transition: 'all 0.1s ease',
};

const segActiveStyle: React.CSSProperties = {
  backgroundColor: '#cbd5e1',
  transform: 'translate(2px, 2px)',
  boxShadow: 'none',
};

const personListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const chipStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '9px 12px',
  fontSize: '0.85rem',
  fontWeight: 600,
  borderRadius: '8px',
  border: '3px solid #0f172a',
  cursor: 'pointer',
  transition: 'all 0.1s ease',
  textAlign: 'left',
};

const chipOnStyle: React.CSSProperties = {
  backgroundColor: '#eef2ff',
  color: '#0f172a',
  boxShadow: '2px 2px 0px #0f172a',
};

const chipOffStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  color: '#94a3b8',
  opacity: 0.7,
  boxShadow: 'none',
};

const chipAmtStyle: React.CSSProperties = {
  marginLeft: 'auto',
  fontSize: '0.8rem',
  fontWeight: 700,
  fontFamily: 'monospace',
  color: '#4f46e5',
};

const shareRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const shareNameStyle: React.CSSProperties = {
  fontSize: '0.85rem',
  fontWeight: 600,
  color: '#0f172a',
  minWidth: '54px',
};

const shareInputStyle: React.CSSProperties = {
  ...inputStyle,
  flex: 1,
  padding: '8px 10px',
  textAlign: 'right',
  fontFamily: 'monospace',
};

const dotStyle: React.CSSProperties = {
  width: '9px',
  height: '9px',
  borderRadius: '50%',
  flexShrink: 0,
};

const footerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  marginTop: '4px',
  paddingTop: '14px',
  borderTop: '3px solid #0f172a',
};

const totalBoxStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
};

const totalLabelStyle: React.CSSProperties = {
  fontSize: '0.7rem',
  fontWeight: 700,
  color: '#64748b',
};

const totalValueStyle: React.CSSProperties = {
  fontSize: '1.15rem',
  fontWeight: 700,
  color: '#0f172a',
  fontFamily: 'monospace',
};

const saveBtnStyle: React.CSSProperties = {
  marginLeft: 'auto',
  padding: '10px 20px',
  fontSize: '0.85rem',
};
