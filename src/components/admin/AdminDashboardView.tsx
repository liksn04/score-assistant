import React, { Suspense, useDeferredValue, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BarChart3,
  Download,
  FileText,
  LayoutDashboard,
  LockOpen,
  Plus,
  RefreshCcw,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  Tv,
  Upload,
  Users,
  Activity,
  ScrollText,
  FolderClock,
} from 'lucide-react';
import type { AdminLogEntry, Audition, Candidate, CandidateStatusFilter, RankedCandidate, TrashBatch } from '../../types';
import { buildProgressSnapshot } from '../../utils/rankingUtils.ts';
import { useConfirmDialog } from '../../context/ConfirmDialogContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';

const StatisticsPanel = React.lazy(() => import('../stats/StatisticsPanel'));
const BulkImportModal = React.lazy(() => import('./BulkImportModal'));

interface AdminDashboardViewProps {
  activeAudition: Audition | null;
  auditions: Audition[];
  activeAuditionId: string | null;
  candidates: Candidate[];
  rankedCandidates: RankedCandidate[];
  logs: AdminLogEntry[];
  trashBatches: TrashBatch[];
  adminSessionRemainingMs: number;
  onBack: () => void;
  onChangeAudition: (auditionId: string) => void;
  onRenameAudition: (name: string) => Promise<void>;
  onOpenSettings: () => void;
  onOpenCreateAudition: () => void;
  onToggleActiveJudge: (judgeName: string) => Promise<void>;
  onFinalize: () => Promise<void>;
  onReopen: () => Promise<void>;
  onUnlockCandidate: (candidate: Candidate) => Promise<void>;
  onRestoreTrash: (batchId: string) => Promise<void>;
  onPurgeTrash: (batchId: string) => Promise<void>;
  onExportWorkbook: () => void;
  onOpenPrintReport: () => void;
  onOpenObserverBoard: () => void;
}

type AdminSection = 'overview' | 'judges' | 'progress' | 'statistics' | 'logs' | 'trash' | 'reports';

const SECTION_OPTIONS: Array<{
  id: AdminSection;
  label: string;
  icon: React.ReactNode;
}> = [
  { id: 'overview', label: '개요', icon: <LayoutDashboard size={14} /> },
  { id: 'judges', label: '심사위원', icon: <Users size={14} /> },
  { id: 'progress', label: '진행 현황', icon: <Activity size={14} /> },
  { id: 'statistics', label: '통계', icon: <BarChart3 size={14} /> },
  { id: 'logs', label: '로그', icon: <ScrollText size={14} /> },
  { id: 'trash', label: '휴지통', icon: <FolderClock size={14} /> },
  { id: 'reports', label: '보고서', icon: <FileText size={14} /> },
];

const formatRemainingTime = (milliseconds: number) => {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
};

const formatDateLabel = (value: unknown) => {
  if (!value) {
    return '-';
  }

  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate().toLocaleString('ko-KR');
  }

  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('ko-KR');
};

