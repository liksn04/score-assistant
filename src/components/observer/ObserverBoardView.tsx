import React from 'react';
import { ArrowLeft, Gauge, Trophy, Tv, Users } from 'lucide-react';
import type { Audition, RankedCandidate } from '../../types';
import { buildProgressSnapshot } from '../../utils/rankingUtils.ts';

interface ObserverBoardViewProps {
  audition: Audition;
  rankedCandidates: RankedCandidate[];
  onBack: () => void;
}

const ObserverBoardView: React.FC<ObserverBoardViewProps> = ({ audition, rankedCandidates, onBack }) => {
  const progress = buildProgressSnapshot(rankedCandidates, audition);
  const displayEntries =
    audition.finalization.lastSnapshot?.entries ??
    rankedCandidates.map((candidate) => ({
      candidateId: candidate.id,
      candidateName: candidate.name,
      song: candidate.song ?? '',
      rank: candidate.rank,
      total: candidate.total,
      average: candidate.average,
      completedJudgeCount: candidate.completedJudgeCount,
      expectedJudgeCount: candidate.expectedJudgeCount,
      isFullyCompleted: candidate.isFullyCompleted,
      judgeTotals: candidate.judgeTotals,
    }));

  return (
    <div className="dashboard fade-in">
      <div className="dashboard-header">
        <div className="dashboard-identity">
          <div className="dashboard-title-row" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <Tv size={26} color="var(--primary)" />
            <h2 className="dashboard-title" style={{ fontSize: '2rem' }}>
              참관 모드
            </h2>
          </div>
          <p style={{ color: 'var(--text-muted)' }}>{audition.name}</p>
        </div>

        <button type="button" className="premium-button secondary-btn" onClick={onBack}>
          <ArrowLeft size={16} />
          돌아가기
        </button>
      </div>

      <div className="landing-control-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', marginBottom: '1.5rem' }}>
        <div className="glass-card stat-tile">
          <Trophy size={24} color="#fbbf24" />
          <div>
            <p style={{ color: 'var(--text-muted)' }}>상위 팀</p>
            <h3 style={{ fontSize: '1.5rem' }}>{displayEntries[0]?.candidateName ?? '-'}</h3>
          </div>
        </div>
        <div className="glass-card stat-tile">
          <Users size={24} color="#38bdf8" />
          <div>
            <p style={{ color: 'var(--text-muted)' }}>전체 팀</p>
            <h3 style={{ fontSize: '1.5rem' }}>{displayEntries.length}팀</h3>
          </div>
        </div>
        <div className="glass-card stat-tile">
          <Gauge size={24} color="#22c55e" />
          <div>
            <p style={{ color: 'var(--text-muted)' }}>완료율</p>
            <h3 style={{ fontSize: '1.5rem' }}>
              {progress.totals.candidateCount === 0
                ? '0%'
                : `${Math.round((progress.totals.completedCandidates / progress.totals.candidateCount) * 100)}%`}
            </h3>
          </div>
        </div>
      </div>

      <div className="glass-card">
        <div className="landing-operations__header" style={{ marginBottom: '1rem' }}>
          <div>
            <span className="section-kicker">실시간 보드</span>
            <h3 style={{ fontSize: '1.45rem', marginTop: '0.75rem' }}>순위 / 진행 상황 / 컷오프</h3>
          </div>
        </div>

        <div style={{ display: 'grid', gap: '0.9rem' }}>
          {displayEntries.map((entry, index) => {
            const isCutoff = audition.dropCount > 0 && index >= displayEntries.length - audition.dropCount;
            return (
              <div
                key={entry.candidateId}
                className="modal-muted-card"
                style={{
                  padding: '1.25rem 1.4rem',
                  borderColor: isCutoff ? 'rgba(244, 63, 94, 0.25)' : 'rgba(255,255,255,0.08)',
                  background: isCutoff ? 'rgba(244, 63, 94, 0.06)' : 'rgba(255,255,255,0.03)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>
                      {entry.rank}위 {entry.candidateName}
                    </div>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                      평균 {entry.average} · 총점 {entry.total} · {entry.completedJudgeCount}/{entry.expectedJudgeCount}명 완료
                    </p>
                  </div>
                  {isCutoff ? <span className="status-badge status-badge--muted">컷오프 구간</span> : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ObserverBoardView;
