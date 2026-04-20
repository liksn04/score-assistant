import type { BulkImportIssue, BulkImportRow, BulkImportValidationResult } from '../types';

export const BULK_IMPORT_HEADERS = ['팀명', '곡명'] as const;
let xlsxModulePromise: Promise<typeof import('xlsx')> | null = null;

const loadXlsx = async () => {
  xlsxModulePromise ??= import('xlsx');
  return xlsxModulePromise;
};

const normalizeTeamName = (value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('ko-KR');

const createIssue = (rowNumber: number, code: BulkImportIssue['code'], message: string): BulkImportIssue => ({
  rowNumber,
  code,
  message,
});

export const validateBulkImportRows = (
  rawRows: Array<Record<string, unknown>>,
  existingTeamNames: string[],
  detectedHeaders: string[] = [...BULK_IMPORT_HEADERS],
): BulkImportValidationResult => {
  const expectedHeaders = [...BULK_IMPORT_HEADERS];
  const invalidColumns = detectedHeaders.filter((header) => !expectedHeaders.includes(header as (typeof BULK_IMPORT_HEADERS)[number]));

  const issues: BulkImportIssue[] = invalidColumns.length > 0
    ? [createIssue(0, 'invalid-columns', `지원하지 않는 컬럼이 포함되어 있습니다: ${invalidColumns.join(', ')}`)]
    : [];

  const seenNames = new Set<string>();
  const existingNameSet = new Set(existingTeamNames.map(normalizeTeamName));

  const rows: BulkImportRow[] = rawRows.map((rawRow, index) => {
    const rowNumber = index + 2;
    const teamName = String(rawRow['팀명'] ?? '').trim();
    const song = String(rawRow['곡명'] ?? '').trim();
    const normalizedName = normalizeTeamName(teamName);
    const errors: string[] = [];

    if (!teamName) {
      issues.push(createIssue(rowNumber, 'empty-team-name', '팀명은 비워둘 수 없습니다.'));
      errors.push('팀명 누락');
    }

    if (!song) {
      issues.push(createIssue(rowNumber, 'empty-song-title', '곡명은 비워둘 수 없습니다.'));
      errors.push('곡명 누락');
    }

    if (teamName && seenNames.has(normalizedName)) {
      issues.push(createIssue(rowNumber, 'duplicate-team-name', '업로드 파일 안에서 팀명이 중복됩니다.'));
      errors.push('파일 내부 중복');
    }

    if (teamName && existingNameSet.has(normalizedName)) {
      issues.push(createIssue(rowNumber, 'duplicate-existing-team-name', '이미 등록된 팀명과 중복됩니다.'));
      errors.push('기존 팀과 중복');
    }

    if (teamName) {
      seenNames.add(normalizedName);
    }

    return {
      rowNumber,
      teamName,
      song,
      normalizedName,
      status: errors.length > 0 ? 'error' : 'ready',
      errors,
    };
  });

  return {
    rows,
    validRows: rows.filter((row) => row.status === 'ready'),
    errors: issues,
    hasBlockingErrors: issues.length > 0,
  };
};

export const parseBulkImportFile = async (
  file: File,
  existingTeamNames: string[],
): Promise<BulkImportValidationResult> => {
  const XLSX = await loadXlsx();
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    return {
      rows: [],
      validRows: [],
      errors: [createIssue(0, 'invalid-columns', '업로드된 파일에서 시트를 찾을 수 없습니다.')],
      hasBlockingErrors: true,
    };
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: '',
  });
  const detectedHeaders = Object.keys(rawRows[0] ?? {});

  return validateBulkImportRows(rawRows, existingTeamNames, detectedHeaders);
};

export const downloadBulkImportTemplate = async () => {
  const XLSX = await loadXlsx();
  const worksheet = XLSX.utils.json_to_sheet([
    { 팀명: '예시 밴드', 곡명: 'Example Song' },
    { 팀명: '예시 보컬', 곡명: 'Another Song' },
  ]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '참가팀 등록');
  XLSX.writeFile(workbook, '참가팀_일괄등록_템플릿.xlsx');
};
