import type { Audition, Candidate } from '../types';
import { createRankingSnapshot, getScoringJudges, normalizeRankingPolicy } from './rankingUtils.ts';

const formatWorkbookDate = () => new Date().toISOString().split('T')[0];
let xlsxModulePromise: Promise<typeof import('xlsx')> | null = null;

const loadXlsx = async () => {
  xlsxModulePromise ??= import('xlsx');
  return xlsxModulePromise;
};

const getFinalizedAtLabel = (audition: Audition) =>
  typeof audition.finalization.finalizedAt === 'string' ? audition.finalization.finalizedAt : '미확정';

export const exportFinalWorkbook = async (candidates: Candidate[], audition: Audition) => {
  const XLSX = await loadXlsx();
  const rankingSnapshot = audition.finalization.lastSnapshot ?? createRankingSnapshot(audition, candidates);
  const candidateMap = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const rankingPolicy = normalizeRankingPolicy(audition.rankingPolicy);
  const scoringJudges = getScoringJudges(audition);

  const rows = rankingSnapshot.entries.map((entry) => {
    const candidate = candidateMap.get(entry.candidateId);
    const row: Record<string, string | number> = {
      순위: entry.rank,
      팀명: entry.candidateName,
      곡명: entry.song || candidate?.song || '-',
      최종총점: entry.total,
      최종평균: entry.average,
      동점처리결과: rankingPolicy.label,
      완료여부: entry.isFullyCompleted ? '완료' : '미완료',
      확정시각: getFinalizedAtLabel(audition),
    };

    audition.judges.forEach((judge) => {
      const scores = candidate?.scores[judge.name];

      if (judge.type === 'observer') {
        return;
      }

      if (judge.type === 'simple') {
        row[`${judge.name}_총점`] = typeof scores?.simpleTotal === 'number' ? scores.simpleTotal : 0;
      }

      if (judge.type === 'detail') {
        (judge.criteria ?? []).forEach((criterion) => {
          row[`${judge.name}_${criterion.item}`] = typeof scores?.[criterion.item] === 'number' ? Number(scores[criterion.item]) : 0;
        });
        row[`${judge.name}_총점`] = entry.judgeTotals[judge.name] ?? 0;
      }

      row[`${judge.name}_완료`] = scores?.isCompleted ? '완료' : '진행중';
    });

    row.반영심사위원수 = scoringJudges.length;

    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = Object.keys(rows[0] ?? {}).map((column) => ({
    wch: Math.max(12, column.length + 4),
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '최종 결과');
  XLSX.writeFile(workbook, `${audition.name.replace(/\s+/g, '_')}_최종결과_${formatWorkbookDate()}.xlsx`);
};

export const exportToExcel = exportFinalWorkbook;
