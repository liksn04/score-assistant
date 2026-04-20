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
  Legend
} from 'recharts';
import { BarChart3, Download, Archive, Unlock, TrendingUp, Users, Info } from 'lucide-react';
import type { Candidate, Audition } from '../../types';
import { calculateStats } from '../../utils/statsUtils';
import { exportToExcel } from '../../utils/exportUtils';
import { firebaseService } from '../../api/firebaseService';

interface StatisticsPanelProps {
  candidates: Candidate[];
  activeAudition: Audition | null;
}

const StatisticsPanel: React.FC<StatisticsPanelProps> = ({ candidates, activeAudition }) => {
  const stats = activeAudition ? calculateStats(candidates, activeAudition) : null;

  if (!stats || !activeAudition) return null;

  const handleExport = () => {
    exportToExcel(candidates, activeAudition);
  };

  const handleToggleArchive = async () => {
    const newStatus = activeAudition.status === 'active' ? 'archived' : 'active';
    if (window.confirm(`오디션을 ${newStatus === 'archived' ? '종료(아카이브)' : '활성화'} 하시겠습니까?`)) {
      try {
        await firebaseService.updateAuditionStatus(activeAudition.id, newStatus);
      } catch (error) {
        alert("상태 변경 중 오류가 발생했습니다.");
      }
    }
  };

  const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f59e0b', '#10b981'];

  return (
    <div className="glass-card fade-in" style={{ padding: '2rem', marginBottom: '3rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.5rem' }}>
            <BarChart3 color="var(--primary)" size={28} />
            <h2 style={{ fontSize: '1.8rem', fontWeight: 700, margin: 0 }}>심사 통계 분석</h2>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', fontWeight: 300 }}>심사위원별 성향과 후보자 점수 일관성 데이터를 분석합니다.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
          <button 
            onClick={handleExport}
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
              border: activeAudition.status === 'archived' ? '1px solid rgba(234, 179, 8, 0.3)' : 'none'
            }}
          >
            {activeAudition.status === 'archived' ? <Unlock size={18} /> : <Archive size={18} />}
            {activeAudition.status === 'archived' ? '오디션 활성화' : '오디션 종료'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 0.8fr) 1.2fr', gap: '2rem' }}>
        {/* 심사위원별 평균 점수 */}
        <div className="glass-card" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
            <Users size={18} color="var(--text-muted)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-muted)', margin: 0 }}>심사위원별 평균 점수</h3>
          </div>
          <div style={{ width: '100%', height: '280px' }}>
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
                <Bar dataKey="averageScore" radius={[6, 6, 0, 0]} barSize={45}>
                  {stats.judgeStats.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 심사 일관성 (표준편차) */}
        <div className="glass-card" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
            <TrendingUp size={18} color="var(--text-muted)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-muted)', margin: 0 }}>후보자별 점수 일관성 (편차)</h3>
          </div>
          <div style={{ width: '100%', height: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={[...stats.candidateStats].sort((a, b) => b.std - a.std).slice(0, 20)}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                />
                <Legend verticalAlign="top" height={36} />
                <Line 
                  type="monotone" 
                  dataKey="std" 
                  name="표준편차 (낮을수록 일치)" 
                  stroke="var(--secondary)" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: 'var(--secondary)', strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="spread" 
                  name="최대-최소 점수차" 
                  stroke="var(--text-muted)" 
                  strokeWidth={1.5} 
                  strokeDasharray="5 5"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div style={{ 
        marginTop: '2.5rem', 
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

