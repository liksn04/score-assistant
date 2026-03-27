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
import { JUDGES, EVALUATION_ITEMS, JUDGE_SCORE_LIMITS, SIMPLE_JUDGES } from './types';
import { 
  Users, 
  Star, 
  LogOut, 
  UserPlus, 
  Trophy, 
  X, 
  Trash2, 
  Send,
  MessageSquare,
  ChevronDown, 
  ChevronUp 
} from 'lucide-react';
import { arrayUnion, arrayRemove } from 'firebase/firestore';

const App: React.FC = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedJudge, setSelectedJudge] = useState<JudgeName | null>(null);
  const isObserver = selectedJudge === '참관자';
  const [newCandidateName, setNewCandidateName] = useState('');
  const [newSongTitle, setNewSongTitle] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [editingSongId, setEditingSongId] = useState<string | null>(null);
  const [tempSongTitle, setTempSongTitle] = useState('');

  // 실시간 순위 데이터 (순위표 전용)
  const sortedCandidates = React.useMemo(() => {
    return [...candidates].sort((a, b) => {
      if (b.average !== a.average) return b.average - a.average;
      return a.name.localeCompare(b.name);
    });
  }, [candidates]);

  // 실시간 데이터 수신
  useEffect(() => {
    const q = query(collection(db, 'candidates'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as Candidate[];
      
      // 입력창 고정을 위해 등록 순으로 정렬 (updatedAt 기준 오름차순)
      // 또는 id 기준 등으로 고정 가능. 여기서는 updatedAt 기준.
      const fixedData = [...data].sort((a, b) => {
        const timeA = a.updatedAt?.seconds || 0;
        const timeB = b.updatedAt?.seconds || 0;
        return timeA - timeB;
      });
      
      setCandidates(fixedData);
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
        initialScores[j] = { strikes: 0, itemStrikes: {} };
        EVALUATION_ITEMS.forEach(item => {
          initialScores[j][item] = null;
          initialScores[j].itemStrikes[item] = 0;
        });
      });

      await addDoc(collection(db, 'candidates'), {
        name: newCandidateName,
        song: newSongTitle,
        scores: initialScores,
        total: 0,
        average: 0,
        updatedAt: serverTimestamp()
      });
      setNewCandidateName('');
      setNewSongTitle('');
    } catch (error) {
      alert("참가자 추가 중 오류가 발생했습니다.");
    }
  };

  // 단순 점수 업데이트 로직 (전체 100점 방식)
  const updateSimpleScore = async (candidateId: string, scoreStr: string) => {
    if (!selectedJudge) return;

    let score: number | null = scoreStr.trim() === "" ? null : parseInt(scoreStr);

    if (score !== null && (isNaN(score) || score < 0 || score > 100)) {
       alert("0에서 100 사이의 숫자를 입력해주세요.");
       return;
    }

    const candidate = candidates.find(c => c.id === candidateId);
    if (!candidate) return;

    try {
      const newScores = {
        ...candidate.scores,
        [selectedJudge]: { 
          ...candidate.scores[selectedJudge], 
          simpleTotal: score 
        }
      };

      // 전체 통계 재계산
      let overallTotal = 0;
      let judgeCount = 0;

      JUDGES.forEach(j => {
        const jScores = newScores[j];
        if (!jScores) return;

        let jTotal = 0;
        let hasScore = false;

        if (SIMPLE_JUDGES.includes(j)) {
          // 단순 채점 모드
          if (jScores.simpleTotal !== null && jScores.simpleTotal !== undefined) {
             jTotal = jScores.simpleTotal;
             hasScore = true;
          }
        } else {
          // 세부 채점 모드
          const validValues = EVALUATION_ITEMS.map(item => jScores[item]).filter((v): v is number => v !== null);
          if (validValues.length > 0) {
             jTotal = validValues.reduce((a, b) => a + b, 0);
             hasScore = true;
          }
        }

        if (hasScore) {
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
      console.error("단순 점수 업데이트 오류:", error);
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

        let jTotal = 0;
        let hasScore = false;

        if (SIMPLE_JUDGES.includes(j)) {
          // 단순 채점 모드
          if (jScores.simpleTotal !== null && jScores.simpleTotal !== undefined) {
             jTotal = jScores.simpleTotal;
             hasScore = true;
          }
        } else {
          // 세부 채점 모드
          const validValues = EVALUATION_ITEMS.map(item => jScores[item]).filter((v): v is number => v !== null);
          if (validValues.length > 0) {
             jTotal = validValues.reduce((a, b) => a + b, 0);
             hasScore = true;
          }
        }

        if (hasScore) {
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

  const addComment = async (candidateId: string) => {
    if (!selectedJudge || !commentInputs[candidateId]?.trim()) return;

    try {
      const newComment = {
        id: Math.random().toString(36).substr(2, 9),
        author: selectedJudge,
        content: commentInputs[candidateId].trim(),
        createdAt: new Date().toISOString(), // serverTimestamp() inside arrayUnion is not supported directly in some cases, using ISO string for simplicity or handling it differently
      };

      await updateDoc(doc(db, 'candidates', candidateId), {
        comments: arrayUnion(newComment)
      });

      setCommentInputs(prev => ({ ...prev, [candidateId]: '' }));
    } catch (error) {
      console.error("코멘트 추가 오류:", error);
      alert("코멘트 추가 중 오류가 발생했습니다.");
    }
  };

  const deleteComment = async (candidateId: string, comment: any) => {
    if (!window.confirm("이 코멘트를 삭제하시겠습니까?")) return;

    try {
      await updateDoc(doc(db, 'candidates', candidateId), {
        comments: arrayRemove(comment)
      });
    } catch (error) {
      console.error("코멘트 삭제 오류:", error);
    }
  };

  const updateItemStrikes = async (candidateId: string, item: string, increment: number) => {
    if (!selectedJudge) return;

    const candidate = candidates.find(c => c.id === candidateId);
    if (!candidate) return;

    try {
      const currentItemStrikes = candidate.scores[selectedJudge]?.itemStrikes || {};
      const currentVal = currentItemStrikes[item] || 0;
      const newVal = Math.max(0, currentVal + increment);

      const newScores = {
        ...candidate.scores,
        [selectedJudge]: {
          ...candidate.scores[selectedJudge],
          itemStrikes: {
            ...currentItemStrikes,
            [item]: newVal
          }
        }
      };

      await updateDoc(doc(db, 'candidates', candidateId), {
        scores: newScores
      });
    } catch (error) {
      console.error("항목별 스트라이크 업데이트 오류:", error);
    }
  };

  const updateSongTitle = async (candidateId: string, newTitle: string) => {
    try {
      await updateDoc(doc(db, 'candidates', candidateId), {
        song: newTitle,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("곡명 업데이트 오류:", error);
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

    if (SIMPLE_JUDGES.includes(judge)) {
      return scores.simpleTotal || 0;
    }

    // EVALUATION_ITEMS만 집계 (simpleTotal 제외)
    return EVALUATION_ITEMS.reduce((sum: number, item) => sum + (scores[item] || 0), 0);
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
              <h2 style={{ fontSize: '1.8rem' }}>{isObserver ? '참관자 모니터링 대시보드' : `${selectedJudge} 심사위원 대시보드`}</h2>
            </div>
            <button className="premium-button logout-btn" style={{ background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', border: '1px solid rgba(244, 63, 94, 0.2)' }} onClick={() => setSelectedJudge(null)}>
              <LogOut size={18} style={{ marginRight: '0.5rem' }} /> {isObserver ? '나가기' : '심사 종료'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isObserver ? '1fr' : '1.2fr 1fr', gap: '2.5rem' }}>
            {/* Input Section */}
            <section>
              {!isObserver && (
                <div className="glass-card" style={{ padding: '2rem', marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    <UserPlus size={22} color="var(--primary)" />
                    <h3 style={{ fontSize: '1.4rem' }}>새 참가자 등록</h3>
                  </div>
                  <form onSubmit={addCandidate} style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <input className="premium-input" style={{ flex: 1 }} placeholder="참가자 이름" value={newCandidateName} onChange={(e) => setNewCandidateName(e.target.value)} />
                      <input className="premium-input" style={{ flex: 1 }} placeholder="곡명 (예: 밤양갱)" value={newSongTitle} onChange={(e) => setNewSongTitle(e.target.value)} />
                    </div>
                    <button type="submit" className="premium-button">참가자 등록</button>
                  </form>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <h3 style={{ fontSize: '1.4rem', borderLeft: '4px solid var(--primary)', paddingLeft: '1rem' }}>
                  {isObserver ? '참가자 목록' : (SIMPLE_JUDGES.includes(selectedJudge) ? '단순 합산 채점' : '항목별 세부 채점')}
                </h3>
                {candidates.map(candidate => (
                  <div key={candidate.id} className="glass-card candidate-row" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <span style={{ fontSize: '1.2rem', fontWeight: 600 }}>{candidate.name}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          {editingSongId === candidate.id && !isObserver ? (
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                              <input 
                                className="premium-input" 
                                style={{ padding: '2px 8px', fontSize: '0.8rem', width: '150px' }}
                                value={tempSongTitle}
                                onChange={(e) => setTempSongTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    updateSongTitle(candidate.id, tempSongTitle);
                                    setEditingSongId(null);
                                  } else if (e.key === 'Escape') {
                                    setEditingSongId(null);
                                  }
                                }}
                                autoFocus
                              />
                              <button 
                                onClick={() => {
                                  updateSongTitle(candidate.id, tempSongTitle);
                                  setEditingSongId(null);
                                }}
                                style={{ background: 'var(--primary)', border: 'none', color: 'white', borderRadius: '4px', padding: '2px 6px', fontSize: '0.7rem', cursor: 'pointer' }}
                              >
                                저장
                              </button>
                            </div>
                          ) : (
                            <span 
                              style={{ 
                                fontSize: '0.85rem', 
                                color: 'var(--text-muted)', 
                                cursor: isObserver ? 'default' : 'pointer' 
                              }}
                              onClick={() => {
                                if (isObserver) return;
                                setEditingSongId(candidate.id);
                                setTempSongTitle(candidate.song || '');
                              }}
                            >
                              🎵 {candidate.song || (isObserver ? '곡 정보 없음' : '곡명 미입력 (클릭하여 추가)')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                         <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                           {isObserver ? '실시간 평균 점수: ' : '현재 총점: '}
                           <strong style={{ color: 'var(--primary)' }}>
                             {isObserver ? candidate.average : getJudgeTotal(candidate, selectedJudge)}
                           </strong>/100
                         </span>
                         {!isObserver && (
                           <button onClick={() => deleteCandidate(candidate.id, candidate.name)} style={{ background: 'none', border: 'none', color: 'rgba(244, 63, 94, 0.6)', cursor: 'pointer' }}>
                             <Trash2 size={18} />
                           </button>
                         )}
                      </div>
                    </div>

                    {/* Scoring Section */}
                    {!isObserver && (
                      SIMPLE_JUDGES.includes(selectedJudge) ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginTop: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <label style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>총점 입력 (0~100):</label>
                            <input 
                              type="number"
                              className="premium-input score-input"
                              style={{ maxWidth: '120px', textAlign: 'center' }}
                              placeholder="0"
                              min="0"
                              max="100"
                              value={candidate.scores[selectedJudge]?.simpleTotal ?? ''}
                              onChange={(e) => updateSimpleScore(candidate.id, e.target.value)}
                            />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <button 
                              onClick={() => updateItemStrikes(candidate.id, 'simple', 1)}
                              style={{ background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.2)', color: '#f43f5e', borderRadius: '8px', padding: '4px 8px', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                            >
                              <X size={14} /> <span style={{ fontSize: '0.8rem', marginLeft: '2px' }}>X 추가</span>
                            </button>
                            <div style={{ display: 'flex', gap: '2px' }}>
                              {Array.from({ length: candidate.scores[selectedJudge]?.itemStrikes?.['simple'] || 0 }).map((_, i) => (
                                <X key={i} size={16} color="#f43f5e" strokeWidth={3} />
                              ))}
                            </div>
                            {(candidate.scores[selectedJudge]?.itemStrikes?.['simple'] || 0) > 0 && (
                              <button 
                                onClick={() => updateItemStrikes(candidate.id, 'simple', -1)}
                                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.7rem' }}
                              >
                                취소
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="scoring-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                          {EVALUATION_ITEMS.map(item => (
                            <div key={item} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255, 255, 255, 0.02)', padding: '0.8rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.03)' }}>
                              <label style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.7)', flex: 1 }}>{item} ({JUDGE_SCORE_LIMITS[selectedJudge][item]})</label>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <input type="number" className="premium-input score-input" style={{ width: '60px', padding: '6px', textAlign: 'center', fontSize: '0.9rem' }} min="0" max={JUDGE_SCORE_LIMITS[selectedJudge][item]} value={candidate.scores[selectedJudge]?.[item] ?? ''} onChange={(e) => updateDetailScore(candidate.id, item, e.target.value)} />
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                  <button onClick={() => updateItemStrikes(candidate.id, item, 1)} style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.2)', color: '#f43f5e', borderRadius: '6px', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={14} strokeWidth={3} /></button>
                                  <div style={{ display: 'flex', gap: '1px' }}>{Array.from({ length: candidate.scores[selectedJudge]?.itemStrikes?.[item] || 0 }).map((_, i) => (<X key={i} size={14} color="#f43f5e" strokeWidth={3} />))}</div>
                                  {(candidate.scores[selectedJudge]?.itemStrikes?.[item] || 0) > 0 && (<button onClick={() => updateItemStrikes(candidate.id, item, -1)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.65rem' }}>-</button>)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    )}

                    {/* Comment Section with Toggle */}
                    <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setExpandedComments(prev => ({ ...prev, [candidate.id]: !prev[candidate.id] }))}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <MessageSquare size={16} color="var(--text-muted)" />
                          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 500 }}>심사 코멘트 ({candidate.comments?.length || 0})</span>
                        </div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                          {expandedComments[candidate.id] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </span>
                      </div>
                      {expandedComments[candidate.id] && (
                        <div style={{ marginTop: '1rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '1rem' }}>
                            {candidate.comments && candidate.comments.length > 0 ? candidate.comments.map((comment) => (
                              <div key={comment.id} style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: comment.author === '준모' ? '#6366f1' : (comment.author === '정현' ? '#fbbf24' : '#a855f7'), background: 'rgba(255, 255, 255, 0.05)', padding: '2px 6px', borderRadius: '4px' }}>{comment.author}</span>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                  <p style={{ fontSize: '0.9rem', lineHeight: '1.5', color: 'rgba(255, 255, 255, 0.9)' }}>{comment.content}</p>
                                </div>
                                {comment.author === selectedJudge && (
                                  <button onClick={() => deleteComment(candidate.id, comment)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}><X size={14} /></button>
                                )}
                              </div>
                            )) : <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem', border: '1px dashed rgba(255, 255, 255, 0.05)', borderRadius: '12px' }}>아직 작성된 코멘트가 없습니다.</p>}
                          </div>
                          <div style={{ display: 'flex', gap: '0.6rem' }}>
                            <input className="premium-input" style={{ flex: 1, padding: '0.6rem 1rem', fontSize: '0.9rem' }} placeholder="질문이나 피드백을 남겨주세요..." value={commentInputs[candidate.id] || ''} onChange={(e) => setCommentInputs(prev => ({ ...prev, [candidate.id]: e.target.value }))} onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && addComment(candidate.id)} />
                            <button className="premium-button" style={{ padding: '0.6rem', borderRadius: '10px' }} onClick={() => addComment(candidate.id)} disabled={!commentInputs[candidate.id]?.trim()}><Send size={18} /></button>
                          </div>
                        </div>
                      )}
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
                    {sortedCandidates.map((candidate, index) => {
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
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
