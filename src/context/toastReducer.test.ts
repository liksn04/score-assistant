import { describe, expect, it } from 'vitest';
import type { ToastState } from '../types';
import { toastReducer } from './toastReducer.ts';

describe('toastReducer', () => {
  it('같은 dedupeKey를 가진 토스트는 중복 추가하지 않고 갱신한다', () => {
    const initialState: ToastState = { items: [] };
    const loadingState = toastReducer(initialState, {
      type: 'enqueue',
      toast: {
        id: 'toast-1',
        kind: 'loading',
        title: '저장 중',
        message: '오디션을 저장하고 있습니다.',
        dedupeKey: 'audition-save',
        createdAt: 1,
      },
    });

    const updatedState = toastReducer(loadingState, {
      type: 'enqueue',
      toast: {
        id: 'toast-2',
        kind: 'loading',
        title: '저장 중',
        message: '오디션을 저장하고 있습니다.',
        dedupeKey: 'audition-save',
        createdAt: 2,
      },
    });

    expect(updatedState.items).toHaveLength(1);
    expect(updatedState.items[0]?.id).toBe('toast-1');
  });

  it('loading 토스트를 success 상태로 전환한다', () => {
    const initialState: ToastState = {
      items: [
        {
          id: 'toast-1',
          kind: 'loading',
          title: '저장 중',
          message: '오디션을 저장하고 있습니다.',
          createdAt: 1,
        },
      ],
    };

    const nextState = toastReducer(initialState, {
      type: 'update',
      id: 'toast-1',
      patch: {
        kind: 'success',
        title: '저장 완료',
        message: '오디션 설정이 저장되었습니다.',
      },
    });

    expect(nextState.items[0]).toMatchObject({
      id: 'toast-1',
      kind: 'success',
      title: '저장 완료',
    });
  });
});
