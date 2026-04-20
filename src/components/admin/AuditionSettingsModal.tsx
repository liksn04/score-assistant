import React, { useState } from 'react';
import { AlertTriangle, ArrowRight, BadgeCheck, Plus, Settings, Trash2, Users, X } from 'lucide-react';
import type { Audition, Criterion, JudgeConfig, JudgeType, RankingPolicy } from '../../types';
import ModalPortal from '../common/ModalPortal';
import { useToast } from '../../context/ToastContext.tsx';
import { useConfirmDialog } from '../../context/ConfirmDialogContext.tsx';
import { RANKING_POLICY_OPTIONS } from '../../utils/rankingUtils.ts';

interface AuditionSettingsModalProps {
  audition: Audition;
  candidateCount: number;
  onSave: (judges: JudgeConfig[], dropCount: number, rankingPolicy: RankingPolicy) => Promise<void>;
  onDelete: () => Promise<void>;
  onClose: () => void;
}

type EditableCriterion = Criterion & { localId: string };
type EditableJudgeConfig = Omit<JudgeConfig, 'criteria'> & { localId: string; criteria?: EditableCriterion[] };

const createLocalId = () =>
  globalThis.crypto?.randomUUID?.() ?? `draft-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const createEditableCriterion = (criterion?: Partial<Criterion>): EditableCriterion => ({
  localId: createLocalId(),
  item: criterion?.item ?? '항목 1',
  maxScore: criterion?.maxScore ?? 100,
});

const createDefaultCriteria = (): EditableCriterion[] => [createEditableCriterion()];

const toEditableCriteria = (criteria?: Criterion[]): EditableCriterion[] =>
  criteria && criteria.length > 0
    ? criteria.map((criterion) => createEditableCriterion(criterion))
    : createDefaultCriteria();

const JUDGE_TYPE_LABELS: Record<JudgeType, string> = {
  detail: '항목별 세부 평가',
  simple: '단순 총점 평가',
  observer: '참관자 (읽기 전용)',
};

const toEditableJudge = (judge: JudgeConfig, index: number): EditableJudgeConfig => ({
  localId: createLocalId(),
  name: judge.name || `심사위원 ${index + 1}`,
  pin: judge.pin || '123456',
  type: judge.type,
  criteria: judge.type === 'detail' ? toEditableCriteria(judge.criteria) : undefined,
});

const createDefaultJudge = (index: number): EditableJudgeConfig => ({
  localId: createLocalId(),
  name: `심사위원 ${index + 1}`,
  pin: '123456',
  type: 'detail',
  criteria: createDefaultCriteria(),
});

export const AuditionSettingsModal: React.FC<AuditionSettingsModalProps> = ({
  audition,
  candidateCount,
  onSave,
  onDelete,
  onClose,
}) => {
  const [judges, setJudges] = useState<EditableJudgeConfig[]>(() => (audition.judges || []).map(toEditableJudge));
  const [dropCount, setDropCount] = useState<number>(audition.dropCount || 0);
  const [rankingPolicyId, setRankingPolicyId] = useState<string>(audition.rankingPolicy.id);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const { showToast } = useToast();
  const { confirm } = useConfirmDialog();

  const isDeleteReady = deleteConfirmText.trim() === audition.name.trim();

  const updateJudgeAt = (index: number, updater: (judge: EditableJudgeConfig) => EditableJudgeConfig) => {
    setJudges((previousJudges) =>
      previousJudges.map((judge, judgeIndex) => (judgeIndex === index ? updater(judge) : judge)),
    );
  };

  const handleAddJudge = () => {
    setJudges((previousJudges) => [...previousJudges, createDefaultJudge(previousJudges.length)]);
  };

  const handleRemoveJudge = (index: number) => {
    setJudges((previousJudges) => previousJudges.filter((_, judgeIndex) => judgeIndex !== index));
  };

  const handleChangeJudge = (index: number, field: 'name' | 'pin' | 'type', value: string) => {
    updateJudgeAt(index, (judge) => {
      if (field === 'type') {
        const nextType = value as JudgeType;

        if (nextType !== 'detail') {
          const judgeWithoutCriteria = { ...judge };
          delete judgeWithoutCriteria.criteria;

          return {
            ...judgeWithoutCriteria,
            type: nextType,
          };
        }

        return {
          ...judge,
          type: nextType,
          criteria: judge.criteria && judge.criteria.length > 0 ? judge.criteria : createDefaultCriteria(),
        };
      }

      return { ...judge, [field]: value };
    });
  };

  const handleAddCriterion = (judgeIndex: number) => {
    updateJudgeAt(judgeIndex, (judge) => ({
      ...judge,
      criteria: [...(judge.criteria ?? []), createEditableCriterion({ item: '새 항목', maxScore: 20 })],
    }));
  };

  const handleRemoveCriterion = (judgeIndex: number, criterionIndex: number) => {
    updateJudgeAt(judgeIndex, (judge) => ({
      ...judge,
      criteria: (judge.criteria ?? []).filter((_, index) => index !== criterionIndex),
    }));
  };

  const handleChangeCriterion = (
    judgeIndex: number,
    criterionIndex: number,
    field: keyof Criterion,
    value: Criterion[keyof Criterion],
  ) => {
    updateJudgeAt(judgeIndex, (judge) => ({
      ...judge,
      criteria: (judge.criteria ?? []).map((criterion, index) =>
        index === criterionIndex ? { ...criterion, [field]: value } : criterion,
      ),
    }));
  };

  const handleSubmit = async () => {
    if (dropCount < 0) {
      showToast({
        kind: 'warning',
        title: '탈락 기준 오류',
        message: '탈락 팀 수는 0 이상이어야 합니다.',
      });
      return;
    }

    // Edge cases: 빈 이름, 중복 이름, 잘못된 PIN, detail 심사위원의 비정상 criteria를 저장 전에 막습니다.
    const sanitizedJudges: JudgeConfig[] = judges.map((editableJudge) => {
      const baseJudge = {
        name: editableJudge.name.trim(),
        pin: editableJudge.pin.trim(),
        type: editableJudge.type,
      };

      if (editableJudge.type !== 'detail') {
        return baseJudge;
      }

      return {
        ...baseJudge,
        // Firestore 배열 내부 객체에는 undefined 필드가 들어가면 저장이 실패합니다.
        criteria: (editableJudge.criteria ?? []).map((criterion) => ({
          item: criterion.item.trim(),
          maxScore: Number(criterion.maxScore) || 0,
        })),
      };
    });

    if (sanitizedJudges.some((judge) => judge.name.length === 0)) {
      showToast({
        kind: 'warning',
        title: '심사위원 이름 확인',
        message: '모든 심사위원 이름을 입력해 주세요.',
      });
      return;
    }

    const uniqueJudgeNames = new Set(sanitizedJudges.map((judge) => judge.name));
    if (uniqueJudgeNames.size !== sanitizedJudges.length) {
      showToast({
        kind: 'warning',
        title: '중복된 심사위원 이름',
        message: '심사위원 이름은 서로 중복될 수 없습니다.',
      });
      return;
    }

    if (sanitizedJudges.some((judge) => !/^\d{6}$/.test(judge.pin))) {
      showToast({
        kind: 'warning',
        title: 'PIN 형식 오류',
        message: '모든 심사위원 PIN은 숫자 6자리여야 합니다.',
      });
      return;
    }

    const hasInvalidCriteria = sanitizedJudges.some((judge) => {
      if (judge.type !== 'detail') {
        return false;
      }

      const criteria = judge.criteria ?? [];
      return criteria.length === 0 || criteria.some((criterion) => criterion.item.length === 0 || criterion.maxScore <= 0);
    });

    if (hasInvalidCriteria) {
      showToast({
        kind: 'warning',
        title: '세부 항목 확인',
        message: '세부 평가 심사위원은 비어 있지 않은 항목명과 1점 이상의 배점을 가져야 합니다.',
      });
      return;
    }

    setIsSaving(true);
    try {
      const rankingPolicy = RANKING_POLICY_OPTIONS.find((policy) => policy.id === rankingPolicyId) ?? audition.rankingPolicy;
      await onSave(sanitizedJudges, dropCount, rankingPolicy);
      onClose();
    } catch (error) {
      showToast({
        kind: 'error',
        title: '오디션 설정 저장 실패',
        message: error instanceof Error ? error.message : '오디션 설정 저장 중 오류가 발생했습니다.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isDeleteReady) {
      showToast({
        kind: 'warning',
        title: '삭제 확인 문구 불일치',
        message: '삭제하려면 오디션 이름을 정확히 입력해 주세요.',
      });
      return;
    }

    const candidateMessage = candidateCount > 0
      ? `참가자 ${candidateCount}팀의 점수와 코멘트도 함께 삭제됩니다.`
      : '현재 연결된 참가자는 없지만, 오디션 설정은 완전히 삭제됩니다.';

    const shouldDelete = await confirm({
      title: `"${audition.name}" 오디션을 휴지통으로 이동할까요?`,
      description: `${candidateMessage} 휴지통에서 30일 동안 복구할 수 있습니다.`,
      confirmText: '휴지통으로 이동',
      tone: 'danger',
    });

    if (!shouldDelete) {
      return;
    }

    setIsDeleting(true);

    try {
      await onDelete();
    } catch (error) {
      showToast({
        kind: 'error',
        title: '오디션 삭제 실패',
        message: error instanceof Error ? error.message : '오디션 삭제 중 오류가 발생했습니다.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <ModalPortal>
      <div className="modal-overlay-shell">
        <div className="modal-surface modal-surface--scrollable fade-in" style={{ maxWidth: '1120px' }}>
          <button
            type="button"
            className="modal-close-button"
            onClick={onClose}
            aria-label="오디션 환경설정 닫기"
          >
            <X size={20} />
          </button>

          <div className="modal-content">
            <div className="modal-header-row">
              <div className="modal-header-copy">
                <span className="modal-kicker">
                  <Settings size={14} />
                  오디션 환경설정
                </span>
                <h2>{audition.name}</h2>
              </div>
            </div>

            <div className="modal-summary-grid">
              <div className="modal-summary-card">
                <p className="modal-summary-label">등록된 심사위원</p>
                <p className="modal-summary-value">{judges.length}명</p>
              </div>
              <div className="modal-summary-card">
                <p className="modal-summary-label">활성 리더보드 심사위원</p>
                <p className="modal-summary-value">{audition.activeJudges?.length ?? 0}명</p>
              </div>
              <div className="modal-summary-card">
                <p className="modal-summary-label">현재 참가팀</p>
                <p className="modal-summary-value">{candidateCount}팀</p>
              </div>
              <div className="modal-summary-card">
                <p className="modal-summary-label">탈락 기준</p>
                <p className="modal-summary-value">하위 {dropCount}팀</p>
              </div>
            </div>

            <div className="modal-body-grid">
              <div className="modal-main-column">
                <section className="modal-section">
                <div className="modal-section-header">
                  <div>
                    <div className="modal-section-title">
                      <ArrowRight size={18} color="var(--primary)" />
                      기본 운영 설정
                    </div>
                  </div>
                </div>

                <div className="modal-muted-card" style={{ padding: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.6rem', color: 'var(--text-muted)' }}>
                    정기공연에 탈락할 하위 팀 개수
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
                    <input
                      type="number"
                      min={0}
                      className="premium-input"
                      style={{ width: '110px' }}
                      value={dropCount}
                      onChange={(e) => setDropCount(Math.max(0, Number(e.target.value) || 0))}
                    />
                    <span style={{ color: 'rgba(255,255,255,0.75)' }}>
                      팀
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      0이면 아무도 탈락하지 않습니다.
                    </span>
                  </div>
                </div>

                <div className="modal-muted-card" style={{ padding: '1rem', marginTop: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.6rem', color: 'var(--text-muted)' }}>
                    동점 처리 규칙
                  </label>
                  <select
                    className="premium-input"
                    value={rankingPolicyId}
                    onChange={(event) => setRankingPolicyId(event.target.value)}
                    style={{ cursor: 'pointer' }}
                  >
                    {RANKING_POLICY_OPTIONS.map((policy) => (
                      <option key={policy.id} value={policy.id}>
                        {policy.label}
                      </option>
                    ))}
                  </select>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginTop: '0.55rem' }}>
                    확정 시 이 규칙으로 최종 순위를 고정합니다.
                  </p>
                </div>
              </section>

              <section className="modal-section">
                <div className="modal-section-header">
                  <div>
                    <div className="modal-section-title">
                      <Users size={18} color="var(--primary)" />
                      심사위원 설정
                    </div>
                  </div>
                  <button type="button" className="premium-button" onClick={handleAddJudge}>
                    <Plus size={16} />
                    새로운 심사위원 추가
                  </button>
                </div>

                <div className="judge-config-list">
                  {judges.map((judge, judgeIndex) => {
                    const totalCriteriaScore = (judge.criteria ?? []).reduce((sum, criterion) => sum + criterion.maxScore, 0);

                    return (
                      <div key={judge.localId} className="judge-config-card">
                        <div className="judge-config-header">
                          <div>
                            <div className="judge-config-title">
                              <h3 style={{ fontSize: '1.1rem' }}>{judge.name || `심사위원 ${judgeIndex + 1}`}</h3>
                              <span className="status-badge status-badge--muted">
                                {JUDGE_TYPE_LABELS[judge.type]}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveJudge(judgeIndex)}
                            style={{
                              background: 'rgba(244, 63, 94, 0.1)',
                              border: '1px solid rgba(244, 63, 94, 0.2)',
                              color: '#f43f5e',
                              padding: '0.65rem 1rem',
                              borderRadius: '12px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem'
                            }}
                          >
                            <Trash2 size={16} />
                            삭제
                          </button>
                        </div>

                        <div className="judge-config-grid">
                          <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.45rem' }}>
                              심사위원 이름
                            </label>
                            <input
                              className="premium-input"
                              value={judge.name}
                              onChange={(e) => handleChangeJudge(judgeIndex, 'name', e.target.value)}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.45rem' }}>
                              6자리 PIN 코드
                            </label>
                            <input
                              className="premium-input"
                              value={judge.pin}
                              maxLength={6}
                              onChange={(e) => handleChangeJudge(judgeIndex, 'pin', e.target.value.replace(/[^0-9]/g, ''))}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.45rem' }}>
                              평가 유형
                            </label>
                            <select
                              className="premium-input"
                              style={{ cursor: 'pointer' }}
                              value={judge.type}
                              onChange={(e) => handleChangeJudge(judgeIndex, 'type', e.target.value as JudgeType)}
                            >
                              <option value="detail">항목별 세부 평가</option>
                              <option value="simple">단순 총점 평가</option>
                              <option value="observer">참관자 (읽기 전용)</option>
                            </select>
                          </div>
                        </div>

                        {judge.type === 'detail' && (
                          <div className="judge-criteria-panel">
                            <div className="modal-section-header" style={{ marginBottom: '0.85rem' }}>
                              <div>
                                <div className="modal-section-title" style={{ fontSize: '1rem' }}>
                                  <BadgeCheck size={16} color="var(--primary)" />
                                  세부 평가 항목
                                </div>
                              </div>
                              <button
                                type="button"
                                className="premium-button secondary-btn"
                                style={{ padding: '0.55rem 0.9rem', fontSize: '0.9rem' }}
                                onClick={() => handleAddCriterion(judgeIndex)}
                              >
                                <Plus size={15} />
                                항목 추가
                              </button>
                            </div>

                            <div className="criteria-list">
                              {(judge.criteria ?? []).map((criterion, criterionIndex) => (
                                <div key={criterion.localId} className="criteria-row">
                                  <input
                                    className="premium-input"
                                    placeholder="항목명 (예: 음정)"
                                    value={criterion.item}
                                    onChange={(e) => handleChangeCriterion(judgeIndex, criterionIndex, 'item', e.target.value)}
                                  />
                                  <input
                                    type="number"
                                    className="premium-input"
                                    placeholder="배점"
                                    value={criterion.maxScore}
                                    onChange={(e) => handleChangeCriterion(judgeIndex, criterionIndex, 'maxScore', Number(e.target.value) || 0)}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveCriterion(judgeIndex, criterionIndex)}
                                    style={{
                                      background: 'transparent',
                                      border: '1px solid rgba(244, 63, 94, 0.16)',
                                      color: '#f43f5e',
                                      borderRadius: '12px',
                                      padding: '0.75rem',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              ))}
                            </div>

                            <p style={{ marginTop: '0.9rem', textAlign: 'right', color: '#c7d2fe', fontSize: '0.88rem', fontWeight: 700 }}>
                              합산 만점: {totalCriteriaScore}점
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {judges.length === 0 && (
                    <div className="modal-muted-card" style={{ padding: '1.2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      등록된 심사위원이 없습니다.
                    </div>
                  )}
                </div>
                </section>
              </div>

              <aside className="modal-side-column">
                <section className="modal-danger-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
                  <AlertTriangle size={18} color="#fda4af" />
                  <h3 style={{ fontSize: '1.1rem', color: '#fecdd3' }}>위험 작업</h3>
                </div>

                <p style={{ color: 'rgba(255,255,255,0.84)', fontSize: '0.95rem', marginBottom: '0.6rem' }}>
                  실수로 생성한 오디션을 정리할 때만 사용하세요.
                </p>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                  {candidateCount > 0
                    ? `참가자 ${candidateCount}팀의 점수, 완료 상태, 코멘트도 함께 휴지통으로 이동됩니다.`
                    : '현재 연결된 참가자는 없지만, 오디션 정보와 심사위원 설정은 휴지통으로 이동됩니다.'}
                </p>
                <p style={{ color: '#fecaca', fontSize: '0.86rem', marginBottom: '0.8rem' }}>
                  휴지통 이동을 진행하려면 아래 입력란에 오디션 이름을 정확히 입력하세요.
                </p>

                <div className="modal-muted-card" style={{ padding: '0.9rem 1rem', marginBottom: '0.8rem' }}>
                  <p className="modal-summary-label">확인용 이름</p>
                  <p style={{ fontWeight: 700 }}>{audition.name}</p>
                </div>

                <input
                  className="premium-input"
                  placeholder={audition.name}
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  disabled={isSaving || isDeleting}
                  style={{
                    borderColor: 'rgba(244, 63, 94, 0.24)',
                    marginBottom: '0.1rem'
                  }}
                />

                <div className={`danger-status ${isDeleteReady ? 'danger-status--ready' : 'danger-status--pending'}`}>
                  {isDeleteReady ? '입력 확인 완료' : '오디션 이름이 아직 일치하지 않습니다'}
                </div>

                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={!isDeleteReady || isSaving || isDeleting}
                  style={{
                    marginTop: '1rem',
                    width: '100%',
                    background: isDeleteReady ? 'linear-gradient(135deg, #ef4444, #f97316)' : 'rgba(255,255,255,0.08)',
                    color: isDeleteReady ? 'white' : 'rgba(255,255,255,0.45)',
                    border: 'none',
                    borderRadius: '14px',
                    padding: '0.95rem 1.2rem',
                    fontWeight: 700,
                    cursor: isDeleteReady && !isSaving && !isDeleting ? 'pointer' : 'not-allowed'
                  }}
                >
                  {isDeleting ? '이동 중...' : '휴지통으로 이동'}
                </button>

                <p style={{ color: 'rgba(255,255,255,0.56)', fontSize: '0.82rem', marginTop: '0.85rem' }}>
                  다른 오디션이 없으면 이동 직후 기본 오디션이 자동으로 다시 생성됩니다.
                </p>
                </section>
              </aside>
            </div>

            <div className="modal-action-bar">
              <button type="button" className="premium-button secondary-btn" style={{ flex: 1 }} onClick={onClose} disabled={isSaving || isDeleting}>
                취소
              </button>
              <button type="button" className="premium-button" style={{ flex: 2 }} onClick={handleSubmit} disabled={isSaving || isDeleting}>
                {isSaving ? '저장 중...' : '설정 저장하기'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
