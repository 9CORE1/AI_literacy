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
    // 웹페이지 내 하드코딩된 관리자 계정 시딩 제거 (오로지 파이어베이스 데이터베이스 레코드만 사용)

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

  // =========================================================================
  // 관리자(Admin) 및 회원 승인(Approval) 시스템
  // =========================================================================
  ADMIN_DEFAULT_ID: 'admin',

  /**
   * 관리자 세션 또는 관리자 권한 확인
   * @returns {boolean}
   */
  isAdmin() {
    return Boolean(sessionStorage.getItem('ai_lit_admin_session') === 'true' || (this.user && (this.user.isAdmin || this.user.role === 'admin')));
  },

  /**
   * 관리자 로그인 (파이어베이스 Cloud Firestore users 컬렉션 실시간 전용 인증)
   * 웹페이지 소스코드에는 어떠한 관리자 아이디나 비밀번호도 저장하지 않으며,
   * 오로지 파이어베이스 데이터베이스(users 컬렉션)에 저장된 레코드와 실시간으로 직접 대조하여 검증합니다.
   * @param {string} username 
   * @param {string} password 
   * @returns {Promise<{success: boolean, message?: string, user?: Object}>}
   */
  async loginAdmin(username, password) {
    if (!username || !password) {
      return { success: false, message: '아이디와 비밀번호를 모두 입력해 주세요.' };
    }

    const cleanId = username.trim().toLowerCase();

    // Firebase Firestore 연결 필수
    if (!this.isFirebaseReady()) {
      return {
        success: false,
        message: '파이어베이스(Firebase) 데이터베이스에 연결되어 있지 않습니다. 네트워크 또는 설정을 확인해 주세요.'
      };
    }

    try {
      // 1. user_admin 또는 admin 또는 입력된 ID 기반 대표 문서 직접 조회
      const candidateDocIds = [cleanId, `user_${cleanId}`, 'user_admin', 'admin'];
      for (const docId of candidateDocIds) {
        const directDoc = await this.firebaseDb.collection('users').doc(docId).get();
        if (directDoc.exists) {
          const data = directDoc.data();
          if (!data) continue;
          const dUser = (data.username || '').trim().toLowerCase();
          const dEmail = (data.email || '').trim().toLowerCase();
          const isDocAdmin = Boolean(data.isAdmin || data.role === 'admin' || directDoc.id === 'user_admin' || directDoc.id === 'admin');

          if (isDocAdmin && (dUser === cleanId || dEmail === cleanId || directDoc.id.toLowerCase() === cleanId || cleanId === 'admin')) {
            // 데이터베이스의 비밀번호와 직접 대조
            if (data.password && String(data.password) === String(password)) {
              sessionStorage.setItem('ai_lit_admin_session', 'true');
              const adminUser = {
                name: data.name || '최고 관리자',
                username: data.username || cleanId,
                email: data.email || 'admin@ailiteracy.kr',
                role: 'admin',
                allowedRole: 'staff',
                status: 'approved',
                isAdmin: true,
                university: data.university || '',
                department: data.department || '',
                gradeOrPosition: data.gradeOrPosition || '',
                loginAt: new Date().toISOString(),
                loginMethod: 'admin'
              };
              this.setUser(adminUser);
              return { success: true, user: adminUser };
            } else {
              return { success: false, message: '관리자 비밀번호가 일치하지 않습니다.' };
            }
          }
        }
      }

      // 2. users 컬렉션 전체에서 isAdmin=true 또는 role='admin'인 계정 매칭 조회
      const snap = await this.firebaseDb.collection('users').get();
      for (const doc of snap.docs) {
        const data = doc.data();
        if (!data) continue;
        const dUser = (data.username || '').trim().toLowerCase();
        const dEmail = (data.email || '').trim().toLowerCase();
        const isDocAdmin = Boolean(data.isAdmin || data.role === 'admin' || doc.id === 'user_admin' || doc.id === 'admin');

        if (isDocAdmin && (dUser === cleanId || dEmail === cleanId || doc.id.toLowerCase() === cleanId)) {
          // 데이터베이스의 비밀번호와 직접 대조
          if (data.password && String(data.password) === String(password)) {
            sessionStorage.setItem('ai_lit_admin_session', 'true');
            const adminUser = {
              name: data.name || '최고 관리자',
              username: data.username || cleanId,
              email: data.email || 'admin@ailiteracy.kr',
              role: 'admin',
              allowedRole: 'staff',
              status: 'approved',
              isAdmin: true,
              university: data.university || '',
              department: data.department || '',
              gradeOrPosition: data.gradeOrPosition || '',
              loginAt: new Date().toISOString(),
              loginMethod: 'admin'
            };
            this.setUser(adminUser);
            return { success: true, user: adminUser };
          } else {
            return { success: false, message: '관리자 비밀번호가 일치하지 않습니다.' };
          }
        }
      }

      return { success: false, message: '데이터베이스에 등록된 관리자 정보를 찾을 수 없습니다.' };
    } catch (err) {
      console.error('[Auth] Firestore 관리자 인증 오류:', err);
      return { success: false, message: '파이어베이스 데이터베이스 연결 중 오류가 발생했습니다: ' + err.message };
    }
  },

  /**
   * 관리자 로그아웃
   */
  logoutAdmin() {
    sessionStorage.removeItem('ai_lit_admin_session');
    if (this.user && this.user.isAdmin) {
      this.logout();
    }
  },

  /**
   * 회원 승인 레코드 맵 조회
   * @returns {Object}
   */
  getApprovals() {
    try {
      return JSON.parse(localStorage.getItem('ai_lit_user_approvals') || '{}');
    } catch (e) {
      return {};
    }
  },

  /**
   * 표준 Firestore users 문서 ID 생성 (단일 문서 유지 규칙)
   * @param {string} [email]
   * @param {string} [username]
   * @returns {string}
   */
  getStandardUserDocId(email = '', username = '') {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanUser = String(username || '').trim().toLowerCase();
    if (cleanUser === 'admin' || cleanEmail === 'admin@ailiteracy.kr') {
      return 'user_admin';
    }
    if (cleanEmail) {
      return cleanEmail.replace(/[\/\.]/g, '_');
    }
    if (cleanUser) {
      return `user_${cleanUser.replace(/[\/\.]/g, '_')}`;
    }
    return '';
  },

  /**
   * Cloud Firestore users 컬렉션에서 기존 회원 문서 1개 탐색 (문서 파편화 방지)
   * @param {string} emailOrUsername
   * @param {string} [secondaryKey]
   * @returns {Promise<{docId: string, data: Object}|null>}
   */
  async findExistingFirestoreUserDoc(emailOrUsername, secondaryKey = '') {
    if (!this.isFirebaseReady()) return null;
    const keys = [emailOrUsername, secondaryKey]
      .map((k) => String(k || '').trim().toLowerCase())
      .filter(Boolean);
    if (keys.length === 0) return null;

    try {
      // 1. 대표 후보 문서 ID 직접 조회
      const candidateDocIds = new Set();
      keys.forEach((k) => {
        candidateDocIds.add(k.replace(/[\/\.]/g, '_'));
        candidateDocIds.add(k.replace(/[@.]/g, '_'));
        candidateDocIds.add(`user_${k.replace(/[\/\.]/g, '_')}`);
        candidateDocIds.add(k);
      });

      for (const docId of candidateDocIds) {
        if (!docId) continue;
        const snap = await this.firebaseDb.collection('users').doc(docId).get();
        if (snap.exists) {
          return { docId: snap.id, data: snap.data() || {} };
        }
      }

      // 2. 아이디 로그인 등 문서 ID와 필드가 다른 경우 전체 문서에서 email/username 매칭 폴백
      const colSnap = await this.firebaseDb.collection('users').get();
      for (const doc of colSnap.docs) {
        const d = doc.data() || {};
        const dEmail = String(d.email || '').trim().toLowerCase();
        const dUser = String(d.username || '').trim().toLowerCase();
        if ((dEmail && keys.includes(dEmail)) || (dUser && keys.includes(dUser))) {
          return { docId: doc.id, data: d };
        }
      }
    } catch (err) {
      console.warn('[Auth] Firestore 기존 회원 문서 탐색 실패:', err);
    }
    return null;
  },

  /**
   * 로컬 승인 캐시 및 등록 회원 목록을 최신 상태(Firestore 등)로 동기화
   * @param {Object} userObj
   */
  syncLocalApprovalCache(userObj) {
    if (!userObj) return;
    const emailKey = String(userObj.email || '').trim().toLowerCase();
    const userKey = String(userObj.username || '').trim().toLowerCase();
    const primaryKey = emailKey || userKey;
    if (!primaryKey) return;

    const status = userObj.status || 'pending';
    const role = (userObj.role || userObj.allowedRole || 'student') === 'staff' ? 'staff' : 'student';

    try {
      const approvals = this.getApprovals();
      const targetKeys = [emailKey, userKey].filter(Boolean);
      targetKeys.forEach((k) => {
        approvals[k] = {
          ...(approvals[k] || {}),
          name: userObj.name || (approvals[k] && approvals[k].name) || '',
          email: userObj.email || (approvals[k] && approvals[k].email) || '',
          username: userObj.username || (approvals[k] && approvals[k].username) || k,
          role: role,
          allowedRole: role,
          status: status,
          university: userObj.university || (approvals[k] && approvals[k].university) || '',
          department: userObj.department || (approvals[k] && approvals[k].department) || '',
          gradeOrPosition: userObj.gradeOrPosition || (approvals[k] && approvals[k].gradeOrPosition) || '',
          updatedAt: new Date().toISOString()
        };
      });
      localStorage.setItem('ai_lit_user_approvals', JSON.stringify(approvals));
    } catch (e) {}

    try {
      const users = this.getRegisteredUsers();
      const idx = users.findIndex(
        (u) =>
          (emailKey && u.email && u.email.toLowerCase() === emailKey) ||
          (userKey && u.username && u.username.toLowerCase() === userKey)
      );
      if (idx !== -1) {
        users[idx] = {
          ...users[idx],
          name: userObj.name || users[idx].name || '',
          email: userObj.email || users[idx].email || '',
          username: userObj.username || users[idx].username || '',
          role: role,
          allowedRole: role,
          status: status,
          university: userObj.university || users[idx].university || '',
          department: userObj.department || users[idx].department || '',
          gradeOrPosition: userObj.gradeOrPosition || users[idx].gradeOrPosition || '',
          firestoreDocId: userObj.firestoreDocId || users[idx].firestoreDocId || null
        };
      } else {
        users.push({
          name: userObj.name || primaryKey,
          email: userObj.email || '',
          username: userObj.username || (emailKey ? emailKey.split('@')[0] : primaryKey),
          role: role,
          allowedRole: role,
          status: status,
          university: userObj.university || '',
          department: userObj.department || '',
          gradeOrPosition: userObj.gradeOrPosition || '',
          registeredAt: userObj.registeredAt || new Date().toISOString(),
          lastLoginAt: userObj.lastLoginAt || null,
          loginMethod: userObj.loginMethod || 'credentials',
          firestoreDocId: userObj.firestoreDocId || null
        });
      }
      localStorage.setItem('ai_lit_registered_users', JSON.stringify(users));
    } catch (e) {}
  },

  /**
   * 회원 정보를 Cloud Firestore users 컬렉션에 단일 문서로 저장/병합 (Upsert)
   * 간편입장(승인 전 포함), 회원가입, 아이디 로그인 시 언제나 누락 없이 기록 보장
   * @param {Object} userData
   * @param {Object} [options] { preserveExistingStatus: boolean, updateRole: boolean }
   * @returns {Promise<{saved: boolean, docId: string|null, data: Object|null}>}
   */
  async upsertUserToFirestore(userData, options = { preserveExistingStatus: true, updateRole: false }) {
    if (!userData) return { saved: false, docId: null, data: null };
    this.initFirebase();
    if (!this.isFirebaseReady()) {
      return { saved: false, docId: null, data: null };
    }

    const cleanEmail = String(userData.email || '').trim().toLowerCase();
    const cleanUser = String(userData.username || (cleanEmail ? cleanEmail.split('@')[0] : '')).trim();
    if (!cleanEmail && !cleanUser) {
      return { saved: false, docId: null, data: null };
    }

    try {
      let targetDocId = userData.firestoreDocId || '';
      let existingData = {};

      if (targetDocId) {
        const snap = await this.firebaseDb.collection('users').doc(targetDocId).get();
        if (snap.exists) {
          existingData = snap.data() || {};
        }
      } else {
        const found = await this.findExistingFirestoreUserDoc(cleanEmail, cleanUser);
        if (found) {
          targetDocId = found.docId;
          existingData = found.data || {};
        }
      }

      if (!targetDocId) {
        targetDocId = this.getStandardUserDocId(cleanEmail, cleanUser);
      }
      if (!targetDocId) {
        return { saved: false, docId: null, data: null };
      }

      const preserveStatus = options && options.preserveExistingStatus !== false;
      const forceUpdateRole = Boolean(options && options.updateRole);

      const resolvedStatus = (preserveStatus && existingData.status)
        ? existingData.status
        : (userData.status || existingData.status || 'pending');

      const explicitRole = (userData.role === 'staff' || userData.role === 'student') ? userData.role : null;
      const resolvedRole = (forceUpdateRole && explicitRole)
        ? explicitRole
        : (explicitRole || existingData.role || existingData.allowedRole || 'student');
      const resolvedAllowedRole = (forceUpdateRole && explicitRole)
        ? explicitRole
        : (userData.allowedRole || explicitRole || existingData.allowedRole || existingData.role || 'student');

      const nowIso = new Date().toISOString();
      const payload = {
        name: userData.name || existingData.name || cleanUser || cleanEmail,
        username: userData.username || existingData.username || cleanUser,
        email: userData.email || existingData.email || '',
        role: resolvedRole,
        allowedRole: resolvedAllowedRole,
        status: resolvedStatus,
        university: userData.university !== undefined && userData.university !== '' ? userData.university : (existingData.university || ''),
        department: userData.department !== undefined && userData.department !== '' ? userData.department : (existingData.department || ''),
        gradeOrPosition: userData.gradeOrPosition !== undefined && userData.gradeOrPosition !== '' ? userData.gradeOrPosition : (existingData.gradeOrPosition || ''),
        loginMethod: userData.loginMethod || existingData.loginMethod || 'credentials',
        provider: userData.provider || existingData.provider || (userData.loginMethod === 'google' ? 'google' : 'password'),
        registeredAt: existingData.registeredAt || userData.registeredAt || nowIso,
        updatedAt: typeof firebase !== 'undefined' && firebase.firestore ? firebase.firestore.FieldValue.serverTimestamp() : nowIso
      };

      if (userData.password) {
        payload.password = userData.password;
      } else if (existingData.password) {
        payload.password = existingData.password;
      }
      if (userData.picture || existingData.picture) {
        payload.picture = userData.picture || existingData.picture;
      }
      if (userData.googleId || existingData.googleId) {
        payload.googleId = userData.googleId || existingData.googleId;
      }
      if (userData.lastLoginAt) {
        payload.lastLoginAt = userData.lastLoginAt;
      } else if (existingData.lastLoginAt) {
        payload.lastLoginAt = existingData.lastLoginAt;
      }
      if (userData.lastLoginAttemptAt) {
        payload.lastLoginAttemptAt = userData.lastLoginAttemptAt;
      }
      if (typeof userData.loginCount === 'number') {
        payload.loginCount = userData.loginCount;
      } else if (typeof existingData.loginCount === 'number') {
        payload.loginCount = existingData.loginCount;
      }

      const writePromise = this.firebaseDb.collection('users').doc(targetDocId).set(payload, { merge: true });
      await Promise.race([
        writePromise,
        new Promise((resolve) => setTimeout(resolve, 2500))
      ]);

      return { saved: true, docId: targetDocId, data: { ...existingData, ...payload, firestoreDocId: targetDocId } };
    } catch (err) {
      console.error('[Auth] Firestore users 문서 저장(Upsert) 오류:', err);
      return { saved: false, docId: null, data: null };
    }
  },

  /**
   * 특정 회원의 승인 상태 및 관리자 지정 허용 대상자 조회
   * @param {string} emailOrUsername 
   * @returns {{ status: 'approved'|'pending'|'blocked', allowedRole: 'student'|'staff'|null, exists?: boolean }}
   */
  getUserApproval(emailOrUsername) {
    if (!emailOrUsername) return { status: 'pending', allowedRole: null, exists: false };
    const cleanKey = emailOrUsername.trim().toLowerCase();

    const adminId = (localStorage.getItem('ai_lit_admin_id') || this.ADMIN_DEFAULT_ID).toLowerCase();
    // 최고 관리자 계정은 항상 승인
    if (cleanKey === adminId || cleanKey === 'admin' || cleanKey === 'admin@ailiteracy.kr') {
      return { status: 'approved', allowedRole: 'staff', exists: true };
    }

    const approvals = this.getApprovals();
    if (approvals[cleanKey]) {
      const role = approvals[cleanKey].allowedRole || approvals[cleanKey].role || null;
      return {
        status: approvals[cleanKey].status || 'pending',
        allowedRole: role ? (role === 'staff' ? 'staff' : 'student') : null,
        exists: true
      };
    }

    // 등록 회원 목록에서 기본 상태 확인
    const registered = this.getRegisteredUsers();
    const found = registered.find(
      (u) => (u.email && u.email.toLowerCase() === cleanKey) || (u.username && u.username.toLowerCase() === cleanKey)
    );

    if (found) {
      const role = found.allowedRole || found.role || null;
      return {
        status: found.status || 'pending',
        allowedRole: role ? (role === 'staff' ? 'staff' : 'student') : null,
        exists: true
      };
    }

    return { status: 'pending', allowedRole: null, exists: false };
  },

  /**
   * 관리자가 사용자의 신청 역할/소속 과정(대학생 ↔ 교직원)을 직접 수정
   * 회원이 첫 로그인/가입 시 잘못 선택한 역할을 관리자가 정정
   * @param {string} emailOrUsername 
   * @param {'student'|'staff'} newRole 
   */
  async updateUserRole(emailOrUsername, newRole) {
    if (!emailOrUsername || !newRole) return { success: false, message: '유효한 인자가 아닙니다.' };
    const cleanRole = newRole === 'staff' ? 'staff' : 'student';
    const cleanKey = emailOrUsername.trim().toLowerCase();

    // 1. ai_lit_registered_users 갱신
    let matchedUser = null;
    try {
      const users = this.getRegisteredUsers();
      const idx = users.findIndex(
        (u) => (u.email && u.email.toLowerCase() === cleanKey) || (u.username && u.username.toLowerCase() === cleanKey)
      );
      if (idx !== -1) {
        users[idx].role = cleanRole;
        users[idx].allowedRole = cleanRole;
        users[idx].updatedAt = new Date().toISOString();
        matchedUser = users[idx];
        localStorage.setItem('ai_lit_registered_users', JSON.stringify(users));
      }
    } catch (e) {
      console.warn('[Auth] 역할 수정 registered_users 동기화 오류:', e);
    }

    // 2. ai_lit_user_approvals 갱신
    try {
      const approvals = this.getApprovals();
      const existing = approvals[cleanKey] || {};
      approvals[cleanKey] = {
        ...existing,
        role: cleanRole,
        allowedRole: cleanRole,
        updatedAt: new Date().toISOString(),
        updatedBy: 'admin'
      };
      localStorage.setItem('ai_lit_user_approvals', JSON.stringify(approvals));
    } catch (e) {
      console.warn('[Auth] 역할 수정 approvals 동기화 오류:', e);
    }

    // 3. 현재 접속 중인 세션이 본인인 경우 실시간 반영
    if (this.user && ((this.user.email && this.user.email.toLowerCase() === cleanKey) || (this.user.username && this.user.username.toLowerCase() === cleanKey))) {
      this.user.role = cleanRole;
      this.user.allowedRole = cleanRole;
      this.setUser(this.user);
    }

    // 4. Cloud Firestore 단일 기존 문서 동기화
    if (this.isFirebaseReady()) {
      try {
        const found = await this.findExistingFirestoreUserDoc(
          matchedUser && matchedUser.email ? matchedUser.email : cleanKey,
          matchedUser && matchedUser.username ? matchedUser.username : cleanKey
        );
        const targetDocId = found
          ? found.docId
          : this.getStandardUserDocId(
              cleanKey.includes('@') ? cleanKey : (matchedUser ? matchedUser.email : ''),
              !cleanKey.includes('@') ? cleanKey : (matchedUser ? matchedUser.username : '')
            );
        if (targetDocId) {
          await this.firebaseDb.collection('users').doc(targetDocId).set({
            role: cleanRole,
            allowedRole: cleanRole,
            updatedAt: typeof firebase !== 'undefined' && firebase.firestore ? firebase.firestore.FieldValue.serverTimestamp() : new Date().toISOString()
          }, { merge: true });
        }
      } catch (err) {
        console.warn('[Auth] Firestore 역할 수정 오류:', err);
      }
    }

    return { success: true, role: cleanRole };
  },

  /**
   * 회원의 로그인 승인 상태 및 역할 업데이트 (관리자용)
   * @param {string} emailOrUsername 
   * @param {'approved'|'pending'|'blocked'} status 
   * @param {'student'|'staff'} allowedRole 
   */
  async setUserApproval(emailOrUsername, status, allowedRole) {
    if (!emailOrUsername) return;
    const cleanKey = emailOrUsername.trim().toLowerCase();
    const cleanRole = allowedRole === 'staff' ? 'staff' : 'student';

    // 1. ai_lit_user_approvals 저장
    const approvals = this.getApprovals();
    const existing = approvals[cleanKey] || {};
    approvals[cleanKey] = {
      ...existing,
      status: status,
      role: cleanRole,
      allowedRole: cleanRole,
      updatedAt: new Date().toISOString(),
      updatedBy: 'admin'
    };
    localStorage.setItem('ai_lit_user_approvals', JSON.stringify(approvals));

    // 2. ai_lit_registered_users 목록 내 동기화
    let matchedUser = null;
    try {
      const users = this.getRegisteredUsers();
      const idx = users.findIndex(
        (u) => (u.email && u.email.toLowerCase() === cleanKey) || (u.username && u.username.toLowerCase() === cleanKey)
      );
      if (idx !== -1) {
        users[idx].status = status;
        users[idx].role = cleanRole;
        users[idx].allowedRole = cleanRole;
        users[idx].updatedAt = new Date().toISOString();
        matchedUser = users[idx];
        localStorage.setItem('ai_lit_registered_users', JSON.stringify(users));
      }
    } catch (e) {}

    // 3. 현재 로그인된 세션이 본인인 경우 세션도 실시간 갱신
    if (this.user && ((this.user.email && this.user.email.toLowerCase() === cleanKey) || (this.user.username && this.user.username.toLowerCase() === cleanKey))) {
      this.user.status = status;
      this.user.role = cleanRole;
      this.user.allowedRole = cleanRole;
      this.setUser(this.user);
    }

    // 4. Cloud Firestore users 컬렉션 단일 기존 문서 동기화
    if (this.isFirebaseReady()) {
      try {
        const found = await this.findExistingFirestoreUserDoc(
          matchedUser && matchedUser.email ? matchedUser.email : cleanKey,
          matchedUser && matchedUser.username ? matchedUser.username : cleanKey
        );
        const targetDocId = found
          ? found.docId
          : this.getStandardUserDocId(
              cleanKey.includes('@') ? cleanKey : (matchedUser ? matchedUser.email : ''),
              !cleanKey.includes('@') ? cleanKey : (matchedUser ? matchedUser.username : '')
            );
        if (targetDocId) {
          const updateData = {
            status: status,
            role: cleanRole,
            allowedRole: cleanRole,
            updatedAt: typeof firebase !== 'undefined' && firebase.firestore ? firebase.firestore.FieldValue.serverTimestamp() : new Date().toISOString()
          };
          if (matchedUser) {
            if (matchedUser.name) updateData.name = matchedUser.name;
            if (matchedUser.email) updateData.email = matchedUser.email;
            if (matchedUser.username) updateData.username = matchedUser.username;
            if (matchedUser.university) updateData.university = matchedUser.university;
            if (matchedUser.department) updateData.department = matchedUser.department;
            if (matchedUser.password) updateData.password = matchedUser.password;
          }
          await this.firebaseDb.collection('users').doc(targetDocId).set(updateData, { merge: true });
        }
      } catch (err) {
        console.warn('[Auth] Firestore 회원 승인 상태 동기화 오류:', err);
      }
    }
  },

  /**
   * 특정 회원 영구 삭제 (로컬스토리지 및 Cloud Firestore 완전 동기 삭제)
   * @param {string|Object} userParam 이메일/아이디 문자열 또는 { key, email, username, docId } 객체
   * @param {string} [docIdParam] Firestore 문서 ID (옵션)
   * @returns {Promise<{success: boolean, message?: string}>}
   */
  async deleteUser(userParam, docIdParam = null) {
    if (!userParam) return { success: false, message: '삭제할 회원 식별자가 없습니다.' };

    let key = '';
    let email = '';
    let username = '';
    let docId = docIdParam;

    if (typeof userParam === 'object' && userParam !== null) {
      key = (userParam.key || '').trim().toLowerCase();
      email = (userParam.email || '').trim().toLowerCase();
      username = (userParam.username || '').trim().toLowerCase();
      docId = userParam.docId || docIdParam || '';
    } else if (typeof userParam === 'string') {
      key = userParam.trim().toLowerCase();
      if (key.includes('@')) {
        email = key;
      } else {
        username = key;
      }
    }

    const candidateKeys = new Set([key, email, username].filter(Boolean));
    if (candidateKeys.size === 0) {
      return { success: false, message: '유효한 회원 식별자가 없습니다.' };
    }

    // 최고 관리자 계정 보호
    const adminId = (localStorage.getItem('ai_lit_admin_id') || this.ADMIN_DEFAULT_ID).toLowerCase();
    for (const k of candidateKeys) {
      if (k === adminId || k === 'admin' || k === 'admin@ailiteracy.kr') {
        return { success: false, message: '최고 관리자(admin) 계정은 삭제할 수 없습니다.' };
      }
    }

    // 1. ai_lit_registered_users 에서 제거
    try {
      const users = this.getRegisteredUsers();
      const filtered = users.filter(u => {
        const uName = (u.username || '').toLowerCase().trim();
        const uEmail = (u.email || '').toLowerCase().trim();
        return !candidateKeys.has(uName) && !candidateKeys.has(uEmail);
      });
      localStorage.setItem('ai_lit_registered_users', JSON.stringify(filtered));
    } catch (e) {
      console.warn('[Auth] registered_users 삭제 오류:', e);
    }

    // 2. ai_lit_user_approvals 에서 제거
    try {
      const approvals = this.getApprovals();
      candidateKeys.forEach(k => delete approvals[k]);
      Object.keys(approvals).forEach(k => {
        const cleanK = k.toLowerCase().trim();
        if (candidateKeys.has(cleanK)) {
          delete approvals[k];
        }
      });
      localStorage.setItem('ai_lit_user_approvals', JSON.stringify(approvals));
    } catch (e) {
      console.warn('[Auth] approvals 삭제 오류:', e);
    }

    // 3. ai_lit_login_history, 프로필 캐시 및 진단 데이터 제거
    try {
      const history = this.getLoginHistory().filter(h => {
        const hEmail = (h.email || '').toLowerCase().trim();
        const hUser = (h.username || '').toLowerCase().trim();
        return !candidateKeys.has(hEmail) && !candidateKeys.has(hUser);
      });
      localStorage.setItem('ai_lit_login_history', JSON.stringify(history));

      const profiles = JSON.parse(localStorage.getItem('ai_lit_user_profiles') || '{}');
      candidateKeys.forEach(k => delete profiles[k]);
      Object.keys(profiles).forEach(k => {
        if (candidateKeys.has(k.toLowerCase().trim())) delete profiles[k];
      });
      localStorage.setItem('ai_lit_user_profiles', JSON.stringify(profiles));

      candidateKeys.forEach(k => {
        localStorage.removeItem('ai_lit_diagnosis_' + k);
      });
    } catch (e) {}

    // 4. Cloud Firestore 문서 완전 삭제
    if (this.isFirebaseReady()) {
      try {
        const docIdsToDelete = new Set();
        if (docId) docIdsToDelete.add(docId);

        // 후보 키들로부터 생성 가능한 모든 Firestore 문서 ID 패턴 추가
        candidateKeys.forEach(k => {
          docIdsToDelete.add(k);
          docIdsToDelete.add(k.replace(/[@.]/g, '_'));
          docIdsToDelete.add(`user_${k}`);
          docIdsToDelete.add(`user_${k.replace(/[@.]/g, '_')}`);
        });

        // users 컬렉션 전체 문서를 실시간 스캔하여 대상 회원 관련 문서 모두 수집
        const snap = await this.firebaseDb.collection('users').get();
        snap.forEach(doc => {
          const dId = doc.id.toLowerCase();
          const isDocAdmin = dId === 'user_admin' || dId === 'admin@ailiteracy_kr' || dId === 'admin';
          if (isDocAdmin) return;

          const data = doc.data() || {};
          const dEmail = (data.email || '').toLowerCase().trim();
          const dUser = (data.username || '').toLowerCase().trim();

          // doc.id가 직접 일치하거나
          if (docIdsToDelete.has(doc.id) || docIdsToDelete.has(dId)) {
            docIdsToDelete.add(doc.id);
            return;
          }

          // 문서 내부의 email 또는 username이 일치하거나
          if ((dEmail && candidateKeys.has(dEmail)) || (dUser && candidateKeys.has(dUser))) {
            docIdsToDelete.add(doc.id);
            return;
          }

          // doc.id에 candidateKey가 포함된 경우
          for (const k of candidateKeys) {
            const safeK = k.replace(/[@.]/g, '_');
            if (dId === `user_${k}` || dId === `user_${safeK}` || dId === safeK) {
              docIdsToDelete.add(doc.id);
              return;
            }
          }
        });

        // 수집된 모든 문서 ID를 Firestore에서 실제 삭제 (await 완료 대기)
        const deletePromises = [];
        for (const targetId of docIdsToDelete) {
          const targetLower = targetId.toLowerCase();
          if (targetLower !== 'user_admin' && targetLower !== 'admin@ailiteracy_kr' && targetLower !== 'admin') {
            deletePromises.push(
              this.firebaseDb.collection('users').doc(targetId).delete().catch(err => {
                console.warn(`[Auth] Firestore 문서 삭제 실패 (${targetId}):`, err);
              })
            );
          }
        }

        await Promise.all(deletePromises);
      } catch (err) {
        console.error('[Auth] Firestore 회원 문서 삭제 오류:', err);
      }
    }

    return { success: true };
  },

  /**
   * 시스템 내 데모/임의 추가 회원 패턴을 자동 감지하여 영구 정리
   */
  async cleanDummyUsers() {
    const adminId = (localStorage.getItem('ai_lit_admin_id') || this.ADMIN_DEFAULT_ID).toLowerCase();
    const adminEmail = 'admin@ailiteracy.kr';

    const isDummy = (u) => {
      if (!u) return false;
      const uName = (u.username || '').toLowerCase();
      const uEmail = (u.email || '').toLowerCase();
      const realName = (u.name || '').toLowerCase();
      const univ = (u.university || '').toLowerCase();

      if (uName === adminId || uEmail === adminEmail) return false;

      if (u.isDemo === true) return true;
      if (uEmail === 'staff.demo@univ.ac.kr' || uEmail === 'student.demo@campus.edu') return true;
      if (uName === 'staff.demo' || uName === 'student.demo') return true;
      if (realName.includes('구글 사용자') || realName.includes('데모')) return true;
      if (univ.includes('데모 대학교')) return true;
      if (uEmail.includes('demo@') || uEmail.includes('@campus.edu')) return true;
      return false;
    };

    // 1. registered_users 정리
    try {
      const users = this.getRegisteredUsers();
      const cleaned = users.filter(u => !isDummy(u));
      if (cleaned.length !== users.length) {
        localStorage.setItem('ai_lit_registered_users', JSON.stringify(cleaned));
      }
    } catch (e) {}

    // 2. approvals 정리
    try {
      const approvals = this.getApprovals();
      let changed = false;
      const dummyKeys = ['staff.demo@univ.ac.kr', 'student.demo@campus.edu', 'staff.demo', 'student.demo'];
      Object.keys(approvals).forEach(k => {
        if (dummyKeys.includes(k.toLowerCase()) || isDummy(approvals[k])) {
          delete approvals[k];
          changed = true;
        }
      });
      if (changed) {
        localStorage.setItem('ai_lit_user_approvals', JSON.stringify(approvals));
      }
    } catch (e) {}

    // 3. login_history 정리
    try {
      const history = this.getLoginHistory().filter(h => !isDummy(h));
      localStorage.setItem('ai_lit_login_history', JSON.stringify(history));
    } catch (e) {}

    // 4. Firestore 데모 문서 정리
    if (this.isFirebaseReady()) {
      try {
        const dummyDocs = [
          'staff_demo@univ_ac_kr',
          'student_demo@campus_edu',
          'user_staff_demo',
          'user_student_demo'
        ];
        dummyDocs.forEach(docId => {
          this.firebaseDb.collection('users').doc(docId).delete().catch(() => {});
        });
      } catch (e) {}
    }
  },

  /**
   * 최고 관리자(admin)를 제외한 모든 임의/테스트 회원 일괄 영구 삭제
   */
  async deleteAllNonAdminUsers() {
    const adminId = (localStorage.getItem('ai_lit_admin_id') || this.ADMIN_DEFAULT_ID).toLowerCase();
    const adminEmail = 'admin@ailiteracy.kr';

    // 1. registered_users 에서 admin만 보존
    const registered = this.getRegisteredUsers();
    const nonAdminUsers = registered.filter(u => {
      const uName = (u.username || '').toLowerCase();
      const uEmail = (u.email || '').toLowerCase();
      return uName !== adminId && uEmail !== adminEmail;
    });

    const keptUsers = registered.filter(u => {
      const uName = (u.username || '').toLowerCase();
      const uEmail = (u.email || '').toLowerCase();
      return uName === adminId || uEmail === adminEmail;
    });
    localStorage.setItem('ai_lit_registered_users', JSON.stringify(keptUsers));

    // 2. approvals 에서 admin만 보존
    const approvals = this.getApprovals();
    const keptApprovals = {};
    if (approvals[adminId]) keptApprovals[adminId] = approvals[adminId];
    if (approvals[adminEmail]) keptApprovals[adminEmail] = approvals[adminEmail];
    localStorage.setItem('ai_lit_user_approvals', JSON.stringify(keptApprovals));

    // 3. login_history 에서 admin만 보존
    const history = this.getLoginHistory().filter(h => {
      const k = (h.email || h.username || '').toLowerCase();
      return k === adminId || k === adminEmail;
    });
    localStorage.setItem('ai_lit_login_history', JSON.stringify(history));

    // 4. Firestore 에서 비관리자 문서 일괄 완전 삭제
    if (this.isFirebaseReady()) {
      try {
        const snap = await this.firebaseDb.collection('users').get();
        const deletePromises = [];
        snap.forEach(doc => {
          const data = doc.data() || {};
          const docId = doc.id.toLowerCase();
          const isDocAdmin = docId === 'user_admin' || docId === 'admin@ailiteracy_kr' || docId === 'admin' ||
                             data.username === 'admin' || data.email === 'admin@ailiteracy.kr' || data.isAdmin === true;
          if (!isDocAdmin) {
            deletePromises.push(doc.ref.delete().catch(() => {}));
          }
        });
        await Promise.all(deletePromises);
      } catch (e) {
        console.warn('[Auth] Firestore 비관리자 일괄 삭제 오류:', e);
      }
    }

    return { success: true, count: nonAdminUsers.length };
  },

  /**
   * 신규 사용자(구글 간편입장/일반)를 승인 대기자 목록 및 Cloud Firestore users DB에 즉시 기록
   * 로그인 모달에서 선택한 역할(대학생/교직원)을 최신 상태로 정확히 저장
   * @param {Object} userData
   */
  async recordPendingUser(userData) {
    const cleanKey = (userData.email || userData.username || '').trim().toLowerCase();
    if (!cleanKey) return;

    const selectedRole = userData.role === 'staff' ? 'staff' : 'student';
    const nowIso = new Date().toISOString();
    const recordObj = {
      name: userData.name || '',
      email: userData.email || '',
      username: userData.username || (cleanKey.includes('@') ? cleanKey.split('@')[0] : cleanKey),
      picture: userData.picture || '',
      googleId: userData.googleId || '',
      role: selectedRole,
      allowedRole: selectedRole,
      status: userData.status || 'pending',
      university: userData.university || '',
      department: userData.department || '',
      registeredAt: userData.registeredAt || nowIso,
      lastLoginAttemptAt: nowIso,
      loginMethod: userData.loginMethod || 'google',
      provider: userData.provider || (userData.loginMethod === 'google' ? 'google' : 'password')
    };

    const approvals = this.getApprovals();
    approvals[cleanKey] = {
      ...(approvals[cleanKey] || {}),
      name: recordObj.name || (approvals[cleanKey] && approvals[cleanKey].name) || '',
      email: recordObj.email || (approvals[cleanKey] && approvals[cleanKey].email) || '',
      username: recordObj.username,
      role: selectedRole,
      allowedRole: selectedRole,
      status: (approvals[cleanKey] && approvals[cleanKey].status === 'blocked') ? 'blocked' : recordObj.status,
      university: recordObj.university || (approvals[cleanKey] && approvals[cleanKey].university) || '',
      department: recordObj.department || (approvals[cleanKey] && approvals[cleanKey].department) || '',
      registeredAt: (approvals[cleanKey] && approvals[cleanKey].registeredAt) || recordObj.registeredAt,
      updatedAt: nowIso
    };
    localStorage.setItem('ai_lit_user_approvals', JSON.stringify(approvals));

    // ai_lit_registered_users 에도 최신 선택 역할 반영 동기화
    const users = this.getRegisteredUsers();
    const idx = users.findIndex(
      (u) => (u.email && u.email.toLowerCase() === cleanKey) || (u.username && u.username.toLowerCase() === cleanKey)
    );
    if (idx === -1) {
      users.push(recordObj);
    } else {
      users[idx] = {
        ...users[idx],
        name: recordObj.name || users[idx].name || '',
        role: selectedRole,
        allowedRole: selectedRole,
        lastLoginAttemptAt: nowIso
      };
    }
    localStorage.setItem('ai_lit_registered_users', JSON.stringify(users));

    // Cloud Firestore users 데이터베이스에 모달 선택 역할(role, allowedRole) 즉시 기록
    await this.upsertUserToFirestore(recordObj, { preserveExistingStatus: true, updateRole: true });
  },

  /**
   * 관리자 화면용 전체 통합 회원 목록 조회 (Firestore + 로컬 등록회원 + 승인대기자 + 구글접속자 통합 실시간 로드)
   * @returns {Promise<Array<Object>>}
   */
  async getAllUsersForAdmin() {
    this.initFirebase();
    const map = new Map();

    const isSuperAdminRecord = (u) => {
      if (!u) return false;
      const uname = String(u.username || '').trim().toLowerCase();
      const mail = String(u.email || '').trim().toLowerCase();
      const docId = String(u.firestoreDocId || u.id || '').trim().toLowerCase();
      const key = String(u.key || '').trim().toLowerCase();
      return Boolean(
        u.isAdmin ||
        u.role === 'admin' ||
        uname === 'admin' ||
        mail === 'admin@ailiteracy.kr' ||
        docId === 'user_admin' ||
        docId === 'admin' ||
        docId === 'admin@ailiteracy_kr' ||
        key === 'admin' ||
        key === 'admin@ailiteracy.kr' ||
        key === 'user_admin'
      );
    };

    // 1. Cloud Firestore users 컬렉션에서 실시간 통합 조회 (권위 있는 원본 데이터)
    if (this.isFirebaseReady()) {
      try {
        const snap = await this.firebaseDb.collection('users').get();
        snap.forEach(doc => {
          const data = doc.data();
          if (!data) return;
          const userEmail = (data.email || '').trim().toLowerCase();
          const userName = (data.username || '').trim().toLowerCase();
          const isDocAdmin = Boolean(
            data.isAdmin ||
            data.role === 'admin' ||
            userName === 'admin' ||
            userEmail === 'admin@ailiteracy.kr' ||
            doc.id.toLowerCase() === 'user_admin' ||
            doc.id.toLowerCase() === 'admin' ||
            doc.id.toLowerCase() === 'admin@ailiteracy_kr'
          );

          let primaryKey = isDocAdmin ? 'admin' : (userEmail || userName || doc.id.toLowerCase());
          if (!isDocAdmin && primaryKey.startsWith('user_')) {
            primaryKey = primaryKey.replace(/^user_/, '');
          }
          if (primaryKey) {
            const existing = map.get(primaryKey) || {};
            map.set(primaryKey, {
              ...existing,
              ...data,
              key: primaryKey,
              email: data.email || existing.email || (isDocAdmin ? 'admin@ailiteracy.kr' : ''),
              username: isDocAdmin ? 'admin' : (data.username || existing.username || primaryKey),
              name: isDocAdmin ? (data.name || '최고 관리자') : (data.name || existing.name || ''),
              role: isDocAdmin ? 'admin' : (data.role || existing.role || 'student'),
              allowedRole: isDocAdmin ? 'staff' : (data.allowedRole || data.role || existing.allowedRole || 'student'),
              status: isDocAdmin ? 'approved' : (data.status || existing.status || 'pending'),
              isAdmin: isDocAdmin ? true : Boolean(data.isAdmin || existing.isAdmin),
              firestoreDocId: doc.id
            });
          }
        });
      } catch (err) {
        console.warn('[Auth] Firestore 회원 목록 조회 실패 (로컬 데이터로 대체):', err);
      }
    }

    // 2. 로컬 ai_lit_registered_users 병합 (Firestore 데이터가 이미 있는 경우 Firestore 값 우선 보존)
    const registered = this.getRegisteredUsers();
    registered.forEach(u => {
      const isUserAdmin = isSuperAdminRecord(u);
      const key = isUserAdmin ? 'admin' : ((u.email || u.username || '').trim().toLowerCase());
      if (key) {
        const existing = map.get(key);
        if (existing && existing.firestoreDocId) {
          map.set(key, {
            ...u,
            ...existing,
            key: key,
            university: existing.university || u.university || '',
            department: existing.department || u.department || '',
            gradeOrPosition: existing.gradeOrPosition || u.gradeOrPosition || ''
          });
        } else {
          map.set(key, {
            ...(existing || {}),
            ...u,
            key: key,
            ...(isUserAdmin ? {
              key: 'admin',
              username: 'admin',
              email: u.email || (existing && existing.email) || 'admin@ailiteracy.kr',
              name: u.name || (existing && existing.name) || '최고 관리자',
              role: 'admin',
              status: 'approved',
              isAdmin: true
            } : {})
          });
        }
      }
    });

    // 3. 승인 목록(ai_lit_user_approvals) 병합 (Firestore 데이터가 있는 경우 Firestore 최신 승인 상태 우선)
    const approvals = this.getApprovals();
    Object.keys(approvals).forEach(key => {
      const isKeyAdmin = key === 'admin' || key === 'admin@ailiteracy.kr' || key === 'user_admin';
      const targetKey = isKeyAdmin ? 'admin' : key;
      const app = approvals[key];
      const existing = map.get(targetKey) || {};
      const hasRemote = Boolean(existing.firestoreDocId);
      map.set(targetKey, {
        ...app,
        ...existing,
        key: targetKey,
        ...(isKeyAdmin ? {
          key: 'admin',
          username: 'admin',
          email: existing.email || 'admin@ailiteracy.kr',
          name: existing.name || '최고 관리자',
          role: 'admin',
          status: 'approved',
          isAdmin: true
        } : {
          status: hasRemote ? (existing.status || app.status || 'pending') : (app.status || existing.status || 'pending'),
          role: hasRemote
            ? (existing.role || existing.allowedRole || app.role || 'student')
            : (app.role || existing.role || app.allowedRole || existing.allowedRole || 'student'),
          allowedRole: hasRemote
            ? (existing.allowedRole || existing.role || app.allowedRole || 'student')
            : (app.allowedRole || app.role || existing.allowedRole || 'student')
        }),
        university: existing.university || app.university || '',
        department: existing.department || app.department || '',
        gradeOrPosition: existing.gradeOrPosition || app.gradeOrPosition || ''
      });
    });

    // 3-1. 영구 프로필 캐시(ai_lit_user_profiles) 추가 보강
    try {
      const profiles = JSON.parse(localStorage.getItem('ai_lit_user_profiles') || '{}');
      Object.keys(profiles).forEach(k => {
        const isProfileAdmin = k === 'admin' || k === 'admin@ailiteracy.kr' || k === 'user_admin';
        const targetKey = isProfileAdmin ? 'admin' : k.toLowerCase().trim();
        const p = profiles[k];
        if (targetKey && map.has(targetKey)) {
          const item = map.get(targetKey);
          if (p.university && !item.university) item.university = p.university;
          if (p.department && !item.department) item.department = p.department;
          if (p.gradeOrPosition && !item.gradeOrPosition) item.gradeOrPosition = p.gradeOrPosition;
          if (p.name && (!item.name || item.name === targetKey)) item.name = p.name;
        }
      });
    } catch (e) {}

    // 4. 로그인 이력 목록에서 추가 정보 보강
    const history = this.getLoginHistory();
    history.forEach(h => {
      const hKey = (h.email || h.username || '').trim().toLowerCase();
      const isHistoryAdmin = hKey === 'admin' || hKey === 'admin@ailiteracy.kr' || hKey === 'user_admin';
      const targetKey = isHistoryAdmin ? 'admin' : hKey;
      if (targetKey && map.has(targetKey)) {
        const item = map.get(targetKey);
        if (!item.lastLoginAt) item.lastLoginAt = h.timestamp;
        if (!item.loginMethod) item.loginMethod = h.method;
      }
    });

    // 5. 모든 관리자 키('admin@ailiteracy.kr', 'user_admin' 등)를 'admin' 단일 키로 완전 병합 및 중복 키 제거
    const adminRecord = map.get('admin') || {};
    for (const [k, v] of Array.from(map.entries())) {
      if (k !== 'admin' && isSuperAdminRecord(v)) {
        Object.assign(adminRecord, v);
        map.delete(k);
      }
    }
    if (Object.keys(adminRecord).length > 0 || map.has('admin')) {
      adminRecord.key = 'admin';
      adminRecord.username = 'admin';
      adminRecord.name = adminRecord.name || '최고 관리자';
      adminRecord.email = adminRecord.email || 'admin@ailiteracy.kr';
      adminRecord.role = 'admin';
      adminRecord.status = 'approved';
      adminRecord.isAdmin = true;
      map.set('admin', adminRecord);
    }

    // 6. 단일화 및 최고 관리자 중복 엄격 필터링
    let adminSeen = false;
    const finalUsers = [];
    for (const u of map.values()) {
      if (isSuperAdminRecord(u)) {
        if (adminSeen) continue;
        adminSeen = true;
        u.key = 'admin';
        u.username = 'admin';
        u.name = u.name || '최고 관리자';
        u.email = u.email || 'admin@ailiteracy.kr';
        u.role = 'admin';
        u.status = 'approved';
        u.isAdmin = true;
      }
      finalUsers.push(u);
    }

    finalUsers.sort((a, b) => {
      // 최고 관리자 계정은 항상 최상단에 고정
      const aAdmin = isSuperAdminRecord(a);
      const bAdmin = isSuperAdminRecord(b);
      if (aAdmin && !bAdmin) return -1;
      if (!aAdmin && bAdmin) return 1;
      const dateA = new Date(a.registeredAt || a.lastLoginAt || 0);
      const dateB = new Date(b.registeredAt || b.lastLoginAt || 0);
      return dateB - dateA;
    });

    // 로컬 스토리지 캐시 및 승인 목록을 최신 통합 상태로 동기화
    try {
      localStorage.setItem('ai_lit_registered_users', JSON.stringify(finalUsers));
      const cleanApprovals = this.getApprovals();
      finalUsers.forEach((u) => {
        if (isSuperAdminRecord(u)) return;
        const uKey = (u.email || u.username || u.key || '').trim().toLowerCase();
        if (uKey) {
          cleanApprovals[uKey] = {
            ...(cleanApprovals[uKey] || {}),
            name: u.name || '',
            email: u.email || '',
            username: u.username || uKey,
            role: u.role || 'student',
            allowedRole: u.allowedRole || u.role || 'student',
            status: u.status || 'pending',
            university: u.university || '',
            department: u.department || ''
          };
        }
      });
      if (cleanApprovals['admin@ailiteracy.kr']) {
        delete cleanApprovals['admin@ailiteracy.kr'];
      }
      localStorage.setItem('ai_lit_user_approvals', JSON.stringify(cleanApprovals));
    } catch (e) {}

    return finalUsers;
  },

  /**
   * 보호된 페이지 접근 제어 (비로그인, 미승인 및 대상자 불일치 시 엄격 차단 및 리다이렉트)
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

    // 2. 최고 관리자 계정은 모든 페이지 통과
    if (user.isAdmin || this.isAdmin()) {
      return true;
    }

    // 3. 관리자 승인 상태 재검증 (로그인 중 관리자가 차단/대기로 변경했을 경우 즉시 차단)
    const approval = this.getUserApproval(user.email || user.username);
    if (approval.status !== 'approved') {
      if (typeof document !== 'undefined' && document.body) {
        document.body.style.display = 'none';
      }
      const msg = approval.status === 'blocked'
        ? '⛔ [접속 차단]\n해당 계정은 관리자에 의해 접속이 차단되었습니다.'
        : '🔒 [접근 제한 안내]\n해당 계정은 현재 관리자의 승인을 기다리는 중입니다.\n\n관리자가 승인한 회원만 로그인 및 강의실 이용이 가능합니다.\n관리자에게 승인을 요청해 주세요.';
      alert(msg);
      this.logout();
      return false;
    }

    // 4. 회원의 소속 과정(role) 페이지만 접속 허용
    const userRole = approval.allowedRole || user.role || 'student';
    if (options.role && userRole !== options.role) {
      if (typeof document !== 'undefined' && document.body) {
        document.body.style.display = 'none';
      }
      if (userRole === 'student') {
        alert('⛔ [대상자 접근 제한]\n해당 계정은 [대학생 과정] 회원입니다.\n교직원 과정에는 접속할 수 없습니다.\n\n대학생 맞춤 강의실로 이동합니다.');
      } else if (userRole === 'staff') {
        alert('⛔ [대상자 접근 제한]\n해당 계정은 [교직원 과정] 회원입니다.\n대학생 과정에는 접속할 수 없습니다.\n\n교직원 맞춤 강의실로 이동합니다.');
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
   * 등록된 사용자 정보 조회 (로컬 스토리지 및 Cloud Firestore 연동, Firestore 최신 상태 우선)
   * @param {string} emailOrUsername 
   * @returns {Promise<Object|null>}
   */
  async fetchExistingUser(emailOrUsername) {
    if (!emailOrUsername) return null;
    const cleanKey = emailOrUsername.trim().toLowerCase();

    // 1. 로컬 등록 회원 목록에서 조회
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

    // 2. Cloud Firestore에서 단일 기존 사용자 문서 조회 (이메일/아이디 모두 매칭)
    if (this.isFirebaseReady()) {
      try {
        const remoteDoc = await this.findExistingFirestoreUserDoc(
          found && found.email ? found.email : cleanKey,
          found && found.username ? found.username : cleanKey
        );
        if (remoteDoc && remoteDoc.data) {
          const remoteData = remoteDoc.data;
          found = found
            ? { ...found, ...remoteData, firestoreDocId: remoteDoc.docId }
            : { ...remoteData, firestoreDocId: remoteDoc.docId };
          // Firestore 최신 승인 상태 및 역할을 로컬 캐시에도 동기화
          this.syncLocalApprovalCache(found);
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
    let matchedUser = null;
    try {
      const registered = this.getRegisteredUsers();
      const idx = registered.findIndex(
        (u) => (u.email && u.email.toLowerCase() === cleanKey) || (u.username && u.username.toLowerCase() === cleanKey)
      );
      if (idx !== -1) {
        registered[idx].role = newRole;
        registered[idx].updatedAt = new Date().toISOString();
        matchedUser = registered[idx];
        localStorage.setItem('ai_lit_registered_users', JSON.stringify(registered));
      }
    } catch (e) {
      console.warn('[Auth] 로컬 대상자 역할 갱신 오류:', e);
    }

    // 2. Cloud Firestore users 단일 문서 갱신
    if (this.isFirebaseReady()) {
      try {
        const found = await this.findExistingFirestoreUserDoc(
          matchedUser && matchedUser.email ? matchedUser.email : cleanKey,
          matchedUser && matchedUser.username ? matchedUser.username : cleanKey
        );
        const safeDocKey = found
          ? found.docId
          : this.getStandardUserDocId(
              cleanKey.includes('@') ? cleanKey : '',
              !cleanKey.includes('@') ? cleanKey : ''
            );
        if (safeDocKey) {
          await this.firebaseDb.collection('users').doc(safeDocKey).set({
            role: newRole,
            updatedAt: typeof firebase !== 'undefined' && firebase.firestore ? firebase.firestore.FieldValue.serverTimestamp() : new Date()
          }, { merge: true });
        }
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

    // 기존 등록 회원 및 Firestore에서 동일 이메일 사용자 조회 (Firestore 최신 상태 자동 동기화)
    const existing = await this.fetchExistingUser(payload.email);

    // 사용자가 로그인 모달 창에서 선택한 대상자 역할 ('student' | 'staff') 최우선 적용
    const attemptedRole = (role === 'staff' || role === 'student')
      ? role
      : ((existing && existing.role) ? existing.role : 'student');

    // 관리자 승인 상태 검증 (Firestore 최신 상태 최우선 반영)
    const localApproval = this.getUserApproval(payload.email);
    const effectiveStatus = (existing && existing.status) ? existing.status : localApproval.status;

    if (effectiveStatus !== 'approved') {
      await this.recordPendingUser({
        name: (existing && existing.name) ? existing.name : (payload.name || payload.email.split('@')[0]),
        email: payload.email,
        username: (existing && existing.username) ? existing.username : payload.email.split('@')[0],
        picture: payload.picture || '',
        googleId: payload.sub || '',
        role: attemptedRole,
        allowedRole: attemptedRole,
        status: effectiveStatus === 'blocked' ? 'blocked' : 'pending',
        university: existing ? (existing.university || '') : '',
        department: existing ? (existing.department || '') : '',
        loginMethod: 'google',
        provider: 'google',
        firestoreDocId: existing ? (existing.firestoreDocId || null) : null
      });

      const roleKo = attemptedRole === 'staff' ? '교직원' : '대학생';
      const msg = effectiveStatus === 'blocked'
        ? '⛔ [접속 차단]\n해당 Google 계정은 관리자에 의해 접속이 차단되었습니다.\n관리자에게 문의해 주세요.'
        : `🔒 [로그인 승인 대기 안내]\n회원 정보(${roleKo} 과정)가 데이터베이스에 등록되었으며 현재 관리자의 승인을 기다리는 중입니다.\n\n관리자가 승인한 후 다시 입장하시면 맞춤 강의실을 이용하실 수 있습니다.`;
      alert(msg);
      return;
    }

    // 로그인 모달 창에서 선택한 대상자(attemptedRole)를 role 및 allowedRole로 반영 및 DB 저장
    const userRole = attemptedRole;

    const user = {
      name: (existing && existing.name) ? existing.name : (payload.name || payload.email.split('@')[0]),
      username: (existing && existing.username) ? existing.username : payload.email.split('@')[0],
      email: payload.email,
      picture: payload.picture || '',
      role: userRole,
      allowedRole: userRole,
      status: 'approved',
      university: existing ? (existing.university || '') : '',
      department: existing ? (existing.department || '') : '',
      gradeOrPosition: existing ? (existing.gradeOrPosition || '') : '',
      googleId: payload.sub,
      loginCount: ((existing && existing.loginCount) || 0) + 1,
      firestoreDocId: existing ? (existing.firestoreDocId || null) : null,
      loginAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      loginMethod: 'google',
      provider: 'google'
    };

    // 로컬 승인 캐시 및 세션 스토리지 동기화
    this.syncLocalApprovalCache(user);
    this.setUser(user);

    // Firebase Auth 구글 자격 증명 동기화 및 입장 이력 저장 대기
    if (this.isFirebaseReady() && this.firebaseAuth && response.credential) {
      try {
        const credential = firebase.auth.GoogleAuthProvider.credential(response.credential);
        await this.firebaseAuth.signInWithCredential(credential).catch(() => {});
      } catch (e) {}
    }

    // Cloud Firestore users 문서(선택한 역할 포함) 및 입장 이력 기록 완료 대기 후 페이지 이동
    await this.recordLoginHistory(user, 'google');

    if (typeof onSuccess === 'function') {
      onSuccess(user);
    } else {
      window.location.href = 'dashboard.html';
    }
  },

  /**
   * 로그인/입장 이력 기록 및 Cloud Firestore users 데이터베이스 회원 정보 영구 동기화
   */
  async recordLoginHistory(user, method = 'unknown') {
    try {
      const nowIso = new Date().toISOString();
      const history = JSON.parse(localStorage.getItem('ai_lit_login_history') || '[]');
      const logEntry = {
        id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        timestamp: nowIso,
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

      // Firebase Cloud Firestore 연결되어 있을 경우 login_history 및 users 컬렉션에 영구 저장
      if (this.isFirebaseReady()) {
        try {
          const historyPromise = this.firebaseDb.collection('login_history').add({
            ...logEntry,
            createdAt: typeof firebase !== 'undefined' && firebase.firestore ? firebase.firestore.FieldValue.serverTimestamp() : new Date()
          }).then((docRef) => {
            console.log('[Auth] Firestore login_history 저장 성공:', docRef.id);
          }).catch((err) => {
            console.error('[Auth] Firestore login_history 저장 실패 (규칙 확인 필요):', err);
          });

          const userUpsertPromise = this.upsertUserToFirestore({
            ...user,
            role: user.role || 'student',
            allowedRole: user.allowedRole || user.role || 'student',
            loginMethod: method || user.loginMethod || 'credentials',
            lastLoginAt: nowIso
          }, { preserveExistingStatus: true, updateRole: true }).then((res) => {
            if (res && res.saved && res.docId) {
              user.firestoreDocId = res.docId;
              if (this.user && ((user.email && this.user.email === user.email) || (user.username && this.user.username === user.username))) {
                this.user.firestoreDocId = res.docId;
                this.setUser(this.user);
              }
              console.log('[Auth] Firestore users 문서 갱신 성공:', res.docId);
            }
          });

          // Firestore 네트워크 통신 완료 대기 (최대 2초 안전 타임아웃)
          await Promise.race([
            Promise.allSettled([historyPromise, userUpsertPromise]),
            new Promise((resolve) => setTimeout(resolve, 2000))
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
      const list = data ? JSON.parse(data) : [];
      if (!Array.isArray(list)) return [];
      let adminSeen = false;
      const cleanList = [];
      for (const u of list) {
        if (!u) continue;
        const isAdmin = Boolean(
          u.isAdmin ||
          u.role === 'admin' ||
          (u.username && u.username.toLowerCase() === 'admin') ||
          (u.email && u.email.toLowerCase() === 'admin@ailiteracy.kr') ||
          u.key === 'admin'
        );
        if (isAdmin) {
          if (adminSeen) continue;
          adminSeen = true;
          cleanList.push({
            ...u,
            key: 'admin',
            username: 'admin',
            name: u.name || '최고 관리자',
            email: u.email || 'admin@ailiteracy.kr',
            role: 'admin',
            isAdmin: true,
            status: 'approved'
          });
        } else {
          cleanList.push(u);
        }
      }
      return cleanList;
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

    // 로컬 아이디 및 이메일 중복 체크
    if (users.some((u) => u.username && u.username.toLowerCase() === cleanUsername)) {
      return { success: false, message: '이미 사용 중인 아이디입니다. 다른 아이디를 입력해 주세요.' };
    }
    if (users.some((u) => u.email && u.email.toLowerCase() === cleanEmail)) {
      return { success: false, message: '이미 가입된 이메일 주소입니다. 로그인해 주세요.' };
    }

    // Cloud Firestore 중복 가입 체크
    if (this.isFirebaseReady()) {
      try {
        const dupByUser = await this.findExistingFirestoreUserDoc(cleanUsername);
        if (dupByUser && dupByUser.data && String(dupByUser.data.username || '').trim().toLowerCase() === cleanUsername && dupByUser.data.password) {
          return { success: false, message: '이미 데이터베이스에 등록된 아이디입니다. 다른 아이디를 입력해 주세요.' };
        }
        const dupByEmail = await this.findExistingFirestoreUserDoc(cleanEmail);
        if (dupByEmail && dupByEmail.data && String(dupByEmail.data.email || '').trim().toLowerCase() === cleanEmail && dupByEmail.data.password) {
          return { success: false, message: '이미 가입된 이메일 주소입니다. 로그인해 주세요.' };
        }
      } catch (e) {}
    }

    const nowIso = new Date().toISOString();
    const newUser = {
      username: username.trim(),
      name: name.trim(),
      email: email.trim(),
      password: password,
      role: role,
      allowedRole: role,
      status: 'pending', // 관리자 승인 대기 기본값 (Requirement 1)
      university: university.trim(),
      department: department.trim(),
      registeredAt: nowIso,
      lastLoginAt: null,
      loginCount: 0,
      loginMethod: 'credentials',
      provider: 'password'
    };

    users.push(newUser);
    localStorage.setItem('ai_lit_registered_users', JSON.stringify(users));

    // 로컬 승인 대기자 목록 동기화
    const approvals = this.getApprovals();
    approvals[cleanEmail] = {
      name: newUser.name,
      email: newUser.email,
      username: newUser.username,
      role: newUser.role,
      allowedRole: newUser.allowedRole,
      status: 'pending',
      university: newUser.university,
      department: newUser.department,
      registeredAt: nowIso
    };
    localStorage.setItem('ai_lit_user_approvals', JSON.stringify(approvals));

    // Firebase Cloud Firestore 단일 표준 문서 저장 (비밀번호 포함하여 타 기기 로그인 지원)
    let firestoreSaved = false;
    if (this.isFirebaseReady()) {
      const upsertRes = await this.upsertUserToFirestore(newUser, { preserveExistingStatus: true });
      firestoreSaved = Boolean(upsertRes && upsertRes.saved);

      if (firestoreSaved && upsertRes.docId) {
        newUser.firestoreDocId = upsertRes.docId;
        console.log('[Auth] Cloud Firestore users 컬렉션 단일 문서 등록 완료:', upsertRes.docId);
      }

      // Firebase Auth 이메일/비밀번호 계정 생성 시도 (활성화된 경우)
      if (this.firebaseAuth && newUser.email && newUser.password) {
        try {
          await this.firebaseAuth.createUserWithEmailAndPassword(newUser.email, newUser.password);
          console.log('[Auth] Firebase Auth 계정 생성 성공:', newUser.email);
        } catch (authErr) {
          console.warn('[Auth] Firebase Auth 계정 생성 안내 (Firestore 등록은 정상 유지됨):', authErr.code, authErr.message);
        }
      }
    } else {
      console.warn('[Auth] Firebase가 아직 준비되지 않아 로컬 저장소에 우선 등록되었습니다.');
    }

    // 신규 가입자는 관리자가 승인한 후 로그인할 수 있도록 안내 (Requirement 1)
    return { 
      success: true, 
      requiresApproval: true,
      message: '회원가입이 완료되었습니다. 관리자가 승인한 후 로그인하여 맞춤 강의실을 이용하실 수 있습니다.',
      user: newUser,
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

    // 1. 최고 관리자(Admin) 직통 로그인 체크 (파이어베이스 users 컬렉션 실시간 인증)
    const adminId = (localStorage.getItem('ai_lit_admin_id') || this.ADMIN_DEFAULT_ID).toLowerCase();
    if (key === adminId || key === 'admin' || key === 'admin@ailiteracy.kr') {
      const adminRes = await this.loginAdmin(usernameOrEmail, password);
      if (adminRes.success) {
        return adminRes;
      }
      return adminRes;
    }

    // 로컬 및 Cloud Firestore 통합 사용자 조회 (Firestore 최신 승인 상태 자동 병합)
    const users = this.getRegisteredUsers();
    let matched = users.find(
      (u) => ((u.username && u.username.toLowerCase() === key) || (u.email && u.email.toLowerCase() === key)) && String(u.password) === String(password)
    );

    const existingProfile = await this.fetchExistingUser(key);
    if (existingProfile) {
      if (!matched && existingProfile.password !== undefined && String(existingProfile.password) === String(password)) {
        matched = existingProfile;
      } else if (matched) {
        // Firestore에 비밀번호가 변경된 경우 대조
        if (existingProfile.password !== undefined && String(existingProfile.password) !== String(password)) {
          return {
            success: false,
            message: '아이디(이메일) 또는 비밀번호가 일치하지 않습니다.'
          };
        }
        matched = {
          ...matched,
          ...existingProfile,
          name: existingProfile.name || matched.name,
          university: existingProfile.university || matched.university || '',
          department: existingProfile.department || matched.department || '',
          gradeOrPosition: existingProfile.gradeOrPosition || matched.gradeOrPosition || ''
        };
      }
    }

    if (!matched) {
      return {
        success: false,
        message: '아이디(이메일) 또는 비밀번호가 일치하지 않습니다. 회원가입 여부를 확인해 주세요.'
      };
    }

    // 2. 관리자 승인 상태 검증 및 로그인 모달 선택 역할(selectedRole) 반영
    const userIdentifier = matched.email || matched.username;
    const localApproval = this.getUserApproval(userIdentifier);
    const effectiveStatus = (existingProfile && existingProfile.status)
      ? existingProfile.status
      : (matched.status || localApproval.status || 'pending');

    // 로그인 모달 창에서 선택한 대상자('student' | 'staff') 최우선 적용
    const chosenRole = (selectedRole === 'staff' || selectedRole === 'student')
      ? selectedRole
      : (matched.role || (existingProfile && existingProfile.role) || localApproval.allowedRole || 'student');

    // 승인 대기 또는 차단 상태에서 로그인 시도하더라도 모달에서 선택한 역할과 회원 정보가 users DB에 저장되도록 보장
    if (effectiveStatus !== 'approved') {
      const pendingUpdated = {
        ...matched,
        role: chosenRole,
        allowedRole: chosenRole,
        status: effectiveStatus === 'blocked' ? 'blocked' : 'pending',
        loginMethod: 'credentials',
        provider: 'password',
        lastLoginAttemptAt: new Date().toISOString()
      };
      this.syncLocalApprovalCache(pendingUpdated);
      await this.upsertUserToFirestore(pendingUpdated, { preserveExistingStatus: true, updateRole: true });

      const roleKo = chosenRole === 'staff' ? '교직원' : '대학생';
      const statusText = effectiveStatus === 'blocked'
        ? '해당 계정은 관리자에 의해 접속이 차단되었습니다.\n관리자에게 문의해 주세요.'
        : `선택하신 [${roleKo} 과정]으로 회원 정보가 반영되었으며, 현재 관리자의 승인을 기다리는 중입니다.\n\n관리자가 승인한 회원만 로그인 및 강의실 이용이 가능합니다.`;
      return {
        success: false,
        status: effectiveStatus,
        isPending: effectiveStatus !== 'blocked',
        message: `🔒 [로그인 제한 안내]\n${statusText}`
      };
    }

    // 3. 로그인 모달에서 선택한 역할(chosenRole) 확정 적용
    const finalRole = chosenRole;

    // 최종 로그인 시간 및 횟수 갱신
    const nowIso = new Date().toISOString();
    const nextLoginCount = ((matched.loginCount) || 0) + 1;

    const sessionUser = {
      name: matched.name,
      username: matched.username,
      email: matched.email,
      password: matched.password,
      role: finalRole,
      allowedRole: finalRole,
      status: 'approved',
      university: matched.university || '',
      department: matched.department || '',
      gradeOrPosition: matched.gradeOrPosition || '',
      loginCount: nextLoginCount,
      firestoreDocId: matched.firestoreDocId || null,
      loginAt: nowIso,
      lastLoginAt: nowIso,
      loginMethod: 'credentials',
      provider: 'password'
    };

    // 로컬 승인 캐시 동기화 (requireAuth 통과 및 역할 일치 보장)
    this.syncLocalApprovalCache(sessionUser);

    // 세션에는 비밀번호 제외한 안전한 사용자 정보 저장
    const safeSessionUser = { ...sessionUser };
    delete safeSessionUser.password;
    this.setUser(safeSessionUser);

    // Cloud Firestore users DB 회원 정보(선택한 역할 포함) 및 입장 이력 영구 기록
    await this.recordLoginHistory(sessionUser, 'credentials');

    return { success: true, user: safeSessionUser };
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

        // 로그인 모달 창에서 선택한 대상자 역할('student' | 'staff') 최우선 적용
        const attemptedRole = (role === 'staff' || role === 'student')
          ? role
          : ((existing && existing.role) ? existing.role : 'student');

        // 관리자 승인 상태 검증 (Firestore 최신 상태 최우선 반영)
        const localApproval = this.getUserApproval(fbUser.email);
        const effectiveStatus = (existing && existing.status) ? existing.status : localApproval.status;

        if (effectiveStatus !== 'approved') {
          await this.recordPendingUser({
            name: (existing && existing.name) ? existing.name : (fbUser.displayName || fbUser.email.split('@')[0]),
            email: fbUser.email,
            username: (existing && existing.username) ? existing.username : fbUser.email.split('@')[0],
            picture: fbUser.photoURL || '',
            googleId: fbUser.uid || '',
            role: attemptedRole,
            allowedRole: attemptedRole,
            status: effectiveStatus === 'blocked' ? 'blocked' : 'pending',
            university: existing ? (existing.university || '') : '',
            department: existing ? (existing.department || '') : '',
            loginMethod: 'google',
            provider: 'google',
            firestoreDocId: existing ? (existing.firestoreDocId || null) : null
          });

          const roleKo = attemptedRole === 'staff' ? '교직원' : '대학생';
          const msg = effectiveStatus === 'blocked'
            ? '⛔ [접속 차단]\n해당 Google 계정은 관리자에 의해 접속이 차단되었습니다.\n관리자에게 문의해 주세요.'
            : `🔒 [로그인 승인 대기 안내]\n회원 정보(${roleKo} 과정)가 데이터베이스에 등록되었으며 현재 관리자의 승인을 기다리는 중입니다.\n\n관리자가 승인한 후 다시 입장하시면 맞춤 강의실을 이용하실 수 있습니다.`;
          alert(msg);
          return;
        }

        const userRole = attemptedRole;
        const nowIso = new Date().toISOString();
        const user = {
          name: (existing && existing.name) ? existing.name : (fbUser.displayName || fbUser.email.split('@')[0]),
          username: (existing && existing.username) ? existing.username : fbUser.email.split('@')[0],
          email: fbUser.email,
          picture: fbUser.photoURL || '',
          role: userRole,
          allowedRole: userRole,
          status: 'approved',
          university: existing ? (existing.university || '') : '',
          department: existing ? (existing.department || '') : '',
          gradeOrPosition: existing ? (existing.gradeOrPosition || '') : '',
          googleId: fbUser.uid,
          loginCount: ((existing && existing.loginCount) || 0) + 1,
          firestoreDocId: existing ? (existing.firestoreDocId || null) : null,
          loginAt: nowIso,
          lastLoginAt: nowIso,
          loginMethod: 'google',
          provider: 'google'
        };

        // 로컬 승인 캐시 및 세션 스토리지 동기화
        this.syncLocalApprovalCache(user);
        this.setUser(user);

        await this.recordLoginHistory(user, 'google');
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
      alert('🔒 [Google 로그인 안내]\n\nGoogle 로그인을 이용하시려면 관리자 콘솔 또는 환경 설정에서 Google Client ID 설정이 필요합니다.\n현재는 [아이디 / 비밀번호] 로그인 및 [회원가입]을 통해 정식으로 이용하실 수 있습니다.');
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

    // 2-1. 승인 목록(ai_lit_user_approvals)에서도 프로필 정보 즉시 동기화
    try {
      const approvals = this.getApprovals();
      const matchKeys = [userEmail, userUsername].filter(Boolean);
      matchKeys.forEach(k => {
        if (approvals[k]) {
          approvals[k] = {
            ...approvals[k],
            name: this.user.name || approvals[k].name || '',
            university: this.user.university || approvals[k].university || '',
            department: this.user.department || approvals[k].department || '',
            gradeOrPosition: this.user.gradeOrPosition || approvals[k].gradeOrPosition || '',
            updatedAt: new Date().toISOString()
          };
        }
      });
      localStorage.setItem('ai_lit_user_approvals', JSON.stringify(approvals));
    } catch (e) {
      console.warn('[Auth] 승인 목록 프로필 동기화 실패:', e);
    }

    // 3. Firebase Cloud Firestore 실시간 동기화 (기존 회원 레코드에만 필드 업데이트)
    if (this.isFirebaseReady()) {
      try {
        const updatePayload = {
          ...data,
          name: this.user.name || '',
          email: this.user.email || '',
          username: this.user.username || '',
          role: this.user.role || 'student',
          university: this.user.university || '',
          department: this.user.department || '',
          gradeOrPosition: this.user.gradeOrPosition || '',
          updatedAt: typeof firebase !== 'undefined' && firebase.firestore ? firebase.firestore.FieldValue.serverTimestamp() : new Date().toISOString()
        };

        // 1. 기존 문서 ID 결정 (중복 레코드 생성을 방지하고 기존 회원 레코드 딱 1개만 타겟팅)
        let targetDocId = this.user.firestoreDocId || null;

        // 세션에 docId가 없으면 Firestore에서 기존 문서 1개 검색
        if (!targetDocId) {
          try {
            const snap = await this.firebaseDb.collection('users').get();
            for (const doc of snap.docs) {
              const d = doc.data() || {};
              const dEmail = (d.email || '').trim().toLowerCase();
              const dUser = (d.username || '').trim().toLowerCase();
              if ((userEmail && dEmail === userEmail) || (userUsername && dUser === userUsername)) {
                targetDocId = doc.id;
                break;
              }
            }
          } catch (scanErr) {
            console.warn('[Auth] Firestore 기존 사용자 문서 검색 경고:', scanErr);
          }
        }

        // 기존 문서가 전혀 없는 경우에만 단일 표준 키(이메일 기반)로 1개 결정
        if (!targetDocId) {
          targetDocId = userEmail ? userEmail.replace(/[\/\.]/g, '_') : (userUsername ? 'user_' + userUsername : 'user');
        }

        // 2. 오직 기존 회원 문서 딱 1개에만 필드 병합 업데이트
        await this.firebaseDb.collection('users').doc(targetDocId).set(updatePayload, { merge: true });
        this.user.firestoreDocId = targetDocId;
        this.setUser(this.user);
        console.log('[Auth] Firestore 기존 회원 레코드 필드 업데이트 완료:', targetDocId);
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
      if (this.user.isAdmin || this.isAdmin()) {
        navMenu.innerHTML = `
          <div class="user-badge" style="display: flex; align-items: center; gap: 6px; flex-wrap: nowrap;">
            <span style="background: var(--color-ember); color: #fff; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 999px; white-space: nowrap;">
              🛡️ 최고 관리자
            </span>
            <a href="admin.html" class="btn btn-primary btn-sm" style="font-weight: 800; font-size: 12px; white-space: nowrap;">
              관리자 콘솔 ↗
            </a>
            <a href="dashboard.html?role=student" class="btn btn-secondary btn-sm" style="white-space: nowrap; font-weight: 700; font-size: 12px;" title="대학생 강의실 바로가기">
              🎓 대학생 강의실
            </a>
            <a href="dashboard.html?role=staff" class="btn btn-secondary btn-sm" style="white-space: nowrap; font-weight: 700; font-size: 12px;" title="교직원 강의실 바로가기">
              🏛️ 교직원 강의실
            </a>
            <button id="logout-btn" type="button" class="btn btn-secondary btn-sm" style="white-space: nowrap; font-size: 12px;">로그아웃</button>
          </div>
        `;
        document.getElementById('logout-btn')?.addEventListener('click', () => {
          this.logoutAdmin();
          this.logout();
        });
        return;
      }

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
        <div style="display: flex; align-items: center; gap: 8px;">
          <a href="admin.html" class="btn btn-secondary btn-sm" style="font-size: 12px; padding: 5px 12px; font-weight: 700; color: var(--color-obsidian);" title="관리자 모드 접속">
            🛡️ 관리자
          </a>
          <span class="nav-tag">GUEST</span>
        </div>
      `;
    }
  }
};

window.Auth = Auth;
window.escapeHtml = Auth.escapeHtml.bind(Auth);