const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  activeAudition,
  auditions,
  activeAuditionId,
  candidates,
  rankedCandidates,
  logs,
  trashBatches,
  adminSessionRemainingMs,
  onBack,
  onChangeAudition,
  onRenameAudition,
  onOpenSettings,
  onOpenCreateAudition,
  onToggleActiveJudge,
  onFinalize,
  onReopen,
  onUnlockCandidate,
  onRestoreTrash,
  onPurgeTrash,
  onExportWorkbook,
  onOpenPrintReport,
  onOpenObserverBoard,
}) => {
  const [activeSection, setActiveSection] = useState<AdminSection>('overview');
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<CandidateStatusFilter>('all');
  const [renameValue, setRenameValue] = useState(activeAudition?.name ?? '');
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const deferredSearchText = useDeferredValue(searchText);
  const { showToast } = useToast();
  const { confirm } = useConfirmDialog();

  const progressSnapshot = useMemo(
    () => (activeAudition ? buildProgressSnapshot(candidates, activeAudition) : null),
    [activeAudition, candidates],
  );

  const filteredCandidates = useMemo(() => {
    const normalizedSearch = deferredSearchText.trim().toLocaleLowerCase('ko-KR');

    return rankedCandidates.filter((candidate) => {
      const progressItem = progressSnapshot?.candidates.find((item) => item.candidateId === candidate.id);
      if (!progressItem) {
        return false;
      }

      const matchesSearch =
        normalizedSearch.length === 0 || candidate.name.toLocaleLowerCase('ko-KR').includes(normalizedSearch);
      const matchesFilter =
        statusFilter === 'all'
          ? true
          : statusFilter === 'complete'
            ? progressItem.completionRate === 100
            : statusFilter === 'incomplete'
              ? progressItem.completionRate < 100
              : statusFilter === 'in-progress'
                ? progressItem.completionRate > 0 && progressItem.completionRate < 100
                : progressItem.isUnlocked;

      return matchesSearch && matchesFilter;
    });
  }, [deferredSearchText, progressSnapshot, rankedCandidates, statusFilter]);

  const summaryCards = useMemo(
    () => [
      {
        label: '참가팀',
        value: `${candidates.length}팀`,
        sublabel: activeAudition?.finalization.isFinalized ? '최종 스냅샷 기준 운영' : '실시간 운영 중',
      },
      {
        label: '심사위원',
        value: `${activeAudition?.judges.filter((judge) => judge.type !== 'observer').length ?? 0}명`,
        sublabel: `리더보드 반영 ${activeAudition?.activeJudges?.length ?? 0}명`,
      },
      {
        label: '완료율',
        value:
          progressSnapshot?.totals.candidateCount
            ? `${Math.round((progressSnapshot.totals.completedCandidates / progressSnapshot.totals.candidateCount) * 100)}%`
            : '0%',
        sublabel: `진행 중 ${progressSnapshot?.totals.inProgressCandidates ?? 0}팀`,
      },
      {
        label: '누락',
        value: `${progressSnapshot?.totals.missingScoreCount ?? 0}`,
        sublabel: `코멘트 ${progressSnapshot?.totals.missingCommentCount ?? 0}건`,
      },
    ],
    [activeAudition, candidates.length, progressSnapshot],
  );

  const runAction = async (title: string, runner: () => Promise<void>, successMessage: string) => {
    try {
      await runner();
      showToast({
        kind: 'success',
        title,
        message: successMessage,
      });
    } catch (error) {
      showToast({
        kind: 'error',
        title: `${title} 실패`,
        message: error instanceof Error ? error.message : `${title} 처리 중 오류가 발생했습니다.`,
      });
    }
  };

  if (!activeAudition) {
    return null;
  }

  const renderSectionHeader = (eyebrow: string, title: string, description: string) => (
    <div className="admin-panel__header">
      <div>
        <span className="section-kicker">{eyebrow}</span>
        <h3 className="admin-panel__title">{title}</h3>
        <p className="admin-panel__description">{description}</p>
      </div>
    </div>
  );

  const overviewSection = (
    <div className="admin-section-stack">
      <section className="glass-card admin-panel">
        {renderSectionHeader('개요', '오디션 컨트롤', '현재 오디션 전환과 이름 정리를 한 곳에서 처리합니다.')}
        <div className="admin-overview-grid">
          <div className="admin-field-card">
            <label className="admin-field-label">활성 오디션</label>
            <select
              className="premium-input"
              value={activeAuditionId ?? ''}
              onChange={(event) => onChangeAudition(event.target.value)}
            >
              {auditions.map((audition) => (
                <option key={audition.id} value={audition.id}>
                  {audition.name}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-field-card">
            <label className="admin-field-label">오디션 이름</label>
            <div className="admin-inline-field">
              <input
                className="premium-input"
                value={renameValue}
                onChange={(event) => setRenameValue(event.target.value)}
                placeholder="오디션 이름 수정"
              />
              <button
                type="button"
                className="premium-button secondary-btn"
                onClick={() => runAction('이름 변경', () => onRenameAudition(renameValue), '오디션 이름을 변경했습니다.')}
                disabled={!renameValue.trim() || renameValue.trim() === activeAudition.name}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="admin-action-grid">
        <div className="glass-card admin-action-card">
          <div className="admin-action-card__head">
            <Settings size={18} color="var(--primary)" />
            <strong>운영 설정</strong>
          </div>
          <p>심사위원 구성, 동점 정책, 탈락 기준을 정리합니다.</p>
          <button type="button" className="premium-button secondary-btn" onClick={onOpenSettings}>
            심사위원 설정 열기
          </button>
        </div>

        <div className="glass-card admin-action-card">
          <div className="admin-action-card__head">
            <Plus size={18} color="var(--primary)" />
            <strong>오디션 추가</strong>
          </div>
          <p>새 시즌이나 새 차수 운영을 바로 시작합니다.</p>
          <button type="button" className="premium-button secondary-btn" onClick={onOpenCreateAudition}>
            새 오디션 만들기
          </button>
        </div>

        <div className="glass-card admin-action-card">
          <div className="admin-action-card__head">
            <Upload size={18} color="var(--primary)" />
            <strong>참가팀 등록</strong>
          </div>
          <p>XLSX 템플릿 기반으로 여러 팀을 한 번에 등록합니다.</p>
          <button type="button" className="premium-button secondary-btn" onClick={() => setIsBulkImportOpen(true)}>
            일괄 등록 열기
          </button>
        </div>
      </section>
    </div>
  );

  const judgesSection = (
    <section className="glass-card admin-panel">
      {renderSectionHeader('심사위원', '리더보드 반영 제어', '참관자를 제외한 심사위원 중 누가 실시간 순위 계산에 반영되는지 관리합니다.')}
      <div className="admin-judge-board">
        {activeAudition.judges
          .filter((judge) => judge.type !== 'observer')
          .map((judge) => {
            const isActive = activeAudition.activeJudges?.includes(judge.name) ?? false;
            return (
              <button
                key={judge.name}
                type="button"
                className={`admin-judge-toggle ${isActive ? 'admin-judge-toggle--active' : ''}`}
                onClick={() =>
                  runAction(
                    '리더보드 반영 심사위원 변경',
                    () => onToggleActiveJudge(judge.name),
                    `${judge.name} 심사위원 반영 여부를 갱신했습니다.`,
                  )
                }
              >
                <span className="admin-judge-toggle__name">{judge.name}</span>
                <span className="admin-judge-toggle__state">{isActive ? 'ON' : 'OFF'}</span>
              </button>
            );
          })}
      </div>
      <div className="admin-inline-note">
        <span>리더보드 반영 심사위원 {activeAudition.activeJudges?.length ?? 0}명</span>
        <button type="button" className="premium-button secondary-btn" onClick={onOpenSettings}>
          상세 설정 열기
        </button>
      </div>
    </section>
  );

  const progressSection = (
    <div className="admin-section-stack">
      <section className="glass-card admin-panel">
        {renderSectionHeader('진행 현황', '현장 심사 진행 보드', '검색과 필터를 사용해 잠금 해제 대상과 누락 지점을 빠르게 찾습니다.')}
        <div className="admin-progress-strip">
          <span className="info-chip">완료 팀 {progressSnapshot?.totals.completedCandidates ?? 0}</span>
          <span className="info-chip">진행 중 {progressSnapshot?.totals.inProgressCandidates ?? 0}</span>
          <span className="info-chip">잠금 해제 팀 {progressSnapshot?.totals.unlockedCandidates ?? 0}</span>
          <span className="info-chip">누락 점수 {progressSnapshot?.totals.missingScoreCount ?? 0}</span>
          <span className="info-chip">누락 코멘트 {progressSnapshot?.totals.missingCommentCount ?? 0}</span>
        </div>

        <div className="admin-toolbar">
          <div className="admin-search">
            <Search size={16} />
            <input
              className="premium-input"
              placeholder="팀 이름 검색"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />
          </div>
          <select
            className="premium-input admin-filter-select"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as CandidateStatusFilter)}
          >
            <option value="all">전체</option>
            <option value="incomplete">미완료만</option>
            <option value="complete">완료만</option>
            <option value="in-progress">심사중만</option>
            <option value="unlocked">잠금해제 팀만</option>
          </select>
        </div>
      </section>

      <section className="glass-card admin-panel">
        <div className="admin-candidate-list">
          {filteredCandidates.length === 0 ? (
            <div className="admin-empty-state">조건에 맞는 참가팀이 없습니다.</div>
          ) : (
            filteredCandidates.map((candidate) => {
              const progressItem = progressSnapshot?.candidates.find((item) => item.candidateId === candidate.id);
              const completionRate = progressItem?.completionRate ?? 0;
              return (
                <article key={candidate.id} className="admin-candidate-row">
                  <div className="admin-candidate-row__main">
                    <div className="admin-rank-pill">{candidate.rank}</div>
                    <div className="admin-candidate-row__copy">
                      <div className="admin-candidate-row__title">
                        <strong>{candidate.name}</strong>
                        <span className="status-badge status-badge--muted">평균 {candidate.average}</span>
                        {candidate.isUnlocked ? <span className="status-badge status-badge--success">잠금 해제됨</span> : null}
                      </div>
                      <p>
                        {progressItem?.completedJudgeCount ?? 0}/{progressItem?.expectedJudgeCount ?? 0}명 완료 · 누락 점수{' '}
                        {progressItem?.missingScores ?? 0} · 누락 코멘트 {progressItem?.missingComments ?? 0}
                      </p>
                    </div>
                  </div>
                  <div className="admin-candidate-row__meta">
                    <div className="admin-progress-bar">
                      <div className="admin-progress-bar__fill" style={{ width: `${completionRate}%` }} />
                    </div>
                    <span className="admin-progress-value">{completionRate}%</span>
                    {activeAudition.finalization.isFinalized && !candidate.isUnlocked ? (
                      <button
                        type="button"
                        className="premium-button secondary-btn"
                        onClick={() =>
                          runAction('팀 잠금 해제', () => onUnlockCandidate(candidate), `${candidate.name} 팀을 다시 수정 가능하게 열었습니다.`)
                        }
                      >
                        <LockOpen size={15} />
                        팀 잠금 해제
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>
    </div>
  );

  const logsSection = (
    <section className="glass-card admin-panel">
      {renderSectionHeader('로그', '관리자 작업 이력', '생성, 설정 변경, 확정, 재개방, 휴지통 작업을 시간순으로 확인합니다.')}
      <div className="admin-list-stack">
        {logs.length === 0 ? (
          <div className="admin-empty-state">아직 기록된 작업 로그가 없습니다.</div>
        ) : (
          logs.map((log) => (
            <article key={log.id} className="admin-list-row">
              <div>
                <strong>{log.message}</strong>
                <p>{formatDateLabel(log.createdAt)} · {log.actor}</p>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );

  const statisticsSection = (
    <section className="admin-section-stack">
      <Suspense
        fallback={
          <section className="glass-card admin-panel">
            <div className="admin-empty-state">통계를 불러오는 중입니다.</div>
          </section>
        }
      >
        <StatisticsPanel candidates={candidates} activeAudition={activeAudition} embedded />
      </Suspense>
    </section>
  );

  const trashSection = (
    <section className="glass-card admin-panel">
      {renderSectionHeader('휴지통', '복구 및 영구 삭제', '오디션은 30일 동안 휴지통에 보관되며, 기간 내 복구할 수 있습니다.')}
      <div className="admin-list-stack">
        {trashBatches.length === 0 ? (
          <div className="admin-empty-state">휴지통에 보관 중인 오디션이 없습니다.</div>
        ) : (
          trashBatches.map((batch) => (
            <article key={batch.id} className="admin-list-row admin-list-row--spread">
              <div>
                <strong>{batch.auditionName}</strong>
                <p>
                  삭제 {formatDateLabel(batch.deletedAt)} · 만료 {formatDateLabel(batch.expiresAt)} · {batch.candidateCount}팀 보관
                </p>
              </div>
              <div className="admin-row-actions">
                <button
                  type="button"
                  className="premium-button secondary-btn"
                  onClick={() => runAction('휴지통 복구', () => onRestoreTrash(batch.id), `${batch.auditionName} 오디션을 복구했습니다.`)}
                >
                  <RefreshCcw size={15} />
                  복구
                </button>
                <button
                  type="button"
                  className="premium-button danger-btn"
                  onClick={async () => {
                    const shouldPurge = await confirm({
                      title: `${batch.auditionName} 오디션을 영구 삭제할까요?`,
                      description: '이 작업은 되돌릴 수 없습니다.',
                      confirmText: '영구 삭제',
                      tone: 'danger',
                    });

                    if (!shouldPurge) {
                      return;
                    }

                    await runAction(
                      '휴지통 영구 삭제',
                      () => onPurgeTrash(batch.id),
                      `${batch.auditionName} 오디션을 영구 삭제했습니다.`,
                    );
                  }}
                >
                  <Trash2 size={15} />
                  영구 삭제
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );

  const reportsSection = (
    <div className="admin-section-stack">
      <section className="glass-card admin-panel">
        {renderSectionHeader('보고서', '결과 확정과 제출 출력', '최종 확정 이후 XLSX와 인쇄용 결과 화면으로 운영 산출물을 정리합니다.')}
        <div className="admin-action-grid">
          <div className="glass-card admin-action-card admin-action-card--strong">
            <div className="admin-action-card__head">
              <ShieldCheck size={18} color="var(--primary)" />
              <strong>{activeAudition.finalization.isFinalized ? '전체 재개방' : '오디션 결과 확정'}</strong>
            </div>
            <p>
              {activeAudition.finalization.isFinalized
                ? '현재 결과는 확정되어 있습니다. 재개방하면 전체 팀을 다시 수정할 수 있습니다.'
                : '지금 상태를 최종 스냅샷으로 고정하고, 이후에는 팀별 잠금 해제로만 수정할 수 있습니다.'}
            </p>
            <button
              type="button"
              className="premium-button"
              onClick={async () => {
                if (activeAudition.finalization.isFinalized) {
                  await runAction('재개방', onReopen, '오디션 전체를 다시 수정 가능 상태로 열었습니다.');
                  return;
                }

                const shouldFinalize = await confirm({
                  title: '오디션 결과를 확정할까요?',
                  description: '확정 후에는 관리자만 팀별 잠금 해제를 통해 수정할 수 있습니다.',
                  confirmText: '확정',
                });

                if (!shouldFinalize) {
                  return;
                }

                await runAction('결과 확정', onFinalize, '최종 순위를 확정하고 스냅샷을 생성했습니다.');
              }}
            >
              {activeAudition.finalization.isFinalized ? <RefreshCcw size={16} /> : <ShieldCheck size={16} />}
              {activeAudition.finalization.isFinalized ? '전체 재개방' : '결과 확정'}
            </button>
          </div>

          <div className="glass-card admin-action-card">
            <div className="admin-action-card__head">
              <Download size={18} color="var(--primary)" />
              <strong>XLSX 보고서</strong>
            </div>
            <p>순위, 동점 처리, 심사위원별 점수, 완료 여부, 확정 시각을 담아 내보냅니다.</p>
            <button type="button" className="premium-button secondary-btn" onClick={onExportWorkbook}>
              XLSX 내보내기
            </button>
          </div>

          <div className="glass-card admin-action-card">
            <div className="admin-action-card__head">
              <FileText size={18} color="var(--primary)" />
              <strong>인쇄용 결과 화면</strong>
            </div>
            <p>브라우저 인쇄 또는 PDF 저장용으로 최종 결과를 깔끔하게 출력합니다.</p>
            <button type="button" className="premium-button secondary-btn" onClick={onOpenPrintReport}>
              인쇄용 화면 열기
            </button>
          </div>

          <div className="glass-card admin-action-card">
            <div className="admin-action-card__head">
              <Tv size={18} color="var(--primary)" />
              <strong>대형 화면 참관 모드</strong>
            </div>
            <p>순위, 진행률, 컷오프 상태만 큰 타이포로 보여주는 읽기 전용 화면입니다.</p>
            <button type="button" className="premium-button secondary-btn" onClick={onOpenObserverBoard}>
              참관 모드 열기
            </button>
          </div>
        </div>
      </section>
    </div>
  );

  return (
    <div className="dashboard fade-in admin-shell">
      <div className="admin-topbar">
        <div className="admin-topbar__copy">
          <span className="section-kicker">관리자 대시보드</span>
          <h2 className="admin-topbar__title">{activeAudition.name}</h2>
          <div className="admin-topbar__meta">
            <span className="status-badge status-badge--success">
              <ShieldCheck size={14} />
              세션 남은 시간 {formatRemainingTime(adminSessionRemainingMs)}
            </span>
            <span className="status-badge status-badge--muted">
              {activeAudition.finalization.isFinalized ? '결과 확정됨' : '운영 중'}
            </span>
          </div>
        </div>
        <button type="button" className="premium-button secondary-btn" onClick={onBack}>
          <ArrowLeft size={16} />
          랜딩으로
        </button>
      </div>

      <section className="glass-card admin-hero">
        <div className="admin-hero__main">
          <div>
            <span className="admin-hero__eyebrow">LIVE CONTROL</span>
            <h3 className="admin-hero__title">현장 운영과 결과 정리를 한 화면에서 관리합니다</h3>
            <p className="admin-hero__description">
              길게 쌓인 카드 대신, 필요한 운영 동선을 섹션별로 분리해 관리자 판단이 빠르게 이루어지도록 정리했습니다.
            </p>
          </div>
          <div className="admin-hero__actions">
            <button type="button" className="premium-button secondary-btn" onClick={onOpenSettings}>
              <Settings size={16} />
              설정
            </button>
            <button type="button" className="premium-button secondary-btn" onClick={() => setIsBulkImportOpen(true)}>
              <Upload size={16} />
              참가팀 등록
            </button>
            <button type="button" className="premium-button" onClick={() => setActiveSection('reports')}>
              <FileText size={16} />
              보고서 이동
            </button>
          </div>
        </div>
        <div className="admin-summary-grid">
          {summaryCards.map((card) => (
            <article key={card.label} className="admin-summary-card">
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <p>{card.sublabel}</p>
            </article>
          ))}
        </div>
      </section>

      <nav className="admin-section-nav">
        {SECTION_OPTIONS.map((section) => (
          <button
            key={section.id}
            type="button"
            className={`admin-section-nav__item ${activeSection === section.id ? 'admin-section-nav__item--active' : ''}`}
            onClick={() => setActiveSection(section.id)}
          >
            {section.icon}
            {section.label}
          </button>
        ))}
      </nav>

      {activeSection === 'overview' ? overviewSection : null}
      {activeSection === 'judges' ? judgesSection : null}
      {activeSection === 'progress' ? progressSection : null}
      {activeSection === 'statistics' ? statisticsSection : null}
      {activeSection === 'logs' ? logsSection : null}
      {activeSection === 'trash' ? trashSection : null}
      {activeSection === 'reports' ? reportsSection : null}

      {isBulkImportOpen ? (
        <Suspense
          fallback={
            <section className="glass-card admin-panel">
              <div className="admin-empty-state">일괄 등록 화면을 불러오는 중입니다.</div>
            </section>
          }
        >
          <BulkImportModal audition={activeAudition} candidates={candidates} onClose={() => setIsBulkImportOpen(false)} />
        </Suspense>
      ) : null}
    </div>
  );
};

export default AdminDashboardView;
