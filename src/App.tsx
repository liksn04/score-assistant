import React from 'react';
import type { Candidate, JudgeName, EvaluationItem } from './types';
import { JUDGES, SIMPLE_JUDGES, EVALUATION_ITEMS } from './types';
import { useCandidates } from './hooks/useCandidates';
import { useJudgeActions } from './hooks/useJudgeActions';
import { Users, Star, LogOut, UserPlus, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';
import CandidateScoreCard from './components/candidate/CandidateScoreCard';
import Leaderboard from './components/leaderboard/Leaderboard';

const App: React.FC = () => {
  const [isCompletedExpanded, setIsCompletedExpanded] = React.useState(false);

  const { candidates, sortedCandidates, isLoading } = useCandidates();
  const {
    selectedJudge, setSelectedJudge, isObserver,
    newCandidateName, setNewCandidateName,
    newSongTitle, setNewSongTitle,
    commentInputs, setCommentInputs,
    expandedComments, setExpandedComments,
    editingSongId, setEditingSongId,
    tempSongTitle, setTempSongTitle,
    addCandidate, updateSimpleScore, updateDetailScore,
    addComment, deleteComment,
    updateItemStrikes, updateSongTitle, deleteCandidate,
    toggleCompletion
  } = useJudgeActions(candidates);


  // 심사위원별 총점 계산 도우미
  const getJudgeTotal = (candidate: Candidate, judge: JudgeName) => {
    const scores = candidate.scores[judge];
    if (!scores) return 0;
    if (SIMPLE_JUDGES.includes(judge)) return scores.simpleTotal || 0;
    
    // EVALUATION_ITEMS는 상단에서 정식 임포트하여 사용 (불필요한 require 제거)
    return EVALUATION_ITEMS.reduce((sum: number, item: EvaluationItem) => sum + (Number(scores[item]) || 0), 0);
  };

  if (isLoading) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'var(--bg-dark)',
        color: 'white',
        fontSize: '1.2rem'
      }}>
        <div className="fade-in">데이터 로드 중...</div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <header className="fade-in" style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ 
          fontSize: '3rem', 
          marginBottom: '0.5rem', 
          background: 'linear-gradient(to right, #fff, #94a3b8)', 
          WebkitBackgroundClip: 'text', 
          WebkitTextFillColor: 'transparent' 
        }}>
          Audition Master
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Premium Multi-Criteria Scoring System</p>
      </header>

      {!selectedJudge ? (
        <div className="judge-selection fade-in" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
          gap: '2rem',
          marginTop: '2rem'
        }}>
          {JUDGES.map((judge: JudgeName) => (
            <div 
              key={judge} 
              className="glass-card" 
              style={{ padding: '3rem', cursor: 'pointer', textAlign: 'center' }} 
              onClick={() => setSelectedJudge(judge)}
            >
              <Users size={56} style={{ marginBottom: '1.5rem', color: 'var(--primary)' }} />
              <h2 style={{ fontSize: '1.8rem' }}>{judge} 심사위원</h2>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>심사 시작하기</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="dashboard fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Star color="#fbbf24" fill="#fbbf24" />
              <h2 style={{ fontSize: '1.8rem' }}>
                {isObserver ? '참관자 모니터링 대시보드' : `${selectedJudge} 심사위원 대시보드`}
              </h2>
            </div>
            <button 
              className="premium-button logout-btn" 
              style={{ 
                background: 'rgba(244, 63, 94, 0.1)', 
                color: '#f43f5e', 
                border: '1px solid rgba(244, 63, 94, 0.2)' 
              }} 
              onClick={() => setSelectedJudge(null)}
            >
              <LogOut size={18} style={{ marginRight: '0.5rem' }} /> 
              {isObserver ? '나가기' : '심사 종료'}
            </button>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: isObserver ? '1fr' : '1.2fr 1.0fr', 
            gap: '2.5rem',
            alignItems: 'start'
          }}>
            {/* Input Section */}
            <section style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {!isObserver && (
                <div className="glass-card fade-in" style={{ padding: '2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '1.5rem' }}>
                    <UserPlus size={22} color="var(--primary)" />
                    <h3 style={{ fontSize: '1.4rem' }}>새 참가자 등록</h3>
                  </div>
                  <form onSubmit={addCandidate} style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <input 
                        className="premium-input" 
                        style={{ flex: 1 }} 
                        placeholder="참가자 이름" 
                        value={newCandidateName} 
                        onChange={(e) => setNewCandidateName(e.target.value)} 
                      />
                      <input 
                        className="premium-input" 
                        style={{ flex: 1 }} 
                        placeholder="곡명 (예: 밤양갱)" 
                        value={newSongTitle} 
                        onChange={(e) => setNewSongTitle(e.target.value)} 
                      />
                    </div>
                    <button type="submit" className="premium-button">참가자 등록</button>
                  </form>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <h3 style={{ 
                  fontSize: '1.4rem', 
                  borderLeft: '4px solid var(--primary)', 
                  paddingLeft: '1rem',
                  marginBottom: '0.5rem'
                }}>
                  {isObserver ? '실시간 참가자 현황' : (SIMPLE_JUDGES.includes(selectedJudge) ? '단순 합산 채점' : '항목별 세부 채점')}
                </h3>
                {/* In-progress Candidates */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {candidates
                    .filter(c => !selectedJudge || !(c.scores[selectedJudge]?.isCompleted))
                    .map((candidate: Candidate) => (
                      <CandidateScoreCard 
                        key={candidate.id}
                        candidate={candidate}
                        selectedJudge={selectedJudge!}
                        isObserver={isObserver}
                        getJudgeTotal={getJudgeTotal}
                        editingSongId={editingSongId}
                        setEditingSongId={setEditingSongId}
                        tempSongTitle={tempSongTitle}
                        setTempSongTitle={setTempSongTitle}
                        updateSongTitle={updateSongTitle}
                        deleteCandidate={deleteCandidate}
                        updateSimpleScore={updateSimpleScore}
                        updateDetailScore={updateDetailScore}
                        updateItemStrikes={updateItemStrikes}
                        commentInput={commentInputs[candidate.id] || ''}
                        isCommentExpanded={!!expandedComments[candidate.id]}
                        onToggleComment={(id) => setExpandedComments(prev => ({ ...prev, [id]: !prev[id] }))}
                        onCommentInputChange={(id, val) => setCommentInputs(prev => ({ ...prev, [id]: val }))}
                        addComment={addComment}
                        deleteComment={deleteComment}
                        onToggleCompletion={toggleCompletion}
                      />
                    ))}
                </div>

                {/* Completed Candidates Section (Accordion) */}
                {candidates.some(c => selectedJudge && c.scores[selectedJudge]?.isCompleted) && (
                  <div className="glass-card fade-in" style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(34, 197, 94, 0.03)', border: '1px solid rgba(34, 197, 94, 0.1)' }}>
                    <div 
                      onClick={() => setIsCompletedExpanded(!isCompletedExpanded)}
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        cursor: 'pointer',
                        padding: '0.5rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                        <CheckCircle size={20} color="#22c55e" />
                        <h3 style={{ fontSize: '1.2rem', color: '#22c55e' }}>
                          심사 완료된 참가자 ({candidates.filter(c => selectedJudge && c.scores[selectedJudge]?.isCompleted).length}명)
                        </h3>
                      </div>
                      {isCompletedExpanded ? <ChevronUp size={20} color="#22c55e" /> : <ChevronDown size={20} color="#22c55e" />}
                    </div>
                    
                    {isCompletedExpanded && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', marginTop: '1.5rem' }}>
                        {candidates
                          .filter(c => selectedJudge && c.scores[selectedJudge]?.isCompleted)
                          .map((candidate: Candidate) => (
                            <CandidateScoreCard 
                              key={candidate.id}
                              candidate={candidate}
                              selectedJudge={selectedJudge!}
                              isObserver={isObserver}
                              getJudgeTotal={getJudgeTotal}
                              editingSongId={editingSongId}
                              setEditingSongId={setEditingSongId}
                              tempSongTitle={tempSongTitle}
                              setTempSongTitle={setTempSongTitle}
                              updateSongTitle={updateSongTitle}
                              deleteCandidate={deleteCandidate}
                              updateSimpleScore={updateSimpleScore}
                              updateDetailScore={updateDetailScore}
                              updateItemStrikes={updateItemStrikes}
                              commentInput={commentInputs[candidate.id] || ''}
                              isCommentExpanded={!!expandedComments[candidate.id]}
                              onToggleComment={(id) => setExpandedComments(prev => ({ ...prev, [id]: !prev[id] }))}
                              onCommentInputChange={(id, val) => setCommentInputs(prev => ({ ...prev, [id]: val }))}
                              addComment={addComment}
                              deleteComment={deleteComment}
                              onToggleCompletion={toggleCompletion}
                            />
                          ))}
                      </div>
                    )}
                  </div>
                )}

              </div>
            </section>

            <Leaderboard sortedCandidates={sortedCandidates} />
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
