import React from 'react';
import { X, Trash2, CheckCircle2, RotateCcw } from 'lucide-react';
import type { Candidate, JudgeName, EvaluationItem } from '../../types';
import { EVALUATION_ITEMS, JUDGE_SCORE_LIMITS, SIMPLE_JUDGES } from '../../types';
import CommentSection from './CommentSection';

interface CandidateScoreCardProps {
  candidate: Candidate;
  selectedJudge: JudgeName;
  isObserver: boolean;
  getJudgeTotal: (candidate: Candidate, judge: JudgeName) => number;
  editingSongId: string | null;
  setEditingSongId: (id: string | null) => void;
  tempSongTitle: string;
  setTempSongTitle: (title: string) => void;
  updateSongTitle: (id: string, title: string) => void;
  deleteCandidate: (id: string, name: string) => void;
  updateSimpleScore: (id: string, value: string) => void;
  updateDetailScore: (id: string, item: EvaluationItem, value: string) => void;
  updateItemStrikes: (id: string, item: string, delta: number) => void;
  commentInput: string;
  isCommentExpanded: boolean;
  onToggleComment: (id: string) => void;
  onCommentInputChange: (id: string, value: string) => void;
  addComment: (id: string) => void;
  deleteComment: (id: string, comment: any) => void;
  onToggleCompletion: (id: string, currentStatus: boolean) => void;
}

