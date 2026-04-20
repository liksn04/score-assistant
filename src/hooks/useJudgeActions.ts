import { useState } from 'react';
import { firebaseService } from '../api/firebaseService';
import type { Candidate, Audition } from '../types';

export const useJudgeActions = (candidates: Candidate[], audition: Audition | null) => {
  const [selectedJudge, setSelectedJudge] = useState<string | null>(null);
  
  const judgeConfig = audition?.judges?.find(j => j.name === selectedJudge);
  const isObserver = judgeConfig?.type === 'observer';
  
  const [newCandidateName, setNewCandidateName] = useState('');
  const [newSongTitle, setNewSongTitle] = useState('');
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [editingSongId, setEditingSongId] = useState<string | null>(null);
  const [tempSongTitle, setTempSongTitle] = useState('');

  // 참가자 추가
  const addCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCandidateName.trim() || !audition) return;
    try {
      await firebaseService.addCandidate(newCandidateName, newSongTitle, audition);
      setNewCandidateName('');
      setNewSongTitle('');
    } catch (error) {
      alert("참가자 추가 중 오류가 발생했습니다.");
    }
  };

  // 단순 점수 업데이트
  const updateSimpleScore = async (candidateId: string, scoreStr: string) => {
    if (!selectedJudge || !audition) return;
    let score: number | null = scoreStr.trim() === "" ? null : parseInt(scoreStr);
    if (score !== null && (isNaN(score) || score < 0 || score > 100)) {
       alert("0에서 100 사이의 숫자를 입력해주세요.");
       return;
    }
    const candidate = candidates.find(c => c.id === candidateId);
    if (!candidate) return;
    try {
      await firebaseService.updateSimpleScore(candidate, selectedJudge, score, audition);
    } catch (error) {
      console.error("단순 점수 업데이트 오류:", error);
    }
  };

  // 세부 점수 업데이트
  const updateDetailScore = async (candidateId: string, item: string, scoreStr: string) => {
    if (!selectedJudge || !audition || !judgeConfig) return;
    let score: number | null = scoreStr.trim() === "" ? null : parseInt(scoreStr);
    const criterion = judgeConfig.criteria?.find(c => c.item === item);
    const maxScore = criterion ? criterion.maxScore : 100;

    if (score !== null && (isNaN(score) || score < 0 || score > maxScore)) {
      alert(`0에서 ${maxScore} 사이의 숫자를 입력해주세요. (${item} 항목 한도: ${maxScore}점)`);
      return;
    }
    const candidate = candidates.find(c => c.id === candidateId);
    if (!candidate) return;
    try {
      await firebaseService.updateDetailScore(candidate, selectedJudge, item, score, audition);
    } catch (error) {
      console.error("점수 업데이트 오류:", error);
    }
  };

  // 코멘트 관리
  const addComment = async (candidateId: string) => {
    if (!selectedJudge || !commentInputs[candidateId]?.trim()) return;
    try {
      await firebaseService.addComment(candidateId, selectedJudge, commentInputs[candidateId]);
      setCommentInputs(prev => ({ ...prev, [candidateId]: '' }));
    } catch (error) {
      console.error("코멘트 추가 오류:", error);
      alert("코멘트 추가 중 오류가 발생했습니다.");
    }
  };

  const deleteComment = async (candidateId: string, comment: any) => {
    if (!window.confirm("이 코멘트를 삭제하시겠습니까?")) return;
    try {
      await firebaseService.deleteComment(candidateId, comment);
    } catch (error) {
      console.error("코멘트 삭제 오류:", error);
    }
  };

  // 기타 액션
  const updateItemStrikes = async (candidateId: string, item: string, increment: number) => {
    if (!selectedJudge) return;
    const candidate = candidates.find(c => c.id === candidateId);
    if (!candidate) return;
    try {
      const currentItemStrikes = candidate.scores[selectedJudge]?.itemStrikes || {};
      const newVal = Math.max(0, (currentItemStrikes[item] || 0) + increment);
      await firebaseService.updateItemStrikes(candidate, selectedJudge, item, newVal);
    } catch (error) {
      console.error("스트라이크 업데이트 오류:", error);
    }
  };

  const updateSongTitle = async (candidateId: string, newTitle: string) => {
    try {
      await firebaseService.updateSongTitle(candidateId, newTitle);
    } catch (error) {
      console.error("곡명 업데이트 오류:", error);
    }
  };

  const deleteCandidate = async (id: string, name: string) => {
    if (window.confirm(`${name} 참가자를 삭제하시겠습니까?`)) {
      await firebaseService.deleteCandidate(id);
    }
  };

  const toggleCompletion = async (candidateId: string, currentStatus: boolean) => {
    if (!selectedJudge) return;
    try {
      await firebaseService.toggleJudgeCompletion(candidateId, selectedJudge, currentStatus);
    } catch (error) {
      console.error("완료 상태 토글 오류:", error);
    }
  };

  return {
    selectedJudge, setSelectedJudge, isObserver,
    newCandidateName, setNewCandidateName,
    newSongTitle, setNewSongTitle,
    commentInputs, setCommentInputs,
    expandedComments, setExpandedComments,
    editingSongId, setEditingSongId,
    tempSongTitle, setTempSongTitle,
    addCandidate, updateSimpleScore, updateDetailScore,
    addComment, deleteComment,
    updateItemStrikes, updateSongTitle, deleteCandidate,
    toggleCompletion
  };
};
