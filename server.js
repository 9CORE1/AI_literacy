/**
 * @file server.js
 * @description AI 리터러시 웹 플랫폼 Express 백엔드 서버
 */

require('dotenv').config();
const express = require('express');
const path = require('path');
const { OAuth2Client } = require('google-auth-library');

const app = express();
const PORT = process.env.PORT || 3000;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

// 메모리 기반 임시 사용자 프로필 저장소 (단순 세션/프로필 관리)
const userProfiles = new Map();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/**
 * 환경 설정 API (구글 클라이언트 ID 제공)
 */
app.get('/api/config', (req, res) => {
  res.json({
    googleClientId: GOOGLE_CLIENT_ID,
    hasGoogleAuth: Boolean(GOOGLE_CLIENT_ID)
  });
});

/**
 * 구글 ID 토큰 검증 또는 시뮬레이션 로그인 API
 */
app.post('/api/auth/google', async (req, res) => {
  try {
    const { credential, mockUser } = req.body;

    // 1. Google OAuth Client ID가 설정되어 있고 토큰이 전달된 경우
    if (credential && googleClient) {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID
      });
      const payload = ticket.getPayload();
      const email = payload.email;
      const name = payload.name;
      const picture = payload.picture;

      let profile = userProfiles.get(email);
      if (!profile) {
        profile = {
          email,
          name,
          picture,
          role: null, // 최초 로그인 시 role 선택 필요 ('student' | 'staff')
          department: '',
          gradeOrPosition: ''
        };
        userProfiles.set(email, profile);
      }

      return res.json({ success: true, user: profile });
    }

    // 2. 개발 및 테스트용 (OAuth 미설정 환경)
    if (mockUser && mockUser.email) {
      let profile = userProfiles.get(mockUser.email);
      if (!profile) {
        profile = {
          email: mockUser.email,
          name: mockUser.name || '테스트 사용자',
          picture: mockUser.picture || '',
          role: mockUser.role || null,
          department: mockUser.department || '',
          gradeOrPosition: mockUser.gradeOrPosition || ''
        };
        userProfiles.set(mockUser.email, profile);
      }
      return res.json({ success: true, user: profile });
    }

    return res.status(400).json({ success: false, message: '유효한 인증 정보가 없습니다.' });
  } catch (error) {
    console.error('구글 로그인 검증 오류:', error);
    return res.status(500).json({ success: false, message: '인증 처리 중 오류가 발생했습니다.' });
  }
});

/**
 * 사용자 프로필 조회 API
 */
app.get('/api/user/profile', (req, res) => {
  const email = req.query.email;
  if (!email) {
    return res.status(400).json({ success: false, message: '이메일 파라미터가 누락되었습니다.' });
  }

  const profile = userProfiles.get(email);
  if (!profile) {
    return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
  }

  res.json({ success: true, user: profile });
});

/**
 * 사용자 프로필 및 역할 업데이트 API
 */
app.post('/api/user/profile', (req, res) => {
  const { email, role, department, gradeOrPosition, name } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: '이메일이 누락되었습니다.' });
  }

  let profile = userProfiles.get(email);
  if (!profile) {
    profile = { email, name: name || '사용자', picture: '', role: null, department: '', gradeOrPosition: '' };
  }

  if (role) profile.role = role;
  if (department !== undefined) profile.department = department;
  if (gradeOrPosition !== undefined) profile.gradeOrPosition = gradeOrPosition;
  if (name !== undefined) profile.name = name;

  userProfiles.set(email, profile);
  res.json({ success: true, user: profile });
});

// SPA 라우트 폴백
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[AI Literacy Platform] Server running at http://localhost:${PORT}`);
});
