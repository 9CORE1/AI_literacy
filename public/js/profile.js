/**
 * @file profile.js
 * @description 마이페이지 - 내 정보 확인 및 추가 정보(학과, 학년 등) 수정
 */

const ProfileApp = {
  init() {
    const user = Auth.getCurrentUser();
    if (!user) {
      alert('로그인이 필요합니다.');
      window.location.href = '/index.html';
      return;
    }

    this.renderForm(user);
    this.bindEvents();
  },

  renderForm(user) {
    document.getElementById('prof-email').value = user.email || '';
    document.getElementById('prof-name').value = user.name || '';
    document.getElementById('prof-role').value = user.role === 'staff' ? '교직원' : (user.role === 'student' ? '대학생' : '미지정');
    document.getElementById('prof-dept').value = user.department || '';
    document.getElementById('prof-grade').value = user.gradeOrPosition || '';

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
      const name = document.getElementById('prof-name').value.trim();
      const department = document.getElementById('prof-dept').value.trim();
      const gradeOrPosition = document.getElementById('prof-grade').value.trim();

      const success = await Auth.updateProfile({ name, department, gradeOrPosition });
      if (success) {
        alert('회원 정보가 성공적으로 업데이트되었습니다.');
        window.location.href = '/dashboard.html';
      } else {
        alert('정보 업데이트에 실패했습니다.');
      }
    });
  }
};

window.ProfileApp = ProfileApp;
