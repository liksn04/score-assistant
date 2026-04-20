import React from 'react';
import { Trophy, AlertTriangle } from 'lucide-react';
import type { Candidate, Audition } from '../../types';

interface LeaderboardProps {
  sortedCandidates: Candidate[];
  activeAudition: Audition | null;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ sortedCandidates, activeAudition }) => {
  const dropCount = activeAudition?.dropCount || 0;
  const totalTeams = sortedCandidates.length;
  const cutoffIndex = totalTeams - dropCount; // e.g., if 20 teams, drop 5 -> index 15 and above are dropped

  // Helper to check if a specific index is exactly at the cutoff line
  const isCutoffLine = (index: number) => dropCount > 0 && index === cutoffIndex;

  return (
    <section className="glass-card" style={{ padding: '2rem', height: 'fit-content' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
        <Trophy size={22} color="#fbbf24" />
        <h3 style={{ fontSize: '1.4rem' }}>실시간 순위 현황</h3>
      </div>
      
      <div className="leaderboard-wrapper">
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '400px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              <th style={{ padding: '1rem 0.5rem', textAlign: 'left' }}>순위</th>
              <th style={{ padding: '1rem 0.5rem', textAlign: 'left' }}>이름</th>
              <th style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>평균 점수</th>
              <th style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>전체 합산</th>
            </tr>
          </thead>
          <tbody>
            {sortedCandidates.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  참가팀이 없습니다.
                </td>
              </tr>
            ) : (
              sortedCandidates.map((candidate: Candidate, index: number) => {
                const isEliminationRisk = dropCount > 0 && index >= cutoffIndex;
                return (
                  <React.Fragment key={candidate.id}>
                    {/* 커트라인 구분선 렌더링 */}
                    {isCutoffLine(index) && (
                      <tr style={{ background: 'transparent' }}>
                        <td colSpan={4} style={{ padding: '0.5rem 0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ flex: 1, height: '1px', background: 'rgba(244, 63, 94, 0.4)' }} />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f43f5e', fontSize: '0.8rem', fontWeight: 600 }}>
                              <AlertTriangle size={14} /> 하위 {dropCount}팀 탈락 커트라인
                            </div>
                            <div style={{ flex: 1, height: '1px', background: 'rgba(244, 63, 94, 0.4)' }} />
                          </div>
                        </td>
                      </tr>
                    )}
                    
                    <tr style={{ 
                      borderBottom: '1px solid var(--border)', 
                      transition: 'background 0.2s',
                      background: isEliminationRisk ? 'rgba(244, 63, 94, 0.03)' : 'transparent'
                    }}>
                      <td style={{ padding: '1.2rem 0.5rem' }}>
                        <div style={{ 
                          width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: index === 0 ? 'rgba(251, 191, 36, 0.2)' : (isEliminationRisk ? 'rgba(244, 63, 94, 0.2)' : 'rgba(255,255,255,0.05)'),
                          color: index === 0 ? '#fbbf24' : (isEliminationRisk ? '#f43f5e' : 'var(--text)'),
                          fontWeight: 'bold', 
                          border: index === 0 ? '1px solid #fbbf24' : (isEliminationRisk ? '1px solid rgba(244, 63, 94, 0.4)' : 'none')
                        }}>
                          {index + 1}
                        </div>
                      </td>
                      <td style={{ padding: '1.2rem 0.5rem', fontWeight: 500 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
                            <span style={{ color: isEliminationRisk ? '#f43f5e' : 'inherit' }}>{candidate.name}</span>
                            {isEliminationRisk && (
                              <span style={{ 
                                fontSize: '0.7rem', 
                                backgroundColor: '#f43f5e', 
                                color: 'white', 
                                padding: '2px 6px', 
                                borderRadius: '4px',
                                fontWeight: 'bold',
                                letterSpacing: '-0.02em',
                                wordBreak: 'keep-all'
                              }}>
                                탈락 위기
                              </span>
                            )}
                          </div>
                          {candidate.song && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>{candidate.song}</span>}
                        </div>
                      </td>
                      <td style={{ padding: '1.2rem 0.5rem', textAlign: 'center' }}>
                        <span style={{ 
                          background: isEliminationRisk 
                            ? 'linear-gradient(135deg, #f43f5e, #991b1b)' 
                            : 'linear-gradient(135deg, var(--primary), var(--secondary))',
                          padding: '6px 14px', borderRadius: '20px', fontSize: '1rem', fontWeight: 'bold'
                        }}>
                          {candidate.average}
                        </span>
                      </td>
                      <td style={{ padding: '1.2rem 0.5rem', textAlign: 'right', color: isEliminationRisk ? '#f43f5e' : 'var(--text-muted)' }}>
                        {candidate.total}점
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })
            )}
            
            {/* 데이터 부족으로 인해 커트라인이 그려지지 않았지만 표시가 필요할 때 보정 */}
            {dropCount > 0 && totalTeams > 0 && totalTeams <= cutoffIndex && (
              <tr>
                <td colSpan={4} style={{ padding: '1.5rem 0 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(244, 63, 94, 0.4)' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      <AlertTriangle size={14} /> 현재 등록 팀이 적어 모든 팀이 합격권입니다 (하위 {dropCount}팀 탈락)
                    </div>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(244, 63, 94, 0.4)' }} />
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default Leaderboard;
