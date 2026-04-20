import { useState, useEffect } from 'react';
import type { Audition } from '../types';

const AUTH_STORAGE_KEY = 'audition_judge_session';

export const useAuth = () => {
  const [judgeRole, setJudgeRole] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    // 로컬 스토리지에서 세션 복구
    const savedSession = localStorage.getItem(AUTH_STORAGE_KEY);
    if (savedSession) {
      if (savedSession === 'ADMIN') {
        setIsAdmin(true);
      } else {
        setJudgeRole(savedSession);
      }
    }
    setIsLoadingAuth(false);
  }, []);

  const loginWithPin = async (judgeName: string, pin: string, audition: Audition) => {
    // 보안을 위해 지연시간 추가 (Brute-force 방지)
    await new Promise(resolve => setTimeout(resolve, 500));

    const judgeConfig = audition.judges.find(j => j.name === judgeName);
    if (judgeConfig && judgeConfig.pin === pin) {
      setJudgeRole(judgeName);
      localStorage.setItem(AUTH_STORAGE_KEY, judgeName);
      return true;
    } else {
      throw new Error("PIN 번호가 일치하지 않습니다.");
    }
  };

  const loginAdmin = async (pin: string, audition?: Audition) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    // 공통 관리자 PIN '000000' 또는 현재 오디션의 adminPin
    if (pin === '000000' || (audition && audition.adminPin === pin)) {
      setIsAdmin(true);
      localStorage.setItem(AUTH_STORAGE_KEY, 'ADMIN');
      return true;
    } else {
      throw new Error("관리자 PIN이 일치하지 않습니다.");
    }
  };

  const logout = () => {
    setJudgeRole(null);
    setIsAdmin(false);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  return {
    judgeRole,
    isAdmin,
    isLoadingAuth,
    loginWithPin,
    loginAdmin,
    logout
  };
};
