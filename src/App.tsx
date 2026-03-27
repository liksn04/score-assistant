import React from 'react';
import type { Candidate, JudgeName, EvaluationItem } from './types';
import { SIMPLE_JUDGES, EVALUATION_ITEMS } from './types';
import { useCandidates } from './hooks/useCandidates';
import { useJudgeActions } from './hooks/useJudgeActions';
import { useAuditions } from './hooks/useAuditions';
import { useAuth } from './hooks/useAuth';
import { firebaseService } from './api/firebaseService';
import Login from './components/auth/Login';
import { 
  Users, Star, LogOut, UserPlus, ChevronDown, ChevronUp, 
  CheckCircle, Plus, Edit2, Database, LayoutGrid, ShieldAlert, ShieldCheck
} from 'lucide-react';
import CandidateScoreCard from './components/candidate/CandidateScoreCard';
import Leaderboard from './components/leaderboard/Leaderboard';

const App: React.FC = () => {
  const [isCompletedExpanded, setIsCompletedExpanded] = React.useState(false);
  const [isAddingAudition, setIsAddingAudition] = React.useState(false);
  const [newAuditionName, setNewAuditionName] = React.useState('');

  const { user, judgeRole, isLoadingAuth, login, logout } = useAuth();
  const { auditions, activeAuditionId, setActiveAuditionId, isLoading: isAuditionLoading } = useAuditions();
  const { candidates, sortedCandidates, isLoading: isCandidatesLoading } = useCandidates(activeAuditionId);
  
  const {
    selectedJudge: currentJudge, setSelectedJudge, isObserver,
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
  } = useJudgeActions(candidates, activeAuditionId);

  // 인증된 역할이 있으면 자동으로 심사위원 설정
  React.useEffect(() => {
    if (judgeRole) {
      setSelectedJudge(judgeRole);
    }
  }, [judgeRole, setSelectedJudge]);

  const activeAudition = auditions.find(a => a.id === activeAuditionId);

  const handleCreateAudition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAuditionName.trim()) return;
    try {
      const newAud = await firebaseService.createAudition(newAuditionName);
      setActiveAuditionId(newAud.id);
      setNewAuditionName('');
      setIsAddingAudition(false);
    } catch (error) {
      alert("오디션 생성 중 오류가 발생했습니다.");
    }
  };

  const handleUpdateAuditionName = async () => {
    if (!activeAuditionId || !activeAudition) return;
    const newName = window.prompt("새로운 오디션 이름을 입력하세요:", activeAudition.name);
    if (newName && newName.trim() && newName !== activeAudition.name) {
      try {
        await firebaseService.updateAuditionName(activeAuditionId, newName.trim());
      } catch (error) {
        alert("이름 변경 중 오류가 발생했습니다.");
      }
    }
  };

  // 심사위원별 총점 계산 도우미
  const getJudgeTotal = (candidate: Candidate, judge: JudgeName) => {
    const scores = candidate.scores[judge];
    if (!scores) return 0;
    if (SIMPLE_JUDGES.includes(judge)) return scores.simpleTotal || 0;
    return EVALUATION_ITEMS.reduce((sum: number, item: EvaluationItem) => sum + (Number(scores[item]) || 0), 0);
  };

  if (isLoadingAuth || isAuditionLoading || isCandidatesLoading) {
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
        <div className="fade-in">시스탬 준비 중...</div>
      </div>
    );
  }

  // 로그인하지 않은 경우
  if (!user) {
    return <Login onLogin={login} />;
  }

  // 인증은 되었으나 심사위원 명단에 없는 이메일인 경우
  if (!judgeRole) {
    return (
      <div style={{ 
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', 
        background: 'var(--bg-dark)', color: 'white' 
      }}>
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', maxWidth: '500px' }}>
          <ShieldAlert size={64} color="#f43f5e" style={{ marginBottom: '1.5rem' }} />
          <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem' }}>접근 권한 없음</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: 1.6 }}>
            인증된 계정(<strong>{user.email}</strong>)은 등록된 심사위원 명단에 없습니다. <br />
            관리자에게 문의하거나 다른 계정으로 로그인해 주세요.
          </p>
          <button className="premium-button" onClick={logout} style={{ width: '100%' }}>다른 계정으로 로그인</button>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <header className="fade-in" style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
          <Star size={40} color="var(--primary)" fill="var(--primary)" />
          <h1 style={{ 
            fontSize: '3.5rem', 
            background: 'linear-gradient(to right, #fff, #94a3b8)', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-1px'
          }}>
            Audition Master
          </h1>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', fontWeight: 300 }}>Premium Multi-Criteria Scoring System</p>
      </header>

      {!currentJudge ? (
        <div className="landing-page fade-in">
          {/* Audition Management Panel */}
          <div className="glass-card" style={{ 
            padding: '2rem', 
            marginBottom: '3rem', 
            border: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'rgba(255, 255, 255, 0.02)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Database size={24} color="var(--primary)" />
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>오디션 관리</h2>
              </div>
              <button 
                className="premium-button" 
                style={{ height: '40px', padding: '0 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                onClick={() => setIsAddingAudition(true)}
              >
                <Plus size={18} /> 새 오디션 시작
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {/* Audition Selection Card */}
              <div className="glass-card inner-card" style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.2)' }}>
                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.8rem' }}>활성 오디션 선택</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select 
                    className="premium-input" 
                    style={{ flex: 1, height: '45px', cursor: 'pointer' }}
                    value={activeAuditionId || ''}
                    onChange={(e) => setActiveAuditionId(e.target.value)}
                  >
                    {auditions.map(aud => (
                      <option key={aud.id} value={aud.id}>{aud.name}</option>
                    ))}
                  </select>
                  <button 
                    className="premium-button" 
                    style={{ width: '45px', padding: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(255,255,255,0.05)' }}
                    onClick={handleUpdateAuditionName}
                    title="이름 변경"
                  >
                    <Edit2 size={16} />
                  </button>
                </div>
              </div>

              {/* Stats Card 1 */}
              <div className="glass-card inner-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{ width: '50px', height: '50px', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <Users size={24} color="#38bdf8" />
                </div>
                <div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>총 참가자</p>
                  <h3 style={{ fontSize: '1.5rem' }}>{candidates.length}명</h3>
                </div>
              </div>

              {/* Stats Card 2 */}
              <div className="glass-card inner-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{ width: '50px', height: '50px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <CheckCircle size={24} color="#22c55e" />
                </div>
                <div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>심사 완료 항목</p>
                  <h3 style={{ fontSize: '1.5rem' }}>
                    {candidates.reduce((acc, curr) => acc + Object.values(curr.scores).filter(s => s.isCompleted).length, 0)}건
                  </h3>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '2rem' }}>
            <LayoutGrid size={24} color="var(--primary)" />
            <h2 style={{ fontSize: '1.6rem' }}>내 역할 확인</h2>
          </div>

          <div className="judge-selection" style={{ 
            maxWidth: '400px', margin: '0 auto'
          }}>
              <div 
                className="glass-card judge-card hover-lift" 
                style={{ padding: '3rem', cursor: 'pointer', textAlign: 'center', transition: 'all 0.3s ease', border: '2px solid var(--primary)' }} 
                onClick={() => setSelectedJudge(judgeRole)}
              >
                <div className="judge-icon-wrapper" style={{ 
                  width: '80px', 
                  height: '80px', 
                  margin: '0 auto 1.5rem',
                  background: 'rgba(124, 58, 237, 0.1)',
                  borderRadius: '24px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  <ShieldCheck size={40} color="var(--primary)" />
                </div>
                <h3 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>{judgeRole} 심사위원</h3>
                <p style={{ color: 'var(--text-muted)' }}>심사 시작하기 &rarr;</p>
              </div>
          </div>

          <button onClick={logout} className="premium-button secondary-btn" style={{ marginTop: '2rem', margin: '2rem auto', display: 'flex' }}>
            <LogOut size={18} style={{ marginRight: '0.5rem' }} /> 로그아웃
          </button>

          {/* New Audition Modal */}
          {isAddingAudition && (
            <div className="modal-overlay fade-in" style={{ 
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
              background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
              display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
            }}>
              <div className="glass-card" style={{ padding: '2.5rem', width: '100%', maxWidth: '450px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                  <Plus size={24} color="var(--primary)" />
                  <h2 style={{ fontSize: '1.6rem' }}>새 오디션 생성</h2>
                </div>
                <form onSubmit={handleCreateAudition}>
                  <input 
                    autoFocus
                    className="premium-input" 
                    style={{ width: '100%', marginBottom: '1.5rem' }} 
                    placeholder="오디션 이름 (예: 2024 버츄얼 아이돌 상반기)"
                    value={newAuditionName}
                    onChange={(e) => setNewAuditionName(e.target.value)}
                  />
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button type="button" className="premium-button secondary-btn" style={{ flex: 1 }} onClick={() => setIsAddingAudition(false)}>취소</button>
                    <button type="submit" className="premium-button" style={{ flex: 1 }}>생성하기</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="dashboard fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Star color="#fbbf24" fill="#fbbf24" />
                <h2 style={{ fontSize: '1.8rem' }}>
                  {isObserver ? '참관자 모니터링 대시보드' : `${currentJudge} 심사위원 대시보드`}
                </h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginLeft: '2.5rem' }}>
                <p style={{ color: 'var(--text-muted)' }}>현재 오디션: <strong>{activeAudition?.name}</strong></p>
                <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
                <p style={{ color: 'var(--text-muted)' }}>로그인 계정: <strong>{user?.email}</strong></p>
              </div>
            </div>
            <button 
              className="premium-button logout-btn" 
              style={{ 
                background: 'rgba(244, 63, 94, 0.1)', 
                color: '#f43f5e', 
                border: '1px solid rgba(244, 63, 94, 0.2)' 
              }} 
              onClick={logout}
            >
              <LogOut size={18} style={{ marginRight: '0.5rem' }} /> 
              {isObserver ? '로그아웃 및 나가기' : '심사 종료(로그아웃)'}
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
                    <h3 style={{ fontSize: '1.4rem' }}>새 참가자 등록 ({activeAudition?.name})</h3>
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
                  {isObserver ? '실시간 참가자 현황' : (SIMPLE_JUDGES.includes(currentJudge!) ? '단순 합산 채점' : '항목별 세부 채점')}
                </h3>
                {/* In-progress Candidates */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {candidates
                    .filter(c => !currentJudge || !(c.scores[currentJudge]?.isCompleted))
                    .map((candidate: Candidate) => (
                      <CandidateScoreCard 
                        key={candidate.id}
                        candidate={candidate}
                        selectedJudge={currentJudge!}
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
                {candidates.some(c => currentJudge && c.scores[currentJudge]?.isCompleted) && (
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
                          심사 완료된 참가자 ({candidates.filter(c => currentJudge && c.scores[currentJudge]?.isCompleted).length}명)
                        </h3>
                      </div>
                      {isCompletedExpanded ? <ChevronUp size={20} color="#22c55e" /> : <ChevronDown size={20} color="#22c55e" />}
                    </div>
                    
                    {isCompletedExpanded && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', marginTop: '1.5rem' }}>
                        {candidates
                          .filter(c => currentJudge && c.scores[currentJudge]?.isCompleted)
                          .map((candidate: Candidate) => (
                            <CandidateScoreCard 
                              key={candidate.id}
                              candidate={candidate}
                              selectedJudge={currentJudge!}
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
