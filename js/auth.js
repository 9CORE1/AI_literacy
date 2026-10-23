/**
 * @file auth.js
 * @description Google Identity Services(GIS) OAuth 연동 및 역할(대학생/교직원) 바인딩 세션 관리 모듈
 */

const Auth = {
  user: null,

  // Google Cloud Console에서 발급받은 OAuth 2.0 Web Client ID
  // 사용자가 브라우저에서 직접 등록한 Client ID가 있으면 우선 적용됩니다.
  GOOGLE_CLIENT_ID: localStorage.getItem('ai_lit_google_client_id') || 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',

  /**
   * 로컬 스토리지 및 세션에서 현재 사용자 정보 불러오기
   */
  async init() {
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

    const user = {
      name: payload.name || payload.email.split('@')[0],
      email: payload.email,
      picture: payload.picture || '',
      role: role || 'student',
      googleId: payload.sub,
      loginAt: new Date().toISOString()
    };

    // 로컬 스토리지에 유저 저장
    this.setUser(user);

    // 백엔드 서버가 구동 중인 경우 동기화 시도 (GitHub Pages 환경에서는 자동 무시)
    try {
      fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential, role })
      }).catch(() => {});
    } catch (e) {
      // 정적 호스팅(GitHub Pages)에서는 무시
    }

    if (typeof onSuccess === 'function') {
      onSuccess(user);
    } else {
      window.location.href = 'dashboard.html';
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
   * 일반 회원가입 (역할, 아이디, 비밀번호, 이메일, 이름)
   */
  registerUser({ role, username, email, password, name }) {
    if (!role) {
      return { success: false, message: '대학생 또는 교직원 역할을 선택해 주세요.' };
    }
    if (!username || username.trim().length < 3) {
      return { success: false, message: '아이디는 3자 이상 입력해 주세요.' };
    }
    if (!email || !email.includes('@')) {
      return { success: false, message: '올바른 이메일 주소를 입력해 주세요.' };
    }
    if (!password || password.length < 4) {
      return { success: false, message: '비밀번호는 4자 이상 입력해 주세요.' };
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
      email: email.trim(),
      password: password,
      name: name && name.trim() ? name.trim() : username.trim(),
      role: role,
      registeredAt: new Date().toISOString()
    };

    users.push(newUser);
    localStorage.setItem('ai_lit_registered_users', JSON.stringify(users));

    // 회원가입 완료 즉시 자동 세션 생성 및 로그인
    const sessionUser = {
      name: newUser.name,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
      loginAt: new Date().toISOString()
    };
    this.setUser(sessionUser);

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

    const sessionUser = {
      name: matched.name,
      username: matched.username,
      email: matched.email,
      role: matched.role,
      loginAt: new Date().toISOString()
    };
    this.setUser(sessionUser);

    return { success: true, user: sessionUser };
  },

  /**
   * 사용자가 커스텀 구글 버튼 클릭 시 호출
   */
  triggerGoogleLogin(role = 'student', onSuccess = null) {
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
          <span style="font-weight: 600; font-size: 14px;">${this.user.name || '사용자'} 님</span>
        </div>
        ${this.user.role ? '<a href="dashboard.html" class="btn btn-secondary btn-sm">강의실 입장</a>' : ''}
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

