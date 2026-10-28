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
    if (!this.firebaseDb) {
      this.initFirebase();
    }
    return Boolean(this.firebaseDb);
  },

  /**
   * 세션 스토리지에서 현재 사용자 정보 불러오기 (창을 닫으면 자동 로그아웃)
   */
  async init() {
    this.initFirebase();

    // 1. 창을 닫으면 로그아웃되도록 sessionStorage를 기본 세션 저장소로 사용
    const cached = sessionStorage.getItem('ai_lit_user');
    if (cached) {
      try {
        this.user = JSON.parse(cached);
      } catch (e) {
        sessionStorage.removeItem('ai_lit_user');
        this.user = null;
      }
    } else {
      this.user = null;
    }

    // 2. 혹시 기존 localStorage에 남아있던 영구 로그인 캐시는 창 닫힘 시 로그아웃 보장을 위해 안전하게 정리
    try {
      localStorage.removeItem('ai_lit_user');
    } catch (e) {}

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
   * 보호된 페이지 접근 제어 (비로그인 상태 시 즉시 차단 및 리다이렉트)
   * @param {Object} options { role: 'student'|'staff'|null, redirectTo: string }
   * @returns {boolean}
   */
  requireAuth(options = {}) {
    const user = this.getCurrentUser();

    // 1. 미로그인 상태 차단
    if (!user || !user.email) {
      if (typeof document !== 'undefined' && document.body) {
        document.body.style.display = 'none';
      }
      alert('로그인이 필요한 서비스입니다.\n메인 화면에서 로그인 또는 회원가입 후 입장해 주세요.');
      const target = options.redirectTo || 'index.html?login=true';
      window.location.replace(target);
      return false;
    }

    // 2. 특정 역할(대학생 전용 등) 제한 검증
    if (options.role && user.role !== options.role) {
      if (typeof document !== 'undefined' && document.body) {
        document.body.style.display = 'none';
      }
      if (options.role === 'student') {
        alert('해당 메뉴는 대학생 전용 서비스입니다.\n교직원 맞춤형 강의실로 이동합니다.');
      } else if (options.role === 'staff') {
        alert('해당 메뉴는 교직원 전용 서비스입니다.\n대학생 맞춤형 강의실로 이동합니다.');
      }
      window.location.replace('dashboard.html');
      return false;
    }

    return true;
  },

  /**
   * 사용자 정보 저장 (sessionStorage 저장으로 창 닫으면 자동 로그아웃)
   */
  setUser(userData) {
    this.user = userData;
    sessionStorage.setItem('ai_lit_user', JSON.stringify(userData));
    // localStorage의 기존 영구 캐시는 삭제
    try {
      localStorage.removeItem('ai_lit_user');
    } catch (e) {}
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
   * XSS 방지를 위한 HTML Entity 치환 함수
   * @param {string} str 
   * @returns {string}
   */
  escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, function (m) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      }[m];
    });
  },

  /**
   * 등록된 사용자 정보 조회 (로컬 스토리지 및 Cloud Firestore 연동)
   * @param {string} emailOrUsername 
   * @returns {Promise<Object|null>}
   */
  async fetchExistingUser(emailOrUsername) {
    if (!emailOrUsername) return null;
    const cleanKey = emailOrUsername.trim().toLowerCase();

    // 1. 로컬 등록 회원 목록에서 우선 조회
    const localUsers = this.getRegisteredUsers();
    let found = localUsers.find(
      (u) => (u.email && u.email.toLowerCase() === cleanKey) || (u.username && u.username.toLowerCase() === cleanKey)
    );

    // 1-1. Google 사용자 및 일반 사용자 공통 영구 프로필 캐시(ai_lit_user_profiles)에서 조회 및 병합
    try {
      const profiles = JSON.parse(localStorage.getItem('ai_lit_user_profiles') || '{}');
      if (profiles[cleanKey]) {
        found = found ? { ...found, ...profiles[cleanKey] } : { ...profiles[cleanKey] };
      }
    } catch (e) {}

    // 2. Cloud Firestore에서 사용자 문서 조회
    if (this.isFirebaseReady()) {
      try {
        const safeDocKey = cleanKey.replace(/[\/\.]/g, '_');
        const docSnap = await this.firebaseDb.collection('users').doc(safeDocKey).get();
        if (docSnap.exists) {
          const remoteData = docSnap.data();
          found = found ? { ...found, ...remoteData } : remoteData;
        }
      } catch (e) {
        console.warn('[Auth] Firestore 사용자 조회 실패:', e);
      }
    }

    return found || null;
  },

  /**
   * 사용자 역할(대상자) 변경 시 등록 정보 및 Cloud Firestore 동기화
   * @param {string} emailOrUsername 
   * @param {string} newRole 
   */
  async syncUserRoleUpdate(emailOrUsername, newRole) {
    if (!emailOrUsername || !newRole) return;
    const cleanKey = emailOrUsername.trim().toLowerCase();

    // 1. 로컬 등록 회원 정보 갱신
    try {
      const registered = this.getRegisteredUsers();
      const idx = registered.findIndex(
        (u) => (u.email && u.email.toLowerCase() === cleanKey) || (u.username && u.username.toLowerCase() === cleanKey)
      );
      if (idx !== -1) {
        registered[idx].role = newRole;
        registered[idx].updatedAt = new Date().toISOString();
        localStorage.setItem('ai_lit_registered_users', JSON.stringify(registered));
      }
    } catch (e) {
      console.warn('[Auth] 로컬 대상자 역할 갱신 오류:', e);
    }

    // 2. Cloud Firestore users 문서 갱신
    if (this.isFirebaseReady()) {
      try {
        const safeDocKey = cleanKey.replace(/[\/\.]/g, '_');
        await this.firebaseDb.collection('users').doc(safeDocKey).set({
          role: newRole,
          updatedAt: typeof firebase !== 'undefined' && firebase.firestore ? firebase.firestore.FieldValue.serverTimestamp() : new Date()
        }, { merge: true });
      } catch (err) {
        console.warn('[Auth] Firestore 대상자 역할 갱신 오류:', err);
      }
    }
  },

  /**
   * 대상자 역할 유효성 검사 (사용자가 선택한 대상자로 자유로운 전환 및 로그인 허용)
   * @param {Object|null} existingUser 
   * @param {string} attemptedRole 
   * @param {string} emailOrId 
   * @returns {boolean} true
   */
  validateRoleConsistency(existingUser, attemptedRole, emailOrId) {
    // 사용자가 로그인 시 선택한 대상자(대학생/교직원)로 언제든 자유롭게 입장할 수 있도록 허용
    return true;
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

    // 기존 등록 회원 및 Firestore에서 동일 이메일 사용자 조회
    const existing = await this.fetchExistingUser(payload.email);

    // 사용자가 모달에서 선택한 대상자 역할을 최우선 적용
    const userRole = role || (existing && existing.role ? existing.role : 'student');

    // 기존 등록 정보가 있고 역할이 변경된 경우 비동기 동기화
    if (existing && existing.role !== userRole) {
      this.syncUserRoleUpdate(payload.email, userRole).catch(() => {});
    }

    const user = {
      name: (existing && existing.name) ? existing.name : (payload.name || payload.email.split('@')[0]),
      email: payload.email,
      picture: payload.picture || '',
      role: userRole,
      university: existing ? (existing.university || '') : '',
      department: existing ? (existing.department || '') : '',
      gradeOrPosition: existing ? (existing.gradeOrPosition || '') : '',
      googleId: payload.sub,
      loginAt: new Date().toISOString(),
      loginMethod: 'google'
    };

    // 세션 스토리지에 유저 저장 (창 닫으면 자동 로그아웃)
    this.setUser(user);

    // Firebase Auth 구글 자격 증명 동기화 및 입장 이력 저장 대기
    if (this.isFirebaseReady() && this.firebaseAuth && response.credential) {
      try {
        const credential = firebase.auth.GoogleAuthProvider.credential(response.credential);
        await this.firebaseAuth.signInWithCredential(credential).catch(() => {});
      } catch (e) {}
    }

    // Cloud Firestore 입장 이력 기록 완료 대기 후 페이지 이동
    await this.recordLoginHistory(user, 'google');

    if (typeof onSuccess === 'function') {
      onSuccess(user);
    } else {
      window.location.href = 'dashboard.html';
    }
  },

  /**
   * 로그인/입장 이력 기록 (로컬 저장소 및 Cloud Firestore 동기화)
   */
  async recordLoginHistory(user, method = 'unknown') {
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
          const promises = [];

          // 1. login_history 컬렉션에 새 로그 추가
          promises.push(
            this.firebaseDb.collection('login_history').add({
              ...logEntry,
              createdAt: typeof firebase !== 'undefined' && firebase.firestore ? firebase.firestore.FieldValue.serverTimestamp() : new Date()
            }).then((docRef) => {
              console.log('[Auth] Firestore login_history 저장 성공:', docRef.id);
            }).catch((err) => {
              console.error('[Auth] Firestore login_history 저장 실패 (규칙 확인 필요):', err);
            })
          );

          // 2. users 컬렉션 사용자 정보 및 최종 로그인 시각 업데이트
          const docKey = user.email || user.username;
          if (docKey) {
            const safeDocKey = docKey.replace(/[\/\.]/g, '_');
            promises.push(
              this.firebaseDb.collection('users').doc(safeDocKey).set({
                name: user.name || '',
                role: user.role || 'student',
                email: user.email || '',
                university: user.university || '',
                department: user.department || '',
                lastLoginAt: new Date().toISOString()
              }, { merge: true }).then(() => {
                console.log('[Auth] Firestore users 문서 갱신 성공:', safeDocKey);
              }).catch((err) => {
                console.error('[Auth] Firestore users 문서 갱신 실패:', err);
              })
            );
          }

          // Firestore 네트워크 통신 완료 대기 (최대 1.5초 안전 타임아웃)
          await Promise.race([
            Promise.allSettled(promises),
            new Promise((resolve) => setTimeout(resolve, 1500))
          ]);
        } catch (err) {
          console.warn('[Auth] Firebase Firestore 동기화 예외:', err);
        }
      } else {
        console.warn('[Auth] Firebase가 초기화되지 않아 로컬 저장소에만 기록되었습니다. (firebaseConfig 확인 필요)');
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
  async registerUser({ role, name, username, email, password, department, university }) {
    this.initFirebase();

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

    // 로컬 아이디 중복 체크
    if (users.some((u) => u.username.toLowerCase() === cleanUsername)) {
      return { success: false, message: '이미 사용 중인 아이디입니다. 다른 아이디를 입력해 주세요.' };
    }
    // 로컬 이메일 중복 체크
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

    // Firebase Cloud Firestore 및 Auth 동기화
    let firestoreSaved = false;
    if (this.isFirebaseReady()) {
      try {
        const safeEmailKey = cleanEmail.replace(/[\/\.]/g, '_');
        const userData = {
          name: newUser.name,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role,
          university: newUser.university,
          department: newUser.department,
          registeredAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          provider: 'password'
        };

        // 1. Cloud Firestore users 컬렉션에 사용자 프로필 저장 (이메일 키 기준)
        const setDocPromise = this.firebaseDb.collection('users').doc(safeEmailKey).set(userData, { merge: true });
        
        // 아이디 기준 보조 문서도 등록하여 아이디 로그인 시에도 Firestore에서 즉시 매칭되도록 지원
        const safeUserKey = `user_${cleanUsername}`;
        const setUserDocPromise = this.firebaseDb.collection('users').doc(safeUserKey).set(userData, { merge: true });

        await Promise.race([
          Promise.all([setDocPromise, setUserDocPromise]),
          new Promise((resolve) => setTimeout(resolve, 2000))
        ]);

        firestoreSaved = true;
        console.log('[Auth] Cloud Firestore users 컬렉션에 등록 완료:', safeEmailKey);

        // 2. Firebase Auth 이메일/비밀번호 계정 생성 시도 (활성화된 경우)
        if (this.firebaseAuth && newUser.email && newUser.password) {
          try {
            await this.firebaseAuth.createUserWithEmailAndPassword(newUser.email, newUser.password);
            console.log('[Auth] Firebase Auth 계정 생성 성공:', newUser.email);
          } catch (authErr) {
            console.warn('[Auth] Firebase Auth 계정 생성 안내 (Firestore 등록은 정상 유지됨):', authErr.code, authErr.message);
          }
        }
      } catch (err) {
        console.error('[Auth] Firebase Cloud Firestore 저장 중 오류:', err);
        if (err.code === 'permission-denied') {
          console.error('[Auth] Firestore 보안 규칙(Rules) 권한 부족: Firebase 콘솔에서 allow read, write: if true; 설정이 필요합니다.');
        }
      }
    } else {
      console.warn('[Auth] Firebase가 아직 준비되지 않아 로컬 저장소에 우선 등록되었습니다.');
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

    // 입장 이력(login_history) 저장 완료 대기
    await this.recordLoginHistory(sessionUser, 'register');

    return { 
      success: true, 
      user: sessionUser,
      firestoreSaved: firestoreSaved
    };
  },

  /**
   * 일반 로그인 (아이디 또는 이메일 + 비밀번호)
   * @param {string} usernameOrEmail 
   * @param {string} password 
   * @param {string} [selectedRole] 사용자가 모달에서 선택한 대상자 역할 ('student'|'staff')
   */
  async loginWithCredentials(usernameOrEmail, password, selectedRole = null) {
    if (!usernameOrEmail || !password) {
      return { success: false, message: '아이디(또는 이메일)와 비밀번호를 모두 입력해 주세요.' };
    }

    const key = usernameOrEmail.trim().toLowerCase();
    const users = this.getRegisteredUsers();
    let matched = users.find(
      (u) => (u.username.toLowerCase() === key || u.email.toLowerCase() === key) && u.password === password
    );

    // 로컬에 없더라도 Firestore users에 등록된 경우 조회 시도
    if (!matched && this.isFirebaseReady()) {
      try {
        const remoteUser = await this.fetchExistingUser(key);
        if (remoteUser && remoteUser.password === password) {
          matched = remoteUser;
        }
      } catch (e) {}
    }

    if (!matched) {
      return {
        success: false,
        message: '아이디(이메일) 또는 비밀번호가 일치하지 않습니다. 회원가입 여부를 확인해 주세요.'
      };
    }

    // 사용자가 선택한 대상자가 있다면 해당 역할을 최우선 적용하여 다른 대상자로도 자유롭게 입장 지원
    const finalRole = selectedRole || matched.role || 'student';
    if (matched.role !== finalRole) {
      matched.role = finalRole;
      this.syncUserRoleUpdate(matched.email || matched.username, finalRole).catch(() => {});
    }

    // 최종 로그인 시간 및 횟수 갱신
    matched.lastLoginAt = new Date().toISOString();
    matched.loginCount = (matched.loginCount || 0) + 1;
    localStorage.setItem('ai_lit_registered_users', JSON.stringify(users));

    const sessionUser = {
      name: matched.name,
      username: matched.username,
      email: matched.email,
      role: finalRole,
      university: matched.university || '',
      department: matched.department || '',
      gradeOrPosition: matched.gradeOrPosition || '',
      loginAt: new Date().toISOString(),
      loginMethod: 'credentials'
    };
    this.setUser(sessionUser);
    await this.recordLoginHistory(sessionUser, 'credentials');

    return { success: true, user: sessionUser };
  },

  /**
   * 사용자가 커스텀 구글 버튼 클릭 시 호출
   */
  triggerGoogleLogin(role = 'student', onSuccess = null) {
    // 1. Firebase Auth가 설정되어 있으면 Firebase Google 팝업 로그인 우선 실행
    if (this.isFirebaseReady() && this.firebaseAuth && typeof firebase !== 'undefined') {
      const provider = new firebase.auth.GoogleAuthProvider();
      this.firebaseAuth.signInWithPopup(provider).then(async (result) => {
        const fbUser = result.user;
        const existing = await this.fetchExistingUser(fbUser.email);

        // 사용자가 선택한 대상자 역할을 최우선 반영
        const userRole = role || (existing && existing.role ? existing.role : 'student');

        if (existing && existing.role !== userRole) {
          this.syncUserRoleUpdate(fbUser.email, userRole).catch(() => {});
        }

        const user = {
          name: (existing && existing.name) ? existing.name : (fbUser.displayName || fbUser.email.split('@')[0]),
          email: fbUser.email,
          picture: fbUser.photoURL || '',
          role: userRole,
          university: existing ? (existing.university || '') : '',
          department: existing ? (existing.department || '') : '',
          gradeOrPosition: existing ? (existing.gradeOrPosition || '') : '',
          googleId: fbUser.uid,
          loginAt: new Date().toISOString(),
          loginMethod: 'google'
        };

        this.setUser(user);
        this.recordLoginHistory(user, 'google').finally(() => {
          if (typeof onSuccess === 'function') {
            onSuccess(user);
          } else {
            window.location.href = 'dashboard.html';
          }
        });
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
      // Client ID가 아직 기본값인 경우: 선택한 역할에 맞춘 빠른 원클릭 시뮬레이션 입장
      const roleLabel = role === 'staff' ? '교직원' : '대학생';
      const mockUser = {
        name: `${roleLabel} 구글 사용자`,
        email: role === 'staff' ? 'staff.demo@univ.ac.kr' : 'student.demo@campus.edu',
        picture: '',
        role: role,
        googleId: 'demo-google-id',
        isDemo: true,
        loginAt: new Date().toISOString(),
        loginMethod: 'google'
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

    const userEmail = (this.user.email || '').trim().toLowerCase();
    const userUsername = (this.user.username || '').trim().toLowerCase();

    // 1. Google 사용자 및 일반 사용자 공통 영구 프로필 캐시(ai_lit_user_profiles)에 영구 저장
    try {
      const profiles = JSON.parse(localStorage.getItem('ai_lit_user_profiles') || '{}');
      const profileData = {
        name: this.user.name || '',
        email: this.user.email || '',
        username: this.user.username || '',
        role: this.user.role || 'student',
        university: this.user.university || '',
        department: this.user.department || '',
        gradeOrPosition: this.user.gradeOrPosition || '',
        updatedAt: new Date().toISOString()
      };
      if (userEmail) profiles[userEmail] = { ...(profiles[userEmail] || {}), ...profileData };
      if (userUsername) profiles[userUsername] = { ...(profiles[userUsername] || {}), ...profileData };
      localStorage.setItem('ai_lit_user_profiles', JSON.stringify(profiles));
    } catch (e) {
      console.warn('[Auth] 영구 프로필 캐시 저장 실패:', e);
    }

    // 2. 등록 회원 목록(ai_lit_registered_users)에서도 갱신 (Google 사용자라도 새 레코드로 자동 Upsert)
    try {
      const registered = this.getRegisteredUsers();
      const idx = registered.findIndex(u => (userUsername && u.username && u.username.toLowerCase() === userUsername) || (userEmail && u.email && u.email.toLowerCase() === userEmail));
      if (idx !== -1) {
        registered[idx] = {
          ...registered[idx],
          ...data,
          updatedAt: new Date().toISOString()
        };
      } else if (userEmail) {
        // Google 로그인 사용자 등을 위해 영구 레코드 자동 생성
        registered.push({
          name: this.user.name || userEmail.split('@')[0],
          email: userEmail,
          username: userUsername || userEmail.split('@')[0],
          role: this.user.role || 'student',
          university: this.user.university || '',
          department: this.user.department || '',
          gradeOrPosition: this.user.gradeOrPosition || '',
          registeredAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      localStorage.setItem('ai_lit_registered_users', JSON.stringify(registered));
    } catch (e) {
      console.warn('[Auth] 등록 회원 정보 갱신 동기화 실패:', e);
    }

    // 3. Firebase Cloud Firestore 동기화
    if (this.isFirebaseReady()) {
      try {
        const docKey = (userEmail || userUsername).replace(/[\/\.]/g, '_');
        if (docKey) {
          const updatePayload = {
            ...data,
            name: this.user.name || '',
            email: this.user.email || '',
            role: this.user.role || 'student',
            university: this.user.university || '',
            department: this.user.department || '',
            gradeOrPosition: this.user.gradeOrPosition || '',
            updatedAt: typeof firebase !== 'undefined' && firebase.firestore ? firebase.firestore.FieldValue.serverTimestamp() : new Date().toISOString()
          };
          this.firebaseDb.collection('users').doc(docKey).set(updatePayload, { merge: true }).catch(() => {});
        }
      } catch (err) {
        console.warn('[Auth] Firestore 프로필 갱신 오류:', err);
      }
    }

    return true;
  },

  /**
   * 로그아웃 (세션 스토리지 삭제 및 상태 초기화)
   */
  logout() {
    this.user = null;
    sessionStorage.removeItem('ai_lit_user');
    try {
      localStorage.removeItem('ai_lit_user');
    } catch (e) {}
    if (this.firebaseAuth) {
      this.firebaseAuth.signOut().catch(() => {});
    }
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
      const safeName = this.escapeHtml(this.user.name || '사용자');
      const notionUrl = this.user.role === 'staff'
        ? 'https://9core.notion.site/AI-4060ce4c022480bcace7f6cf5209c762?source=copy_link'
        : (this.user.role === 'student'
          ? 'https://9core.notion.site/AI-4050ce4c022480468d6cd989497770ca?source=copy_link'
          : '');
      const roleShortText = this.user.role === 'staff' ? '🏛️ 교직원' : (this.user.role === 'student' ? '🎓 대학생' : '회원');
      const notionNoteBtn = notionUrl
        ? `<a href="${notionUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; gap: 4px; font-weight: 700; background: #ffffff; color: var(--color-obsidian); border-color: #d1d5db; white-space: nowrap;" title="새 창에서 노션 강의노트 열기">
             <span class="desktop-only">📝 노션 강의노트 보기 ↗</span>
             <span class="mobile-only">📝 강의노트 ↗</span>
           </a>`
        : '';
      
      const roleBadgeColor = this.user.role === 'staff' ? 'background: #fff3ee; color: var(--color-ember); border: 1px solid #fed7aa;' : 'background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0;';
      
      navMenu.innerHTML = `
        <div class="user-badge" style="display: flex; align-items: center; gap: 6px; flex-wrap: nowrap;">
          <span class="role-badge" style="${roleBadgeColor} padding: 4px 10px; border-radius: 999px; font-size: 11.5px; font-weight: 800; white-space: nowrap;">
            <span class="desktop-only">${roleText} 전용</span>
            <span class="mobile-only">${roleShortText}</span>
          </span>
          ${notionNoteBtn}
          <a href="profile.html" style="font-weight: 600; font-size: 13.5px; color: var(--color-obsidian); text-decoration: none; display: inline-flex; align-items: center; gap: 4px; white-space: nowrap;" title="내 정보 및 프로필 관리">
            <span>${safeName} 님</span>
            <span style="font-size: 14px; opacity: 0.9;" aria-label="프로필 관리">⚙️</span>
          </a>
        </div>
        ${this.user.role ? '<a href="dashboard.html" class="btn btn-secondary btn-sm" style="white-space: nowrap;">강의실</a>' : ''}
        <button id="logout-btn" type="button" class="btn btn-secondary btn-sm" style="white-space: nowrap;">로그아웃</button>
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
window.escapeHtml = Auth.escapeHtml.bind(Auth);


