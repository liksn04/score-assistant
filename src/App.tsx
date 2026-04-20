import React, { useState, useEffect } from 'react';
import type { Candidate, JudgeConfig } from './types';
import { useCandidates } from './hooks/useCandidates';
import { useJudgeActions } from './hooks/useJudgeActions';
import { useAuditions } from './hooks/useAuditions';
import { useAuth } from './hooks/useAuth';
import { firebaseService } from './api/firebaseService';
import PinModal from './components/auth/PinModal';
import { AuditionSettingsModal } from './components/admin/AuditionSettingsModal';
import CandidateScoreCard from './components/candidate/CandidateScoreCard';
import Leaderboard from './components/leaderboard/Leaderboard';
import StatisticsPanel from './components/stats/StatisticsPanel';
import { LogOut, Star, UserPlus, Users, LayoutGrid, Plus, Edit2, CheckCircle, ChevronDown, ChevronUp, Database, Settings } from 'lucide-react';
import { getJudgeScore } from './utils/statsUtils';

const App: React.FC = () => {
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(false);
  const [isAddingAudition, setIsAddingAudition] = useState(false);
  const [newAuditionName, setNewAuditionName] = useState('');
  const [newAdminPin, setNewAdminPin] = useState('000000');
  
  const [selectedJudgeToAuth, setSelectedJudgeToAuth] = useState<JudgeConfig | null>(null);
  const [isAdminPinModalOpen, setIsAdminPinModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const { judgeRole, isAdmin, isLoadingAuth, loginWithPin, loginAdmin, logout } = useAuth();
  const { auditions, activeAuditionId, setActiveAuditionId, isLoading: isAuditionLoading } = useAuditions();
  const activeAudition = auditions.find(a => a.id === activeAuditionId);
  const activeJudges = activeAudition?.activeJudges || [];
  
  const { candidates, sortedCandidates, isLoading: isCandidatesLoading } = useCandidates(activeAudition || null);
  
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
  } = useJudgeActions(candidates, activeAudition || null);

  const isArchived = activeAudition?.status === 'archived';

  useEffect(() => {
    if (judgeRole) {
      setSelectedJudge(judgeRole);
      setSelectedJudgeToAuth(null);
    } else {
      setSelectedJudge(null);
    }
  }, [judgeRole, setSelectedJudge]);

  const handleCreateAudition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAuditionName.trim()) return;
    try {
      const newAud = await firebaseService.createAudition(newAuditionName, newAdminPin);
      setActiveAuditionId(newAud.id);
      setNewAuditionName('');
      setNewAdminPin('000000');
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

  const handleSettingsClick = () => {
    if (!activeAudition) return;
    if (isAdmin) {
      setIsSettingsModalOpen(true);
    } else {
      setIsAdminPinModalOpen(true);
    }
  };

  const handleAdminAuth = async (pin: string) => {
    const success = await loginAdmin(pin, activeAudition);
    if (success) {
      setIsAdminPinModalOpen(false);
      setIsSettingsModalOpen(true);
    }
    return success;
  };

  const handleSaveSettings = async (judges: JudgeConfig[], dropCount: number) => {
    if (activeAuditionId) {
      await firebaseService.updateAuditionSettings(activeAuditionId, judges, dropCount);
    }
  };

  // 헬퍼: 현재 오디션 기반 단순 총점 가져오기
  const getJudgeTotal = (candidate: Candidate, judgeName: string) => {
    if (!activeAudition) return 0;
    return getJudgeScore(candidate, judgeName, activeAudition) || 0;
  };

  if (isLoadingAuth || isAuditionLoading || isCandidatesLoading) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-dark)', color: 'white', fontSize: '1.2rem'
      }}>
        <div className="fade-in">시스탬 준비 중...</div>
      </div>
    );
  }

  return (
    <div className="container">
      <header className="fade-in" style={{ padding: '2rem 0 3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.8rem', marginBottom: '0.2rem' }}>
          <Star size={36} className="header-star" color="var(--primary)" fill="var(--primary)" />
          <h1 className="main-title" style={{ marginBottom: 0 }}>Audition Master</h1>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '1.05rem', fontWeight: 400, textAlign: 'center', letterSpacing: '0.5px' }}>Premium Multi-Criteria Scoring System</p>
      </header>

      {!currentJudge ? (
        <div className="landing-page fade-in">
          {/* Audition Management Panel */}
          <div className="glass-card" style={{ padding: '2.2rem 2.5rem', marginBottom: '3.5rem' }}>
            <div className="flex-between" style={{ marginBottom: '2.2rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Database size={24} color="var(--primary)" />
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>오디션 관리</h2>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  className="premium-button secondary-btn" 
                  onClick={handleSettingsClick}
                  disabled={!activeAudition}
                >
                  <Settings size={18} /> 오디션 상세 설정
                </button>
                <button 
                  className="premium-button" 
                  onClick={() => setIsAddingAudition(true)}
                >
                  <Plus size={18} /> 새 오디션 시작
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.8rem' }}>
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
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>총 참가팀</p>
                  <h3 style={{ fontSize: '1.5rem' }}>{candidates.length}팀</h3>
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
                  {candidates.filter(c => Object.values(c.scores).some(s => s.isCompleted)).length}건
                  </h3>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-between" style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <LayoutGrid size={24} color="var(--primary)" />
              <h2 style={{ fontSize: '1.6rem' }}>심사위원 선택</h2>
            </div>
            {isAdmin && <span style={{ color: '#22c55e', fontSize: '0.85rem' }}>관리자 권한 활성화됨</span>}
          </div>

          <div className="judge-selection" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {activeAudition?.judges?.map((judge: JudgeConfig) => (
              <div 
                key={judge.name} 
                className="glass-card judge-card hover-lift" 
                style={{ cursor: 'pointer', textAlign: 'center' }} 
                onClick={() => setSelectedJudgeToAuth(judge)}
              >
                <div className="judge-icon-wrapper">
                  <Users size={40} color="var(--primary)" />
                </div>
                <h3 style={{ fontSize: '1.6rem', marginBottom: '0.5rem', fontWeight: 600 }}>{judge.name} {judge.type !== 'observer' && '심사위원'}</h3>
                <p style={{ color: 'var(--primary)', fontSize: '0.9rem', fontWeight: 'bold' }}>
                  {judge.type === 'observer' ? '모니터링 하기 →' : '심사 시작하기 →'}
                </p>
              </div>
            ))}
            {(!activeAudition?.judges || activeAudition.judges.length === 0) && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', borderRadius: '16px' }}>
                <p>등록된 심사위원이 없습니다. 상세 설정을 통해 심사위원을 추가하세요.</p>
              </div>
            )}
          </div>

          {/* Judge PIN Verification Modal */}
          {selectedJudgeToAuth && (
            <PinModal 
              title={`${selectedJudgeToAuth.name} ${selectedJudgeToAuth.type !== 'observer' ? '심사위원' : ''}`}
              onVerify={(pin) => loginWithPin(selectedJudgeToAuth.name, pin, activeAudition!)}
              onClose={() => setSelectedJudgeToAuth(null)}
            />
          )}

          {/* Admin PIN Verification Modal */}
          {isAdminPinModalOpen && (
            <PinModal 
              title="관리자 설정"
              onVerify={handleAdminAuth}
              onClose={() => setIsAdminPinModalOpen(false)}
            />
          )}

          {/* Admin Settings Modal */}
          {isSettingsModalOpen && activeAudition && (
            <AuditionSettingsModal 
              audition={activeAudition}
              onSave={handleSaveSettings}
              onClose={() => setIsSettingsModalOpen(false)}
            />
          )}

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
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>오디션 이름</label>
                    <input 
                      autoFocus
                      className="premium-input" 
                      style={{ width: '100%' }} 
                      placeholder="예: 2024년 1학기 라이브 클럽 오디션"
                      value={newAuditionName}
                      onChange={(e) => setNewAuditionName(e.target.value)}
                    />
                  </div>
                  <div style={{ marginBottom: '2rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>관리자 PIN (6자리)</label>
                    <input 
                      type="password"
                      maxLength={6}
                      className="premium-input" 
                      style={{ width: '100%' }} 
                      placeholder="기본값: 000000"
                      value={newAdminPin}
                      onChange={(e) => setNewAdminPin(e.target.value.replace(/[^0-9]/g, ''))}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button type="button" className="premium-button secondary-btn" style={{ flex: 1 }} onClick={() => setIsAddingAudition(false)}>취소</button>
                    <button type="submit" className="premium-button" style={{ flex: 1 }} disabled={!newAuditionName.trim() || newAdminPin.length !== 6}>생성하기</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="dashboard fade-in">
          {/* Dashboard Code (same mostly, slightly refactored with activeAudition logic) */}
          <div className="dashboard-header">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Star size={24} color="#fbbf24" fill="#fbbf24" />
                <h2 style={{ fontSize: '1.6rem', wordBreak: 'keep-all' }}>
                  {isObserver ? '참관자 모니터링' : `${currentJudge} 심사위원`}
                </h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginLeft: '0.2rem' }}>
                <span className="glass-card" style={{ padding: '0.2rem 0.6rem', width: 'auto', fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)' }}>
                  {activeAudition?.name}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>보안 세션 활성화</span>
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
                <LogOut size={18} /> 
                {isObserver ? '나가기' : '심사 종료'}
              </button>
            </div>

          <div className="dashboard-content">
            <section style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {!isObserver && (
                <div className="glass-card fade-in">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '1.5rem' }}>
                    <UserPlus size={22} color="var(--primary)" />
                    <h3 style={{ fontSize: '1.4rem' }}>새 팀 등록</h3>
                  </div>
                  <form onSubmit={addCandidate} className="flex-column" style={{ gap: '1rem' }}>
                    <div className="input-row" style={{ display: 'flex', gap: '1rem' }}>
                      <input 
                        className="premium-input" 
                        placeholder="팀 이름" 
                        value={newCandidateName} 
                        onChange={(e) => setNewCandidateName(e.target.value)} 
                      />
                      <input 
                        className="premium-input" 
                        placeholder="곡명 (예: 밤양갱)" 
                        value={newSongTitle} 
                        onChange={(e) => setNewSongTitle(e.target.value)} 
                      />
                    </div>
                    <button type="submit" className="premium-button">팀 등록</button>
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
                  {isObserver ? '실시간 참가 현황' : '채점 진행 중인 팀'}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {candidates
                    .filter(c => !currentJudge || !(c.scores[currentJudge]?.isCompleted))
                    .map((candidate: Candidate) => (
                      <CandidateScoreCard 
                        key={candidate.id}
                        candidate={candidate}
                        selectedJudge={currentJudge!}
                        activeAudition={activeAudition!}
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
                        onAddComment={addComment}
                        onDeleteComment={deleteComment}
                        onToggleCompletion={toggleCompletion}
                        isReadOnly={isArchived}
                      />
                    ))}
                </div>

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
                          심사 완료된 팀 ({candidates.filter(c => currentJudge && c.scores[currentJudge]?.isCompleted).length}팀)
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
                              activeAudition={activeAudition!}
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
                              onAddComment={addComment}
                              onDeleteComment={deleteComment}
                              onToggleCompletion={toggleCompletion}
                              isReadOnly={isArchived}
                            />
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="glass-card" style={{ padding: '1rem', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.8rem', fontWeight: 500 }}>리더보드 반영 심사위원 선택</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem' }}>
                  {activeAudition?.judges.filter(j => j.type !== 'observer').map(j => {
                    const isActive = activeJudges.includes(j.name);
                    return (
                      <button 
                        key={j.name}
                        onClick={() => {
                          if (!activeAuditionId) return;
                          const newActive = isActive 
                            ? activeJudges.filter(aj => aj !== j.name)
                            : [...activeJudges, j.name];
                          firebaseService.updateActiveJudges(activeAuditionId, newActive);
                        }}
                        style={{
                          padding: '0.5rem 1rem',
                          borderRadius: '10px',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          border: '1px solid',
                          borderColor: isActive ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                          background: isActive ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255,255,255,0.05)',
                          color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                        }}
                      >
                        {j.name} {isActive ? 'ON' : 'OFF'}
                      </button>
                    );
                  })}
                </div>
              </div>
              <Leaderboard sortedCandidates={sortedCandidates} activeAudition={activeAudition!} />
            </div>
          </div>

          <div style={{ marginTop: '3rem' }}>
            <StatisticsPanel candidates={candidates} activeAudition={activeAudition || null} />
          </div>
        </div>
      )}
      <footer style={{ 
        marginTop: '4rem', padding: '2rem 0', 
        borderTop: '1px solid rgba(255,255,255,0.05)',
        textAlign: 'center', color: 'rgba(255,255,255,0.3)',
        fontSize: '0.9rem', letterSpacing: '1px'
      }}>
        <p>Developed by <strong>Kim Junmo</strong></p>
        <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', opacity: 0.5 }}>© 2024 Audition Master. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default App;
