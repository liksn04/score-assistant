import { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut,
  type User 
} from 'firebase/auth';
import { auth } from '../firebaseConfig';
import type { JudgeName } from '../types';

// 이메일별 심사위원 역할 매핑
const JUDGE_EMAIL_MAP: Record<string, JudgeName> = {
  'junmo@audition.com': '준모',
  'jinha@audition.com': '진하',
  'jeonghyun@audition.com': '정현',
  'observer@audition.com': '참관자',
  'admin@audition.com': '참관자', // 관리자용 (모니터링)
};

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [judgeRole, setJudgeRole] = useState<JudgeName | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser && currentUser.email) {
        setJudgeRole(JUDGE_EMAIL_MAP[currentUser.email] || null);
      } else {
        setJudgeRole(null);
      }
      setIsLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      let message = "로그인 중 오류가 발생했습니다.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        message = "이메일 또는 비밀번호가 올바르지 않습니다.";
      } else if (error.code === 'auth/too-many-requests') {
        message = "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.";
      }
      throw new Error(message);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("로그아웃 오류:", error);
    }
  };

  return {
    user,
    judgeRole,
    isLoadingAuth,
    login,
    logout
  };
};
