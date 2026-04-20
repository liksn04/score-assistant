import React, { useState } from 'react';
import { X, Plus, Trash2, Settings, Users, ArrowRight } from 'lucide-react';
import type { Audition, JudgeConfig, JudgeType } from '../../types';

interface AuditionSettingsModalProps {
  audition: Audition;
  onSave: (judges: JudgeConfig[], dropCount: number) => Promise<void>;
  onClose: () => void;
}

export const AuditionSettingsModal: React.FC<AuditionSettingsModalProps> = ({ audition, onSave, onClose }) => {
  const [judges, setJudges] = useState<JudgeConfig[]>(audition.judges || []);
  const [dropCount, setDropCount] = useState<number>(audition.dropCount || 0);
  const [isSaving, setIsSaving] = useState(false);

  const handleAddJudge = () => {
    setJudges([
      ...judges,
      {
        name: `심사위원 ${judges.length + 1}`,
        pin: '123456',
        type: 'detail',
        criteria: [{ item: '항목 1', maxScore: 100 }]
      }
    ]);
  };

  const handleRemoveJudge = (index: number) => {
    const newJudges = [...judges];
    newJudges.splice(index, 1);
    setJudges(newJudges);
  };

  const handleChangeJudge = (index: number, field: keyof JudgeConfig, value: any) => {
    const newJudges = [...judges];
    newJudges[index] = { ...newJudges[index], [field]: value };
    setJudges(newJudges);
  };

  const handleAddCriterion = (judgeIndex: number) => {
    const newJudges = [...judges];
    const judge = newJudges[judgeIndex];
    if (!judge.criteria) judge.criteria = [];
    judge.criteria.push({ item: '새 항목', maxScore: 20 });
    setJudges(newJudges);
  };

  const handleRemoveCriterion = (judgeIndex: number, cIndex: number) => {
    const newJudges = [...judges];
    newJudges[judgeIndex].criteria?.splice(cIndex, 1);
    setJudges(newJudges);
  };

  const handleChangeCriterion = (judgeIndex: number, cIndex: number, field: 'item' | 'maxScore', value: any) => {
    const newJudges = [...judges];
    const criteria = newJudges[judgeIndex].criteria;
    if (criteria && criteria[cIndex]) {
      criteria[cIndex] = { ...criteria[cIndex], [field]: value };
    }
    setJudges(newJudges);
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      await onSave(judges, dropCount);
      onClose();
    } catch (e) {
      alert("오디션 설정 저장 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ 
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000,
      padding: '2rem'
    }}>
      <div className="glass-card fade-in" style={{ 
        width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto',
        padding: '2.5rem', position: 'relative'
      }}>
        <button 
          onClick={onClose}
          style={{ 
            position: 'absolute', top: '1.5rem', right: '1.5rem', 
            background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--text-muted)', 
            cursor: 'pointer', borderRadius: '50%', width: '36px', height: '36px',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <Settings size={28} color="var(--primary)" />
          <h2 style={{ fontSize: '1.8rem' }}>오디션 환경설정 ({audition.name})</h2>
        </div>

        {/* 하위 N팀 탈락 설정 */}
        <section style={{ marginBottom: '2.5rem', background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '16px' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <ArrowRight size={18} /> 탈락 기준 설정
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <label style={{ fontSize: '1rem', color: 'var(--text)' }}>정기공연에 탈락할 하위 팀 개수:</label>
            <input 
              type="number"
              min={0}
              className="premium-input"
              style={{ width: '80px', padding: '0.5rem' }}
              value={dropCount}
              onChange={(e) => setDropCount(Number(e.target.value) || 0)}
            />
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>팀 (0이면 아무도 탈락하지 않음)</span>
          </div>
        </section>

        {/* 심사위원 설정 */}
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.2rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Users size={18} /> 심사위원 설정
            </h3>
            <button className="premium-button" onClick={handleAddJudge} style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
              <Plus size={16} /> 새로운 심사위원 추가
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {judges.map((judge, jIndex) => (
              <div key={jIndex} style={{ 
                background: 'rgba(255,255,255,0.05)', 
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '1.5rem', 
                borderRadius: '16px' 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', flex: 1 }}>
                    <div style={{ flex: 1, minWidth: '150px' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>심사위원 이름</label>
                      <input 
                        className="premium-input" 
                        value={judge.name} 
                        onChange={(e) => handleChangeJudge(jIndex, 'name', e.target.value)} 
                        style={{ width: '100%', padding: '0.6rem' }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: '150px' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>6자리 PIN 코드</label>
                      <input 
                        className="premium-input" 
                        value={judge.pin} 
                        maxLength={6}
                        onChange={(e) => handleChangeJudge(jIndex, 'pin', e.target.value.replace(/[^0-9]/g, ''))} 
                        style={{ width: '100%', padding: '0.6rem' }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: '150px' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>평가 유형</label>
                      <select 
                        className="premium-input"
                        value={judge.type}
                        onChange={(e) => handleChangeJudge(jIndex, 'type', e.target.value as JudgeType)}
                        style={{ width: '100%', padding: '0.6rem', cursor: 'pointer' }}
                      >
                        <option value="detail">항목별 세부 평가</option>
                        <option value="simple">단순 총점 평가</option>
                        <option value="observer">참관자 (읽기 전용)</option>
                      </select>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleRemoveJudge(jIndex)}
                    style={{ 
                      background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.2)', 
                      color: '#f43f5e', padding: '0.6rem 1rem', borderRadius: '12px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s', alignSelf: 'flex-end'
                    }}
                  >
                    <Trash2 size={16} /> 삭제
                  </button>
                </div>

                {judge.type === 'detail' && (
                  <div style={{ marginTop: '1.5rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)' }}>세부 평가 항목 설정 (총점 계산에 사용됨)</p>
                      <button 
                        onClick={() => handleAddCriterion(jIndex)}
                        style={{ 
                          background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)', 
                          color: 'var(--primary)', padding: '0.4rem 0.8rem', borderRadius: '8px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem'
                        }}
                      >
                        <Plus size={14} /> 항목 추가
                      </button>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                      {judge.criteria?.map((criterion, cIndex) => (
                        <div key={cIndex} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input 
                            className="premium-input" 
                            placeholder="항목명 (예: 음정)"
                            value={criterion.item} 
                            onChange={(e) => handleChangeCriterion(jIndex, cIndex, 'item', e.target.value)} 
                            style={{ flex: 2, padding: '0.5rem' }}
                          />
                          <input 
                            type="number"
                            className="premium-input" 
                            placeholder="배점"
                            value={criterion.maxScore} 
                            onChange={(e) => handleChangeCriterion(jIndex, cIndex, 'maxScore', Number(e.target.value) || 0)} 
                            style={{ flex: 1, padding: '0.5rem' }}
                          />
                          <button 
                            onClick={() => handleRemoveCriterion(jIndex, cIndex)}
                            style={{ 
                              background: 'transparent', border: 'none', color: '#f43f5e', 
                              cursor: 'pointer', padding: '0.5rem'
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                    {judge.criteria && judge.criteria.length > 0 && (
                      <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--primary)', textAlign: 'right' }}>
                        합산 만점: {judge.criteria.reduce((sum, c) => sum + c.maxScore, 0)}점
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
            
            {judges.length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                등록된 심사위원이 없습니다.
              </div>
            )}
          </div>
        </section>

        <div style={{ marginTop: '3rem', display: 'flex', gap: '1rem' }}>
          <button className="premium-button secondary-btn" style={{ flex: 1 }} onClick={onClose} disabled={isSaving}>취소</button>
          <button className="premium-button" style={{ flex: 2 }} onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? '저장 중...' : '설정 저장하기'}
          </button>
        </div>
      </div>
    </div>
  );
};
