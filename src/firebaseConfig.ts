import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Deployment Trigger: 2026-03-27
const firebaseConfig = {
  apiKey: "AIzaSyAZK38uirEXB8FQ60kKYDLFuhD_F1q2Qr0",
  authDomain: "score-assistant.firebaseapp.com",
  projectId: "score-assistant",
  storageBucket: "score-assistant.firebasestorage.app",
  messagingSenderId: "479463244565",
  appId: "1:479463244565:web:0d6909128268ba8313df1c"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
