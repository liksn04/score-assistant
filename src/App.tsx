import React, { Suspense, useEffect, useMemo, useState } from 'react';
import type { AppView, Candidate, JudgeConfig, RankingPolicy } from './types';
import { useCandidates } from './hooks/useCandidates';
import { useJudgeActions } from './hooks/useJudgeActions';
import { useAuditions } from './hooks/useAuditions';
import { useAuth } from './hooks/useAuth';
import { useAdminLogs } from './hooks/useAdminLogs';
import { useTrashBatches } from './hooks/useTrashBatches';
import { firebaseService } from './api/firebaseService';
import PinModal from './components/auth/PinModal';
import ModalPortal from './components/common/ModalPortal';
import {
  ArrowRight,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Database,
  LayoutGrid,
  LogOut,
  Plus,
  ShieldCheck,
  Star,
  Tv,
  Users,
  X,
} from 'lucide-react';
import { useToast } from './context/ToastContext.tsx';
import { getJudgeScore } from './utils/statsUtils';

type AdminPinIntent = 'admin-view' | 'settings' | 'create' | null;
const AdminDashboardView = React.lazy(() => import('./components/admin/AdminDashboardView'));
const ObserverBoardView = React.lazy(() => import('./components/observer/ObserverBoardView'));
const ReportPrintView = React.lazy(() => import('./components/report/ReportPrintView'));
const AuditionSettingsModal = React.lazy(() =>
  import('./components/admin/AuditionSettingsModal').then((module) => ({ default: module.AuditionSettingsModal })),
);
const CandidateScoreCard = React.lazy(() => import('./components/candidate/CandidateScoreCard'));
const Leaderboard = React.lazy(() => import('./components/leaderboard/Leaderboard'));

