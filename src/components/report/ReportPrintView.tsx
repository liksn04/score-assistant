import React from 'react';
import { ArrowLeft, Printer } from 'lucide-react';
import type { Audition, Candidate } from '../../types';
import { firebaseService } from '../../api/firebaseService';

interface ReportPrintViewProps {
  audition: Audition;
  candidates: Candidate[];
  onBack: () => void;
}

const ReportPrintView: React.FC<ReportPrintViewProps> = ({ audition, candidates, onBack }) => {
  const snapshot = firebaseService.buildPrintReportSnapshot(audition, candidates);

  return (
    <div className="dashboard fade-in report-print-view">
      <div className="dashboard-header no-print">
        <div className="dashboard-identity">
          <div className="dashboard-title-row" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <Printer size={24} color="var(--primary)" />
            <h2 className="dashboard-title" style={{ fontSize: '1.7rem' }}>
              인쇄용 결과 보고서
            </h2>
          </div>
          <p style={{ color: 'var(--text-muted)' }}>{snapshot.auditionName}</p>
        </div>

        <div style={{ display: 'flex', gap: '0.7rem' }}>
          <button type="button" className="premium-button secondary-btn" onClick={onBack}>
            <ArrowLeft size={16} />
            돌아가기
          </button>
          <button type="button" className="premium-button" onClick={() => window.print()}>
            <Printer size={16} />
            인쇄 / PDF 저장
          </button>
        </div>
      </div>

      <div className="glass-card print-sheet">
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '2rem' }}>{snapshot.auditionName} 최종 결과</h1>
          <p style={{ color: 'var(--text-muted)' }}>
            동점 규칙: {snapshot.policyLabel} · 확정 시각: {String(snapshot.finalizedAt ?? '미확정')}
          </p>
        </div>

        <table className="print-report-table">
          <thead>
            <tr>
              <th>순위</th>
              <th>팀명</th>
              <th>곡명</th>
              <th>총점</th>
              <th>평균</th>
              <th>완료</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.rankings.map((entry) => (
              <tr key={entry.candidateId}>
                <td>{entry.rank}</td>
                <td>{entry.candidateName}</td>
                <td>{entry.song || '-'}</td>
                <td>{entry.total}</td>
                <td>{entry.average}</td>
                <td>{entry.isFullyCompleted ? '완료' : '미완료'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReportPrintView;
