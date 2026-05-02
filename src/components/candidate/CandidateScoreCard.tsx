import React from 'react';
import { X, Trash2, CheckCircle2, RotateCcw } from 'lucide-react';
import type { Candidate, Audition, Comment } from '../../types';
import CommentSection from './CommentSection';

interface CandidateScoreCardProps {
  candidate: Candidate;
  selectedJudge: string;
  activeAudition: Audition;
  isObserver: boolean;
  getJudgeTotal: (candidate: Candidate, judge: string) => number;
  editingSongId: string | null;
  setEditingSongId: (id: string | null) => void;
  tempSongTitle: string;
  setTempSongTitle: (title: string) => void;
  updateSongTitle: (id: string, title: string) => void;
  deleteCandidate: (id: string, name: string) => void;
  updateSimpleScore: (id: string, value: string) => void;
  updateDetailScore: (id: string, item: string, value: string) => void;
  updateItemStrikes: (id: string, item: string, delta: number) => void;
  commentInput: string;
  isCommentExpanded: boolean;
  onToggleComment: (id: string) => void;
  onCommentInputChange: (id: string, value: string) => void;
  onAddComment: (id: string) => void;
  onDeleteComment: (id: string, comment: Comment) => void;
  onToggleCompletion: (id: string, currentStatus: boolean) => void;
  isReadOnly?: boolean;
  readOnlyLabel?: string;
}

