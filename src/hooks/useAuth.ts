import { useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import type { Audition } from '../types';
import { ADMIN_PIN } from '../constants/admin';
import { ADMIN_SESSION_TIMEOUT_MS, isAdminSessionExpired, touchAdminSession, type AdminSessionSnapshot } from '../utils/adminSession.ts';
import { auth } from '../firebaseConfig.ts';

const AUTH_STORAGE_KEY = 'audition_judge_session';
const ADMIN_ACTIVITY_EVENTS: Array<keyof WindowEventMap> = ['click', 'keydown', 'mousemove', 'touchstart'];

type AuthSession =
  | {
      role: 'ADMIN';
      authenticatedAt: number;
      lastActivityAt: number;
    }
  | {
      role: 'JUDGE';
      judgeName: string;
      authenticatedAt: number;
    };

const parseStoredSession = (): AuthSession | null => {
  const rawValue = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  if (rawValue === 'ADMIN') {
    const now = Date.now();
    return {
      role: 'ADMIN',
      authenticatedAt: now,
      lastActivityAt: now,
    };
  }

  if (rawValue.startsWith('{')) {
    try {
      return JSON.parse(rawValue) as AuthSession;
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }
  }

  return {
    role: 'JUDGE',
    judgeName: rawValue,
    authenticatedAt: Date.now(),
  };
};

const persistSession = (session: AuthSession | null) => {
  if (!session) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }

  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
};

export const useAuth = () => {
  const [initialAuthState] = useState(() => {
    const savedSession = parseStoredSession();

    if (!savedSession) {
      return {
        judgeRole: null as string | null,
        adminSession: null as AdminSessionSnapshot | null,
        currentTimestamp: Date.now(),
      };
    }

    if (savedSession.role === 'ADMIN') {
      if (isAdminSessionExpired(savedSession, Date.now())) {
        persistSession(null);
        return {
          judgeRole: null as string | null,
          adminSession: null as AdminSessionSnapshot | null,
          currentTimestamp: Date.now(),
        };
      }

      return {
        judgeRole: null as string | null,
        adminSession: savedSession,
        currentTimestamp: savedSession.lastActivityAt,
      };
    }

    return {
      judgeRole: savedSession.judgeName,
      adminSession: null as AdminSessionSnapshot | null,
      currentTimestamp: savedSession.authenticatedAt,
    };
  });
  const [judgeRole, setJudgeRole] = useState<string | null>(initialAuthState.judgeRole);
  const [adminSession, setAdminSession] = useState<AdminSessionSnapshot | null>(initialAuthState.adminSession);
  const [adminTimeoutCount, setAdminTimeoutCount] = useState(0);
  const [currentTimestamp, setCurrentTimestamp] = useState(initialAuthState.currentTimestamp);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const clearSession = useCallback((shouldCountTimeout = false) => {
    setJudgeRole(null);
    setAdminSession(null);
    persistSession(null);
    if (shouldCountTimeout) {
      setAdminTimeoutCount((count) => count + 1);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        if (user) {
          setAuthError(null);
          setIsLoadingAuth(false);
          return;
        }

        signInAnonymously(auth).catch((error: unknown) => {
          if (error instanceof FirebaseError && error.code === 'auth/admin-restricted-operation') {
            setAuthError('Firebase Anonymous 인증이 비활성화되어 있습니다. Firebase 콘솔에서 Anonymous provider를 활성화해 주세요.');
            setIsLoadingAuth(false);
            return;
          }

          setAuthError(error instanceof Error ? error.message : 'Firebase 인증을 시작하지 못했습니다.');
          setIsLoadingAuth(false);
        });
      },
      (error) => {
        setAuthError(error.message);
        setIsLoadingAuth(false);
      },
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!adminSession) {
      return;
    }

    const handleActivity = () => {
      setAdminSession((currentSession) => {
        if (!currentSession) {
          return currentSession;
        }

        const nextSession = touchAdminSession(currentSession);
        persistSession(nextSession);
        setCurrentTimestamp(nextSession.lastActivityAt);
        return nextSession;
      });
    };

    const interval = window.setInterval(() => {
      setAdminSession((currentSession) => {
        if (!currentSession) {
          return currentSession;
        }

        if (isAdminSessionExpired(currentSession, Date.now())) {
          clearSession(true);
          return null;
        }

        setCurrentTimestamp(Date.now());
        return {
          ...currentSession,
        };
      });
    }, 15_000);

    ADMIN_ACTIVITY_EVENTS.forEach((eventName) => window.addEventListener(eventName, handleActivity, { passive: true }));

    return () => {
      window.clearInterval(interval);
      ADMIN_ACTIVITY_EVENTS.forEach((eventName) => window.removeEventListener(eventName, handleActivity));
    };
  }, [adminSession, clearSession]);

  const loginWithPin = useCallback(async (judgeName: string, pin: string, audition: Audition) => {
    await new Promise((resolve) => window.setTimeout(resolve, 500));

    const judgeConfig = audition.judges.find((judge) => judge.name === judgeName);
    if (!judgeConfig || judgeConfig.pin !== pin) {
      throw new Error('PIN 번호가 일치하지 않습니다.');
    }

    const session: AuthSession = {
      role: 'JUDGE',
      judgeName,
      authenticatedAt: Date.now(),
    };

    setJudgeRole(judgeName);
    setAdminSession(null);
    setCurrentTimestamp(Date.now());
    persistSession(session);

    return true;
  }, []);

  const loginAdmin = useCallback(async (pin: string) => {
    await new Promise((resolve) => window.setTimeout(resolve, 500));

    if (pin !== ADMIN_PIN) {
      throw new Error('관리자 PIN이 일치하지 않습니다.');
    }

    const nextSession: AdminSessionSnapshot = {
      role: 'ADMIN',
      authenticatedAt: Date.now(),
      lastActivityAt: Date.now(),
    };

    setJudgeRole(null);
    setAdminSession(nextSession);
    setCurrentTimestamp(nextSession.lastActivityAt);
    persistSession(nextSession);

    return true;
  }, []);

  const touchAdminActivity = useCallback(() => {
    setAdminSession((currentSession) => {
      if (!currentSession) {
        return currentSession;
      }

      const nextSession = touchAdminSession(currentSession);
      persistSession(nextSession);
      setCurrentTimestamp(nextSession.lastActivityAt);
      return nextSession;
    });
  }, []);

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  return {
    judgeRole,
    isAdmin: adminSession !== null,
    isLoadingAuth,
    authError,
    adminTimeoutCount,
    adminSessionRemainingMs:
      adminSession === null ? 0 : Math.max(0, adminSession.lastActivityAt + ADMIN_SESSION_TIMEOUT_MS - currentTimestamp),
    loginWithPin,
    loginAdmin,
    touchAdminActivity,
    logout,
  };
};
