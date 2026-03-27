import { useState, useEffect } from 'react';
import { JUDGE_PINS, type JudgeName } from '../types';

const AUTH_STORAGE_KEY = 'audition_judge_session';

export const useAuth = () => {
  const [judgeRole, setJudgeRole] = useState<JudgeName | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    // 로컬 스토리지에서 세션 복구
    const savedSession = localStorage.getItem(AUTH_STORAGE_KEY);
    if (savedSession && Object.keys(JUDGE_PINS).includes(savedSession)) {
      setJudgeRole(savedSession as JudgeName);
    }
    setIsLoadingAuth(false);
  }, []);

  const loginWithPin = async (judge: JudgeName, pin: string) => {
    // 보안을 위해 지연시간 추가 (Brute-force 방지)
    await new Promise(resolve => setTimeout(resolve, 500));

    if (JUDGE_PINS[judge] === pin) {
      setJudgeRole(judge);
      localStorage.setItem(AUTH_STORAGE_KEY, judge);
      return true;
    } else {
      throw new Error("PIN 번호가 일치하지 않습니다.");
    }
  };

  const logout = () => {
    setJudgeRole(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  return {
    user: judgeRole ? { email: judgeRole } : null, // 하위 호환성을 위해 일부 유지
    judgeRole,
    isLoadingAuth,
    loginWithPin,
    logout
  };
};
