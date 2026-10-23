/**
 * @file firebase-config.example.js
 * @description Firebase SDK 환경설정 예시 템플릿
 */

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

if (typeof window !== 'undefined') {
  window.firebaseConfig = firebaseConfig;
}
