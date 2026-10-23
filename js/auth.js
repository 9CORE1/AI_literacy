/**
 * @file auth.js
 * @description Google Identity Services(GIS) OAuth 연동 및 역할(대학생/교직원) 바인딩 세션 관리 모듈
 */

const Auth = {
  user: null,
  firebaseApp: null,
  firebaseAuth: null,
  firebaseDb: null,

  // Google Cloud Console에서 발급받은 OAuth 2.0 Web Client ID
  // 사용자가 브라우저에서 직접 등록한 Client ID가 있으면 우선 적용됩니다.
  GOOGLE_CLIENT_ID: localStorage.getItem('ai_lit_google_client_id') || 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',

  /**
   * Firebase SDK 초기화 확인 및 준비
   */
  initFirebase() {
    if (this.firebaseDb) return true;
    try {
      const config = window.firebaseConfig;
      if (
        typeof firebase !== 'undefined' &&
        config &&
        config.apiKey &&
        !config.apiKey.includes('YOUR_API_KEY')
      ) {
        if (!firebase.apps.length) {
          this.firebaseApp = firebase.initializeApp(config);
        } else {
          this.firebaseApp = firebase.app();
        }
        this.firebaseAuth = firebase.auth();
        this.firebaseDb = firebase.firestore();
        console.log('[Auth] Firebase Auth & Cloud Firestore 연결 성공');
        return true;
      }
    } catch (err) {
      console.warn('[Auth] Firebase 초기화 경고 (로컬 모드로 동작):', err);
    }
    return false;
  },

  isFirebaseReady() {
    return Boolean(this.firebaseDb && this.firebaseAuth);
  },

  /**
   * 로컬 스토리지 및 세션에서 현재 사용자 정보 불러오기
   */
  async init() {
    this.initFirebase();

    const cached = localStorage.getItem('ai_lit_user');
    if (cached) {
      try {
        this.user = JSON.parse(cached);
      } catch (e) {
        localStorage.removeItem('ai_lit_user');
      }
    }
    this.renderNavUser();
    return this.user;
  },

  getCurrentUser() {
    return this.user;
  },

  isLoggedIn() {
    return Boolean(this.user && this.user.email);
  },

  isStudent() {
    return this.user && this.user.role === 'student';
  },

  isStaff() {
    return this.user && this.user.role === 'staff';
  },

  /**
   * 사용자 정보 저장
   */
  setUser(userData) {
    this.user = userData;
    localStorage.setItem('ai_lit_user', JSON.stringify(userData));
    this.renderNavUser();
  },

  /**
   * Google Client ID 동적 설정 (로컬 스토리지 저장)
   */
  setClientId(clientId) {
    if (!clientId) return;
    this.GOOGLE_CLIENT_ID = clientId.trim();
    localStorage.setItem('ai_lit_google_client_id', this.GOOGLE_CLIENT_ID);
  },

  /**
   * JWT ID 토큰 Base64 페이로드 디코딩 (백엔드 없이 클라이언트에서 즉시 처리)
   */
  decodeJwt(token) {
    try {
      const base64Url = token.split('.')[1];
      if (!base64Url) return null;
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error('[Auth] JWT 디코딩 실패:', e);
      return null;
    }
  },

  /**
   * Google Identity Services (GIS) 초기화
   * @param {Object} options { containerId, getRoleCallback, onSuccess }
   */
  initGoogleIdentity(options = {}) {
    if (typeof window.google === 'undefined' || !window.google.accounts || !window.google.accounts.id) {
      // GIS 라이브러리가 아직 로드되지 않은 경우 300ms 후 재시도
      setTimeout(() => this.initGoogleIdentity(options), 300);
      return;
    }

    const clientId = this.GOOGLE_CLIENT_ID;
    const isConfigured = clientId && !clientId.includes('YOUR_GOOGLE_CLIENT_ID');

    window.google.accounts.id.initialize({
      client_id: isConfigured ? clientId : '100000000000-dummy.apps.googleusercontent.com',
      callback: (response) => {
        const role = typeof options.getRoleCallback === 'function' ? options.getRoleCallback() : 'student';
        this.handleGoogleCredentialResponse(response, role, options.onSuccess);
      },
      auto_select: false,
      cancel_on_tap_outside: true
    });

    // 공식 구글 로그인 버튼 컨테이너가 있으면 렌더링
    if (options.containerId && isConfigured) {
      const container = document.getElementById(options.containerId);
      if (container) {
        container.innerHTML = '';
        window.google.accounts.id.renderButton(container, {
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'pill',
          width: 280,
          logo_alignment: 'left'
        });
      }
    }
  },

  /**
   * Google 로그인 자격 증명(Credential) 응답 처리
   */
  async handleGoogleCredentialResponse(response, role = 'student', onSuccess = null) {
    if (!response || !response.credential) {
      console.error('[Auth] 자격 증명 정보가 올바르지 않습니다.');
      return;
    }

    const payload = this.decodeJwt(response.credential);
    if (!payload) {
      alert('Google 로그인 토큰을 파싱할 수 없습니다.');
      return;
    }

    // 기존 등록 회원 중 동일 이메일이 있는지 조회하여 역할 및 학적 정보 복원
    const users = this.getRegisteredUsers();
    const existing = users.find((u) => u.email.toLowerCase() === payload.email.toLowerCase());

    const user = {
      name: payload.name || (existing ? existing.name : payload.email.split('@')[0]),
      email: payload.email,
      picture: payload.picture || '',
      role: existing ? existing.role : (role || 'student'),
      university: existing ? existing.university : '',
      department: existing ? existing.department : '',
      googleId: payload.sub,
      loginAt: new Date().toISOString()
    };

    // 로컬 스토리지에 유저 저장 및 입장 이력 기록
    this.setUser(user);
    this.recordLoginHistory(user, 'google');

    // Firebase Auth 구글 자격 증명 동기화
    if (this.isFirebaseReady() && this.firebaseAuth && response.credential) {
      try {
        const credential = firebase.auth.GoogleAuthProvider.credential(response.credential);
        this.firebaseAuth.signInWithCredential(credential).catch(() => {});
      } catch (e) {}
    }

    if (typeof onSuccess === 'function') {
      onSuccess(user);
    } else {
      window.location.href = 'dashboard.html';
    }
  },

  /**
   * 로그인/입장 이력 기록 (로컬 저장소 기반)
   */
  recordLoginHistory(user, method = 'unknown') {
    try {
      const history = JSON.parse(localStorage.getItem('ai_lit_login_history') || '[]');
      const logEntry = {
        id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        timestamp: new Date().toISOString(),
        name: user.name || '',
        username: user.username || '',
        email: user.email || '',
        role: user.role || 'student',
        university: user.university || '',
        department: user.department || '',
        method: method // 'google' | 'credentials' | 'register'
      };
      history.unshift(logEntry);
      // 최근 100건 유지
      if (history.length > 100) history.pop();
      localStorage.setItem('ai_lit_login_history', JSON.stringify(history));

      // Firebase Cloud Firestore 연결되어 있을 경우 클라우드에 영구 저장
      if (this.isFirebaseReady()) {
        try {
          this.firebaseDb.collection('login_history').add({
            ...logEntry,
            createdAt: typeof firebase !== 'undefined' && firebase.firestore ? firebase.firestore.FieldValue.serverTimestamp() : new Date()
          }).catch(err => console.warn('[Auth] Firestore login_history 기록 경고:', err));

          // users 컬렉션 최종 로그인 시각 업데이트
          const docKey = user.email || user.username;
          if (docKey) {
            const safeDocKey = docKey.replace(/[\/\.]/g, '_');
            this.firebaseDb.collection('users').doc(safeDocKey).set({
              name: user.name || '',
              role: user.role || 'student',
              email: user.email || '',
              university: user.university || '',
              department: user.department || '',
              lastLoginAt: new Date().toISOString()
            }, { merge: true }).catch(() => {});
          }
        } catch (err) {
          console.warn('[Auth] Firebase Firestore 동기화 예외:', err);
        }
      }
    } catch (e) {
      console.warn('[Auth] 입장 이력 기록 실패:', e);
    }
  },

  /**
   * 입장 이력 조회
   */
  getLoginHistory() {
    try {
      return JSON.parse(localStorage.getItem('ai_lit_login_history') || '[]');
    } catch (e) {
      return [];
    }
  },

  /**
   * 등록된 회원 목록 조회 (로컬 저장소 기반)
   */
  getRegisteredUsers() {
    try {
      const data = localStorage.getItem('ai_lit_registered_users');
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  /**
   * 일반 회원가입 (역할, 이름, 아이디, 비밀번호, 이메일, 학과, 학교명)
   */
  registerUser({ role, name, username, email, password, department, university }) {
    if (!role) {
      return { success: false, message: '학습자 역할(대학생 또는 교직원)을 선택해 주세요.' };
    }
    if (!name || name.trim().length < 2) {
      return { success: false, message: '성함을 2자 이상 정확히 입력해 주세요.' };
    }
    if (!username || username.trim().length < 3) {
      return { success: false, message: '아이디는 3자 이상 입력해 주세요.' };
    }
    if (!password || password.length < 4) {
      return { success: false, message: '비밀번호는 4자 이상 입력해 주세요.' };
    }
    if (!email || !email.includes('@')) {
      return { success: false, message: '올바른 이메일 주소를 입력해 주세요.' };
    }
    if (!university || university.trim().length < 2) {
      return { success: false, message: '학교명을 입력해 주세요 (예: 한국대학교).' };
    }
    if (!department || department.trim().length < 2) {
      return { success: false, message: '학과 또는 소속 부서명을 입력해 주세요.' };
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();
    const users = this.getRegisteredUsers();

    // 아이디 중복 체크
    if (users.some((u) => u.username.toLowerCase() === cleanUsername)) {
      return { success: false, message: '이미 사용 중인 아이디입니다. 다른 아이디를 입력해 주세요.' };
    }
    // 이메일 중복 체크
    if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      return { success: false, message: '이미 가입된 이메일 주소입니다. 로그인해 주세요.' };
    }

    const newUser = {
      username: username.trim(),
      name: name.trim(),
      email: email.trim(),
      password: password,
      role: role,
      university: university.trim(),
      department: department.trim(),
      registeredAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      loginCount: 1
    };

    users.push(newUser);
    localStorage.setItem('ai_lit_registered_users', JSON.stringify(users));

    // Firebase Cloud Firestore 및 Auth 연동
    if (this.isFirebaseReady()) {
      try {
        const safeDocKey = (newUser.email || newUser.username).replace(/[\/\.]/g, '_');
        this.firebaseDb.collection('users').doc(safeDocKey).set({
          name: newUser.name,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role,
          university: newUser.university,
          department: newUser.department,
          registeredAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString()
        }, { merge: true }).catch(err => console.warn('[Auth] Firestore 신규회원 저장 경고:', err));

        // Firebase Auth 계정 생성 시도
        if (this.firebaseAuth && newUser.email && newUser.password) {
          this.firebaseAuth.createUserWithEmailAndPassword(newUser.email, newUser.password)
            .catch(err => console.warn('[Auth] Firebase Auth 계정 생성 안내:', err.message));
        }
      } catch (err) {
        console.warn('[Auth] Firebase 회원 저장 오류:', err);
      }
    }

    // 회원가입 완료 즉시 자동 세션 생성 및 입장 이력 기록
    const sessionUser = {
      name: newUser.name,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
      university: newUser.university,
      department: newUser.department,
      loginAt: new Date().toISOString(),
      loginMethod: 'register'
    };
    this.setUser(sessionUser);
    this.recordLoginHistory(sessionUser, 'register');

    return { success: true, user: sessionUser };
  },

  /**
   * 일반 로그인 (아이디 또는 이메일 + 비밀번호)
   */
  loginWithCredentials(usernameOrEmail, password) {
    if (!usernameOrEmail || !password) {
      return { success: false, message: '아이디(또는 이메일)와 비밀번호를 모두 입력해 주세요.' };
    }

    const key = usernameOrEmail.trim().toLowerCase();
    const users = this.getRegisteredUsers();
    const matched = users.find(
      (u) => (u.username.toLowerCase() === key || u.email.toLowerCase() === key) && u.password === password
    );

    if (!matched) {
      return {
        success: false,
        message: '아이디(이메일) 또는 비밀번호가 일치하지 않습니다. 회원가입 여부를 확인해 주세요.'
      };
    }

    // 최종 로그인 시간 및 횟수 갱신
    matched.lastLoginAt = new Date().toISOString();
    matched.loginCount = (matched.loginCount || 0) + 1;
    localStorage.setItem('ai_lit_registered_users', JSON.stringify(users));

    const sessionUser = {
      name: matched.name,
      username: matched.username,
      email: matched.email,
      role: matched.role, // 회원가입 시 설정한 학습자 역할
      university: matched.university || '',
      department: matched.department || '',
      loginAt: new Date().toISOString()
    };
    this.setUser(sessionUser);
    this.recordLoginHistory(sessionUser, 'credentials');

    return { success: true, user: sessionUser };
  },

  /**
   * 사용자가 커스텀 구글 버튼 클릭 시 호출
   */
  triggerGoogleLogin(role = 'student', onSuccess = null) {
    // 1. Firebase Auth가 설정되어 있으면 Firebase Google 팝업 로그인 우선 실행
    if (this.isFirebaseReady() && this.firebaseAuth && typeof firebase !== 'undefined') {
      const provider = new firebase.auth.GoogleAuthProvider();
      this.firebaseAuth.signInWithPopup(provider).then((result) => {
        const fbUser = result.user;
        const users = this.getRegisteredUsers();
        const existing = users.find((u) => u.email.toLowerCase() === (fbUser.email || '').toLowerCase());

        const user = {
          name: fbUser.displayName || (existing ? existing.name : fbUser.email.split('@')[0]),
          email: fbUser.email,
          picture: fbUser.photoURL || '',
          role: existing ? existing.role : (role || 'student'),
          university: existing ? existing.university : '',
          department: existing ? existing.department : '',
          googleId: fbUser.uid,
          loginAt: new Date().toISOString(),
          loginMethod: 'google'
        };

        this.setUser(user);
        this.recordLoginHistory(user, 'google');

        if (typeof onSuccess === 'function') {
          onSuccess(user);
        } else {
          window.location.href = 'dashboard.html';
        }
      }).catch((err) => {
        console.warn('[Auth] Firebase Google 팝업 로그인 오류:', err);
        if (err.code !== 'auth/popup-closed-by-user') {
          alert('Google 로그인 중 오류가 발생했습니다: ' + err.message);
        }
      });
      return;
    }

    const isConfigured = this.GOOGLE_CLIENT_ID && !this.GOOGLE_CLIENT_ID.includes('YOUR_GOOGLE_CLIENT_ID');

    if (!isConfigured) {
      // Client ID가 아직 기본값인 경우: 역할에 맞춘 빠른 원클릭 시뮬레이션 입장
      const roleLabel = role === 'staff' ? '교직원' : '대학생';
      const mockUser = {
        name: `${roleLabel} 구글 사용자`,
        email: `google.user@${role === 'staff' ? 'univ.ac.kr' : 'campus.edu'}`,
        picture: '',
        role: role,
        googleId: 'demo-google-id',
        isDemo: true,
        loginAt: new Date().toISOString()
      };
      this.setUser(mockUser);
      if (typeof onSuccess === 'function') {
        onSuccess(mockUser);
      } else {
        window.location.href = 'dashboard.html';
      }
      return;
    }

    // Google Identity 팝업 / One-tap 실행
    if (typeof window.google !== 'undefined' && window.google.accounts && window.google.accounts.id) {
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          console.log('[Auth] One Tap 안내:', notification.getNotDisplayedReason());
        }
      });
    } else {
      alert('Google 로그인 모듈을 불러오는 중입니다. 잠시 후 다시 시도해 주세요.');
    }
  },

  /**
   * 사용자 프로필 업데이트 (이름, 학교, 학과, 학년/직급)
   * @param {Object} data 
   * @returns {Promise<boolean>}
   */
  async updateProfile(data) {
    if (!this.user) return false;
    this.user = {
      ...this.user,
      ...data,
      updatedAt: new Date().toISOString()
    };
    this.setUser(this.user);

    // 등록 회원 목록에서도 일치하는 사용자 정보 갱신
    try {
      const registered = this.getRegisteredUsers();
      const idx = registered.findIndex(u => (this.user.username && u.username === this.user.username) || (this.user.email && u.email === this.user.email));
      if (idx !== -1) {
        registered[idx] = {
          ...registered[idx],
          ...data,
          updatedAt: new Date().toISOString()
        };
        localStorage.setItem('ai_lit_registered_users', JSON.stringify(registered));
      }
    } catch (e) {
      console.warn('[Auth] 프로필 갱신 동기화 실패:', e);
    }

    // Firebase Cloud Firestore 동기화
    if (this.isFirebaseReady()) {
      try {
        const docKey = (this.user.email || this.user.username || '').replace(/[\/\.]/g, '_');
        if (docKey) {
          this.firebaseDb.collection('users').doc(docKey).set({
            ...data,
            updatedAt: typeof firebase !== 'undefined' && firebase.firestore ? firebase.firestore.FieldValue.serverTimestamp() : new Date()
          }, { merge: true }).catch(() => {});
        }
      } catch (err) {
        console.warn('[Auth] Firestore 프로필 갱신 오류:', err);
      }
    }

    return true;
  },

  /**
   * 로그아웃
   */
  logout() {
    this.user = null;
    localStorage.removeItem('ai_lit_user');
    window.location.href = 'index.html';
  },

  /**
   * 상단 네비게이션 사용자 정보 렌더링
   */
  renderNavUser() {
    const navMenu = document.getElementById('nav-user-menu');
    if (!navMenu) return;

    if (this.isLoggedIn()) {
      const roleText = this.user.role === 'staff' ? '🏛️ 교직원' : (this.user.role === 'student' ? '🎓 대학생' : '구분 미선택');
      
      navMenu.innerHTML = `
        <div class="user-badge" style="display: flex; align-items: center; gap: 8px;">
          <span class="role-badge" style="background: var(--color-pumice); padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 700;">${roleText}</span>
          <a href="profile.html" style="font-weight: 600; font-size: 14px; color: var(--color-obsidian); text-decoration: none;" title="프로필 및 입장 이력 관리">
            ${this.user.name || '사용자'} 님 ⚙️
          </a>
        </div>
        ${this.user.role ? '<a href="dashboard.html" class="btn btn-secondary btn-sm">강의실</a>' : ''}
        <button id="logout-btn" type="button" class="btn btn-secondary btn-sm">로그아웃</button>
      `;

      document.getElementById('logout-btn')?.addEventListener('click', () => this.logout());
    } else {
      navMenu.innerHTML = `
        <span class="nav-tag">GUEST</span>
      `;
    }
  }
};

window.Auth = Auth;

