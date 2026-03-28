import * as XLSX from 'xlsx';
import type { Candidate, EvaluationItem } from '../types';
import { JUDGES, EVALUATION_ITEMS, SIMPLE_JUDGES } from '../types';

export const exportToExcel = (candidates: Candidate[], auditionName: string) => {
  // 데이터 변환: 엑셀 행 구조 설계
  const data = candidates.map((c, index) => {
    const row: any = {
      '순위': index + 1,
      '참가자 이름': c.name,
      '곡명': c.song || '-',
      '최종 총합': c.total,
      '최종 평균': c.average,
    };

    // 심사위원별 상세 점수 추가
    JUDGES.forEach(judge => {
      const scores = c.scores[judge];
      if (!scores) {
        row[`${judge}_총점`] = 0;
        return;
      }

      if (SIMPLE_JUDGES.includes(judge)) {
        row[`${judge}_총점`] = scores.simpleTotal || 0;
      } else {
        // 항목별 점수
        EVALUATION_ITEMS.forEach((item: EvaluationItem) => {
          row[`${judge}_${item}`] = scores[item] || 0;
        });
        
        // 심사위원별 합계 계산
        const judgeTotal = EVALUATION_ITEMS.reduce((sum, item) => sum + (Number(scores[item]) || 0), 0);
        row[`${judge}_총점`] = judgeTotal;
      }
      
      row[`${judge}_완료여부`] = scores.isCompleted ? '완료' : '진행중';
    });

    return row;
  });

  // 워크시트 생성
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "심사결과");

  // 컬럼 너비 설정
  const maxWidths = data.reduce((acc: any, row: any) => {
    Object.keys(row).forEach((key, i) => {
      const value = String(row[key] || '');
      acc[i] = Math.max(acc[i] || 0, key.length * 2, value.length * 1.5);
    });
    return acc;
  }, []);
  
  worksheet['!cols'] = Object.keys(maxWidths).map(i => ({ wch: maxWidths[i] }));

  // 파일 다운로드
  const fileName = `${auditionName.replace(/\s+/g, '_')}_심사결과_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};
