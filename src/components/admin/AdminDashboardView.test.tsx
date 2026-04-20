import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AdminDashboardView from './AdminDashboardView';
import { ToastProvider } from '../../context/ToastContext.tsx';
import { ConfirmDialogProvider } from '../../context/ConfirmDialogContext.tsx';
import type { Audition, Candidate } from '../../types';
import { DEFAULT_RANKING_POLICY, rankCandidates } from '../../utils/rankingUtils.ts';

vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');

  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => {
      const child = React.Children.only(children);

      if (!React.isValidElement(child)) {
        return null;
      }

      return React.cloneElement(child as React.ReactElement<{ width?: number; height?: number }>, {
        width: 960,
        height: 320,
      });
    },
  };
});

const buildAudition = (): Audition => ({
  id: 'audition-1',
  name: '2026 상반기 본선',
  status: 'active',
  activeJudges: ['심사위원 A', '심사위원 B'],
  judges: [
    { name: '심사위원 A', pin: '1111', type: 'simple' },
    { name: '심사위원 B', pin: '2222', type: 'simple' },
    { name: '참관자', pin: '3333', type: 'observer' },
  ],
  dropCount: 1,
  adminPin: '9999',
  rankingPolicy: DEFAULT_RANKING_POLICY,
  finalization: {
    isFinalized: false,
    finalizedAt: null,
    lastSnapshot: null,
    reopenCount: 0,
    reopenedAt: null,
  },
  unlocks: [],
  createdAt: '2026-04-21T00:00:00.000Z',
  updatedAt: '2026-04-21T00:00:00.000Z',
});

const buildCandidates = (): Candidate[] => [
  {
    id: 'candidate-1',
    auditionId: 'audition-1',
    name: '팀 오로라',
    song: '빛의 노래',
    scores: {
      '심사위원 A': { simpleTotal: 95, isCompleted: true },
      '심사위원 B': { simpleTotal: 88, isCompleted: true },
      참관자: { isCompleted: false },
    },
    comments: [],
    total: 183,
    average: 91.5,
    updatedAt: '2026-04-21T00:00:00.000Z',
  },
  {
    id: 'candidate-2',
    auditionId: 'audition-1',
    name: '팀 노바',
    song: '새벽선',
    scores: {
      '심사위원 A': { simpleTotal: 82, isCompleted: true },
      '심사위원 B': { simpleTotal: 91, isCompleted: true },
      참관자: { isCompleted: false },
    },
    comments: [],
    total: 173,
    average: 86.5,
    updatedAt: '2026-04-21T00:00:00.000Z',
  },
];

describe('AdminDashboardView', () => {
  it('통계 탭에서 심사위원 평균 점수와 후보자별 표준편차를 다시 보여준다', async () => {
    const activeAudition = buildAudition();
    const candidates = buildCandidates();
    const rankedCandidates = rankCandidates(candidates, activeAudition);

    render(
      <ConfirmDialogProvider>
        <ToastProvider>
          <AdminDashboardView
            activeAudition={activeAudition}
            auditions={[activeAudition]}
            activeAuditionId={activeAudition.id}
            candidates={candidates}
            rankedCandidates={rankedCandidates}
            logs={[]}
            trashBatches={[]}
            adminSessionRemainingMs={1000 * 60 * 30}
            onBack={() => {}}
            onChangeAudition={() => {}}
            onRenameAudition={async () => {}}
            onOpenSettings={() => {}}
            onOpenCreateAudition={() => {}}
            onToggleActiveJudge={async () => {}}
            onFinalize={async () => {}}
            onReopen={async () => {}}
            onUnlockCandidate={async () => {}}
            onRestoreTrash={async () => {}}
            onPurgeTrash={async () => {}}
            onExportWorkbook={() => {}}
            onOpenPrintReport={() => {}}
            onOpenObserverBoard={() => {}}
          />
        </ToastProvider>
      </ConfirmDialogProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /통계/ }));

    expect(await screen.findByText('심사위원별 평균 점수')).toBeInTheDocument();
    expect(await screen.findByText('후보자별 표준편차')).toBeInTheDocument();
    expect(await screen.findByText(/표준편차\(STD\)/)).toBeInTheDocument();
  });
});
