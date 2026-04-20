import { useState } from 'react';
import { firebaseService } from '../api/firebaseService';
import type { Candidate, Comment, Audition, PendingMutationState } from '../types';
import { useConfirmDialog } from '../context/ConfirmDialogContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { canEditCandidateScore } from '../utils/rankingUtils.ts';

const COMMENT_MAX_LENGTH = 500;
type MutationFeedbackMode = 'silent' | 'toast';

export const useJudgeActions = (candidates: Candidate[], audition: Audition | null, selectedJudge: string | null) => {
  const [newCandidateName, setNewCandidateName] = useState('');
  const [newSongTitle, setNewSongTitle] = useState('');
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [editingSongId, setEditingSongId] = useState<string | null>(null);
  const [tempSongTitle, setTempSongTitle] = useState('');
  const [pendingMutation, setPendingMutation] = useState<PendingMutationState>({ key: null, label: null });

  const { confirm } = useConfirmDialog();
  const { showToast, updateToast } = useToast();

  const judgeConfig = audition?.judges?.find((judge) => judge.name === selectedJudge);
  const isObserver = judgeConfig?.type === 'observer';

  const runMutation = async <T,>(
    key: string,
    title: string,
    runner: () => Promise<T>,
    mode: MutationFeedbackMode = 'silent',
    successMessage?: string,
  ) => {
    const toastId =
      mode === 'toast'
        ? showToast({
            kind: 'loading',
            title,
            message: `${title}을 처리하고 있습니다.`,
            dedupeKey: key,
          })
        : null;

    setPendingMutation({
      key,
      label: title,
    });

    try {
      const result = await runner();
      if (mode === 'toast' && toastId) {
        updateToast(toastId, {
          kind: 'success',
          title: `${title} 완료`,
          message: successMessage ?? `${title}을 완료했습니다.`,
        });
      }
      return result;
    } catch (error) {
      if (mode === 'toast' && toastId) {
        updateToast(toastId, {
          kind: 'error',
          title: `${title} 실패`,
          message: error instanceof Error ? error.message : `${title} 중 오류가 발생했습니다.`,
        });
      } else {
        showToast({
          kind: 'error',
          title: `${title} 실패`,
          message: error instanceof Error ? error.message : `${title} 중 오류가 발생했습니다.`,
        });
      }
      throw error;
    } finally {
      setPendingMutation({
        key: null,
        label: null,
      });
    }
  };

  const getCandidate = (candidateId: string) => candidates.find((candidate) => candidate.id === candidateId) ?? null;

  const isCandidateReadOnly = (candidateId: string) => {
    if (!audition) {
      return true;
    }

    if (audition.status === 'archived') {
      return true;
    }

    return !canEditCandidateScore(audition, candidateId);
  };

  const addCandidate = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!audition) {
      return;
    }

    const trimmedName = newCandidateName.trim();
    const trimmedSong = newSongTitle.trim();

    // Edge case 방어: 빈 팀명, 같은 오디션 내 중복 팀명, 확정된 오디션 추가 시도를 사전에 차단합니다.
    if (!trimmedName) {
      showToast({
        kind: 'warning',
        title: '팀명을 확인해 주세요',
        message: '팀명은 비워둘 수 없습니다.',
      });
      return;
    }

    if (candidates.some((candidate) => candidate.name.trim() === trimmedName)) {
      showToast({
        kind: 'warning',
        title: '중복 팀명',
        message: '같은 이름의 팀이 이미 등록되어 있습니다.',
      });
      return;
    }

    await runMutation(
      'candidate-create',
      '팀 등록',
      async () => {
        await firebaseService.addCandidate(trimmedName, trimmedSong, audition);
        setNewCandidateName('');
        setNewSongTitle('');
      },
      'silent',
    );
  };

  const updateSimpleScore = async (candidateId: string, scoreStr: string) => {
    if (!selectedJudge || !audition) {
      return;
    }

    if (isCandidateReadOnly(candidateId)) {
      showToast({
        kind: 'warning',
        title: '수정 잠금 상태',
        message: '확정된 결과는 잠금 해제된 팀만 수정할 수 있습니다.',
      });
      return;
    }

    const score = scoreStr.trim() === '' ? null : Number.parseInt(scoreStr, 10);
    if (score !== null && (Number.isNaN(score) || score < 0 || score > 100)) {
      showToast({
        kind: 'warning',
        title: '점수 범위 오류',
        message: '0에서 100 사이의 숫자를 입력해 주세요.',
      });
      return;
    }

    const candidate = getCandidate(candidateId);
    if (!candidate) {
      return;
    }

    await runMutation(
      `score-simple-${candidateId}`,
      '점수 저장',
      () => firebaseService.updateSimpleScore(candidate, selectedJudge, score, audition),
      'silent',
    );
  };

  const updateDetailScore = async (candidateId: string, item: string, scoreStr: string) => {
    if (!selectedJudge || !audition || !judgeConfig) {
      return;
    }

    if (isCandidateReadOnly(candidateId)) {
      showToast({
        kind: 'warning',
        title: '수정 잠금 상태',
        message: '확정된 결과는 잠금 해제된 팀만 수정할 수 있습니다.',
      });
      return;
    }

    const score = scoreStr.trim() === '' ? null : Number.parseInt(scoreStr, 10);
    const criterion = judgeConfig.criteria?.find((candidateCriterion) => candidateCriterion.item === item);
    const maxScore = criterion?.maxScore ?? 100;

    if (score !== null && (Number.isNaN(score) || score < 0 || score > maxScore)) {
      showToast({
        kind: 'warning',
        title: '점수 범위 오류',
        message: `0에서 ${maxScore} 사이의 숫자를 입력해 주세요.`,
      });
      return;
    }

    const candidate = getCandidate(candidateId);
    if (!candidate) {
      return;
    }

    await runMutation(
      `score-detail-${candidateId}-${item}`,
      '점수 저장',
      () => firebaseService.updateDetailScore(candidate, selectedJudge, item, score, audition),
      'silent',
    );
  };

  const addComment = async (candidateId: string) => {
    if (!selectedJudge || !audition) {
      return;
    }

    const content = commentInputs[candidateId]?.trim() ?? '';
    if (!content) {
      return;
    }

    // Edge case 방어: 빈 입력, 과도하게 긴 코멘트, 잠긴 팀에 대한 후기 수정 시도를 막습니다.
    if (content.length > COMMENT_MAX_LENGTH) {
      showToast({
        kind: 'warning',
        title: '코멘트 길이 초과',
        message: `코멘트는 ${COMMENT_MAX_LENGTH}자 이하로 입력해 주세요.`,
      });
      return;
    }

    const candidate = getCandidate(candidateId);
    if (!candidate) {
      return;
    }

    await runMutation(
      `comment-add-${candidateId}`,
      '코멘트 저장',
      async () => {
        await firebaseService.addComment(candidate, selectedJudge, content, audition);
        setCommentInputs((previous) => ({ ...previous, [candidateId]: '' }));
      },
      'silent',
    );
  };

  const deleteComment = async (candidateId: string, comment: Comment) => {
    if (!audition) {
      return;
    }

    const candidate = getCandidate(candidateId);
    if (!candidate) {
      return;
    }

    const shouldDelete = await confirm({
      title: '코멘트를 삭제할까요?',
      description: '삭제된 코멘트는 복구되지 않습니다.',
      confirmText: '삭제',
      tone: 'danger',
    });

    if (!shouldDelete) {
      return;
    }

    await runMutation(
      `comment-delete-${candidateId}-${comment.id}`,
      '코멘트 삭제',
      () => firebaseService.deleteComment(candidate, comment, audition),
      'silent',
    );
  };

  const updateItemStrikes = async (candidateId: string, item: string, increment: number) => {
    if (!selectedJudge || !audition) {
      return;
    }

    const candidate = getCandidate(candidateId);
    if (!candidate) {
      return;
    }

    const currentItemStrikes = candidate.scores[selectedJudge]?.itemStrikes || {};
    const newValue = Math.max(0, (currentItemStrikes[item] || 0) + increment);

    await runMutation(
      `strike-update-${candidateId}-${item}`,
      '표시 저장',
      () => firebaseService.updateItemStrikes(candidate, selectedJudge, item, newValue, audition),
      'silent',
    );
  };

  const updateSongTitle = async (candidateId: string, nextTitle: string) => {
    if (!audition) {
      return;
    }

    const candidate = getCandidate(candidateId);
    if (!candidate) {
      return;
    }

    await runMutation(
      `song-update-${candidateId}`,
      '곡명 저장',
      () => firebaseService.updateSongTitle(candidate, nextTitle, audition),
      'silent',
    );
  };

  const deleteCandidate = async (candidateId: string, name: string) => {
    if (!audition) {
      return;
    }

    const candidate = getCandidate(candidateId);
    if (!candidate) {
      return;
    }

    const shouldDelete = await confirm({
      title: `${name} 팀을 삭제할까요?`,
      description: '점수와 코멘트가 함께 사라지며 복구되지 않습니다.',
      confirmText: '삭제',
      tone: 'danger',
    });

    if (!shouldDelete) {
      return;
    }

    await runMutation(
      `candidate-delete-${candidateId}`,
      '팀 삭제',
      () => firebaseService.deleteCandidate(candidate, audition),
      'silent',
    );
  };

  const toggleCompletion = async (candidateId: string, currentStatus: boolean) => {
    if (!selectedJudge || !audition || !judgeConfig) {
      return;
    }

    const candidate = getCandidate(candidateId);
    if (!candidate) {
      return;
    }

    // Edge case 방어: 빈 점수 상태로 완료 처리, 잠긴 팀 재수정, 심사위원 설정 누락 상태를 차단합니다.
    if (!currentStatus) {
      if (judgeConfig.type === 'simple' && typeof candidate.scores[selectedJudge]?.simpleTotal !== 'number') {
        showToast({
          kind: 'warning',
          title: '점수 입력 필요',
          message: '완료 처리 전에 총점을 먼저 입력해 주세요.',
        });
        return;
      }

      if (judgeConfig.type === 'detail') {
        const hasMissingScore = (judgeConfig.criteria ?? []).some(
          (criterion) => typeof candidate.scores[selectedJudge]?.[criterion.item] !== 'number',
        );

        if (hasMissingScore) {
          showToast({
            kind: 'warning',
            title: '세부 점수 누락',
            message: '완료 처리 전에 모든 항목 점수를 입력해 주세요.',
          });
          return;
        }
      }
    }

    await runMutation(
      `completion-toggle-${candidateId}`,
      currentStatus ? '완료 취소' : '완료 저장',
      () => firebaseService.toggleJudgeCompletion(candidate, selectedJudge, currentStatus, audition),
      'silent',
    );
  };

  return {
    isObserver,
    newCandidateName,
    setNewCandidateName,
    newSongTitle,
    setNewSongTitle,
    commentInputs,
    setCommentInputs,
    expandedComments,
    setExpandedComments,
    editingSongId,
    setEditingSongId,
    tempSongTitle,
    setTempSongTitle,
    pendingMutation,
    isCandidateReadOnly,
    addCandidate,
    updateSimpleScore,
    updateDetailScore,
    addComment,
    deleteComment,
    updateItemStrikes,
    updateSongTitle,
    deleteCandidate,
    toggleCompletion,
  };
};
