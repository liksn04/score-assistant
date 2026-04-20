import { describe, expect, it } from 'vitest';
import { ADMIN_SESSION_TIMEOUT_MS, isAdminSessionExpired, touchAdminSession } from './adminSession.ts';

describe('adminSession', () => {
  it('활동 이벤트가 발생하면 마지막 활동 시간이 연장된다', () => {
    const baseSession = {
      role: 'ADMIN' as const,
      authenticatedAt: 1000,
      lastActivityAt: 1000,
    };

    const extended = touchAdminSession(baseSession, 5000);

    expect(extended.lastActivityAt).toBe(5000);
    expect(isAdminSessionExpired(extended, 5000 + ADMIN_SESSION_TIMEOUT_MS - 1)).toBe(false);
  });

  it('30분 무활동 시 관리자 세션이 만료된다', () => {
    const session = {
      role: 'ADMIN' as const,
      authenticatedAt: 1000,
      lastActivityAt: 1000,
    };

    expect(isAdminSessionExpired(session, 1000 + ADMIN_SESSION_TIMEOUT_MS + 1)).toBe(true);
  });
});
