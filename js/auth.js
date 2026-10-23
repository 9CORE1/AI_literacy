/**
 * @file auth.js
 * @description Google OAuth 및 사용자 역할(학생/교직원) 필수 선택 & 세션 관리 모듈
 */

const Auth = {
  user: null,

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
   * 프로필 추가 정보 업데이트 (역할 필수 선택 등)
   */
  async updateProfile(updates) {
    if (!this.user) return false;
    const merged = { ...this.user, ...updates };

    try {
      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(merged)
      });
      const data = await res.json();
      if (data.success) {
        this.setUser(data.user);
        return true;
      }
    } catch (e) {
      console.warn('서버 프로필 동기화 실패, 로컬에 저장합니다:', e);
      this.setUser(merged);
      return true;
    }
    return false;
  },

  /**
   * Google 시뮬레이션 로그인 (Google Client ID 미등록 시 또는 간편 테스트용)
   * 로그인 직후 role이 없는 상태로 생성되어 필수 역할 선택 모달로 유도됨
   */
  async mockGoogleLogin(customEmail = 'user@university.ac.kr', customName = '김대학') {
    const mockUser = {
      email: customEmail,
      name: customName,
      picture: '',
      role: null, // 최초 로그인 시 role 미선택 상태
      department: '',
      gradeOrPosition: ''
    };

    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mockUser })
      });
      const data = await res.json();
      if (data.success) {
        this.setUser(data.user);
        return data.user;
      }
    } catch (e) {
      this.setUser(mockUser);
      return mockUser;
    }
  },

  /**
   * 구글 로그인 응답 핸들러
   */
  async handleGoogleCredential(credential) {
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential })
      });
      const data = await res.json();
      if (data.success) {
        this.setUser(data.user);
        if (!data.user.role) {
          // 역할 미선택 시 역할 선택 모달 오픈
          if (typeof window.showRoleModal === 'function') {
            window.showRoleModal();
          } else {
            window.location.href = '/index.html?selectRole=true';
          }
        } else {
          // 이미 역할이 설정되어 있으면 해당 대상자별 교육 대시보드로 이동
          window.location.href = '/dashboard.html';
        }
      } else {
        alert('로그인에 실패했습니다: ' + (data.message || '인증 오류'));
      }
    } catch (e) {
      alert('로그인 처리 중 네트워크 오류가 발생했습니다.');
    }
  },

  /**
   * 로그아웃
   */
  logout() {
    this.user = null;
    localStorage.removeItem('ai_lit_user');
    window.location.href = '/index.html';
  },

  /**
   * 상단 네비게이션 사용자 정보 렌더링
   */
  renderNavUser() {
    const navMenu = document.getElementById('nav-user-menu');
    if (!navMenu) return;

    if (this.isLoggedIn()) {
      const roleText = this.user.role === 'staff' ? '교직원' : (this.user.role === 'student' ? '대학생' : '구분 미선택');
      
      navMenu.innerHTML = `
        <div class="user-badge">
          <span class="role-badge">${roleText}</span>
          <span style="font-weight:600;">${this.user.name || '사용자'} 님</span>
        </div>
        ${this.user.role ? '<a href="/dashboard.html" class="btn btn-secondary btn-sm">강의실 입장</a>' : ''}
        <button id="logout-btn" class="btn btn-secondary btn-sm">로그아웃</button>
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
