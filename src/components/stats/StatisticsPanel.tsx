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
import { BarChart3, Download, Archive, Unlock, TrendingUp, Users } from 'lucide-react';
import type { Candidate, Audition } from '../../types';
import { calculateStats } from '../../utils/statsUtils';
import { exportToExcel } from '../../utils/exportUtils';
import { firebaseService } from '../../api/firebaseService';

interface StatisticsPanelProps {
  candidates: Candidate[];
  activeAudition: Audition | null;
}

const StatisticsPanel: React.FC<StatisticsPanelProps> = ({ candidates, activeAudition }) => {
  const stats = calculateStats(candidates);

  if (!stats || !activeAudition) return null;

  const handleExport = () => {
    exportToExcel(candidates, activeAudition.name);
  };

  const handleToggleArchive = async () => {
    const newStatus = activeAudition.status === 'active' ? 'archived' : 'active';
    if (window.confirm(`오디션을 ${newStatus === 'archived' ? '종료(아카이브)' : '활성화'} 하시겠습니까?`)) {
      await firebaseService.updateAuditionStatus(activeAudition.id, newStatus);
    }
  };

  const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981'];

  return (
    <div className="glass-card p-6 mb-8 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 mb-1">
            <BarChart3 className="text-indigo-400" />
            심사 통계 분석
          </h2>
          <p className="text-gray-400 text-sm">심사위원별 성향 및 후보자 점수 일관성을 분석합니다.</p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <button 
            onClick={handleExport}
            className="flex-1 md:flex-none py-2 px-4 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 text-sm"
          >
            <Download size={18} />
            엑셀 내보내기
          </button>
          
          <button 
            onClick={handleToggleArchive}
            className={`flex-1 md:flex-none py-2 px-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 text-sm ${
              activeAudition.status === 'archived' 
                ? 'bg-amber-500/20 text-amber-500 border border-amber-500/20 hover:bg-amber-500/30' 
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20'
            }`}
          >
            {activeAudition.status === 'archived' ? <Unlock size={18} /> : <Archive size={18} />}
            {activeAudition.status === 'archived' ? '오디션 활성화' : '오디션 종료'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 심사위원별 평균 점수 */}
        <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
          <h3 className="text-sm font-semibold text-gray-400 mb-4 flex items-center gap-2">
            <Users size={16} /> 심사위원별 평균 점수
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.judgeStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis dataKey="judgeName" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="averageScore" radius={[4, 4, 0, 0]} barSize={40}>
                  {stats.judgeStats.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 심사 일관성 (표준편차) */}
        <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
          <h3 className="text-sm font-semibold text-gray-400 mb-4 flex items-center gap-2">
            <TrendingUp size={16} /> 후보자별 심사 일관성 (편차)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.candidateStats.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend iconType="circle" />
                <Line 
                  type="monotone" 
                  dataKey="std" 
                  name="표준편차 (낮을수록 일치)" 
                  stroke="#ec4899" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#ec4899', strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="spread" 
                  name="최대-최소 차이(Gap)" 
                  stroke="#f59e0b" 
                  strokeWidth={2} 
                  strokeDasharray="5 5"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
        <p className="text-xs text-indigo-300 flex items-start gap-2 leading-relaxed">
          <span className="font-bold flex-shrink-0 bg-indigo-500 text-white px-1.5 rounded">TIP</span>
          표준편차가 높을수록 심사위원 간의 점수 차이가 크다는 것을 의미합니다. 
          특정 후보자의 편차가 비정상적으로 높을 경우 재심사나 심사위원 간의 논의가 필요할 수 있습니다.
        </p>
      </div>
    </div>
  );
};

export default StatisticsPanel;
