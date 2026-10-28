/**
 * @file profile.js
 * @description 마이페이지 - 내 정보 확인 및 추가 정보(학과, 학년 등) 수정
 */

const ProfileApp = {
  init() {
    const user = Auth.getCurrentUser();
    if (!user) {
      alert('로그인이 필요합니다.');
      window.location.href = 'index.html';
      return;
    }

    this.renderForm(user);
    this.bindEvents();
  },

  renderForm(user) {
    document.getElementById('prof-email').value = user.email || '';
    document.getElementById('prof-name').value = user.name || '';
    document.getElementById('prof-role').value = user.role === 'staff' ? '교직원' : (user.role === 'student' ? '대학생' : '미지정');
    const univInput = document.getElementById('prof-university');
    if (univInput) univInput.value = user.university || '';
    document.getElementById('prof-dept').value = user.department || '';
    document.getElementById('prof-grade').value = user.gradeOrPosition || '';

    // 상단 요약 배너 요소 바인딩
    const headerName = document.getElementById('prof-header-name');
    if (headerName) headerName.textContent = user.name || '사용자';
    const headerEmail = document.getElementById('prof-header-email');
    if (headerEmail) headerEmail.textContent = user.email || '';
    const badgeRole = document.getElementById('prof-badge-role');
    if (badgeRole) {
      badgeRole.textContent = user.role === 'staff' ? '🏛️ 교직원' : (user.role === 'student' ? '🎓 대학생' : '회원');
    }
    const avatarText = document.getElementById('prof-avatar-text');
    if (avatarText && user.name) {
      avatarText.textContent = user.name.trim().charAt(0).toUpperCase();
    }

    // 역할에 따른 라벨 변경
    const deptLabel = document.getElementById('label-dept');
    const gradeLabel = document.getElementById('label-grade');
    if (user.role === 'staff') {
      if (deptLabel) deptLabel.textContent = '소속 부서';
      if (gradeLabel) gradeLabel.textContent = '직급 / 담당업무';
    } else {
      if (deptLabel) deptLabel.textContent = '학과 / 전공';
      if (gradeLabel) gradeLabel.textContent = '학년 (예: 2학년)';
    }
  },

  bindEvents() {
    document.getElementById('profile-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = e.target.querySelector('button[type="submit"]');
      const originalText = submitBtn ? submitBtn.innerHTML : '저장하기';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>⏳ 저장 중...</span>';
      }

      const name = document.getElementById('prof-name').value.trim();
      const university = document.getElementById('prof-university')?.value.trim() || '';
      const department = document.getElementById('prof-dept').value.trim();
      const gradeOrPosition = document.getElementById('prof-grade').value.trim();

      try {
        const success = await Auth.updateProfile({ name, university, department, gradeOrPosition });
        if (success) {
          alert('회원 정보가 성공적으로 업데이트되었습니다.');
          window.location.href = 'dashboard.html';
        } else {
          alert('정보 업데이트에 실패했습니다.');
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
          }
        }
      } catch (err) {
        console.error('프로필 저장 중 오류:', err);
        alert('저장 중 오류가 발생했습니다: ' + (err.message || '네트워크 상태를 확인해 주세요.'));
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalText;
        }
      }
    });
  }
};

window.ProfileApp = ProfileApp;