const ViewLoaderFallback: React.FC<{ message: string }> = ({ message }) => (
  <div
    className="glass-card fade-in"
    style={{
      padding: '2rem',
      marginTop: '1rem',
      textAlign: 'center',
      color: 'var(--text-muted)',
    }}
  >
    {message}
  </div>
);

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>('landing');
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(false);
  const [isAddingAudition, setIsAddingAudition] = useState(false);
  const [newAuditionName, setNewAuditionName] = useState('');
  const [selectedJudgeToAuth, setSelectedJudgeToAuth] = useState<JudgeConfig | null>(null);
  const [isAdminPinModalOpen, setIsAdminPinModalOpen] = useState(false);
  const [adminPinIntent, setAdminPinIntent] = useState<AdminPinIntent>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const { showToast } = useToast();
  const { judgeRole, isAdmin, isLoadingAuth, authError, loginWithPin, loginAdmin, logout, adminTimeoutCount, adminSessionRemainingMs } =
    useAuth();
  const currentJudge = judgeRole;
  const effectiveView: AppView =
    currentView === 'admin' && !isAdmin
      ? 'landing'
      : currentView === 'judge' && !currentJudge
        ? 'landing'
        : currentView;
  const {
    auditions,
    activeAuditionId,
    setActiveAuditionId,
    isLoading: isAuditionLoading,
    error: auditionError,
  } = useAuditions(!isLoadingAuth && !authError);
  const activeAudition = auditions.find((audition) => audition.id === activeAuditionId) ?? null;
  const { candidates, sortedCandidates, isLoading: isCandidatesLoading } = useCandidates(activeAudition);
  const { logs } = useAdminLogs(activeAuditionId);
  const { trashBatches } = useTrashBatches();

  const {
    isObserver,
    newCandidateName,
    setNewCandidateName,
    newSongTitle,
    setNewSongTitle,
    commentInputs,
    setCommentInputs,
    expandedComments,
    setExpandedComments,
    editingSongId,
    setEditingSongId,
    tempSongTitle,
    setTempSongTitle,
    isCandidateReadOnly,
    addCandidate,
    updateSimpleScore,
    updateDetailScore,
    addComment,
    deleteComment,
    updateItemStrikes,
    updateSongTitle,
    deleteCandidate,
    toggleCompletion,
  } = useJudgeActions(candidates, activeAudition, currentJudge);

  const activeJudges = activeAudition?.activeJudges ?? [];

  useEffect(() => {
    if (adminTimeoutCount > 0) {
      showToast({
        kind: 'warning',
        title: '관리자 세션이 만료되었습니다',
        message: '30분 동안 활동이 없어 관리자 화면을 종료했습니다. 다시 인증해 주세요.',
      });
    }
  }, [adminTimeoutCount, showToast]);

  const completedReviewCount = useMemo(
    () => candidates.filter((candidate) => Object.values(candidate.scores).some((score) => score.isCompleted)).length,
    [candidates],
  );

  const judgeCount = activeAudition?.judges?.length ?? 0;

  const getJudgeTotal = (candidate: Candidate, judgeName: string) => {
    if (!activeAudition) {
      return 0;
    }

    return getJudgeScore(candidate, judgeName, activeAudition, false) ?? 0;
  };

  const requireAdminAuth = (intent: Exclude<AdminPinIntent, null>) => {
    if (isAdmin) {
      if (intent === 'admin-view') {
        setCurrentView('admin');
      } else if (intent === 'create') {
        setIsAddingAudition(true);
      } else if (intent === 'settings') {
        setIsSettingsModalOpen(true);
      }
      return;
    }

    setAdminPinIntent(intent);
    setIsAdminPinModalOpen(true);
  };

  const handleAdminAuth = async (pin: string) => {
    const success = await loginAdmin(pin);

    if (success) {
      setIsAdminPinModalOpen(false);
      if (adminPinIntent === 'admin-view') {
        setCurrentView('admin');
      } else if (adminPinIntent === 'create') {
        setIsAddingAudition(true);
      } else if (adminPinIntent === 'settings') {
        setIsSettingsModalOpen(true);
      }
      setAdminPinIntent(null);
    }

    return success;
  };

  const handleJudgeAuth = async (judge: JudgeConfig, pin: string) => {
    const success = await loginWithPin(judge.name, pin, activeAudition!);

    if (success) {
      setSelectedJudgeToAuth(null);
      setCurrentView('judge');
    }

    return success;
  };

  const handleCreateAudition = async (event: React.FormEvent) => {
    event.preventDefault();

    const trimmedName = newAuditionName.trim();
    if (!trimmedName) {
      showToast({
        kind: 'warning',
        title: '오디션 이름을 확인해 주세요',
        message: '새 오디션 이름은 비워둘 수 없습니다.',
      });
      return;
    }

    try {
      const newAudition = await firebaseService.createAudition(trimmedName);
      setActiveAuditionId(newAudition.id);
      setNewAuditionName('');
      setIsAddingAudition(false);
      setCurrentView('admin');
      showToast({
        kind: 'success',
        title: '오디션 생성 완료',
        message: `${trimmedName} 오디션을 시작했습니다.`,
      });
    } catch (error) {
      showToast({
        kind: 'error',
        title: '오디션 생성 실패',
        message: error instanceof Error ? error.message : '오디션 생성 중 오류가 발생했습니다.',
      });
    }
  };

  const handleRenameAudition = async (name: string) => {
    if (!activeAuditionId || !activeAudition) {
      throw new Error('이름을 변경할 오디션이 선택되지 않았습니다.');
    }

    await firebaseService.updateAuditionName(activeAuditionId, activeAudition.name, name);
  };

  const handleSaveSettings = async (judges: JudgeConfig[], dropCount: number, rankingPolicy: RankingPolicy) => {
    if (!activeAuditionId || !activeAudition) {
      throw new Error('설정을 저장할 오디션이 없습니다.');
    }

    await firebaseService.updateAuditionSettings(activeAuditionId, activeAudition.name, judges, dropCount, rankingPolicy);
  };

  const handleMoveAuditionToTrash = async () => {
    if (!activeAudition) {
      throw new Error('삭제할 오디션이 선택되지 않았습니다.');
    }

    const nextAuditionId = auditions.find((audition) => audition.id !== activeAudition.id)?.id ?? null;

    await firebaseService.moveAuditionToTrash(activeAudition, candidates);
    setActiveAuditionId(nextAuditionId);
    setIsSettingsModalOpen(false);
    showToast({
      kind: 'success',
      title: '오디션 이동 완료',
      message: `${activeAudition.name} 오디션을 휴지통으로 이동했습니다.`,
    });
  };

  const handleToggleActiveJudge = async (judgeName: string) => {
    if (!activeAuditionId || !activeAudition) {
      throw new Error('활성 오디션이 없습니다.');
    }

    const isActive = activeJudges.includes(judgeName);
    const nextActiveJudges = isActive
      ? activeJudges.filter((activeJudge) => activeJudge !== judgeName)
      : [...activeJudges, judgeName];

    await firebaseService.updateActiveJudges(activeAuditionId, nextActiveJudges);
  };

  const handleFinalizeAudition = async () => {
    if (!activeAudition) {
      throw new Error('확정할 오디션이 없습니다.');
    }

    if (candidates.length === 0) {
      throw new Error('참가팀이 없으면 결과를 확정할 수 없습니다.');
    }

    await firebaseService.finalizeAudition(activeAudition, candidates);
  };

  const handleReopenAudition = async () => {
    if (!activeAudition) {
      throw new Error('재개방할 오디션이 없습니다.');
    }

    await firebaseService.reopenAudition(activeAudition);
  };

  const handleUnlockCandidate = async (candidate: Candidate) => {
    if (!activeAudition) {
      throw new Error('오디션 정보가 없습니다.');
    }

    await firebaseService.unlockCandidate(activeAudition, candidate);
  };

  const handleRestoreTrash = async (batchId: string) => {
    await firebaseService.restoreTrashBatch(batchId);
  };

  const handlePurgeTrash = async (batchId: string) => {
    await firebaseService.purgeTrashBatch(batchId);
  };

  const handleExportWorkbook = async () => {
    if (!activeAudition) {
      return;
    }

    try {
      await firebaseService.exportFinalWorkbook(activeAudition, candidates);
      showToast({
        kind: 'success',
        title: 'XLSX 내보내기 완료',
        message: '최종 결과 보고서를 다운로드했습니다.',
      });
    } catch (error) {
      showToast({
        kind: 'error',
        title: 'XLSX 내보내기 실패',
        message: error instanceof Error ? error.message : '최종 결과 보고서 생성 중 오류가 발생했습니다.',
      });
    }
  };

  const candidateReadOnlyLabel = (candidate: Candidate) => {
    if (activeAudition?.status === 'archived') {
      return '보관됨';
    }

    if (activeAudition?.finalization.isFinalized && isCandidateReadOnly(candidate.id)) {
      return '잠금됨';
    }

    return '읽기 전용';
  };

  const startupError = authError ?? auditionError;

  if (startupError) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--background)',
          color: 'white',
          padding: '1.5rem',
        }}
      >
        <div className="glass-card fade-in" style={{ maxWidth: '520px', padding: '2rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.45rem', marginBottom: '0.8rem' }}>시스템 연결을 확인해 주세요</h1>
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Firestore 권한 또는 Firebase 인증 설정 때문에 운영 데이터를 불러오지 못했습니다.
          </p>
          <p style={{ color: '#fca5a5', marginTop: '1rem', wordBreak: 'break-word' }}>{startupError}</p>
        </div>
      </div>
    );
  }

  if (isLoadingAuth || isAuditionLoading || isCandidatesLoading) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--background)',
          color: 'white',
          fontSize: '1.2rem',
        }}
      >
        <div className="fade-in">시스템 준비 중...</div>
      </div>
    );
  }

  return (
    <div className="container">
      <Suspense fallback={<ViewLoaderFallback message="참관 보드를 불러오는 중입니다." />}>
        {effectiveView === 'observer-board' && activeAudition ? (
          <ObserverBoardView
            audition={activeAudition}
            rankedCandidates={sortedCandidates}
            onBack={() => setCurrentView(isAdmin ? 'admin' : 'landing')}
          />
        ) : null}
      </Suspense>

      <Suspense fallback={<ViewLoaderFallback message="인쇄용 결과 화면을 불러오는 중입니다." />}>
        {effectiveView === 'report-print' && activeAudition ? (
          <ReportPrintView audition={activeAudition} candidates={candidates} onBack={() => setCurrentView('admin')} />
        ) : null}
      </Suspense>

      <Suspense fallback={<ViewLoaderFallback message="관리자 화면을 불러오는 중입니다." />}>
        {effectiveView === 'admin' && activeAudition ? (
          <AdminDashboardView
            key={activeAudition.id}
            activeAudition={activeAudition}
            auditions={auditions}
            activeAuditionId={activeAuditionId}
            candidates={candidates}
            rankedCandidates={sortedCandidates}
            logs={logs}
            trashBatches={trashBatches}
            adminSessionRemainingMs={adminSessionRemainingMs}
            onBack={() => setCurrentView('landing')}
            onChangeAudition={(auditionId) => setActiveAuditionId(auditionId)}
            onRenameAudition={handleRenameAudition}
            onOpenSettings={() => requireAdminAuth('settings')}
            onOpenCreateAudition={() => requireAdminAuth('create')}
            onToggleActiveJudge={handleToggleActiveJudge}
            onFinalize={handleFinalizeAudition}
            onReopen={handleReopenAudition}
            onUnlockCandidate={handleUnlockCandidate}
            onRestoreTrash={handleRestoreTrash}
            onPurgeTrash={handlePurgeTrash}
            onExportWorkbook={() => {
              void handleExportWorkbook();
            }}
            onOpenPrintReport={() => setCurrentView('report-print')}
            onOpenObserverBoard={() => setCurrentView('observer-board')}
          />
        ) : null}
      </Suspense>

      {effectiveView === 'landing' ? (
        <div className="landing-page fade-in">
          <header className="landing-hero">
            <div className="glass-card landing-hero__content" style={{ padding: '2rem 2.2rem' }}>
              <span className="landing-kicker">
                <Star size={14} fill="currentColor" />
                Audition Master
              </span>
              <h1 className="main-title" style={{ marginBottom: '0.85rem', marginTop: '1rem' }}>
                심사 운영 콘솔
              </h1>
              <p>현장 심사, 운영 관리, 대형 화면 참관, 최종 결과 출력까지 한 흐름으로 정리한 운영 앱입니다.</p>
            </div>

            <div className="glass-card landing-hero__focus" style={{ padding: '1.8rem' }}>
              <p className="landing-focus-label">현재 선택된 오디션</p>
              <div className="landing-focus-name">{activeAudition?.name || '선택된 오디션이 없습니다'}</div>
              <div className="info-chip-row">
                <span className="info-chip">
                  <Database size={15} />
                  오디션 {auditions.length}개
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
                <h2 style={{ fontSize: '1.7rem', margin: '0.95rem 0 0.4rem' }}>관리자 화면과 참관 모드로 빠르게 이동하세요</h2>
              </div>
              <span className={`status-badge ${isAdmin ? 'status-badge--success' : 'status-badge--muted'}`}>
                <ShieldCheck size={16} />
                {isAdmin ? '관리자 권한 활성화됨' : '관리자 PIN 입력 후 운영 화면 진입'}
              </span>
            </div>

            <div className="landing-control-grid">
              <div className="glass-card" style={{ padding: '1.35rem', background: 'var(--surface-soft)' }}>
                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '0.8rem' }}>
                  활성 오디션 선택
                </label>
                <select
                  className="premium-input"
                  style={{ minHeight: '48px', cursor: 'pointer' }}
                  value={activeAuditionId || ''}
                  onChange={(event) => setActiveAuditionId(event.target.value)}
                >
                  {auditions.map((audition) => (
                    <option key={audition.id} value={audition.id}>
                      {audition.name}
                    </option>
                  ))}
                </select>
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
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '0.85rem' }}>빠른 진입</p>
                <div className="action-stack">
                  <button className="premium-button secondary-btn" onClick={() => requireAdminAuth('admin-view')} disabled={!activeAudition}>
                    <ShieldCheck size={18} />
                    관리자 화면 열기
                  </button>
                  <button
                    className="premium-button secondary-btn"
                    onClick={() => setCurrentView('observer-board')}
                    disabled={!activeAudition}
                  >
                    <Tv size={18} />
                    참관 보드 열기
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
            {activeAudition?.judges?.map((judge) => (
              <div key={judge.name} className="glass-card judge-card hover-lift" onClick={() => setSelectedJudgeToAuth(judge)}>
                <div>
                  <span className="judge-card__type">
                    {judge.type === 'observer' ? '참관 모드' : judge.type === 'simple' ? '총점 평가' : '세부 평가'}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                  <div
                    style={{
                      width: '58px',
                      height: '58px',
                      borderRadius: '18px',
                      background: 'rgba(99, 102, 241, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
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
              <div
                className="glass-card"
                style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', background: 'var(--surface-soft)' }}
              >
                <p>등록된 심사위원이 없습니다. 관리자 화면에서 심사위원을 먼저 추가해 주세요.</p>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {effectiveView === 'judge' && activeAudition && currentJudge ? (
        <div className="dashboard fade-in">
          <div className="dashboard-header">
            <div className="dashboard-identity" style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <div className="dashboard-title-row" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Star size={24} color="#fbbf24" fill="#fbbf24" />
                <h2 className="dashboard-title" style={{ fontSize: '1.6rem', wordBreak: 'keep-all' }}>
                  {isObserver ? '참관자 모니터링' : `${currentJudge} 심사위원`}
                </h2>
              </div>
              <div className="dashboard-session-meta" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginLeft: '0.2rem' }}>
                <span
                  className="glass-card dashboard-audition-chip"
                  style={{ padding: '0.2rem 0.6rem', width: 'auto', fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)' }}
                  title={activeAudition.name}
                >
                  {activeAudition.name}
                </span>
                <span className="dashboard-session-status" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {activeAudition.finalization.isFinalized ? '최종 결과 잠금 상태' : '보안 세션 활성화'}
                </span>
              </div>
            </div>
            <button
              className="premium-button logout-btn dashboard-logout-btn"
              style={{
                background: 'rgba(244, 63, 94, 0.1)',
                color: '#f43f5e',
                border: '1px solid rgba(244, 63, 94, 0.2)',
              }}
              onClick={() => {
                logout();
                setCurrentView('landing');
              }}
            >
              <LogOut size={18} />
              {isObserver ? '나가기' : '심사 종료'}
            </button>
          </div>

          <Suspense fallback={<ViewLoaderFallback message="심사 화면을 준비하는 중입니다." />}>
            <div className="dashboard-content">
              <section className="dashboard-main-column" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {!isObserver && (
                  <div className="glass-card fade-in dashboard-form-card">
                    <div className="dashboard-card-title-row" style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '1.5rem' }}>
                      <Plus size={22} color="var(--primary)" />
                      <h3 style={{ fontSize: '1.4rem' }}>새 팀 등록</h3>
                    </div>
                    <form onSubmit={addCandidate} className="flex-column" style={{ gap: '1rem' }}>
                      <div className="input-row" style={{ display: 'flex', gap: '1rem' }}>
                        <input className="premium-input" placeholder="팀 이름" value={newCandidateName} onChange={(event) => setNewCandidateName(event.target.value)} />
                        <input className="premium-input" placeholder="곡명" value={newSongTitle} onChange={(event) => setNewSongTitle(event.target.value)} />
                      </div>
                      <button type="submit" className="premium-button" disabled={activeAudition.finalization.isFinalized}>
                        팀 등록
                      </button>
                    </form>
                  </div>
                )}

                <div className="dashboard-workflow" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <h3
                    className="dashboard-stage-title"
                    style={{ fontSize: '1.4rem', borderLeft: '4px solid var(--primary)', paddingLeft: '1rem', marginBottom: '0.5rem' }}
                  >
                    {isObserver ? '실시간 참가 현황' : '채점 진행 중인 팀'}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {candidates
                      .filter((candidate) => !currentJudge || !candidate.scores[currentJudge]?.isCompleted)
                      .map((candidate) => {
                        const isReadOnly = isCandidateReadOnly(candidate.id);

                        return (
                          <CandidateScoreCard
                            key={candidate.id}
                            candidate={candidate}
                            selectedJudge={currentJudge}
                            activeAudition={activeAudition}
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
                            onToggleComment={(id) => setExpandedComments((previous) => ({ ...previous, [id]: !previous[id] }))}
                            onCommentInputChange={(id, value) => setCommentInputs((previous) => ({ ...previous, [id]: value }))}
                            onAddComment={addComment}
                            onDeleteComment={deleteComment}
                            onToggleCompletion={toggleCompletion}
                            isReadOnly={isReadOnly}
                            readOnlyLabel={candidateReadOnlyLabel(candidate)}
                          />
                        );
                      })}
                  </div>

                  {candidates.some((candidate) => currentJudge && candidate.scores[currentJudge]?.isCompleted) ? (
                    <div
                      className="glass-card fade-in completed-section"
                      style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(34, 197, 94, 0.03)', border: '1px solid rgba(34, 197, 94, 0.1)' }}
                    >
                      <div
                        className="completed-toggle"
                        onClick={() => setIsCompletedExpanded(!isCompletedExpanded)}
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '0.5rem' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                          <CheckCircle size={20} color="#22c55e" />
                          <h3 style={{ fontSize: '1.2rem', color: '#22c55e' }}>
                            심사 완료된 팀 ({candidates.filter((candidate) => currentJudge && candidate.scores[currentJudge]?.isCompleted).length}팀)
                          </h3>
                        </div>
                        {isCompletedExpanded ? <ChevronUp size={20} color="#22c55e" /> : <ChevronDown size={20} color="#22c55e" />}
                      </div>

                      {isCompletedExpanded ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', marginTop: '1.5rem' }}>
                          {candidates
                            .filter((candidate) => currentJudge && candidate.scores[currentJudge]?.isCompleted)
                            .map((candidate) => {
                              const isReadOnly = isCandidateReadOnly(candidate.id);

                              return (
                                <CandidateScoreCard
                                  key={candidate.id}
                                  candidate={candidate}
                                  selectedJudge={currentJudge}
                                  activeAudition={activeAudition}
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
                                  onToggleComment={(id) => setExpandedComments((previous) => ({ ...previous, [id]: !previous[id] }))}
                                  onCommentInputChange={(id, value) => setCommentInputs((previous) => ({ ...previous, [id]: value }))}
                                  onAddComment={addComment}
                                  onDeleteComment={deleteComment}
                                  onToggleCompletion={toggleCompletion}
                                  isReadOnly={isReadOnly}
                                  readOnlyLabel={candidateReadOnlyLabel(candidate)}
                                />
                              );
                            })}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </section>

              <div className="dashboard-sidepanel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <Leaderboard sortedCandidates={sortedCandidates} activeAudition={activeAudition} />
              </div>
            </div>
          </Suspense>
        </div>
      ) : null}

      {selectedJudgeToAuth ? (
        <PinModal
          title={`${selectedJudgeToAuth.name} ${selectedJudgeToAuth.type !== 'observer' ? '심사위원' : ''}`}
          onVerify={(pin) => handleJudgeAuth(selectedJudgeToAuth, pin)}
          onClose={() => setSelectedJudgeToAuth(null)}
        />
      ) : null}

      {isAdminPinModalOpen ? (
        <PinModal
          title={adminPinIntent === 'create' ? '새 오디션 생성' : adminPinIntent === 'settings' ? '관리자 설정' : '관리자 화면'}
          onVerify={handleAdminAuth}
          onClose={() => {
            setIsAdminPinModalOpen(false);
            setAdminPinIntent(null);
          }}
        />
      ) : null}

      <Suspense fallback={null}>
        {isSettingsModalOpen && isAdmin && activeAudition ? (
          <AuditionSettingsModal
            audition={activeAudition}
            candidateCount={candidates.length}
            onSave={handleSaveSettings}
            onDelete={handleMoveAuditionToTrash}
            onClose={() => setIsSettingsModalOpen(false)}
          />
        ) : null}
      </Suspense>

      {isAddingAudition ? (
        <ModalPortal>
          <div className="modal-overlay-shell fade-in">
            <div className="modal-surface modal-entrance" style={{ maxWidth: '520px' }}>
              <button type="button" className="modal-close-button" onClick={() => setIsAddingAudition(false)} aria-label="새 오디션 생성 모달 닫기">
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
                          onChange={(event) => setNewAuditionName(event.target.value)}
                        />
                      </div>
                      <div className="modal-muted-card" style={{ padding: '0.9rem 1rem' }}>
                        <p className="modal-summary-label">관리자 인증 상태</p>
                        <p style={{ fontWeight: 700 }}>관리자 PIN 확인 완료</p>
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
      ) : null}

      <footer
        style={{
          marginTop: '4rem',
          padding: '2rem 0',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          textAlign: 'center',
          color: 'rgba(255,255,255,0.3)',
          fontSize: '0.9rem',
          letterSpacing: '1px',
        }}
      >
        <p>
          Developed by <strong>Kim Junmo</strong>
        </p>
        <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', opacity: 0.5 }}>© 2024 Audition Master. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default App;
