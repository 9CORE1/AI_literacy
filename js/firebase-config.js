/**
 * @file firebase-config.js
 * @description Firebase SDK 환경설정 파일
 * 
 * Firebase 콘솔(https://console.firebase.google.com/)에서 복사한 실제 설정값으로
 * 아래 객체의 따옴표 안 내용을 채워주시면 됩니다.
 */

const firebaseConfig = {
  apiKey: "AIzaSyCd7V09ArHaA2yq3jHNZaDhsJAjQC5TKWM",
  authDomain: "ai-literacy-ca8b6.firebaseapp.com",
  projectId: "ai-literacy-ca8b6",
  storageBucket: "ai-literacy-ca8b6.firebasestorage.app",
  messagingSenderId: "820826823789",
  appId: "1:820826823789:web:388a6994dbf6fd37913364"
};

// 브라우저 전역 객체로 등록
if (typeof window !== 'undefined') {
  window.firebaseConfig = firebaseConfig;
}
