import React, { useMemo, useState } from 'react';
import { Download, FileSpreadsheet, Upload, X } from 'lucide-react';
import ModalPortal from '../common/ModalPortal';
import type { Audition, BulkImportValidationResult, Candidate } from '../../types';
import { downloadBulkImportTemplate, parseBulkImportFile } from '../../utils/bulkImportUtils.ts';
import { firebaseService } from '../../api/firebaseService';
import { useToast } from '../../context/ToastContext.tsx';

interface BulkImportModalProps {
  audition: Audition;
  candidates: Candidate[];
  onClose: () => void;
}

const emptyValidationResult: BulkImportValidationResult = {
  rows: [],
  validRows: [],
  errors: [],
  hasBlockingErrors: false,
};

const BulkImportModal: React.FC<BulkImportModalProps> = ({ audition, candidates, onClose }) => {
  const [validationResult, setValidationResult] = useState<BulkImportValidationResult>(emptyValidationResult);
  const [fileName, setFileName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  const existingNames = useMemo(() => candidates.map((candidate) => candidate.name), [candidates]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const result = await parseBulkImportFile(file, existingNames);
      setValidationResult(result);
      setFileName(file.name);
      showToast({
        kind: result.hasBlockingErrors ? 'warning' : 'success',
        title: result.hasBlockingErrors ? '업로드 미리보기 완료' : '업로드 검증 완료',
        message:
          result.validRows.length > 0
            ? `${result.validRows.length}개 행을 등록할 수 있습니다.`
            : '등록 가능한 행이 없습니다.',
      });
    } catch (error) {
      showToast({
        kind: 'error',
        title: '파일 분석 실패',
        message: error instanceof Error ? error.message : '업로드 파일을 읽는 중 오류가 발생했습니다.',
      });
    }
  };

  const handleImport = async () => {
    if (validationResult.validRows.length === 0) {
      showToast({
        kind: 'warning',
        title: '등록 가능한 행이 없습니다',
        message: '오류를 수정한 뒤 다시 업로드해 주세요.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const summary = await firebaseService.bulkImportCandidates(audition, validationResult.rows);
      showToast({
        kind: 'success',
        title: '일괄 등록 완료',
        message: `${summary.importedCount}개 팀을 등록했습니다.`,
      });
      onClose();
    } catch (error) {
      showToast({
        kind: 'error',
        title: '일괄 등록 실패',
        message: error instanceof Error ? error.message : '참가팀 일괄 등록 중 오류가 발생했습니다.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTemplateDownload = async () => {
    try {
      await downloadBulkImportTemplate();
      showToast({
        kind: 'success',
        title: '템플릿 다운로드 완료',
        message: '참가팀 일괄 등록용 XLSX 템플릿을 다운로드했습니다.',
      });
    } catch (error) {
      showToast({
        kind: 'error',
        title: '템플릿 다운로드 실패',
        message: error instanceof Error ? error.message : '템플릿 파일 생성 중 오류가 발생했습니다.',
      });
    }
  };

  return (
    <ModalPortal>
      <div className="modal-overlay-shell fade-in">
        <div className="modal-surface modal-surface--scrollable modal-entrance" style={{ maxWidth: '960px' }}>
          <button type="button" className="modal-close-button" onClick={onClose} aria-label="일괄 등록 모달 닫기">
            <X size={18} />
          </button>

          <div className="modal-content">
            <div className="modal-header-row">
              <div className="modal-header-copy">
                <span className="modal-kicker">
                  <FileSpreadsheet size={14} />
                  참가팀 일괄 등록
                </span>
                <h2>{audition.name}</h2>
                <p>XLSX 템플릿을 내려받아 `팀명`, `곡명` 컬럼만 채운 뒤 업로드하세요.</p>
              </div>
            </div>

            <div className="modal-summary-grid">
              <div className="modal-summary-card">
                <p className="modal-summary-label">선택한 파일</p>
                <p className="modal-summary-value">{fileName || '아직 없음'}</p>
              </div>
              <div className="modal-summary-card">
                <p className="modal-summary-label">등록 가능 행</p>
                <p className="modal-summary-value">{validationResult.validRows.length}개</p>
              </div>
              <div className="modal-summary-card">
                <p className="modal-summary-label">오류 행</p>
                <p className="modal-summary-value">{validationResult.rows.filter((row) => row.status === 'error').length}개</p>
              </div>
            </div>

            <div className="modal-action-bar" style={{ justifyContent: 'flex-start', marginTop: '1.2rem' }}>
              <button
                type="button"
                className="premium-button secondary-btn"
                onClick={() => {
                  void handleTemplateDownload();
                }}
              >
                <Download size={16} />
                템플릿 다운로드
              </button>
              <label className="premium-button" style={{ cursor: 'pointer' }}>
                <Upload size={16} />
                XLSX 업로드
                <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleFileChange} />
              </label>
            </div>

            <section className="modal-section" style={{ marginTop: '1.5rem' }}>
              <div className="modal-section-header">
                <div>
                  <div className="modal-section-title">업로드 미리보기</div>
                </div>
              </div>

              <div style={{ display: 'grid', gap: '0.85rem' }}>
                {validationResult.rows.length === 0 ? (
                  <div className="modal-muted-card" style={{ padding: '1.2rem', color: 'var(--text-muted)' }}>
                    아직 업로드된 파일이 없습니다.
                  </div>
                ) : (
                  validationResult.rows.map((row) => (
                    <div
                      key={`${row.rowNumber}-${row.teamName}`}
                      className="modal-muted-card"
                      style={{
                        padding: '0.95rem 1rem',
                        borderColor:
                          row.status === 'ready' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(244, 63, 94, 0.24)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                        <div>
                          <strong>{row.rowNumber}행</strong> {row.teamName || '(팀명 없음)'} / {row.song || '(곡명 없음)'}
                        </div>
                        <span className={`status-badge ${row.status === 'ready' ? 'status-badge--success' : 'status-badge--muted'}`}>
                          {row.status === 'ready' ? '등록 가능' : '오류 있음'}
                        </span>
                      </div>
                      {row.errors.length > 0 ? (
                        <p style={{ marginTop: '0.55rem', color: '#fda4af', fontSize: '0.88rem' }}>
                          {row.errors.join(', ')}
                        </p>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </section>

            <div className="modal-action-bar">
              <button type="button" className="premium-button secondary-btn" onClick={onClose} disabled={isSubmitting}>
                취소
              </button>
              <button
                type="button"
                className="premium-button"
                onClick={handleImport}
                disabled={isSubmitting || validationResult.validRows.length === 0}
              >
                {isSubmitting ? '등록 중...' : `${validationResult.validRows.length}개 팀 등록`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default BulkImportModal;
