export const ADMIN_SESSION_TIMEOUT_MS = 30 * 60 * 1000;

export interface AdminSessionSnapshot {
  role: 'ADMIN';
  authenticatedAt: number;
  lastActivityAt: number;
}

export const isAdminSessionExpired = (session: AdminSessionSnapshot, now: number = Date.now()) =>
  now - session.lastActivityAt >= ADMIN_SESSION_TIMEOUT_MS;

export const touchAdminSession = (
  session: AdminSessionSnapshot,
  lastActivityAt: number = Date.now(),
): AdminSessionSnapshot => ({
  ...session,
  lastActivityAt,
});
