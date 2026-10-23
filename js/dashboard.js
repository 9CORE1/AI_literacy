/**
 * @file dashboard.js
 * @description Caldera Design System 적용 학생/교직원 맞춤형 교육 대시보드
 */

const DashboardApp = {
  init() {
    const user = Auth.getCurrentUser();
    if (!user) {
      alert('로그인이 필요한 서비스입니다.');
      window.location.href = 'index.html';
      return;
    }

    if (!user.role) {
      alert('대학생 또는 교직원 구분을 먼저 선택해 주셔야 합니다.');
      window.location.href = 'index.html?selectRole=true';
      return;
    }

    // 네비게이션 태그 업데이트
    const navTag = document.getElementById('nav-mode-tag');
    if (navTag) {
      navTag.textContent = user.role === 'student' ? 'STUDENT LAB' : 'STAFF LAB';
    }

    this.renderDashboard(user);
    this.bindCopyEvents();
  },

  renderDashboard(user) {
    const container = document.getElementById('dashboard-content');
    if (!container) return;

    if (user.role === 'student') {
      container.innerHTML = this.getStudentDashboardHtml(user);
    } else {
      container.innerHTML = this.getStaffDashboardHtml(user);
    }
  },

  getStudentDashboardHtml(user) {
    const esc = window.escapeHtml || ((s) => s);
    const displayName = esc(user.name || '대학생');
    const affiliation = esc([user.university, user.department].filter(Boolean).join(' · ') || '소속 미설정 (내 정보에서 입력 가능)');
    const loginTime = user.loginAt ? new Date(user.loginAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '방금';
    const loginMethodTag = user.loginMethod === 'google' ? 'Google 간편입장' : (user.loginMethod === 'register' ? '신규가입 입장' : '아이디 로그인');

    return `
      <!-- 학생 전용 AI 리터러시 진단 CTA 배너 (Ember / Caldera Style) -->
      <div class="card card-ember dashboard-header-card" style="margin-bottom: var(--spacing-32); margin-top: var(--spacing-16);">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--spacing-20);">
          <div style="max-width: 680px;">
            <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 8px;">
              <span style="background: var(--color-sulfur); color: var(--color-obsidian); padding: 4px 14px; border-radius: var(--radius-pills); font-size: 12px; font-weight: 700; text-transform: uppercase;">
                🎓 대학생 강의실 · ${displayName} 님
              </span>
              <span style="background: rgba(255, 255, 255, 0.2); color: #fff; padding: 4px 12px; border-radius: var(--radius-pills); font-size: 12px;">
                🏫 ${affiliation}
              </span>
              <span style="background: rgba(255, 255, 255, 0.15); color: #fff; padding: 4px 12px; border-radius: var(--radius-pills); font-size: 12px;">
                🕒 최근 입장: ${loginTime} (${loginMethodTag})
              </span>
            </div>
            <h2 style="font-size: clamp(28px, 4vw, 42px); margin: 0.75rem 0 0.5rem 0; color: var(--color-chalk);">
              나의 AI 리터러시 역량 진단 평가
            </h2>
            <p style="opacity: 0.95; font-size: 1rem; color: #fff3ee; line-height: 1.6;">
              30문항(약 7분 소요) 진단을 통해 나의 5대 AI 리터러시 강점과 취약점 분석 방사형 차트, 맞춤 피드백 및 PDF 공식 레포트를 발급받으세요.
            </p>
          </div>
          <div>
            <a href="diagnosis.html" class="btn btn-secondary" style="background: var(--color-chalk); border-color: var(--color-chalk); color: var(--color-obsidian); font-weight: 700; font-size: 17px; padding: 16px 32px;">
              지금 역량 진단 시작하기 →
            </a>
          </div>
        </div>
      </div>

      <!-- 학생 120분 강의 모듈 헤더 -->
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: var(--spacing-20); flex-wrap: wrap; gap: 12px;">
        <div>
          <span style="font-family: var(--font-display); font-size: 16px; color: var(--color-ember); letter-spacing: 0.05em;">CURRICULUM FOR UNIVERSITY STUDENTS</span>
          <h2 style="font-size: 32px; color: var(--color-obsidian);">🎓 대학생 120분 AI 리터러시 마스터 코스</h2>
        </div>
        <a href="diagnosis.html" class="btn btn-secondary btn-sm">진단 평가 바로가기</a>
      </div>

      <!-- 모듈 그리드 (대상자별 4대 핵심 교육 & 실습 모듈) -->
      <div class="dashboard-grid">
        <!-- 모듈 1 -->
        <div class="card module-card">
          <h3><span>01</span> 대학생의 AI 리터러시 진단</h3>
          <p style="color: #444; font-size: 14px; margin-bottom: 1rem; line-height: 1.6;">
            대학생 전용 30문항 표준 척도를 통해 나의 5대 리터러시 역량을 정밀 진단하고 개별 레포트를 발급받습니다.
          </p>
          <ul style="padding-left: 1.2rem; font-size: 13px; color: #555; line-height: 1.7; margin-bottom: 1.25rem;">
            <li>30문항 종합 진단 및 개인별 오각형 레이더 프로파일 분석</li>
            <li>A4 규격 2페이지 고화질 PDF / JPG 공인 레포트 즉시 다운로드</li>
          </ul>
          <a href="diagnosis.html" class="btn btn-primary btn-sm">진단 시작하기</a>
        </div>

        <!-- 모듈 2 -->
        <div class="card module-card">
          <h3><span>02</span> 프롬프트 공식 4+2</h3>
          <p style="color: #444; font-size: 14px; margin-bottom: 1rem; line-height: 1.6;">
            [역할·배경·지시·형식]의 4대 뼈대와 [조건·샘플]의 2대 보강재를 결합하여 과제 리서치 답변의 정확도를 극대화합니다.
          </p>
          <div class="copy-box">
<button class="copy-btn" data-clipboard="[역할] 당신은 대학 글쓰기센터 튜터입니다.
[배경] 저는 3학년이고 마케팅 수업의 10분 발표 주제를 정해야 합니다.
[지시] 발표 주제 5개를 제안하고 장단점을 설명해 주세요.
[형식] 표(주제, 장점, 단점, 자료 구하기 난이도)로 작성해 주세요.
[조건·제약사항] 근거 자료의 출처를 명시하고, 확실하지 않으면 '확인 필요'로 표시하세요.
[샘플] 첫 행 예시: 숏폼 광고 효과 | 최신성 높음 | 자료 편향 | 보통">복사하기</button>[역할] 당신은 대학 글쓰기센터 튜터입니다.
[배경] 저는 3학년이고 마케팅 수업의 10분 발표 주제를 정해야 합니다.
[지시] 발표 주제 5개를 제안하고 장단점을 설명해 주세요.
[형식] 표(주제, 장점, 단점, 자료 구하기 난이도)로 작성해 주세요.
[조건·제약사항] 근거 자료의 출처를 명시하고, 확실하지 않으면 '확인 필요'로 표시하세요.
[샘플] 첫 행 예시: 숏폼 광고 효과 | 최신성 높음 | 자료 편향 | 보통</div>
        </div>

        <!-- 모듈 3 -->
        <div class="card module-card">
          <h3><span>03</span> NotebookLM 활용</h3>
          <p style="color: #444; font-size: 14px; margin-bottom: 1rem; line-height: 1.6;">
            전공 교재 PDF나 학술 논문을 소스로 지정하여 각주 기반의 팩트체크 스터디 비서를 구축합니다.
          </p>
          <ul style="padding-left: 1.2rem; font-size: 13px; color: #555; line-height: 1.7;">
            <li>발췌 논문 PDF 및 강의 자료 업로드 & 핵심 논점 1분 브리핑</li>
            <li>인용 번호 클릭 시 원문 본문 하이라이트 위치 이동 체험</li>
            <li>오디오 오버뷰(AI 음성 팟캐스트 형식) 요약 듣기</li>
          </ul>
        </div>

        <!-- 모듈 4 -->
        <div class="card module-card">
          <h3><span>04</span> 구글 시트에서 Gemini 함수 활용</h3>
          <p style="color: #444; font-size: 14px; margin-bottom: 1rem; line-height: 1.6;">
            스프레드시트에서 함수 하나로 설문 주관식 텍스트의 감정 분석, 카테고리 분류, 다국어 번역을 자동화합니다. (시연)
          </p>
          <div class="copy-box" style="margin-bottom: 0.75rem;">
<button class="copy-btn" data-clipboard='=GEMINI("다음 학생 피드백의 핵심 감정을 [긍정/중립/부정] 중 하나로 분류해줘: ", A2)'>복사하기</button>=GEMINI("다음 학생 피드백의 핵심 감정을 [긍정/중립/부정] 중 하나로 분류해줘: ", A2)</div>
          <ul style="padding-left: 1.2rem; font-size: 13px; color: #555; line-height: 1.7;">
            <li>=GEMINI() 함수 기반 설문 주관식 응답 감정 분류 및 요약</li>
            <li>강의 실습용 완성 템플릿 스프레드시트 사본 만들기 제공</li>
          </ul>
        </div>
      </div>
    `;
  },

  getStaffDashboardHtml(user) {
    const esc = window.escapeHtml || ((s) => s);
    const displayName = esc(user.name || '교직원');
    const affiliation = esc([user.university, user.department].filter(Boolean).join(' · ') || '소속 미설정 (내 정보에서 입력 가능)');
    const loginTime = user.loginAt ? new Date(user.loginAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '방금';
    const loginMethodTag = user.loginMethod === 'google' ? 'Google 간편입장' : (user.loginMethod === 'register' ? '신규가입 입장' : '아이디 로그인');

    return `
      <!-- 교직원 안내 배너 (학생 전용과 동일한 Ember / Caldera Style) -->
      <div class="card card-ember dashboard-header-card" style="margin-bottom: var(--spacing-32); margin-top: var(--spacing-16);">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--spacing-20);">
          <div style="max-width: 680px;">
            <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 8px;">
              <span style="background: var(--color-sulfur); color: var(--color-obsidian); padding: 4px 14px; border-radius: var(--radius-pills); font-size: 12px; font-weight: 700; text-transform: uppercase;">
                🏛️ 교직원 전용 코스 · ${displayName} 님
              </span>
              <span style="background: rgba(255, 255, 255, 0.2); color: #fff; padding: 4px 12px; border-radius: var(--radius-pills); font-size: 12px;">
                🏫 ${affiliation}
              </span>
              <span style="background: rgba(255, 255, 255, 0.15); color: #fff; padding: 4px 12px; border-radius: var(--radius-pills); font-size: 12px;">
                🕒 최근 입장: ${loginTime} (${loginMethodTag})
              </span>
            </div>
            <h2 style="font-size: clamp(28px, 4vw, 42px); margin: 0.75rem 0 0.5rem 0; color: var(--color-chalk);">
              스마트 학사 행정 업무 혁신 & 홍보 콘텐츠 AI 실무
            </h2>
            <p style="opacity: 0.95; font-size: 1rem; color: #fff3ee; line-height: 1.6;">
              공문 기안, 학칙 규정집 질의응답 챗봇, 원클릭 카드뉴스 제작 및 설문 집계 자동화까지 교직원의 반복 업무를 줄이고 행정 생산성을 극대화합니다.
            </p>
          </div>
          <div>
            <span class="btn btn-secondary" style="background: var(--color-chalk); border-color: var(--color-chalk); color: var(--color-obsidian); font-weight: 700; font-size: 16px; padding: 14px 28px; cursor: default;">
              🏛️ 공식 워크숍 코스
            </span>
          </div>
        </div>
      </div>

      <!-- 교직원 120분 강의 모듈 헤더 -->
      <div style="margin-bottom: var(--spacing-20);">
        <span style="font-family: var(--font-display); font-size: 16px; color: var(--color-ember); letter-spacing: 0.05em;">ADMINISTRATIVE PRODUCTIVITY WORKFLOW</span>
        <h2 style="font-size: 32px; color: var(--color-obsidian);">📋 교직원 120분 스마트 행정 커리큘럼</h2>
      </div>

      <!-- 교직원 모듈 그리드 (대상자별 4대 핵심 교육 & 실습 모듈) -->
      <div class="dashboard-grid">
        <!-- 모듈 1 -->
        <div class="card module-card">
          <h3><span>01</span> 프롬프트 공식 4+2</h3>
          <p style="color: #444; font-size: 14px; margin-bottom: 1rem; line-height: 1.6;">
            행정 격식에 맞춘 톤앤매너 설정, 공문서·안내문 초안 생성 및 품의서 작성 시간을 80% 단축합니다.
          </p>
          <div class="copy-box">
<button class="copy-btn" data-clipboard="[역할] 당신은 대학 행정 담당자입니다.
[배경] 다음 달 신입생 대상 AI 활용 특강을 안내하는 공지문이 필요합니다.
[지시] 학내 공지문 초안을 작성해 주세요.
[형식] 제목, 일시·장소, 신청 방법 순의 항목형으로 300자 이내로 작성해 주세요.
[조건·제약사항] 존댓말을 쓰고 과장 표현을 금지하며, 확정되지 않은 정보는 [확인 필요]로 표기하세요.
[샘플] (지난 공지문 한 단락, 형식만 참고)">복사하기</button>[역할] 당신은 대학 행정 담당자입니다.
[배경] 다음 달 신입생 대상 AI 활용 특강을 안내하는 공지문이 필요합니다.
[지시] 학내 공지문 초안을 작성해 주세요.
[형식] 제목, 일시·장소, 신청 방법 순의 항목형으로 300자 이내로 작성해 주세요.
[조건·제약사항] 존댓말을 쓰고 과장 표현을 금지하며, 확정되지 않은 정보는 [확인 필요]로 표기하세요.
[샘플] (지난 공지문 한 단락, 형식만 참고)</div>
        </div>

        <!-- 모듈 2 -->
        <div class="card module-card">
          <h3><span>02</span> NotebookLM 활용</h3>
          <p style="color: #444; font-size: 14px; margin-bottom: 1rem; line-height: 1.6;">
            학내 보도자료나 규정집 PDF를 연동하여 근거 조항 기반의 행정 질의응답 및 홍보 카드뉴스 기획안을 도출합니다.
          </p>
          <ul style="padding-left: 1.2rem; font-size: 13px; color: #555; line-height: 1.7;">
            <li>행사 기획안 기반 핵심 소구 포인트 3가지 자동 추출</li>
            <li>카드뉴스 구성안(표지 → 본문 3장 → 접수 안내) 원스톱 기획</li>
            <li>학칙 및 복무규정 근거 조항 기반의 행정 Q&A 비서 구축</li>
          </ul>
        </div>

        <!-- 모듈 3 -->
        <div class="card module-card">
          <h3><span>03</span> 카드뉴스 제작(나노바나나 활용)</h3>
          <p style="color: #444; font-size: 14px; margin-bottom: 1rem; line-height: 1.6;">
            기획된 홍보 문구를 AI 시각 템플릿과 결합하여 모바일 친화형 고화질 카드뉴스를 신속하게 제작합니다.
          </p>
          <ul style="padding-left: 1.2rem; font-size: 13px; color: #555; line-height: 1.7;">
            <li>기획 문구 기반 인포그래픽 및 나노바나나 시안 생성</li>
            <li>Canva 또는 미리캔버스를 활용한 한글 타이포그래피 마감</li>
            <li>AI 생성물 공공 표기 기준, 저작권 및 초상권 가이드 안내</li>
          </ul>
        </div>

        <!-- 모듈 4 -->
        <div class="card module-card">
          <h3><span>04</span> 구글 폼 제작 및 집계시스템 설정</h3>
          <p style="color: #444; font-size: 14px; margin-bottom: 1rem; line-height: 1.6;">
            AI로 행사 및 특강 설문 문항을 기획하고, 구글 폼 생성 후 스프레드시트 실시간 집계 대시보드를 구축합니다. (시연)
          </p>
          <div class="copy-box" style="margin-bottom: 0.75rem;">
<button class="copy-btn" data-clipboard="신입생 AI 특강 만족도 조사를 위한 5점 척도 문항 5개와 주관식 건의사항 1개를 설계해줘.">복사하기</button>신입생 AI 특강 만족도 조사를 위한 5점 척도 문항 5개와 주관식 건의사항 1개를 설계해줘.</div>
          <ul style="padding-left: 1.2rem; font-size: 13px; color: #555; line-height: 1.7;">
            <li>특강 및 행사 만족도 조사를 위한 설문 문항 초안 설계</li>
            <li>구글 폼과 시트 연동 실시간 자동 집계 및 요약 응답 확인</li>
          </ul>
        </div>
      </div>
    `;
  },

  bindCopyEvents() {
    document.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const textToCopy = e.target.getAttribute('data-clipboard');
        if (textToCopy) {
          navigator.clipboard.writeText(textToCopy).then(() => {
            const originText = e.target.textContent;
            e.target.textContent = '복사됨!';
            setTimeout(() => { e.target.textContent = originText; }, 1500);
          });
        }
      });
    });
  }
};

window.DashboardApp = DashboardApp;