const CandidateScoreCard: React.FC<CandidateScoreCardProps> = ({
  candidate,
  selectedJudge,
  isObserver,
  getJudgeTotal,
  editingSongId,
  setEditingSongId,
  tempSongTitle,
  setTempSongTitle,
  updateSongTitle,
  deleteCandidate,
  updateSimpleScore,
  updateDetailScore,
  updateItemStrikes,
  commentInput,
  isCommentExpanded,
  onToggleComment,
  onCommentInputChange,
  addComment,
  deleteComment,
  onToggleCompletion
}) => {
  const isCompleted = candidate.scores[selectedJudge]?.isCompleted || false;

  return (
    <div className="glass-card candidate-row" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          <span style={{ fontSize: '1.2rem', fontWeight: 600 }}>{candidate.name}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {editingSongId === candidate.id && !isObserver ? (
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <input 
                  className="premium-input" 
                  style={{ padding: '2px 8px', fontSize: '0.8rem', width: '150px' }}
                  value={tempSongTitle}
                  onChange={(e) => setTempSongTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      updateSongTitle(candidate.id, tempSongTitle);
                      setEditingSongId(null);
                    } else if (e.key === 'Escape') {
                      setEditingSongId(null);
                    }
                  }}
                  autoFocus
                />
                <button 
                  onClick={() => {
                    updateSongTitle(candidate.id, tempSongTitle);
                    setEditingSongId(null);
                  }}
                  style={{ background: 'var(--primary)', border: 'none', color: 'white', borderRadius: '4px', padding: '2px 6px', fontSize: '0.7rem', cursor: 'pointer' }}
                >
                  저장
                </button>
              </div>
            ) : (
              <span 
                style={{ 
                  fontSize: '0.85rem', 
                  color: 'var(--text-muted)', 
                  cursor: isObserver ? 'default' : 'pointer' 
                }}
                onClick={() => {
                  if (isObserver) return;
                  setEditingSongId(candidate.id);
                  setTempSongTitle(candidate.song || '');
                }}
              >
                🎵 {candidate.song || (isObserver ? '곡 정보 없음' : '곡명 미입력 (클릭하여 추가)')}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            {isObserver ? '실시간 평균 점수: ' : '현재 총점: '}
            <strong style={{ color: 'var(--primary)' }}>
              {isObserver ? candidate.average : getJudgeTotal(candidate, selectedJudge)}
            </strong>/100
          </span>
          {!isObserver && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                onClick={() => onToggleCompletion(candidate.id, isCompleted)} 
                className={`premium-button ${isCompleted ? 'completed-btn' : 'complete-btn'}`}
                style={{ 
                  padding: '4px 12px', 
                  fontSize: '0.8rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.3rem',
                  background: isCompleted ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.2)',
                  color: '#22c55e',
                  border: `1px solid ${isCompleted ? 'rgba(34, 197, 94, 0.2)' : '#22c55e'}`,
                  borderRadius: '20px'
                }}
              >
                {isCompleted ? <RotateCcw size={14} /> : <CheckCircle2 size={14} />}
                {isCompleted ? '심사 취소' : '심사 완료'}
              </button>
              <button onClick={() => deleteCandidate(candidate.id, candidate.name)} style={{ background: 'none', border: 'none', color: 'rgba(244, 63, 94, 0.6)', cursor: 'pointer', padding: '0 4px' }}>
                <Trash2 size={18} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Scoring Section */}
      {!isObserver && (
        SIMPLE_JUDGES.includes(selectedJudge) ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginTop: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <label style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>총점 입력 (0~100):</label>
              <input 
                type="number"
                className="premium-input score-input"
                style={{ maxWidth: '120px', textAlign: 'center' }}
                placeholder="0"
                min="0"
                max="100"
                value={candidate.scores[selectedJudge]?.simpleTotal ?? ''}
                onChange={(e) => updateSimpleScore(candidate.id, e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button 
                onClick={() => updateItemStrikes(candidate.id, 'simple', 1)}
                style={{ background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.2)', color: '#f43f5e', borderRadius: '8px', padding: '4px 8px', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
              >
                <X size={14} /> <span style={{ fontSize: '0.8rem', marginLeft: '2px' }}>X 추가</span>
              </button>
              <div style={{ display: 'flex', gap: '2px' }}>
                {Array.from({ length: candidate.scores[selectedJudge]?.itemStrikes?.['simple'] || 0 }).map((_: any, i: number) => (
                  <X key={i} size={16} color="#f43f5e" strokeWidth={3} />
                ))}
              </div>
              {(candidate.scores[selectedJudge]?.itemStrikes?.['simple'] || 0) > 0 && (
                <button 
                  onClick={() => updateItemStrikes(candidate.id, 'simple', -1)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.7rem' }}
                >
                  취소
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="scoring-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
            {EVALUATION_ITEMS.map((item: EvaluationItem) => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255, 255, 255, 0.02)', padding: '0.8rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.03)' }}>
                <label style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.7)', flex: 1 }}>{item} ({JUDGE_SCORE_LIMITS[selectedJudge][item]})</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <input type="number" className="premium-input score-input" style={{ width: '60px', padding: '6px', textAlign: 'center', fontSize: '0.9rem' }} min="0" max={JUDGE_SCORE_LIMITS[selectedJudge][item]} value={candidate.scores[selectedJudge]?.[item] ?? ''} onChange={(e) => updateDetailScore(candidate.id, item, e.target.value)} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <button onClick={() => updateItemStrikes(candidate.id, item, 1)} style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.2)', color: '#f43f5e', borderRadius: '6px', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={14} strokeWidth={3} /></button>
                    <div style={{ display: 'flex', gap: '1px' }}>{Array.from({ length: candidate.scores[selectedJudge]?.itemStrikes?.[item] || 0 }).map((_: any, i: number) => (<X key={i} size={14} color="#f43f5e" strokeWidth={3} />))}</div>
                    {(candidate.scores[selectedJudge]?.itemStrikes?.[item] || 0) > 0 && (<button onClick={() => updateItemStrikes(candidate.id, item, -1)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.65rem' }}>-</button>)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Sub-sections */}
      <CommentSection 
        candidate={candidate}
        selectedJudge={selectedJudge}
        commentInput={commentInput}
        isExpanded={isCommentExpanded}
        onToggleExpand={onToggleComment}
        onInputChange={onCommentInputChange}
        onAddComment={addComment}
        onDeleteComment={deleteComment}
      />

    </div>
  );
};

export default CandidateScoreCard;
