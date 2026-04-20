import type { ToastPayload, ToastRecord, ToastState } from '../types';

export type ToastAction =
  | {
      type: 'enqueue';
      toast: ToastRecord;
    }
  | {
      type: 'update';
      id: string;
      patch: Partial<ToastPayload>;
    }
  | {
      type: 'remove';
      id: string;
    };

const mergeToast = (currentToast: ToastRecord, patch: Partial<ToastPayload>): ToastRecord => ({
  ...currentToast,
  ...patch,
  id: currentToast.id,
  createdAt: currentToast.createdAt,
});

export const toastReducer = (state: ToastState, action: ToastAction): ToastState => {
  switch (action.type) {
    case 'enqueue': {
      const existingToastIndex =
        action.toast.dedupeKey === undefined
          ? -1
          : state.items.findIndex((toast) => toast.dedupeKey === action.toast.dedupeKey);

      if (existingToastIndex === -1) {
        return {
          items: [...state.items, action.toast],
        };
      }

      return {
        items: state.items.map((toast, index) => (index === existingToastIndex ? mergeToast(toast, action.toast) : toast)),
      };
    }

    case 'update':
      return {
        items: state.items.map((toast) => (toast.id === action.id ? mergeToast(toast, action.patch) : toast)),
      };

    case 'remove':
      return {
        items: state.items.filter((toast) => toast.id !== action.id),
      };

    default:
      return state;
  }
};
