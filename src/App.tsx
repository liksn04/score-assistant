import React, { useState, useEffect } from 'react';
import type { Candidate, JudgeConfig } from './types';
import { useCandidates } from './hooks/useCandidates';
import { useJudgeActions } from './hooks/useJudgeActions';
import { useAuditions } from './hooks/useAuditions';
import { useAuth } from './hooks/useAuth';
import { firebaseService } from './api/firebaseService';
import PinModal from './components/auth/PinModal';
import { AuditionSettingsModal } from './components/admin/AuditionSettingsModal';
import ModalPortal from './components/common/ModalPortal';
import CandidateScoreCard from './components/candidate/CandidateScoreCard';
import Leaderboard from './components/leaderboard/Leaderboard';
import StatisticsPanel from './components/stats/StatisticsPanel';
import { ArrowRight, CheckCircle, ChevronDown, ChevronUp, Database, Edit2, LayoutGrid, LogOut, Plus, Settings, ShieldCheck, Star, UserPlus, Users, X } from 'lucide-react';
import { getJudgeScore } from './utils/statsUtils';

type AdminPinIntent = 'settings' | 'create' | null;

const App: React.FC = () => {
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(false);
  const [isAddingAudition, setIsAddingAudition] = useState(false);
  const [newAuditionName, setNewAuditionName] = useState('');
  
  const [selectedJudgeToAuth, setSelectedJudgeToAuth] = useState<JudgeConfig | null>(null);
  const [isAdminPinModalOpen, setIsAdminPinModalOpen] = useState(false);
  const [adminPinIntent, setAdminPinIntent] = useState<AdminPinIntent>(null);
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
      const newAud = await firebaseService.createAudition(newAuditionName.trim());
      setActiveAuditionId(newAud.id);
      setNewAuditionName('');
      setIsAddingAudition(false);
    } catch {
      alert("오디션 생성 중 오류가 발생했습니다.");
    }
  };

  const handleUpdateAuditionName = async () => {
    if (!activeAuditionId || !activeAudition) return;
    const newName = window.prompt("새로운 오디션 이름을 입력하세요:", activeAudition.name);
    if (newName && newName.trim() && newName !== activeAudition.name) {
      try {
        await firebaseService.updateAuditionName(activeAuditionId, newName.trim());
      } catch {
        alert("이름 변경 중 오류가 발생했습니다.");
      }
    }
  };

  const handleSettingsClick = () => {
    if (!activeAudition) return;
    if (isAdmin) {
      setIsSettingsModalOpen(true);
    } else {
      setAdminPinIntent('settings');
      setIsAdminPinModalOpen(true);
    }
  };

  const handleAddAuditionClick = () => {
    if (isAdmin) {
      setIsAddingAudition(true);
      return;
    }

    setAdminPinIntent('create');
    setIsAdminPinModalOpen(true);
  };

  const handleAdminAuth = async (pin: string) => {
    const success = await loginAdmin(pin);
    if (success) {
      setIsAdminPinModalOpen(false);
      if (adminPinIntent === 'create') {
        setIsAddingAudition(true);
      } else if (adminPinIntent === 'settings') {
        setIsSettingsModalOpen(true);
      }
      setAdminPinIntent(null);
    }
    return success;
  };

  const handleSaveSettings = async (judges: JudgeConfig[], dropCount: number) => {
    if (activeAuditionId) {
      await firebaseService.updateAuditionSettings(activeAuditionId, judges, dropCount);
    }
  };

  const handleDeleteAudition = async () => {
    if (!activeAuditionId) {
      throw new Error('삭제할 오디션이 선택되지 않았습니다.');
    }

    const nextAuditionId = auditions.find((audition) => audition.id !== activeAuditionId)?.id || null;

    await firebaseService.deleteAudition(activeAuditionId);

    setIsSettingsModalOpen(false);
    setIsAdminPinModalOpen(false);
    setAdminPinIntent(null);
    setSelectedJudgeToAuth(null);
    setActiveAuditionId(nextAuditionId);
  };

  // 헬퍼: 현재 오디션 기반 단순 총점 가져오기
  const getJudgeTotal = (candidate: Candidate, judgeName: string) => {
    if (!activeAudition) return 0;
    return getJudgeScore(candidate, judgeName, activeAudition) || 0;
  };

  const completedReviewCount = candidates.filter((candidate) =>
    Object.values(candidate.scores).some((score) => score.isCompleted),
  ).length;
  const auditionCount = auditions.length;
  const judgeCount = activeAudition?.judges?.length ?? 0;

  if (isLoadingAuth || isAuditionLoading || isCandidatesLoading) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--background)', color: 'white', fontSize: '1.2rem'
      }}>
        <div className="fade-in">시스템 준비 중...</div>
      </div>
    );
  }

  return (
    <div className="container">
      {!currentJudge ? (
        <div className="landing-page fade-in">
          <header className="landing-hero">
            <div className="glass-card landing-hero__content" style={{ padding: '2rem 2.2rem' }}>
              <span className="landing-kicker">
                <Star size={14} fill="currentColor" />
                Audition Master
              </span>
              <h1 className="main-title" style={{ marginBottom: '0.85rem', marginTop: '1rem' }}>심사 운영 콘솔</h1>
            </div>

            <div className="glass-card landing-hero__focus" style={{ padding: '1.8rem' }}>
              <p className="landing-focus-label">현재 선택된 오디션</p>
              <div className="landing-focus-name">
                {activeAudition?.name || '선택된 오디션이 없습니다'}
              </div>
              <div className="info-chip-row">
                <span className="info-chip">
                  <Database size={15} />
                  오디션 {auditionCount}개
                </span>
                <span className="info-chip">
                  <Users size={15} />
                  심사위원 {judgeCount}명
                </span>
                <span className="info-chip">
                  <CheckCircle size={15} />
                  완료 {completedReviewCount}건
                </span>
              </div>
            </div>
          </header>

          <section className="glass-card landing-operations" style={{ padding: '2rem' }}>
            <div className="landing-operations__header">
              <div>
                <span className="section-kicker">
                  <Database size={14} />
                  운영 허브
                </span>
                <h2 style={{ fontSize: '1.7rem', margin: '0.95rem 0 0.4rem' }}>현재 오디션을 정리하고 빠르게 이동하세요</h2>
              </div>
              <span className={`status-badge ${isAdmin ? 'status-badge--success' : 'status-badge--muted'}`}>
                <ShieldCheck size={16} />
                {isAdmin ? '관리자 권한 활성화됨' : '관리자 PIN 입력 후 설정 가능'}
              </span>
            </div>

            <div className="landing-control-grid">
              <div className="glass-card" style={{ padding: '1.35rem', background: 'var(--surface-soft)' }}>
                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '0.8rem' }}>
                  활성 오디션 선택
                </label>
                <div style={{ display: 'flex', gap: '0.65rem', marginBottom: '0.85rem' }}>
                  <select
                    className="premium-input"
                    style={{ flex: 1, minHeight: '48px', cursor: 'pointer' }}
                    value={activeAuditionId || ''}
                    onChange={(e) => setActiveAuditionId(e.target.value)}
                  >
                    {auditions.map((audition) => (
                      <option key={audition.id} value={audition.id}>{audition.name}</option>
                    ))}
                  </select>
                  <button
                    className="premium-button secondary-btn"
                    style={{ width: '48px', padding: 0 }}
                    onClick={handleUpdateAuditionName}
                    title="오디션 이름 변경"
                    disabled={!activeAudition}
                  >
                    <Edit2 size={16} />
                  </button>
                </div>
              </div>

              <div className="action-stack">
                <div className="glass-card stat-tile" style={{ padding: '1.25rem', background: 'var(--surface-soft)' }}>
                  <div className="stat-tile__icon" style={{ background: 'rgba(56, 189, 248, 0.12)' }}>
                    <Users size={24} color="#38bdf8" />
                  </div>
                  <div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>총 참가팀</p>
                    <h3 style={{ fontSize: '1.6rem' }}>{candidates.length}팀</h3>
                  </div>
                </div>
                <div className="glass-card stat-tile" style={{ padding: '1.25rem', background: 'var(--surface-soft)' }}>
                  <div className="stat-tile__icon" style={{ background: 'rgba(34, 197, 94, 0.12)' }}>
                    <CheckCircle size={24} color="#22c55e" />
                  </div>
                  <div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>심사 완료 항목</p>
                    <h3 style={{ fontSize: '1.6rem' }}>{completedReviewCount}건</h3>
                  </div>
                </div>
              </div>

              <div className="glass-card" style={{ padding: '1.35rem', background: 'var(--surface-soft)' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '0.85rem' }}>빠른 작업</p>
                <div className="action-stack">
                  <button
                    className="premium-button secondary-btn"
                    onClick={handleSettingsClick}
                    disabled={!activeAudition}
                  >
                    <Settings size={18} />
                    오디션 상세 설정
                  </button>
                  <button
                    className="premium-button"
                    onClick={handleAddAuditionClick}
                  >
                    <Plus size={18} />
                    새 오디션 시작
                  </button>
                </div>
              </div>
            </div>
          </section>

          <div className="judge-section-header">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.5rem' }}>
                <LayoutGrid size={24} color="var(--primary)" />
                <h2 style={{ fontSize: '1.6rem' }}>심사위원 선택</h2>
              </div>
            </div>
            <span className="status-badge status-badge--muted">
              <Users size={16} />
              총 {judgeCount}명
            </span>
          </div>

          <div className="judge-selection">
            {activeAudition?.judges?.map((judge: JudgeConfig) => (
              <div
                key={judge.name}
                className="glass-card judge-card hover-lift"
                onClick={() => setSelectedJudgeToAuth(judge)}
              >
                <div>
                  <span className="judge-card__type">
                    {judge.type === 'observer'
                      ? '참관 모드'
                      : judge.type === 'simple'
                        ? '총점 평가'
                        : '세부 평가'}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                  <div style={{ width: '58px', height: '58px', borderRadius: '18px', background: 'rgba(99, 102, 241, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Users size={30} color="var(--primary)" />
                  </div>
                  <div>
                    <h3 className="judge-card__title">{judge.name}{judge.type !== 'observer' ? ' 심사위원' : ''}</h3>
                  </div>
                </div>
                <div className="judge-card__action">
                  <span>{judge.type === 'observer' ? '모니터링 입장' : '심사 시작하기'}</span>
                  <ArrowRight size={18} />
                </div>
              </div>
            ))}
            {(!activeAudition?.judges || activeAudition.judges.length === 0) && (
              <div className="glass-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', background: 'var(--surface-soft)' }}>
                <p>등록된 심사위원이 없습니다. 상세 설정에서 심사위원을 먼저 추가해 주세요.</p>
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
              title={adminPinIntent === 'create' ? '새 오디션 생성' : '관리자 설정'}
              onVerify={handleAdminAuth}
              onClose={() => {
                setIsAdminPinModalOpen(false);
                setAdminPinIntent(null);
              }}
            />
          )}

          {/* Admin Settings Modal */}
          {isSettingsModalOpen && activeAudition && (
            <AuditionSettingsModal 
              audition={activeAudition}
              candidateCount={candidates.length}
              onSave={handleSaveSettings}
              onDelete={handleDeleteAudition}
              onClose={() => setIsSettingsModalOpen(false)}
            />
          )}

          {/* New Audition Modal */}
          {isAddingAudition && (
            <ModalPortal>
              <div className="modal-overlay-shell fade-in">
                <div className="modal-surface modal-entrance" style={{ maxWidth: '520px' }}>
                  <button
                    type="button"
                    className="modal-close-button"
                    onClick={() => setIsAddingAudition(false)}
                    aria-label="새 오디션 생성 모달 닫기"
                  >
                    <X size={18} />
                  </button>

                  <div className="modal-content">
                    <div className="modal-header-row">
                      <div className="modal-header-copy">
                        <span className="modal-kicker">
                          <Plus size={14} />
                          새 오디션
                        </span>
                        <h2>새 오디션 생성</h2>
                      </div>
                    </div>

                    <form onSubmit={handleCreateAudition}>
                      <div className="modal-section" style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>오디션 이름</label>
                            <input
                              autoFocus
                              className="premium-input"
                              placeholder="예: 2026 상반기 밴드 오디션"
                              value={newAuditionName}
                              onChange={(e) => setNewAuditionName(e.target.value)}
                            />
                          </div>
                          <div className="modal-muted-card" style={{ padding: '0.9rem 1rem' }}>
                            <p className="modal-summary-label">관리자 인증 상태</p>
                            <p style={{ fontWeight: 700 }}>
                              관리자 PIN 확인 완료
                            </p>
                            <p style={{ marginTop: '0.35rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                              새 오디션 생성은 관리자 인증 이후에만 진행할 수 있습니다.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="modal-action-bar" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
                        <button type="button" className="premium-button secondary-btn" style={{ flex: 1 }} onClick={() => setIsAddingAudition(false)}>
                          취소
                        </button>
                        <button type="submit" className="premium-button" style={{ flex: 1 }} disabled={!newAuditionName.trim()}>
                          생성하기
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </ModalPortal>
          )}
        </div>
      ) : (
        <div className="dashboard fade-in">
          {/* Dashboard Code (same mostly, slightly refactored with activeAudition logic) */}
          <div className="dashboard-header">
            <div className="dashboard-identity" style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <div className="dashboard-title-row" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Star size={24} color="#fbbf24" fill="#fbbf24" />
                <h2 className="dashboard-title" style={{ fontSize: '1.6rem', wordBreak: 'keep-all' }}>
                  {isObserver ? '참관자 모니터링' : `${currentJudge} 심사위원`}
                </h2>
              </div>
              <div className="dashboard-session-meta" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginLeft: '0.2rem' }}>
                <span className="glass-card dashboard-audition-chip" style={{ padding: '0.2rem 0.6rem', width: 'auto', fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)' }} title={activeAudition?.name}>
                  {activeAudition?.name}
                </span>
                <span className="dashboard-session-status" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>보안 세션 활성화</span>
              </div>
            </div>
            <button 
                className="premium-button logout-btn dashboard-logout-btn" 
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
            <section className="dashboard-main-column" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {!isObserver && (
                <div className="glass-card fade-in dashboard-form-card">
                  <div className="dashboard-card-title-row" style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '1.5rem' }}>
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

              <div className="dashboard-workflow" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <h3 className="dashboard-stage-title" style={{ 
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
                  <div className="glass-card fade-in completed-section" style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(34, 197, 94, 0.03)', border: '1px solid rgba(34, 197, 94, 0.1)' }}>
                    <div 
                      className="completed-toggle"
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

            <div className="dashboard-sidepanel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="glass-card active-judges-card" style={{ padding: '1rem', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.8rem', fontWeight: 500 }}>리더보드 반영 심사위원 선택</div>
                <div className="active-judge-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem' }}>
                  {activeAudition?.judges.filter(j => j.type !== 'observer').map(j => {
                    const isActive = activeJudges.includes(j.name);
                    return (
                      <button 
                        key={j.name}
                        className={`active-judge-chip ${isActive ? 'active-judge-chip--active' : ''}`}
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

          <div className="dashboard-stats-section" style={{ marginTop: '3rem' }}>
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