const CandidateScoreCard: React.FC<CandidateScoreCardProps> = ({
  candidate,
  selectedJudge,
  activeAudition,
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
  onAddComment,
  onDeleteComment,
  onToggleCompletion,
  isReadOnly = false,
  readOnlyLabel = 'Locked',
}) => {
  const isCompleted = candidate.scores[selectedJudge]?.isCompleted || false;
  const judgeConfig = activeAudition.judges.find(j => j.name === selectedJudge);

  return (
    <div className="glass-card candidate-row">
      <div className="candidate-row-header">
        <div className="candidate-title-block" style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          <span style={{ fontSize: '1.2rem', fontWeight: 600 }}>{candidate.name}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {editingSongId === candidate.id && !isObserver ? (
              <div className="candidate-song-editor" style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                <input 
                  className="premium-input" 
                  style={{ padding: '2px 8px', fontSize: '0.8rem', width: '120px' }}
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
                className="candidate-song-text"
                style={{ 
                  fontSize: '0.85rem', 
                  color: 'var(--text-muted)', 
                  cursor: isObserver ? 'default' : 'pointer',
                  wordBreak: 'break-all'
                }}
                onClick={() => {
                  if (isObserver) return;
                  setEditingSongId(candidate.id);
                  setTempSongTitle(candidate.song || '');
                }}
              >
                🎵 {candidate.song || (isObserver || isReadOnly ? '곡 정보 없음' : '곡명 미입력')}
              </span>
            )}
          </div>
        </div>
        <div className="score-info-group">
          <span className="candidate-score-summary" style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            {isObserver ? '평균: ' : '총점: '}
            <strong style={{ color: 'var(--primary)', fontSize: '1.1rem' }}>
              {isObserver ? candidate.average : getJudgeTotal(candidate, selectedJudge)}
            </strong>
            {(!isObserver && judgeConfig && judgeConfig.type === 'detail') && 
              <span style={{ fontSize: '0.75rem', marginLeft: '2px' }}>
                / {judgeConfig.criteria?.reduce((sum, c) => sum + c.maxScore, 0) || 100}
              </span>
            }
            {(!isObserver && (!judgeConfig || judgeConfig.type === 'simple')) && <span style={{ fontSize: '0.75rem', marginLeft: '2px' }}>/ 100</span>}
          </span>
          {!isObserver && !isReadOnly && (
            <div className="candidate-actions" style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                onClick={() => onToggleCompletion(candidate.id, isCompleted)} 
                className={`premium-button ${isCompleted ? 'completed-btn' : 'complete-btn'}`}
                style={{ 
                  padding: '4px 10px', 
                  fontSize: '0.75rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.3rem',
                  background: isCompleted ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.2)',
                  color: '#22c55e',
                  border: `1px solid ${isCompleted ? 'rgba(34, 197, 94, 0.2)' : '#22c55e'}`,
                  borderRadius: '20px',
                  whiteSpace: 'nowrap'
                }}
              >
                {isCompleted ? <RotateCcw size={12} /> : <CheckCircle2 size={12} />}
                {isCompleted ? '취소' : '완료'}
              </button>
              <button className="candidate-delete-btn" onClick={() => deleteCandidate(candidate.id, candidate.name)} style={{ background: 'none', border: 'none', color: 'rgba(244, 63, 94, 0.6)', cursor: 'pointer', padding: '0 4px' }}>
                <Trash2 size={18} />
              </button>
            </div>
          )}
          {isReadOnly && !isObserver && (
            <div className="bg-amber-500/10 text-amber-500 px-2 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider">
              {readOnlyLabel}
            </div>
          )}
        </div>
      </div>

      {/* Scoring Section */}
      {!isObserver && judgeConfig && (
        judgeConfig.type === 'simple' ? (
          <div className="simple-score-row" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginTop: '1rem' }}>
            <div className="simple-score-entry" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <label className="simple-score-label" style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>총점 입력 (0~100):</label>
              <input 
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                aria-label={`${candidate.name} 총점 입력`}
                className="premium-input score-input"
                style={{ width: '80px', textAlign: 'center' }}
                placeholder="0"
                min="0"
                max="100"
                value={candidate.scores[selectedJudge]?.simpleTotal ?? ''}
                onChange={(e) => updateSimpleScore(candidate.id, e.target.value)}
                disabled={isReadOnly}
              />
            </div>
            {!isReadOnly && (
              <div className="simple-strike-row" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button 
                  onClick={() => updateItemStrikes(candidate.id, 'simple', 1)}
                  style={{ background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.2)', color: '#f43f5e', borderRadius: '8px', padding: '4px 8px', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                >
                  <X size={14} /> <span style={{ fontSize: '0.8rem', marginLeft: '2px' }}>X 추가</span>
                </button>
                <div style={{ display: 'flex', gap: '2px' }}>
                  {Array.from({ length: candidate.scores[selectedJudge]?.itemStrikes?.['simple'] || 0 }).map((_, i: number) => (
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
            )}
            {isReadOnly && (candidate.scores[selectedJudge]?.itemStrikes?.['simple'] || 0) > 0 && (
              <div style={{ display: 'flex', gap: '2px' }}>
                {Array.from({ length: candidate.scores[selectedJudge]?.itemStrikes?.['simple'] || 0 }).map((_, i: number) => (
                  <X key={i} size={16} color="#f43f5e" strokeWidth={3} />
                ))}
              </div>
            )}
          </div>
        ) : judgeConfig.type === 'detail' && judgeConfig.criteria ? (
          <div className="scoring-grid" style={{ marginTop: '1rem' }}>
            {judgeConfig.criteria.map((criterion) => (
              <div className="criterion-card" key={criterion.item} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255, 255, 255, 0.02)', padding: '0.8rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.03)' }}>
                <label style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.7)', flex: 1 }}>{criterion.item} ({criterion.maxScore})</label>
                <div className="criterion-controls" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <input 
                    type="number" 
                    inputMode="numeric"
                    pattern="[0-9]*"
                    aria-label={`${candidate.name} ${criterion.item} 점수 입력`}
                    className="premium-input score-input criterion-input" 
                    style={{ width: '60px', padding: '6px', textAlign: 'center', fontSize: '0.9rem' }} 
                    min="0" 
                    max={criterion.maxScore} 
                    value={typeof candidate.scores[selectedJudge]?.[criterion.item] === 'number' ? Number(candidate.scores[selectedJudge]?.[criterion.item]) : ''} 
                    onChange={(e) => updateDetailScore(candidate.id, criterion.item, e.target.value)} 
                    disabled={isReadOnly}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    {!isReadOnly && (
                      <button onClick={() => updateItemStrikes(candidate.id, criterion.item, 1)} style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.2)', color: '#f43f5e', borderRadius: '6px', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={14} strokeWidth={3} /></button>
                    )}
                    <div style={{ display: 'flex', gap: '1px' }}>{Array.from({ length: candidate.scores[selectedJudge]?.itemStrikes?.[criterion.item] || 0 }).map((_, i: number) => (<X key={i} size={14} color="#f43f5e" strokeWidth={3} />))}</div>
                    {!isReadOnly && (candidate.scores[selectedJudge]?.itemStrikes?.[criterion.item] || 0) > 0 && (<button onClick={() => updateItemStrikes(candidate.id, criterion.item, -1)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.65rem' }}>-</button>)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null
      )}

      {/* Sub-sections */}
      <CommentSection 
        candidate={candidate}
        selectedJudge={selectedJudge}
        commentInput={commentInput}
        isExpanded={isCommentExpanded}
        onToggleExpand={onToggleComment}
        onInputChange={onCommentInputChange}
        onAddComment={onAddComment}
        onDeleteComment={onDeleteComment}
        isReadOnly={isObserver || isReadOnly}
      />
    </div>
  );
};

export default CandidateScoreCard;
