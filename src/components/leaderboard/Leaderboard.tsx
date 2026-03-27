import React from 'react';
import { Trophy } from 'lucide-react';
import type { Candidate } from '../../types';

interface LeaderboardProps {
  sortedCandidates: Candidate[];
}

const Leaderboard: React.FC<LeaderboardProps> = ({ sortedCandidates }) => {
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
            {sortedCandidates.map((candidate: Candidate, index: number) => {
              const isEliminationRisk = index >= 14;
              return (
                <tr key={candidate.id} style={{ 
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <span style={{ color: isEliminationRisk ? '#f43f5e' : 'inherit' }}>{candidate.name}</span>
                        {isEliminationRisk && (
                          <span style={{ 
                            fontSize: '0.7rem', 
                            backgroundColor: '#f43f5e', 
                            color: 'white', 
                            padding: '2px 6px', 
                            borderRadius: '4px',
                            fontWeight: 'bold',
                            letterSpacing: '-0.02em'
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
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default Leaderboard;
