import { describe, expect, it } from 'vitest';
import { validateBulkImportRows } from './bulkImportUtils.ts';

describe('validateBulkImportRows', () => {
  it('정상 행은 validRows로 반환한다', () => {
    const result = validateBulkImportRows(
      [
        { 팀명: '아르페지오', 곡명: 'Spring Day' },
        { 팀명: '루프탑', 곡명: 'Night Drive' },
      ],
      ['기존 팀'],
    );

    expect(result.validRows).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
    expect(result.hasBlockingErrors).toBe(false);
  });

  it('빈 값, 중복 팀명, 잘못된 컬럼을 검출한다', () => {
    const result = validateBulkImportRows(
      [
        { 팀명: '아르페지오', 곡명: 'Spring Day' },
        { 팀명: '', 곡명: '빈 팀명' },
        { 팀명: '아르페지오', 곡명: '중복 팀' },
      ],
      ['기존 팀'],
      ['팀명', '곡명', '비고'],
    );

    expect(result.validRows).toHaveLength(1);
    expect(result.hasBlockingErrors).toBe(true);
    expect(result.errors.map((error) => error.code)).toEqual(
      expect.arrayContaining(['empty-team-name', 'duplicate-team-name', 'invalid-columns']),
    );
  });

  it('기존 팀명과 겹치는 행은 부분 실패로 표시한다', () => {
    const result = validateBulkImportRows(
      [
        { 팀명: '기존 팀', 곡명: '이미 있음' },
        { 팀명: '새 팀', 곡명: '신규 곡' },
      ],
      ['기존 팀'],
    );

    expect(result.validRows).toHaveLength(1);
    expect(result.rows[0]?.status).toBe('error');
    expect(result.rows[1]?.status).toBe('ready');
  });
});
