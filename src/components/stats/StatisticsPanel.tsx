import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { BarChart3, Download, Archive, Unlock, TrendingUp, Users, Info } from 'lucide-react';
import type { Candidate, Audition } from '../../types';
import { calculateStats } from '../../utils/statsUtils';
import { exportToExcel } from '../../utils/exportUtils';
import { firebaseService } from '../../api/firebaseService';
import { useToast } from '../../context/ToastContext.tsx';
import { useConfirmDialog } from '../../context/ConfirmDialogContext.tsx';

interface StatisticsPanelProps {
  candidates: Candidate[];
  activeAudition: Audition | null;
  embedded?: boolean;
}

const StatisticsPanel: React.FC<StatisticsPanelProps> = ({ candidates, activeAudition, embedded = false }) => {
  const stats = activeAudition ? calculateStats(candidates, activeAudition) : null;
  const { showToast } = useToast();
  const { confirm } = useConfirmDialog();

  if (!stats || !activeAudition) return null;

  const handleExport = async () => {
    try {
      await exportToExcel(candidates, activeAudition);
      showToast({
        kind: 'success',
        title: '통계 내보내기 완료',
        message: '심사 통계 보고서를 다운로드했습니다.',
      });
    } catch (error) {
      showToast({
        kind: 'error',
        title: '통계 내보내기 실패',
        message: error instanceof Error ? error.message : '통계 파일 생성 중 오류가 발생했습니다.',
      });
    }
  };

  const handleToggleArchive = async () => {
    const newStatus = activeAudition.status === 'active' ? 'archived' : 'active';
    const shouldToggle = await confirm({
      title: `오디션을 ${newStatus === 'archived' ? '종료' : '활성화'}할까요?`,
      description: newStatus === 'archived' ? '종료된 오디션은 읽기 전용으로 전환됩니다.' : '다시 활성 오디션으로 복구합니다.',
      confirmText: newStatus === 'archived' ? '종료' : '활성화',
    });

    if (!shouldToggle) {
      return;
    }

    try {
      await firebaseService.updateAuditionStatus(activeAudition.id, newStatus);
      showToast({
        kind: 'success',
        title: '상태 변경 완료',
        message: newStatus === 'archived' ? '오디션을 종료했습니다.' : '오디션을 활성화했습니다.',
      });
    } catch (error) {
      showToast({
        kind: 'error',
        title: '상태 변경 실패',
        message: error instanceof Error ? error.message : '상태 변경 중 오류가 발생했습니다.',
      });
    }
  };

  const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f59e0b', '#10b981'];
  const sortedCandidateStats = [...stats.candidateStats].sort((a, b) => b.std - a.std);

  return (
    <div className="statistics-panel-stack">
      <div className="glass-card fade-in statistics-overview-card" style={{ padding: '2rem' }}>
        <div className="statistics-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.5rem' }}>
              <BarChart3 color="var(--primary)" size={28} />
              <h2 className="statistics-panel-title" style={{ fontSize: '1.8rem', fontWeight: 700, margin: 0 }}>심사 통계 분석</h2>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '1rem', fontWeight: 300 }}>
              {embedded
                ? '리더보드 운영에 필요한 심사위원 평균 점수와 후보자별 표준편차를 다시 확인합니다.'
                : '심사위원별 성향과 후보자 점수 일관성 데이터를 분석합니다.'}
            </p>
          </div>

          {!embedded ? (
            <div className="statistics-panel-actions" style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  void handleExport();
                }}
                className="premium-button"
                style={{ padding: '0.6rem 1.2rem', fontSize: '0.9rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)' }}
              >
                <Download size={18} /> 엑셀 내보내기
              </button>

              <button
                onClick={handleToggleArchive}
                className="premium-button"
                style={{
                  padding: '0.6rem 1.2rem',
                  fontSize: '0.9rem',
                  background: activeAudition.status === 'archived' ? 'rgba(234, 179, 8, 0.1)' : 'var(--primary)',
                  color: activeAudition.status === 'archived' ? '#eab308' : 'white',
                  border: activeAudition.status === 'archived' ? '1px solid rgba(234, 179, 8, 0.3)' : 'none',
                }}
              >
                {activeAudition.status === 'archived' ? <Unlock size={18} /> : <Archive size={18} />}
                {activeAudition.status === 'archived' ? '오디션 활성화' : '오디션 종료'}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="glass-card fade-in chart-card statistics-chart-card" style={{ padding: '1.6rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="statistics-chart-card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
          <Users size={18} color="var(--text-muted)" />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-muted)', margin: 0 }}>심사위원별 평균 점수</h3>
        </div>
        <div className="chart-frame chart-frame--wide" style={{ width: '100%', height: '320px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.judgeStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="judgeName" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} dy={10} />
              <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                itemStyle={{ color: 'var(--primary)' }}
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              />
              <Bar dataKey="averageScore" radius={[6, 6, 0, 0]} barSize={52}>
                {stats.judgeStats.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-card fade-in chart-card statistics-chart-card" style={{ padding: '1.6rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="statistics-chart-card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
          <TrendingUp size={18} color="var(--text-muted)" />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-muted)', margin: 0 }}>후보자별 표준편차</h3>
        </div>
        <div className="chart-frame chart-frame--wide" style={{ width: '100%', height: '320px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sortedCandidateStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} dy={10} />
              <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
              />
              <Line 
                type="monotone" 
                dataKey="std" 
                name="표준편차" 
                stroke="var(--secondary)" 
                strokeWidth={3} 
                dot={{ r: 4, fill: 'var(--secondary)', strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="statistics-tip" style={{ 
        padding: '1.2rem', 
        background: 'rgba(99, 102, 241, 0.05)', 
        border: '1px solid rgba(99, 102, 241, 0.2)', 
        borderRadius: '16px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '1rem'
      }}>
        <Info color="var(--primary)" size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
        <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)', margin: 0, lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--primary)', marginRight: '0.5rem' }}>TIP:</strong>
          표준편차(STD)가 높을수록 심사위원 간의 점수 차이가 크다는 것을 의미합니다. 
          특정 후보자의 편차가 비정상적으로 높을 경우, 심사 공정성을 위해 심사위원 간의 추가 논의가 권장됩니다.
        </p>
      </div>
    </div>
  );
};

export default StatisticsPanel;
