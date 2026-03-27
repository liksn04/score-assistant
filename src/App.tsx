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
import type { Candidate, JudgeName } from './types';
import { JUDGES } from './types';
import { 
  Users, 
  Plus, 
  Trophy, 
  UserPlus, 
  Trash2, 
  LogOut
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

  // 참가자 추가
  const addCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCandidateName.trim()) return;

    try {
      const initialScores: Record<string, number | null> = {};
      JUDGES.forEach(j => initialScores[j] = null);

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

  // 점수 업데이트 로직
  const updateScore = async (candidateId: string, scoreStr: string) => {
    if (!selectedJudge) return;

    // Edge Case: 빈 문자열 처리
    if (scoreStr.trim() === "") {
        const candidate = candidates.find(c => c.id === candidateId);
        if (!candidate) return;

        const updatedScores = { ...candidate.scores, [selectedJudge]: null };
        const validScores = Object.values(updatedScores).filter((s): s is number => s !== null);
        const total = validScores.reduce((a, b) => a + b, 0);
        const avg = validScores.length > 0 ? Number((total / validScores.length).toFixed(2)) : 0;

        await updateDoc(doc(db, 'candidates', candidateId), {
            scores: updatedScores,
            total,
            average: avg,
            updatedAt: serverTimestamp()
        });
        return;
    }

    const score = parseInt(scoreStr);

    // Edge Case: 숫자 유효성 검사 (0~100)
    if (isNaN(score) || score < 0 || score > 100) {
      alert("0에서 100 사이의 숫자를 입력해주세요.");
      return;
    }

    const candidate = candidates.find(c => c.id === candidateId);
    if (!candidate) return;

    try {
      const updatedScores = { ...candidate.scores, [selectedJudge]: score };
      const validScores = Object.values(updatedScores).filter((s): s is number => s !== null);
      const total = validScores.reduce((a, b) => a + b, 0);
      
      // 실제 평균은 채점한 사람 기준이 일반적일 수 있음. 여기서는 채점한 인원 기준으로 우선 구현
      const dynamicAvg = validScores.length > 0 ? Number((total / validScores.length).toFixed(2)) : 0;

      await updateDoc(doc(db, 'candidates', candidateId), {
        scores: updatedScores,
        total: total,
        average: dynamicAvg, // 현재 채점된 기준 평균
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

  if (isLoading) {
    return <div className="loading">로딩 중...</div>;
  }

  return (
    <div className="container" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <header className="fade-in" style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '0.5rem', background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Audition Master
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Premium Audition Scoring System</p>
      </header>

      {!selectedJudge ? (
        /* Judge Selection */
        <div className="judge-selection fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
          {JUDGES.map(judge => (
            <div 
              key={judge} 
              className="glass-card" 
              style={{ padding: '2.5rem', cursor: 'pointer', textAlign: 'center' }}
              onClick={() => setSelectedJudge(judge)}
            >
              <Users size={48} style={{ marginBottom: '1rem', color: 'var(--primary)' }} />
              <h2 style={{ fontSize: '1.5rem' }}>{judge} 심사위원</h2>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>점수를 입력하려면 선택하세요</p>
            </div>
          ))}
        </div>
      ) : (
        /* Judge Dashboard */
        <div className="dashboard fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Users color="var(--primary)" />
              <h2 style={{ fontSize: '1.8rem' }}>{selectedJudge} 심사위원님, 환영합니다.</h2>
            </div>
            <button className="premium-button" style={{ background: 'rgba(244, 63, 94, 0.2)', color: '#f43f5e', border: '1px solid rgba(244, 63, 94, 0.3)' }} onClick={() => setSelectedJudge(null)}>
              <LogOut size={18} style={{ marginRight: '0.5rem' }} /> 심사 종료
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2rem' }}>
            {/* Input Section */}
            <section className="glass-card" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <UserPlus size={20} color="var(--primary)" />
                <h3 style={{ fontSize: '1.3rem' }}>참가자 등록</h3>
              </div>
              <form onSubmit={addCandidate} style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  className="premium-input" 
                  style={{ flex: 1 }}
                  placeholder="참가자 이름을 입력하세요"
                  value={newCandidateName}
                  onChange={(e) => setNewCandidateName(e.target.value)}
                />
                <button type="submit" className="premium-button">
                  <Plus size={20} />
                </button>
              </form>

              <div style={{ marginTop: '2.5rem' }}>
                <h3 style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>실시간 점수 입력</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {candidates.map(candidate => (
                    <div key={candidate.id} className="glass-card" style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 500 }}>{candidate.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <input 
                          type="number"
                          className="premium-input"
                          style={{ width: '80px', textAlign: 'center', padding: '8px' }}
                          placeholder="0-100"
                          value={candidate.scores[selectedJudge] ?? ''}
                          onChange={(e) => updateScore(candidate.id, e.target.value)}
                        />
                        <button onClick={() => deleteCandidate(candidate.id, candidate.name)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Leaderboard Section */}
            <section className="glass-card" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <Trophy size={20} color="#fbbf24" />
                <h3 style={{ fontSize: '1.3rem' }}>실시간 리더보드</h3>
              </div>
              
              <div className="leaderboard" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '1rem' }}>순위</th>
                      <th style={{ padding: '1rem' }}>이름</th>
                      <th style={{ padding: '1rem' }}>평균</th>
                      <th style={{ padding: '1rem', textAlign: 'center' }}>총점</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidates.map((candidate, index) => (
                      <tr key={candidate.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}>
                        <td style={{ padding: '1rem' }}>
                          <span style={{ 
                            color: index === 0 ? '#fbbf24' : (index === 1 ? '#cbd5e1' : (index === 2 ? '#b45309' : 'var(--text)')),
                            fontWeight: index < 3 ? 'bold' : 'normal'
                          }}>
                            {index + 1}위
                          </span>
                        </td>
                        <td style={{ padding: '1rem', fontWeight: 500 }}>{candidate.name}</td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.9rem' }}>
                            {candidate.average}점
                          </span>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>{candidate.total}점</td>
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
