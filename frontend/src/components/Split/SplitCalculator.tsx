import React, { useEffect, useMemo, useRef, useState } from 'react';
import { usePlannerStore } from '../../store/plannerStore';
import { ExpenseModal } from './ExpenseModal';
import { Calculator, Plus, Trash2, ArrowRight, Wallet, Pencil } from 'lucide-react';

export interface Expense {
  id: string;
  desc: string;
  payerId: string; // Participant.id — 실제 결제한 사람
  splitMode: 'equal' | 'custom';
  amount: number; // 총 금액
  includedIds: string[]; // 1/N 모드에서 나눠 낸 사람들
  customShares: Record<string, number>; // 각자 입력 모드: participantId -> 부담액
}

interface Transfer {
  fromId: string;
  toId: string;
  amount: number;
}

// v2: 항목별 개별 분배를 지원하는 새 데이터 구조 (이전 목업 데이터와 분리)
const STORAGE_PREFIX = 'tripsync_expenses_v2_';

const won = (n: number) => `₩${Math.round(n).toLocaleString('ko-KR')}`;

// 특정 참여자가 한 경비에서 부담하는 금액
const shareOf = (e: Expense, pid: string): number => {
  if (e.splitMode === 'custom') return e.customShares[pid] ?? 0;
  return e.includedIds.includes(pid) && e.includedIds.length > 0
    ? e.amount / e.includedIds.length
    : 0;
};

/**
 * 정산 계산기
 * 참여자별로 실제 부담한 금액이 다를 수 있으므로(각자 입력) 이를 반영해
 * 개인별 정산 잔액과 "누가 누구에게 얼마"(최소 이체)를 계산한다.
 */
