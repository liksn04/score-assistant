import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  doc, 
  updateDoc, 
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import type { Candidate, JudgeName, EvaluationItem } from './types';
import { JUDGES, EVALUATION_ITEMS, JUDGE_SCORE_LIMITS } from './types';
import { 
  Users, 
  Trophy, 
  UserPlus, 
  Trash2, 
  LogOut,
  Star
} from 'lucide-react';

const App: React.FC = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedJudge, setSelectedJudge] = useState<JudgeName | null>(null);
  const [newCandidateName, setNewCandidateName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // 실시간 데이터 수신
  useEffect(() => {
    const q = query(collection(db, 'candidates'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as Candidate[];
      
      // 내림차순 정렬 (평균 점수 기준, 동점 시 이름순)
      const sortedData = [...data].sort((a, b) => {
        if (b.average !== a.average) return b.average - a.average;
        return a.name.localeCompare(b.name);
      });
      
      setCandidates(sortedData);
      setIsLoading(false);
    }, (error) => {
      console.error("Firestore 실시간 연결 오류:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 참가자 추가 시 세부 항목 초기화
  const addCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCandidateName.trim()) return;

    try {
      const initialScores: any = {};
      JUDGES.forEach(j => {
        initialScores[j] = {};
        EVALUATION_ITEMS.forEach(item => {
          initialScores[j][item] = null;
        });
      });

      await addDoc(collection(db, 'candidates'), {
        name: newCandidateName,
        scores: initialScores,
        total: 0,
        average: 0,
        updatedAt: serverTimestamp()
      });
      setNewCandidateName('');
    } catch (error) {
      alert("참가자 추가 중 오류가 발생했습니다.");
    }
  };

  // 세부 점수 업데이트 로직
  const updateDetailScore = async (candidateId: string, item: EvaluationItem, scoreStr: string) => {
    if (!selectedJudge) return;

    let score: number | null = scoreStr.trim() === "" ? null : parseInt(scoreStr);

    // 심사위원별/항목별 한도 가져오기
    const maxScore = JUDGE_SCORE_LIMITS[selectedJudge][item];

    // 유효성 검사
    if (score !== null && (isNaN(score) || score < 0 || score > maxScore)) {
      alert(`0에서 ${maxScore} 사이의 숫자를 입력해주세요. (${item} 항목 한도: ${maxScore}점)`);
      return;
    }

    const candidate = candidates.find(c => c.id === candidateId);
    if (!candidate) return;

    try {
      // 해당 심사위원의 세부 점수 업데이트
      const updatedJudgeScores = { 
        ...candidate.scores[selectedJudge], 
        [item]: score 
      };
      
      const newScores = {
        ...candidate.scores,
        [selectedJudge]: updatedJudgeScores
      };

      // 전체 통계 재계산
      let overallTotal = 0;
      let judgeCount = 0;

      JUDGES.forEach(j => {
        const jScores = newScores[j];
        if (!jScores) return;

        const validValues = Object.values(jScores).filter((v): v is number => v !== null);
        if (validValues.length > 0) {
          const jTotal = validValues.reduce((a, b) => a + b, 0);
          overallTotal += jTotal;
          judgeCount++;
        }
      });

      const average = judgeCount > 0 ? Number((overallTotal / judgeCount).toFixed(2)) : 0;

      await updateDoc(doc(db, 'candidates', candidateId), {
        scores: newScores,
        total: overallTotal,
        average: average,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("점수 업데이트 오류:", error);
    }
  };

  const deleteCandidate = async (id: string, name: string) => {
    if (window.confirm(`${name} 참가자를 삭제하시겠습니까?`)) {
      await deleteDoc(doc(db, 'candidates', id));
    }
  };

  // 심사위원별 총점 계산 도우미
  const getJudgeTotal = (candidate: Candidate, judge: JudgeName) => {
    const scores = candidate.scores[judge];
    if (!scores) return 0;
    return Object.values(scores).reduce((sum: number, val) => sum + (val || 0), 0);
  };

  if (isLoading) {
    return <div className="loading" style={{ color: 'white', textAlign: 'center', marginTop: '20%' }}>데이터 로드 중...</div>;
  }

  return (
    <div className="container" style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <header className="fade-in" style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '0.5rem', background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Audition Master
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Premium Multi-Criteria Scoring System</p>
      </header>

      {!selectedJudge ? (
        <div className="judge-selection fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
          {JUDGES.map(judge => (
            <div key={judge} className="glass-card" style={{ padding: '3rem', cursor: 'pointer', textAlign: 'center' }} onClick={() => setSelectedJudge(judge)}>
              <Users size={56} style={{ marginBottom: '1.5rem', color: 'var(--primary)' }} />
              <h2 style={{ fontSize: '1.8rem' }}>{judge} 심사위원</h2>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>심사 시작하기</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="dashboard fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Star color="#fbbf24" fill="#fbbf24" />
              <h2 style={{ fontSize: '1.8rem' }}>{selectedJudge} 심사위원 대시보드</h2>
            </div>
            <button className="premium-button logout-btn" style={{ background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', border: '1px solid rgba(244, 63, 94, 0.2)' }} onClick={() => setSelectedJudge(null)}>
              <LogOut size={18} style={{ marginRight: '0.5rem' }} /> 심사 종료
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2.5rem' }}>
            {/* Input Section */}
            <section>
              <div className="glass-card" style={{ padding: '2rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  <UserPlus size={22} color="var(--primary)" />
                  <h3 style={{ fontSize: '1.4rem' }}>새 참가자 등록</h3>
                </div>
                <form onSubmit={addCandidate} style={{ display: 'flex', gap: '1rem' }}>
                  <input className="premium-input" style={{ flex: 1 }} placeholder="참가자 이름을 입력하세요" value={newCandidateName} onChange={(e) => setNewCandidateName(e.target.value)} />
                  <button type="submit" className="premium-button">등록</button>
                </form>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <h3 style={{ fontSize: '1.4rem', borderLeft: '4px solid var(--primary)', paddingLeft: '1rem' }}>항목별 채점</h3>
                {candidates.map(candidate => (
                  <div key={candidate.id} className="glass-card candidate-row" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
                      <span style={{ fontSize: '1.2rem', fontWeight: 600 }}>{candidate.name}</span>
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                         <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>현재 총점: <strong style={{ color: 'var(--primary)' }}>{getJudgeTotal(candidate, selectedJudge)}</strong>/100</span>
                         <button onClick={() => deleteCandidate(candidate.id, candidate.name)} style={{ background: 'none', border: 'none', color: 'rgba(244, 63, 94, 0.6)', cursor: 'pointer' }}>
                           <Trash2 size={18} />
                         </button>
                      </div>
                    </div>
                    
                    <div className="scoring-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.8rem' }}>
                      {EVALUATION_ITEMS.map(item => (
                        <div key={item} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                            {item} ({JUDGE_SCORE_LIMITS[selectedJudge][item]}점)
                          </label>
                          <input 
                            type="number"
                            className="premium-input score-input"
                            style={{ padding: '8px', textAlign: 'center' }}
                            placeholder="0"
                            min="0"
                            max={JUDGE_SCORE_LIMITS[selectedJudge][item]}
                            value={candidate.scores[selectedJudge]?.[item] ?? ''}
                            onChange={(e) => updateDetailScore(candidate.id, item, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Results Section */}
            <section className="glass-card" style={{ padding: '2rem', height: 'fit-content' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
                <Trophy size={22} color="#fbbf24" />
                <h3 style={{ fontSize: '1.4rem' }}>실시간 순위 현황</h3>
              </div>
              
              <div className="leaderboard-table" style={{ width: '100%' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      <th style={{ padding: '1rem 0.5rem', textAlign: 'left' }}>순위</th>
                      <th style={{ padding: '1rem 0.5rem', textAlign: 'left' }}>이름</th>
                      <th style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>평균 점수</th>
                      <th style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>전체 합산</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidates.map((candidate, index) => (
                      <tr key={candidate.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}>
                        <td style={{ padding: '1.2rem 0.5rem' }}>
                          <div style={{ 
                            width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: index === 0 ? 'rgba(251, 191, 36, 0.2)' : 'rgba(255,255,255,0.05)',
                            color: index === 0 ? '#fbbf24' : 'var(--text)',
                            fontWeight: 'bold', border: index === 0 ? '1px solid #fbbf24' : 'none'
                          }}>
                            {index + 1}
                          </div>
                        </td>
                        <td style={{ padding: '1.2rem 0.5rem', fontWeight: 500 }}>{candidate.name}</td>
                        <td style={{ padding: '1.2rem 0.5rem', textAlign: 'center' }}>
                          <span style={{ 
                            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                            padding: '6px 14px', borderRadius: '20px', fontSize: '1rem', fontWeight: 'bold'
                          }}>
                            {candidate.average}
                          </span>
                        </td>
                        <td style={{ padding: '1.2rem 0.5rem', textAlign: 'right', color: 'var(--text-muted)' }}>
                          {candidate.total}점
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