export const SplitCalculator: React.FC = () => {
  const { planner, participants, currentUser } = usePlannerStore();
  const shareCode = planner?.shareCode;

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);

  // 하이드레이션 가드: 로드 완료 전 빈 배열로 저장소를 덮어쓰지 않도록
  const hydratedCode = useRef<string | null>(null);

  useEffect(() => {
    if (!shareCode) return;
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + shareCode);
      setExpenses(raw ? JSON.parse(raw) : []);
    } catch {
      setExpenses([]);
    }
    hydratedCode.current = shareCode;
  }, [shareCode]);

  useEffect(() => {
    if (!shareCode || hydratedCode.current !== shareCode) return;
    try {
      localStorage.setItem(STORAGE_PREFIX + shareCode, JSON.stringify(expenses));
    } catch {
      /* ignore quota errors */
    }
  }, [expenses, shareCode]);

  const nameOf = (id: string) => participants.find((p) => p.id === id)?.name ?? '알수없음';
  const colorOf = (id: string) => participants.find((p) => p.id === id)?.color ?? '#94a3b8';

  const total = useMemo(
    () => expenses.reduce((sum, e) => sum + e.amount, 0),
    [expenses]
  );

  // 참여자별 잔액: (본인이 결제한 총액) - (본인이 부담해야 할 총액)
  const balances = useMemo(() => {
    return participants.map((p) => {
      const paid = expenses
        .filter((e) => e.payerId === p.id)
        .reduce((sum, e) => sum + e.amount, 0);
      const owed = expenses.reduce((sum, e) => sum + shareOf(e, p.id), 0);
      return { id: p.id, name: p.name, color: p.color, balance: paid - owed };
    });
  }, [participants, expenses]);

  // 최소 이체 정산: 받을 사람(+)과 낼 사람(-)을 그리디로 매칭
  const transfers = useMemo<Transfer[]>(() => {
    const creditors = balances
      .filter((b) => b.balance > 0.5)
      .map((b) => ({ id: b.id, amt: b.balance }))
      .sort((a, b) => b.amt - a.amt);
    const debtors = balances
      .filter((b) => b.balance < -0.5)
      .map((b) => ({ id: b.id, amt: -b.balance }))
      .sort((a, b) => b.amt - a.amt);

    const result: Transfer[] = [];
    let i = 0;
    let j = 0;
    while (i < debtors.length && j < creditors.length) {
      const pay = Math.min(debtors[i].amt, creditors[j].amt);
      result.push({ fromId: debtors[i].id, toId: creditors[j].id, amount: pay });
      debtors[i].amt -= pay;
      creditors[j].amt -= pay;
      if (debtors[i].amt < 0.5) i++;
      if (creditors[j].amt < 0.5) j++;
    }
    return result;
  }, [balances]);

  const canEdit = !!currentUser;

  const openAdd = () => {
    setEditing(null);
    setShowModal(true);
  };

  const openEdit = (e: Expense) => {
    setEditing(e);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
  };

  const handleSubmit = (data: Omit<Expense, 'id'>) => {
    if (editing) {
      setExpenses((prev) => prev.map((x) => (x.id === editing.id ? { ...data, id: editing.id } : x)));
    } else {
      setExpenses((prev) => [
        ...prev,
        { ...data, id: Math.random().toString(36).substring(2, 10) },
      ]);
    }
  };

  const handleRemove = (id: string) =>
    setExpenses((prev) => prev.filter((e) => e.id !== id));

  const handleReset = () => {
    if (expenses.length === 0) return;
    if (window.confirm('입력한 모든 경비를 초기화할까요?')) setExpenses([]);
  };

  return (
    <div className="glass-panel" style={panelStyle}>
      <div style={panelHeaderStyle}>
        <Calculator size={16} style={{ color: '#94a3b8' }} />
        <h3 style={panelTitleStyle}>정산 계산기</h3>
        {expenses.length > 0 && (
          <button onClick={handleReset} style={resetBtnStyle} title="전체 초기화">
            <Trash2 size={12} />
          </button>
        )}
      </div>

      {participants.length === 0 ? (
        <div style={noticeStyle}>참여자가 있어야 정산할 수 있습니다.</div>
      ) : (
        <>
          {canEdit ? (
            <button onClick={openAdd} className="btn btn-secondary" style={addBtnStyle}>
              <Plus size={14} />
              경비 추가
            </button>
          ) : (
            <div style={noticeStyle}>로그인 후 경비를 추가할 수 있습니다.</div>
          )}

          {/* 경비 목록 */}
          {expenses.length > 0 && (
            <div style={expenseListStyle}>
              {expenses.map((e) => (
                <div
                  key={e.id}
                  style={{ ...expenseItemStyle, cursor: canEdit ? 'pointer' : 'default' }}
                  onClick={() => canEdit && openEdit(e)}
                  title={canEdit ? '클릭하여 수정' : undefined}
                >
                  <span style={{ ...dotStyle, backgroundColor: colorOf(e.payerId) }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={expenseDescStyle}>{e.desc}</div>
                    <div style={expenseMetaStyle}>
                      <span>{nameOf(e.payerId)} 결제</span>
                    </div>
                  </div>
                  <span style={expenseAmountStyle}>{won(e.amount)}</span>
                  {canEdit && (
                    <>
                      <Pencil size={11} style={{ color: '#94a3b8', flexShrink: 0 }} />
                      <button
                        onClick={(ev) => {
                          ev.stopPropagation();
                          handleRemove(e.id);
                        }}
                        style={removeBtnStyle}
                        title="삭제"
                      >
                        <Trash2 size={12} />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 총액 */}
          <div style={summaryStyle}>
            <span style={summaryLabelStyle}>총 지출</span>
            <span style={summaryTotalStyle}>{won(total)}</span>
          </div>

          {/* 최소 이체 정산 안내 */}
          {transfers.length > 0 && (
            <div style={settleWrapStyle}>
              <div style={settleHeaderStyle}>
                <Wallet size={13} />
                <span>정산 방법</span>
              </div>
              {transfers.map((t, idx) => (
                <div key={idx} style={transferRowStyle}>
                  <span style={{ ...personChipStyle, color: colorOf(t.fromId) }}>
                    {nameOf(t.fromId)}
                  </span>
                  <ArrowRight size={12} style={{ color: '#94a3b8', flexShrink: 0 }} />
                  <span style={{ ...personChipStyle, color: colorOf(t.toId) }}>
                    {nameOf(t.toId)}
                  </span>
                  <span style={transferAmountStyle}>{won(t.amount)}</span>
                </div>
              ))}
            </div>
          )}
          {expenses.length > 0 && transfers.length === 0 && (
            <div style={settledStyle}>정산 완료! 주고받을 금액이 없습니다.</div>
          )}
        </>
      )}

      {showModal && (
        <ExpenseModal
          participants={participants}
          defaultPayerId={currentUser?.id ?? ''}
          expense={editing}
          onSubmit={handleSubmit}
          onClose={closeModal}
        />
      )}
    </div>
  );
};

/* ---- Styles: matches the neo-brutalist panel look used across PlannerPage ---- */
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

const resetBtnStyle: React.CSSProperties = {
  marginLeft: 'auto',
  background: 'none',
  border: 'none',
  color: '#94a3b8',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  padding: 0,
};

const noticeStyle: React.CSSProperties = {
  fontSize: '0.72rem',
  color: '#64748b',
  textAlign: 'center',
  padding: '8px 4px',
  lineHeight: 1.4,
};

const addBtnStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px',
  fontSize: '0.8rem',
};

const expenseListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  maxHeight: '170px',
  overflowY: 'auto',
};

const expenseItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '6px 8px',
  borderRadius: '6px',
  backgroundColor: 'rgba(15, 23, 42, 0.02)',
  border: '1px solid rgba(15, 23, 42, 0.05)',
};

const dotStyle: React.CSSProperties = {
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  flexShrink: 0,
};

const expenseDescStyle: React.CSSProperties = {
  fontSize: '0.78rem',
  fontWeight: 600,
  color: '#0f172a',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const expenseMetaStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  fontSize: '0.68rem',
  color: '#64748b',
};

const expenseAmountStyle: React.CSSProperties = {
  fontSize: '0.78rem',
  fontWeight: 700,
  color: '#0f172a',
  fontFamily: 'monospace',
  flexShrink: 0,
};

const removeBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#94a3b8',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  padding: 0,
  flexShrink: 0,
};

const summaryStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '10px 12px',
  backgroundColor: '#eef2ff',
  border: '2px solid #0f172a',
  borderRadius: '8px',
};

const summaryLabelStyle: React.CSSProperties = {
  fontSize: '0.78rem',
  color: '#0f172a',
  fontWeight: 700,
};

const summaryTotalStyle: React.CSSProperties = {
  fontSize: '1.05rem',
  fontWeight: 700,
  color: '#4f46e5',
  fontFamily: 'monospace',
};

const settleWrapStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  paddingTop: '10px',
  borderTop: '1px dashed rgba(15, 23, 42, 0.15)',
};

const settleHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '5px',
  fontSize: '0.72rem',
  fontWeight: 700,
  color: '#0f172a',
};

const transferRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '6px 8px',
  borderRadius: '6px',
  backgroundColor: 'rgba(79, 70, 229, 0.05)',
  border: '1px solid rgba(79, 70, 229, 0.15)',
};

const personChipStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  fontWeight: 700,
  maxWidth: '58px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const transferAmountStyle: React.CSSProperties = {
  marginLeft: 'auto',
  fontSize: '0.78rem',
  fontWeight: 700,
  color: '#0f172a',
  fontFamily: 'monospace',
  flexShrink: 0,
};

const settledStyle: React.CSSProperties = {
  fontSize: '0.72rem',
  color: '#059669',
  fontWeight: 600,
  textAlign: 'center',
  padding: '6px 0',
};
