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

    // 역량진단 완료 여부 확인
    const savedDiagnosis = localStorage.getItem('ai_lit_diagnosis_' + user.email);
    const diagReport = savedDiagnosis ? JSON.parse(savedDiagnosis) : null;
    const isCompleted = Boolean(diagReport);

    const ctaBtnText = isCompleted ? '나의 진단 결과 레포트 확인하기 →' : '지금 역량 진단 시작하기 →';
    const completedBadge = isCompleted
      ? `<div style="margin-top: 10px;">
          <span style="background: var(--color-sulfur); color: var(--color-obsidian); font-weight: 800; font-size: 13px; padding: 4px 14px; border-radius: 999px; display: inline-flex; align-items: center; gap: 6px;">
            <span>✓ 역량진단 완료</span>
            <span style="opacity: 0.75;">|</span>
            <span>종합 ${diagReport.overallScore}점 (${diagReport.overallRating})</span>
          </span>
         </div>`
      : '';

    // 진단 완료자에게만 표시되는 진단 결과 레포트 확인 바로가기 링크
    const factorQuestionsSection = isCompleted
      ? `<div style="margin-top: 14px; padding-top: 12px; border-top: 1.5px dashed #d5d5d0;">
          <a href="diagnosis.html" style="display: inline-flex; align-items: center; gap: 6px; color: var(--color-ember); font-weight: 700; font-size: 12.5px; text-decoration: none; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
            <span>💡 나의 진단 결과 레포트 확인하기 →</span>
          </a>
        </div>`
      : '';

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
            <p style="opacity: 0.95; font-size: 1rem; color: #fff3ee; line-height: 1.6; margin: 0;">
              30문항(약 7분 소요) 진단을 통해 나의 5대 AI 리터러시 강점과 취약점 분석 방사형 차트, 맞춤 피드백 및 PDF 공식 레포트를 발급받으세요.
            </p>
            ${completedBadge}
          </div>
          <div>
            <a href="diagnosis.html" class="btn btn-secondary" style="background: var(--color-chalk); border-color: var(--color-chalk); color: var(--color-obsidian); font-weight: 700; font-size: 17px; padding: 16px 32px;">
              ${ctaBtnText}
            </a>
          </div>
        </div>
      </div>

      <!-- 학생 120분 강의 모듈 헤더 -->
      <div style="margin-bottom: var(--spacing-20);">
        <span style="font-family: var(--font-display); font-size: 16px; color: var(--color-ember); letter-spacing: 0.05em;">CURRICULUM FOR UNIVERSITY STUDENTS</span>
        <h2 style="font-size: 32px; color: var(--color-obsidian);">🎓 대학생 120분 AI 리터러시 마스터 코스</h2>
      </div>

      <!-- 모듈 그리드 (대상자별 4대 핵심 교육 & 실습 모듈) -->
      <div class="dashboard-grid">
        <!-- 모듈 1 -->
        <div class="card module-card">
          <h3><span>01</span> 대학생의 AI 리터러시 진단</h3>
          <p style="color: #444; font-size: 14px; margin-bottom: 0; line-height: 1.6;">
            대학생 전용 30문항 표준 척도를 통해 나의 5대 리터러시 역량을 정밀 진단하고 개별 레포트를 발급받습니다.
          </p>
          ${factorQuestionsSection}
        </div>

        <!-- 모듈 2 -->
        <div class="card module-card">
          <h3><span>02</span> 프롬프트 공식 4+2</h3>
          <p style="color: #444; font-size: 14px; margin-bottom: 0; line-height: 1.6;">
            [역할·배경·지시·형식]의 4대 뼈대와 [조건·샘플]의 2대 보강재를 결합하여 과제 리서치 답변의 정확도를 극대화합니다.
          </p>
        </div>

        <!-- 모듈 3 -->
        <div class="card module-card">
          <h3><span>03</span> NotebookLM 활용</h3>
          <p style="color: #444; font-size: 14px; margin-bottom: 0; line-height: 1.6;">
            전공 교재 PDF나 학술 논문을 소스로 지정하여 각주 기반의 팩트체크 스터디 비서를 구축합니다.
          </p>
        </div>

        <!-- 모듈 4 -->
        <div class="card module-card">
          <h3><span>04</span> 구글 시트에서 Gemini 함수 활용</h3>
          <p style="color: #444; font-size: 14px; margin-bottom: 0; line-height: 1.6;">
            스프레드시트에서 함수 하나로 설문 주관식 텍스트의 감정 분석, 카테고리 분류, 다국어 번역을 자동화합니다.
          </p>
        </div>
      </div>

      <!-- 대학생의 AI리터러시 진단 개요 섹션 -->
      <div style="margin-top: var(--spacing-48); margin-bottom: var(--spacing-32);">
        <div style="margin-bottom: var(--spacing-20);">
          <span style="font-family: var(--font-display); font-size: 16px; color: var(--color-ember); letter-spacing: 0.05em;">DIAGNOSIS OVERVIEW & FRAMEWORK</span>
          <h2 style="font-size: clamp(24px, 3.5vw, 32px); color: var(--color-obsidian); margin-top: 4px;">📊 대학생의 AI리터러시 진단 개요</h2>
        </div>

        <!-- 1. 진단 목적 및 기본 규격 요약 그리드 (3개 미니 카드) -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
          <div class="card" style="padding: 1.25rem 1.5rem; border: 1px solid var(--color-pumice); border-radius: 20px; background: #ffffff;">
            <div style="font-size: 13px; font-weight: 700; color: var(--color-ember); margin-bottom: 4px;">01. 진단 목적</div>
            <div style="font-size: 15px; font-weight: 700; color: var(--color-obsidian); margin-bottom: 6px;">실무 역량 및 윤리 정밀 진단</div>
            <div style="font-size: 13px; color: #555; line-height: 1.55; word-break: keep-all;">
              생성형 AI 시대에 요구되는 실무 문제해결력, 프롬프트 설계, 윤리·보안 및 진로 인식을 종합적으로 측정합니다.
            </div>
          </div>

          <div class="card" style="padding: 1.25rem 1.5rem; border: 1px solid var(--color-pumice); border-radius: 20px; background: #ffffff;">
            <div style="font-size: 13px; font-weight: 700; color: var(--color-ember); margin-bottom: 4px;">02. 측정 규격</div>
            <div style="font-size: 15px; font-weight: 700; color: var(--color-obsidian); margin-bottom: 6px;">30문항 · 7점 리커트 척도 (약 7분)</div>
            <div style="font-size: 13px; color: #555; line-height: 1.55; word-break: keep-all;">
              전국 대학생 표준 척도를 적용하여 100점 만점 표준 점수 및 5대 요인별 방사형(Radar) 프로파일을 도출합니다.
            </div>
          </div>

          <div class="card" style="padding: 1.25rem 1.5rem; border: 1px solid var(--color-pumice); border-radius: 20px; background: #ffffff;">
            <div style="font-size: 13px; font-weight: 700; color: var(--color-ember); margin-bottom: 4px;">03. 결과 발급물</div>
            <div style="font-size: 15px; font-weight: 700; color: var(--color-obsidian); margin-bottom: 6px;">A4 규격 2페이지 레포트</div>
            <div style="font-size: 13px; color: #555; line-height: 1.55; word-break: keep-all;">
              요약 프로파일과 수준별 추천 실천 과제가 담긴 공인 레포트를 PDF 다운로드, 모바일 바로 공유, JPG로 제공합니다.
            </div>
          </div>
        </div>

        <!-- 2. 5대 핵심 역량 요인 및 정의 표 (Card Wrap + Table) -->
        <div class="card" style="padding: 1.75rem 2rem; border: 1px solid var(--color-pumice); border-radius: 28px; background: #ffffff; margin-bottom: 1.5rem;">
          <h3 style="font-size: 18px; color: var(--color-obsidian); margin-bottom: 1rem; display: flex; align-items: center; gap: 8px;">
            <span>🧩 5대 핵심 역량 요인 및 정의</span>
            <span style="font-size: 12px; font-weight: 500; color: #6b7280;">(전국 대학생 기준 평균 대비 비교)</span>
          </h3>
          
          <div style="overflow-x: auto; -webkit-overflow-scrolling: touch;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13.5px; text-align: left; min-width: 600px; word-break: keep-all;">
              <thead>
                <tr style="background-color: #f3f4f6; border-bottom: 2px solid #e5e7eb;">
                  <th style="padding: 12px 14px; width: 12%; text-align: center; color: var(--color-obsidian); font-weight: 700; white-space: nowrap;">역량 구분</th>
                  <th style="padding: 12px 14px; width: 26%; color: var(--color-obsidian); font-weight: 700;">핵심 역량명</th>
                  <th style="padding: 12px 14px; width: 14%; text-align: center; color: var(--color-obsidian); font-weight: 700; white-space: nowrap;">대학생 평균</th>
                  <th style="padding: 12px 14px; color: var(--color-obsidian); font-weight: 700;">역량의 핵심 정의 및 개념</th>
                </tr>
              </thead>
              <tbody>
                <tr style="border-bottom: 1px solid #e5e7eb;">
                  <td style="padding: 12px 14px; text-align: center; font-weight: 700; color: var(--color-ember); background: #fdfbf9; white-space: nowrap;">역량 1</td>
                  <td style="padding: 12px 14px; font-weight: 700; color: var(--color-obsidian);">AI 기반 문제해결·창의적 적용</td>
                  <td style="padding: 12px 14px; text-align: center; font-weight: 600; color: #374151;">71.92점</td>
                  <td style="padding: 12px 14px; color: #4b5563; line-height: 1.55;">
                    리포트 작성, 데이터 분석, 팀 과제 등 학업과 전공 분야의 실제 문제를 해결하기 위해 적절한 AI 도구를 선별·활용하고 창의적인 아이디어와 결과물을 만들어내는 <strong>실무적 적용 역량</strong>
                  </td>
                </tr>
                <tr style="border-bottom: 1px solid #e5e7eb;">
                  <td style="padding: 12px 14px; text-align: center; font-weight: 700; color: var(--color-ember); background: #fdfbf9; white-space: nowrap;">역량 2</td>
                  <td style="padding: 12px 14px; font-weight: 700; color: var(--color-obsidian);">AI 개념·원리 및 생성형 AI 이해</td>
                  <td style="padding: 12px 14px; text-align: center; font-weight: 600; color: #374151;">53.62점</td>
                  <td style="padding: 12px 14px; color: #4b5563; line-height: 1.55;">
                    데이터 학습 원리, 머신러닝과 딥러닝의 차이, 생성형 AI의 작동 메커니즘, 인간과 AI 추론의 차이 등 인공지능 기술의 기초 이론과 학문적 배경을 이해하는 <strong>인지적 기초 역량</strong>
                  </td>
                </tr>
                <tr style="border-bottom: 1px solid #e5e7eb;">
                  <td style="padding: 12px 14px; text-align: center; font-weight: 700; color: var(--color-ember); background: #fdfbf9; white-space: nowrap;">역량 3</td>
                  <td style="padding: 12px 14px; font-weight: 700; color: var(--color-obsidian);">AI 활용 태도·진로 및 사회적 영향 인식</td>
                  <td style="padding: 12px 14px; text-align: center; font-weight: 600; color: #374151;">76.73점</td>
                  <td style="padding: 12px 14px; color: #4b5563; line-height: 1.55;">
                    AI 기술이 자신의 전공과 미래 직업 세계에 미칠 파급효과를 통찰하고, 지속적인 학습 의지와 함께 AI가 사회 전반에 미치는 긍정적·부정적 영향을 균형 있게 바라보는 <strong>미래지향적 태도 역량</strong>
                  </td>
                </tr>
                <tr style="border-bottom: 1px solid #e5e7eb;">
                  <td style="padding: 12px 14px; text-align: center; font-weight: 700; color: var(--color-ember); background: #fdfbf9; white-space: nowrap;">역량 4</td>
                  <td style="padding: 12px 14px; font-weight: 700; color: var(--color-obsidian);">AI 데이터·윤리·보안 인식</td>
                  <td style="padding: 12px 14px; text-align: center; font-weight: 600; color: #374151;">69.09점</td>
                  <td style="padding: 12px 14px; color: #4b5563; line-height: 1.55;">
                    AI 활용 시 발생할 수 있는 개인정보 침해, 저작권, 데이터 편향성, 정보의 부정확성을 명확히 인지하고, 출처 표기와 사회적 책임감을 준수하는 <strong>규범적·윤리적 역량</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 14px; text-align: center; font-weight: 700; color: var(--color-ember); background: #fdfbf9; white-space: nowrap;">역량 5</td>
                  <td style="padding: 12px 14px; font-weight: 700; color: var(--color-obsidian);">프롬프트 설계 및 비판적 활용 역량</td>
                  <td style="padding: 12px 14px; text-align: center; font-weight: 600; color: #374151;">73.18점</td>
                  <td style="padding: 12px 14px; color: #4b5563; line-height: 1.55;">
                    원하는 결과물을 도출하기 위해 명확하고 구체적인 프롬프트(지시문)를 구조화하고, AI가 생성한 결과물을 맹신하지 않고 사실 여부를 교차 검증하는 <strong>비판적 사고 및 통제 역량</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 3. 결과 레포트 2페이지 구성 안내 카드 -->
        <div class="card" style="padding: 1.75rem 2rem; border: 1px solid var(--color-pumice); border-radius: 28px; background: #ffffff;">
          <h3 style="font-size: 18px; color: var(--color-obsidian); margin-bottom: 1rem;">
            📑 결과 레포트(A4 2페이지) 구성 체계
          </h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.25rem;">
            <div style="background: #faf9f6; padding: 1.25rem 1.5rem; border-radius: 18px; border: 1px solid var(--color-pumice);">
              <div style="font-weight: 700; font-size: 15px; color: var(--color-obsidian); margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                <span style="background: var(--color-ember); color: #fff; width: 22px; height: 22px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px;">1</span>
                <span>[1페이지] 개별 역량 프로파일</span>
              </div>
              <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #555; line-height: 1.65; word-break: keep-all;">
                <li><strong>인적사항 영역</strong>: 성명, 소속 대학/학과, 학번, 평가일자</li>
                <li><strong>역량 종합 요약표</strong>: 종합 점수, 5대 요인별 취득 점수 및 수준 판정</li>
                <li><strong>방사형 차트(Radar)</strong>: 개인별 강점과 보완점 시각화</li>
                <li><strong>요인별 1차 맞춤 제안</strong>: 수준별 역량 진단 소견 요약</li>
              </ul>
            </div>

            <div style="background: #faf9f6; padding: 1.25rem 1.5rem; border-radius: 18px; border: 1px solid var(--color-pumice);">
              <div style="font-weight: 700; font-size: 15px; color: var(--color-obsidian); margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                <span style="background: var(--color-ember); color: #fff; width: 22px; height: 22px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px;">2</span>
                <span>[2페이지] 역량 개발 실천 가이드</span>
              </div>
              <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #555; line-height: 1.65; word-break: keep-all;">
                <li><strong>요인별 제안 재표시</strong>: 5대 요인별 진단 소견 재확인</li>
                <li><strong>추천 세부 실천 과제</strong>: 학업 및 비교과에서 바로 실천할 맞춤형 행동 지침</li>
                <li><strong>공인 인증 마크</strong>: 레포트 신뢰성 보장을 위한 인증 마크</li>
                <li><strong>출력 & 공유</strong>: PDF 다운로드, 모바일 바로 공유, 1·2p JPG 저장 지원</li>
              </ul>
            </div>
          </div>

          <div style="margin-top: 1.5rem; text-align: center;">
            <a href="diagnosis.html" class="btn btn-primary" style="padding: 12px 28px; font-size: 15px; font-weight: 700; box-shadow: var(--shadow-md);">
              ${ctaBtnText}
            </a>
          </div>
        </div>
      </div>

      <!-- 프롬프트 공식 4+2 & LLM 안전 활용 가이드 섹션 -->
      <div style="margin-top: var(--spacing-48); margin-bottom: var(--spacing-32);">
        <div style="margin-bottom: var(--spacing-20);">
          <span style="font-family: var(--font-display); font-size: 16px; color: var(--color-ember); letter-spacing: 0.05em;">PROMPT FRAMEWORK & ETHICS GUIDELINES</span>
          <h2 style="font-size: clamp(24px, 3.5vw, 32px); color: var(--color-obsidian); margin-top: 4px;">💡 프롬프트 공식 4+2 & LLM 안전 활용 가이드</h2>
        </div>

        <!-- 1. 「프롬프트 공식 4+2」 프레임워크 카드 -->
        <div class="card" style="padding: 1.75rem 2rem; border: 1px solid var(--color-pumice); border-radius: 28px; background: #ffffff; margin-bottom: 1.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 1rem;">
            <h3 style="font-size: 18px; color: var(--color-obsidian); margin: 0; display: flex; align-items: center; gap: 8px;">
              <span>🧱 「프롬프트 공식 4+2」 프레임워크</span>
            </h3>
            <span style="background: var(--color-sulfur); color: var(--color-obsidian); font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 999px;">
              4대 뼈대 (역·배·지·형) + 2대 보강재 (조·샘)
            </span>
          </div>
          
          <p style="font-size: 13.5px; color: #555; line-height: 1.6; margin-bottom: 1.25rem; word-break: keep-all;">
            생성형 AI로부터 신뢰성 높은 고품질의 답변을 얻기 위한 표준 프레임워크입니다. 기본 답변의 뼈대를 이루는 <strong>핵심 요소 4개</strong>와, 환각을 줄이고 정밀도를 극대화하는 <strong>추가 보강 요소 2개</strong>를 결합합니다.
          </p>

          <!-- 표: 4+2 공식 상세 -->
          <div style="overflow-x: auto; -webkit-overflow-scrolling: touch; margin-bottom: 1.5rem;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13.5px; text-align: left; min-width: 620px; word-break: keep-all;">
              <thead>
                <tr style="background-color: #f3f4f6; border-bottom: 2px solid #e5e7eb;">
                  <th style="padding: 12px 14px; width: 14%; text-align: center; color: var(--color-obsidian); font-weight: 700; white-space: nowrap;">구분</th>
                  <th style="padding: 12px 14px; width: 18%; color: var(--color-obsidian); font-weight: 700;">요소 (영문)</th>
                  <th style="padding: 12px 14px; width: 34%; color: var(--color-obsidian); font-weight: 700;">정의 및 역할</th>
                  <th style="padding: 12px 14px; color: var(--color-obsidian); font-weight: 700;">작성 팁 & 예시 문구</th>
                </tr>
              </thead>
              <tbody>
                <!-- 핵심 4대 뼈대 -->
                <tr style="border-bottom: 1px solid #e5e7eb; background: #fffcfb;">
                  <td rowspan="4" style="padding: 12px 14px; text-align: center; font-weight: 700; color: var(--color-ember); border-right: 1px solid #e5e7eb; white-space: nowrap;">
                    핵심 4대 요소<br><span style="font-size: 11px; font-weight: 600; color: #6b7280;">(뼈대)</span>
                  </td>
                  <td style="padding: 12px 14px; font-weight: 700; color: var(--color-obsidian);">1. 역할 (Role)</td>
                  <td style="padding: 12px 14px; color: #4b5563; line-height: 1.5;">AI에게 부여할 <strong>전문적 정체성과 시각</strong> 설정</td>
                  <td style="padding: 12px 14px; color: #374151; font-size: 12.5px;">"너는 10년 차 대학 교육과정 설계 전문가야."</td>
                </tr>
                <tr style="border-bottom: 1px solid #e5e7eb; background: #fffcfb;">
                  <td style="padding: 12px 14px; font-weight: 700; color: var(--color-obsidian);">2. 배경 (Context)</td>
                  <td style="padding: 12px 14px; color: #4b5563; line-height: 1.5;">질문을 하게 된 <strong>상황, 맥락, 대상 청중</strong> 제시</td>
                  <td style="padding: 12px 14px; color: #374151; font-size: 12.5px;">"경영학과 3학년 학부생 대상 팀 발표 준비 중이야."</td>
                </tr>
                <tr style="border-bottom: 1px solid #e5e7eb; background: #fffcfb;">
                  <td style="padding: 12px 14px; font-weight: 700; color: var(--color-obsidian);">3. 지시 (Task)</td>
                  <td style="padding: 12px 14px; color: #4b5563; line-height: 1.5;">AI가 실제로 수행해야 할 <strong>핵심 작업 및 요구사항</strong></td>
                  <td style="padding: 12px 14px; color: #374151; font-size: 12.5px;">"대학생에게 요구되는 핵심 AI 역량 3가지를 도출해 줘."</td>
                </tr>
                <tr style="border-bottom: 2px solid #e5e7eb; background: #fffcfb;">
                  <td style="padding: 12px 14px; font-weight: 700; color: var(--color-obsidian);">4. 형식 (Format)</td>
                  <td style="padding: 12px 14px; color: #4b5563; line-height: 1.5;">답변이 출력되어야 하는 <strong>시각적 구조 및 문서 형태</strong></td>
                  <td style="padding: 12px 14px; color: #374151; font-size: 12.5px;">"표(Table) 또는 개조식 3단계로 정리해 줘."</td>
                </tr>

                <!-- 추가 2대 보강재 -->
                <tr style="border-bottom: 1px solid #e5e7eb; background: #fdfdfd;">
                  <td rowspan="2" style="padding: 12px 14px; text-align: center; font-weight: 700; color: #0d9488; border-right: 1px solid #e5e7eb; white-space: nowrap;">
                    추가 2대 요소<br><span style="font-size: 11px; font-weight: 600; color: #6b7280;">(보강재)</span>
                  </td>
                  <td style="padding: 12px 14px; font-weight: 700; color: var(--color-obsidian);">5. 조건 (Constraint)</td>
                  <td style="padding: 12px 14px; color: #4b5563; line-height: 1.5;">반드시 지켜야 할 <strong>규칙, 분량, 톤앤매너, 금지사항</strong></td>
                  <td style="padding: 12px 14px; color: #374151; font-size: 12.5px;">"출처가 불확실한 통계는 배제하고 800자 이내로 제한할 것."</td>
                </tr>
                <tr>
                  <td style="padding: 12px 14px; font-weight: 700; color: var(--color-obsidian);">6. 샘플 (Example)</td>
                  <td style="padding: 12px 14px; color: #4b5563; line-height: 1.5;">원하는 답변의 <strong>모범 예시(구조, 어조, 템플릿)</strong> 직접 제공</td>
                  <td style="padding: 12px 14px; color: #374151; font-size: 12.5px;">'[역량명]: 정의 ➔ [실천사례]: 행동' 형식 준수</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Before vs After 비교 박스 -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;">
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 16px; padding: 1rem 1.25rem;">
              <div style="font-weight: 700; font-size: 13.5px; color: #991b1b; margin-bottom: 6px;">❌ 단순 지시형 (일반적인 프롬프트)</div>
              <div style="font-size: 13px; color: #7f1d1d; line-height: 1.5; font-style: italic;">
                "대학생 과제에서 ChatGPT 쓰는 법 알려줘."
              </div>
              <div style="font-size: 12px; color: #991b1b; margin-top: 6px;">
                ➔ 인터넷에 흔히 있는 뻔하고 두루뭉술한 내용 나열에 그침
              </div>
            </div>

            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 16px; padding: 1rem 1.25rem;">
              <div style="font-weight: 700; font-size: 13.5px; color: #166534; margin-bottom: 6px;">✅ 4+2 공식 결합형 (고품질 프롬프트)</div>
              <div style="font-size: 12.5px; color: #14532d; line-height: 1.5;">
                <strong>[역할]</strong> 대학생 학습 코칭 튜터 / <strong>[배경]</strong> 1학년 전공 리포트 작성<br>
                <strong>[지시]</strong> 리포트 단계별 AI 실전 활용 팁 및 윤리 가이드 도출<br>
                <strong>[형식]</strong> 표 형태 / <strong>[조건]</strong> 팩트체크 및 출처 표기 주의점 필수 포함
              </div>
              <div style="font-size: 12px; color: #166534; margin-top: 6px;">
                ➔ 과제에 즉시 적용 가능한 구조화된 실전 맞춤 답변 도출
              </div>
            </div>
          </div>
        </div>

        <!-- 2. 대학생을 위한 실전 프롬프트 템플릿 5선 (카드) -->
        <div class="card" style="padding: 1.75rem 2rem; border: 1px solid var(--color-pumice); border-radius: 28px; background: #ffffff; margin-bottom: 1.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 1rem;">
            <h3 style="font-size: 18px; color: var(--color-obsidian); margin: 0;">
              📋 대학생 추천 실전 프롬프트 템플릿 5선
            </h3>
            <span style="font-size: 12.5px; color: #6b7280;">[대괄호] 부분만 본인 과제 내용으로 변경하여 복사·활용하세요.</span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 1rem;">
            <!-- 템플릿 1 -->
            <div class="prompt-template-card" style="background: #faf9f6; border: 1px solid var(--color-pumice); border-radius: 16px; padding: 1.1rem 1.25rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;">
                <div style="font-weight: 700; font-size: 14.5px; color: var(--color-obsidian); display: flex; align-items: center; gap: 6px;">
                  <span style="background: var(--color-ember); color: #fff; font-size: 11px; padding: 2px 7px; border-radius: 4px;">과제 기획</span>
                  <span>1. 뻔한 주제를 차별화하는 「주제 구체화 프롬프트」</span>
                </div>
                <button type="button" class="btn btn-outline prompt-copy-btn" onclick="DashboardApp.copyPrompt(this)" style="font-size: 12px; padding: 4px 12px; border-radius: 999px; display: inline-flex; align-items: center; gap: 4px; border-color: #d1d5db; background: #ffffff; cursor: pointer;" title="프롬프트 템플릿 복사하기">
                  <span>📋 프롬프트 복사</span>
                </button>
              </div>
              <pre style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 12px; font-size: 12px; color: #374151; white-space: pre-wrap; word-break: break-all; margin: 0; line-height: 1.55; font-family: inherit;">[역할] 너는 대학 학술 글쓰기 지도 교수이자 연구 설계 전문가야.
[배경] [경영학/컴퓨터공학/사회복지학] 전공 과제로 [생성형 AI의 도입]에 관한 A4 5장 분량의 리포트 주제를 정해야 해.
[지시] 뻔하고 흔한 주제 대신, 최신 쟁점과 구체적인 타깃이 결합된 독창적인 리포트 소주제 3가지를 제안해 줘. 각 주제마다 '문제 제기 - 핵심 연구 질문 - 기대 효과'를 제시해 줘.
[형식] 표(Table) 형태로 정리해 줘.
[조건] 학부생 수준에서 한 학기 동안 국내외 학술 논문과 기사를 찾아 분석할 수 있는 현실적인 범위여야 해.
[샘플] | 순번 | 추천 소주제 | 핵심 연구 질문 | 분석 대상 및 데이터 |</pre>
            </div>

            <!-- 템플릿 2 -->
            <div class="prompt-template-card" style="background: #faf9f6; border: 1px solid var(--color-pumice); border-radius: 16px; padding: 1.1rem 1.25rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;">
                <div style="font-weight: 700; font-size: 14.5px; color: var(--color-obsidian); display: flex; align-items: center; gap: 6px;">
                  <span style="background: var(--color-ember); color: #fff; font-size: 11px; padding: 2px 7px; border-radius: 4px;">시험 대비</span>
                  <span>2. 어려운 전공 개념을 뚫어주는 「파인만 튜터 프롬프트」</span>
                </div>
                <button type="button" class="btn btn-outline prompt-copy-btn" onclick="DashboardApp.copyPrompt(this)" style="font-size: 12px; padding: 4px 12px; border-radius: 999px; display: inline-flex; align-items: center; gap: 4px; border-color: #d1d5db; background: #ffffff; cursor: pointer;" title="프롬프트 템플릿 복사하기">
                  <span>📋 프롬프트 복사</span>
                </button>
              </div>
              <pre style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 12px; font-size: 12px; color: #374151; white-space: pre-wrap; word-break: break-all; margin: 0; line-height: 1.55; font-family: inherit;">[역할] 너는 복잡한 전공 이론을 아주 쉽고 직관적으로 설명해 주는 친절한 대학 1:1 튜터야.
[배경] 나는 [컴퓨터·IT / 경영학] 전공 [2학년] 학생이고, 이번 시험 대비를 위해 [머신러닝의 과적합(Overfitting)과 해결 기법]을 완벽히 이해해야 해.
[지시]
1. 이 개념의 핵심 원리를 일상 비유를 들어 비전공자도 이해할 수 있게 설명해 줘.
2. 학부 시험에 자주 출제되는 기술적/학문적 핵심 포인트 3가지를 짚어줘.
3. 내가 제대로 이해했는지 점검할 수 있는 4지선다형 연습문제 2문제를 출제하고, 정답과 해설은 맨 밑에 따로 배치해 줘.
[형식] 1단계(직관적 비유) -> 2단계(학술 핵심 요약) -> 3단계(확인 퀴즈) 순서로 구분해 줘.
[조건] 단순 사전적 정의 나열은 금지하며, 친근하고 명쾌한 어조로 설명해 줘.</pre>
            </div>

            <!-- 템플릿 3 -->
            <div class="prompt-template-card" style="background: #faf9f6; border: 1px solid var(--color-pumice); border-radius: 16px; padding: 1.1rem 1.25rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;">
                <div style="font-weight: 700; font-size: 14.5px; color: var(--color-obsidian); display: flex; align-items: center; gap: 6px;">
                  <span style="background: var(--color-ember); color: #fff; font-size: 11px; padding: 2px 7px; border-radius: 4px;">팀 프로젝트</span>
                  <span>3. 발표 전 약점을 미리 잡는 「악마의 변호인(반박 검증) 프롬프트」</span>
                </div>
                <button type="button" class="btn btn-outline prompt-copy-btn" onclick="DashboardApp.copyPrompt(this)" style="font-size: 12px; padding: 4px 12px; border-radius: 999px; display: inline-flex; align-items: center; gap: 4px; border-color: #d1d5db; background: #ffffff; cursor: pointer;" title="프롬프트 템플릿 복사하기">
                  <span>📋 프롬프트 복사</span>
                </button>
              </div>
              <pre style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 12px; font-size: 12px; color: #374151; white-space: pre-wrap; word-break: break-all; margin: 0; line-height: 1.55; font-family: inherit;">[역할] 너는 팀 프로젝트 평가에서 가장 까다롭고 날카로운 질문을 던지는 심사위원(악마의 변호인)이야.
[배경] 우리 팀은 [경영혁신과 창업] 수업에서 [대학생 교내 전공서적 무인 대여 및 순환 플랫폼 '캠퍼스북스']에 대해 발표할 예정이야.
[지시] 아래 작성된 우리 팀의 발표 개요를 비판적으로 검토하고, 발표 당일 교수님이나 청중이 공격할 수 있는 취약점 3가지와 예상 압박 질문을 뽑아줘. 그리고 각 질문에 대한 방어 논리(대응 가이드)도 함께 제시해 줘.
---
[기획안 개요]
1. 문제 정의: 비싼 전공서적 비용 부담과 학기 후 폐기되는 책 낭비 문제
2. 해결 방안: 단과대 로비에 무인 반납/대여함을 설치하고, 학생증 NFC로 학기당 저렴한 구독료로 전공책 대여
3. 수익 모델: 학생 구독료(월 3,000원) 및 교내 학식·카페 쿠폰 제휴 배너 광고
---
[형식] '[취약점 분석] -> [예상 압박 질문] -> [추천 방어 답변]' 구조로 정리해 줘.
[조건] 칭찬이나 빈말은 일체 생략하고, 논리적 비약과 실현 가능성의 한계 위주로 엄격하게 비판해 줘.</pre>
            </div>

            <!-- 템플릿 4 -->
            <div class="prompt-template-card" style="background: #faf9f6; border: 1px solid var(--color-pumice); border-radius: 16px; padding: 1.1rem 1.25rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;">
                <div style="font-weight: 700; font-size: 14.5px; color: var(--color-obsidian); display: flex; align-items: center; gap: 6px;">
                  <span style="background: var(--color-ember); color: #fff; font-size: 11px; padding: 2px 7px; border-radius: 4px;">글쓰기 윤리</span>
                  <span>4. 표절 없이 문장력만 올리는 「논리 구조 첨삭 프롬프트」</span>
                </div>
                <button type="button" class="btn btn-outline prompt-copy-btn" onclick="DashboardApp.copyPrompt(this)" style="font-size: 12px; padding: 4px 12px; border-radius: 999px; display: inline-flex; align-items: center; gap: 4px; border-color: #d1d5db; background: #ffffff; cursor: pointer;" title="프롬프트 템플릿 복사하기">
                  <span>📋 프롬프트 복사</span>
                </button>
              </div>
              <pre style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 12px; font-size: 12px; color: #374151; white-space: pre-wrap; word-break: break-all; margin: 0; line-height: 1.55; font-family: inherit;">[역할] 너는 학술 논문 및 대학 리포트 전문 에디터야.
[배경] 대학 전공 과제로 내가 직접 작성한 리포트 단락이야. 인공지능이 새로 글을 창작해서는 안 되며, 내 원래 문장과 주장을 그대로 살려야 해.
[지시] 아래 글의 문맥 흐름, 비문, 단어 중복, 논리적 비약을 교정해 줘.
---
[초안 텍스트]
최근 생성형 인공지능의 발전으로 많은 학생들이 과제를 할 때 챗지피티를 많이 쓰고 있는데, 이것은 편리하지만 표절 문제나 할루시네이션 같은 거짓 정보 때문에 부작용도 크다고 생각한다. 그래서 교수님들도 무조건 금지하기보다는 올바른 사용 가이드라인을 만들어서 학생들에게 가르쳐주는 교육이 진짜 중요하다고 본다.
---
[형식] 
1. 교정 전/후 비교 표
2. 주요 수정 이유 (문법, 어휘, 논리성 측면) 3가지 요약
[조건] 내 고유의 주장이나 문맥의 핵심 의미를 왜곡하지 말 것. 학술 보고서에 어울리는 정중하고 객관적인 문체(~다, ~이다)를 유지할 것.</pre>
            </div>

            <!-- 템플릿 5 -->
            <div class="prompt-template-card" style="background: #faf9f6; border: 1px solid var(--color-pumice); border-radius: 16px; padding: 1.1rem 1.25rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;">
                <div style="font-weight: 700; font-size: 14.5px; color: var(--color-obsidian); display: flex; align-items: center; gap: 6px;">
                  <span style="background: var(--color-ember); color: #fff; font-size: 11px; padding: 2px 7px; border-radius: 4px;">취업·진로</span>
                  <span>5. 학과 활동을 스펙으로 바꾸는 「STAR 역량 분해 프롬프트」</span>
                </div>
                <button type="button" class="btn btn-outline prompt-copy-btn" onclick="DashboardApp.copyPrompt(this)" style="font-size: 12px; padding: 4px 12px; border-radius: 999px; display: inline-flex; align-items: center; gap: 4px; border-color: #d1d5db; background: #ffffff; cursor: pointer;" title="프롬프트 템플릿 복사하기">
                  <span>📋 프롬프트 복사</span>
                </button>
              </div>
              <pre style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 12px; font-size: 12px; color: #374151; white-space: pre-wrap; word-break: break-all; margin: 0; line-height: 1.55; font-family: inherit;">[역할] 너는 대기업 및 IT 기업 출신의 채용 면접관이자 커리어 컨설턴트야.
[배경] [희망 직무: 예) 서비스 기획 / 데이터 분석 / 마케팅 / 연구개발] 인턴십 지원을 위해 내 대학 활동 경험을 정리하고 있어.
[지시] 아래 적힌 나의 학과 프로젝트 경험을 바탕으로, 기업 채용관이 매력적으로 느낄 수 있도록 STAR 기법에 맞추어 체계적으로 재구성해 줘.
---
[내가 한 활동 자유롭게 메모: 예) 마케팅 조사론 수업 때 4명이서 키오스크 개선안을 설문조사하고 발표해서 A+ 받음]
---
[형식]
• 상황 (Situation): 어떤 배경과 문제 상황이었는가?
• 과제 (Task): 내가 해결해야 했던 핵심 목표는 무엇이었는가?
• 행동 (Action): 나의 주도적 역할과 사용한 역량/도구는 무엇인가?
• 결과 (Result): 구체적인 성과 및 배운 점(정량적·정성적 결과)
[조건] 직무에 부합하는 전문 직무 역량 키워드를 최소 3개 이상 도출하여 본문에 자연스럽게 녹여낼 것.</pre>
            </div>
          </div>
        </div>

        <!-- 3. LLM 서비스 이용 5대 핵심 유의사항 카드 -->
        <div class="card" style="padding: 1.75rem 2rem; border: 1px solid var(--color-pumice); border-radius: 28px; background: #ffffff;">
          <h3 style="font-size: 18px; color: var(--color-obsidian); margin-bottom: 1rem; display: flex; align-items: center; gap: 8px;">
            <span>⚠️ LLM 서비스 이용 5대 핵심 유의사항</span>
          </h3>

          <!-- 5대 유의사항 가로 1줄 배치 (5열 그리드 + 반응형 터치 스크롤) -->
          <div style="overflow-x: auto; -webkit-overflow-scrolling: touch; margin-bottom: 1.5rem;">
            <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.65rem; width: 100%; min-width: 680px;">
              <!-- 유의사항 1 -->
              <div style="background: #faf9f6; border: 1px solid var(--color-pumice); border-top: 3px solid var(--color-ember); padding: 1rem 1rem; border-radius: 14px;">
                <div style="font-weight: 700; font-size: 13.5px; color: var(--color-obsidian); margin-bottom: 6px; word-break: keep-all;">1. 환각 팩트체크</div>
                <div style="font-size: 12px; color: #555; line-height: 1.55; word-break: keep-all;">
                  AI는 거짓말을 지어낼 수 있습니다. 논문·통계 출처는 RISS 등 학술 DB에서 직접 원문을 교차 검증하세요.
                </div>
              </div>

              <!-- 유의사항 2 -->
              <div style="background: #faf9f6; border: 1px solid var(--color-pumice); border-top: 3px solid var(--color-ember); padding: 1rem 1rem; border-radius: 14px;">
                <div style="font-weight: 700; font-size: 13.5px; color: var(--color-obsidian); margin-bottom: 6px; word-break: keep-all;">2. 개인정보·기밀 금지</div>
                <div style="font-size: 12px; color: #555; line-height: 1.55; word-break: keep-all;">
                  프롬프트는 AI 재학습에 활용될 수 있습니다. 주민번호, 학번, 미발표 연구 데이터는 절대 입력 금지!
                </div>
              </div>

              <!-- 유의사항 3 -->
              <div style="background: #faf9f6; border: 1px solid var(--color-pumice); border-top: 3px solid var(--color-ember); padding: 1rem 1rem; border-radius: 14px;">
                <div style="font-weight: 700; font-size: 13.5px; color: var(--color-obsidian); margin-bottom: 6px; word-break: keep-all;">3. 학술 윤리·출처 명시</div>
                <div style="font-size: 12px; color: #555; line-height: 1.55; word-break: keep-all;">
                  답변을 그대로 복사해 제출하면 표절입니다. AI는 초안 검토 튜터로만 쓰고 활용 사실을 정직하게 밝히세요.
                </div>
              </div>

              <!-- 유의사항 4 -->
              <div style="background: #faf9f6; border: 1px solid var(--color-pumice); border-top: 3px solid var(--color-ember); padding: 1rem 1rem; border-radius: 14px;">
                <div style="font-weight: 700; font-size: 13.5px; color: var(--color-obsidian); margin-bottom: 6px; word-break: keep-all;">4. 데이터 편향성 경계</div>
                <div style="font-size: 12px; color: #555; line-height: 1.55; word-break: keep-all;">
                  학습 데이터에 내재된 성별·인종·문화 편향이 투영될 수 있습니다. AI 의견을 다각도에서 비판 검토하세요.
                </div>
              </div>

              <!-- 유의사항 5 -->
              <div style="background: #faf9f6; border: 1px solid var(--color-pumice); border-top: 3px solid var(--color-ember); padding: 1rem 1rem; border-radius: 14px;">
                <div style="font-weight: 700; font-size: 13.5px; color: var(--color-obsidian); margin-bottom: 6px; word-break: keep-all;">5. 생각의 외주화 경계</div>
                <div style="font-size: 12px; color: #555; line-height: 1.55; word-break: keep-all;">
                  사고 과정을 AI에 넘기면 문제해결력이 퇴화합니다. 항상 내 생각이 먼저이고, AI는 보조 도구여야 합니다.
                </div>
              </div>
            </div>
          </div>

          <!-- 자가 점검 체크리스트 바 -->
          <div style="background: #fdfbf7; border: 1px solid #fed7aa; border-radius: 16px; padding: 1.1rem 1.4rem;">
            <div style="font-weight: 700; font-size: 13.5px; color: #9a3412; margin-bottom: 6px;">📋 과제 제출 전 3초 자가 점검 체크리스트</div>
            <div style="font-size: 12.5px; color: #7c2d12; line-height: 1.6; display: flex; flex-direction: column; gap: 3px;">
              <span>✓ 내가 직접 읽고 이해하여 내 언어로 소화한 내용인가?</span>
              <span>✓ 제시된 통계와 논문 출처가 실제 공식 데이터베이스에 존재하는가?</span>
              <span>✓ 타인의 개인정보나 학교/기업의 비공개 데이터가 포함되지 않았는가?</span>
              <span>✓ 교수님의 AI 사용 지침을 확인하고, 필요한 경우 AI 활용 사실을 명시했는가?</span>
            </div>
          </div>
        </div>

      <!-- Google NotebookLM 완벽 사용 및 대학생 학업 활용 가이드 섹션 -->
      <div style="margin-top: var(--spacing-48); margin-bottom: var(--spacing-32);">
        <!-- 섹션 헤더 -->
        <div style="margin-bottom: var(--spacing-20);">
          <span style="font-family: var(--font-display); font-size: 16px; color: var(--color-ember); letter-spacing: 0.05em;">AI RESEARCH & STUDY NOTE WORKFLOW</span>
          <h2 style="font-size: clamp(24px, 3.5vw, 32px); color: var(--color-obsidian); margin-top: 4px;">📚 Google NotebookLM 완벽 사용 & 학업 활용 가이드</h2>
        </div>

          <!-- 카드 1: NotebookLM 개념 및 ChatGPT와의 결정적 차이 비교표 -->
          <div class="card" style="padding: 1.75rem 2rem; border: 1px solid var(--color-pumice); border-radius: 28px; background: #ffffff; margin-bottom: 1.5rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 1rem;">
              <h3 style="font-size: 18px; color: var(--color-obsidian); margin: 0; display: flex; align-items: center; gap: 8px;">
                <span>🔍 1. NotebookLM이란? (ChatGPT와의 결정적 차이)</span>
              </h3>
              <span style="background: #e0f2fe; color: #0369a1; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 999px;">
                Google Gemini 1.5 Pro 기반 소스 접지(Source-Grounded) RAG
              </span>
            </div>
            
            <p style="font-size: 13.5px; color: #555; line-height: 1.6; margin-bottom: 1.25rem; word-break: keep-all;">
              NotebookLM은 사용자가 직접 업로드한 문서만을 <strong>엄격한 진실의 원천(Source of Truth)</strong>으로 삼아 답변하는 맞춤형 AI 연구 노트입니다. 일반 생성형 AI와 달리 인터넷 전체의 불확실한 지식을 검색하지 않고, 제공된 자료 범위 내에서만 작동합니다.
            </p>

            <!-- 비교 테이블 -->
            <div style="overflow-x: auto; -webkit-overflow-scrolling: touch; margin-bottom: 1.5rem;">
              <table style="width: 100%; border-collapse: collapse; font-size: 13.5px; text-align: left; min-width: 620px; word-break: keep-all;">
                <thead>
                  <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                    <th style="padding: 12px 14px; font-weight: 700; color: #334155; width: 18%;">구분</th>
                    <th style="padding: 12px 14px; font-weight: 700; color: #64748b; width: 41%;">일반 범용 LLM (ChatGPT, Claude 등)</th>
                    <th style="padding: 12px 14px; font-weight: 700; color: #0284c7; width: 41%; background: #f0f9ff;">Google NotebookLM</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 12px 14px; font-weight: 700; color: #475569; background: #fdfbf9;">지식 출처</td>
                    <td style="padding: 12px 14px; color: #6b7280;">인터넷 전체 학습 데이터 (방대하지만 부정확할 수 있음)</td>
                    <td style="padding: 12px 14px; font-weight: 600; color: #0369a1; background: #f0f9ff;">사용자가 직접 업로드한 문서(Source)에만 엄격히 한정</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 12px 14px; font-weight: 700; color: #475569; background: #fdfbf9;">환각 (거짓 정보)</td>
                    <td style="padding: 12px 14px; color: #6b7280;">발생 가능성 상존 (그럴듯한 가짜 논문/통계 생성)</td>
                    <td style="padding: 12px 14px; font-weight: 600; color: #0369a1; background: #f0f9ff;">내가 준 문서 밖의 정보는 답변하지 않아 극소화</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 12px 14px; font-weight: 700; color: #475569; background: #fdfbf9;">출처 표기</td>
                    <td style="padding: 12px 14px; color: #6b7280;">출처가 없거나 지어낸 가짜 링크를 제공하는 경우 발생</td>
                    <td style="padding: 12px 14px; font-weight: 600; color: #0369a1; background: #f0f9ff;">모든 문장마다 원문 페이지/단락 번호 각주([1], [2]) 자동 첨부</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 14px; font-weight: 700; color: #475569; background: #fdfbf9;">최적 용도</td>
                    <td style="padding: 12px 14px; color: #6b7280;">브레인스토밍, 범용 코딩, 창의적 글쓰기, 언어 번역</td>
                    <td style="padding: 12px 14px; font-weight: 600; color: #0369a1; background: #f0f9ff;">전공 서적·학술 논문 분석, 시험 대비 족보 제작, 팀플 자료 대조</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- 핵심 특징 3대 배너 -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 0.85rem;">
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #0284c7; padding: 1rem 1.15rem; border-radius: 12px;">
                <div style="font-weight: 700; font-size: 13.5px; color: var(--color-obsidian); margin-bottom: 4px;">📌 철저한 소스 접지(Source-Grounded)</div>
                <div style="font-size: 12.5px; color: #4b5563; line-height: 1.55; word-break: keep-all;">
                  인터넷이 아니라, 내가 직접 올린 자료만을 근거로 하므로 연구의 객관적 맥락이 100% 보존됩니다.
                </div>
              </div>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid var(--color-ember); padding: 1rem 1.15rem; border-radius: 12px;">
                <div style="font-weight: 700; font-size: 13.5px; color: var(--color-obsidian); margin-bottom: 4px;">🔍 환각(거짓 정보)의 극소화</div>
                <div style="font-size: 12.5px; color: #4b5563; line-height: 1.55; word-break: keep-all;">
                  문서에 명시되지 않은 내용은 답변을 거부하므로, 엄밀한 사실 확인이 필요한 학술 리포트에 최적입니다.
                </div>
              </div>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #10b981; padding: 1rem 1.15rem; border-radius: 12px;">
                <div style="font-weight: 700; font-size: 13.5px; color: var(--color-obsidian); margin-bottom: 4px;">📑 1초 만에 원문 대조 (인라인 각주)</div>
                <div style="font-size: 12.5px; color: #4b5563; line-height: 1.55; word-break: keep-all;">
                  각주 번호를 클릭하면 원본 문서의 해당 페이지와 형광펜 하이라이트로 즉시 이동하여 검증이 완료됩니다.
                </div>
              </div>
            </div>
          </div>

          <!-- 카드 2: 대학생을 위한 핵심 기능 5선 (가로 1줄 5열 배치) -->
          <div class="card" style="padding: 1.75rem 2rem; border: 1px solid var(--color-pumice); border-radius: 28px; background: #ffffff; margin-bottom: 1.5rem;">
            <h3 style="font-size: 18px; color: var(--color-obsidian); margin-bottom: 1.25rem; display: flex; align-items: center; gap: 8px;">
              <span>⚡ 2. 대학생을 위한 핵심 탑재 기능 5선</span>
            </h3>

            <!-- 5대 핵심 기능 가로 1줄 5개 블록 배치 -->
            <div style="overflow-x: auto; -webkit-overflow-scrolling: touch;">
              <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.65rem; width: 100%; min-width: 680px;">
                <!-- 기능 1 -->
                <div style="background: #faf9f6; border: 1px solid var(--color-pumice); border-top: 3px solid #0284c7; border-radius: 14px; padding: 0.95rem 0.85rem; display: flex; flex-direction: column;">
                  <div style="font-weight: 700; font-size: 13px; color: #0284c7; margin-bottom: 6px; word-break: keep-all;">① 멀티 포맷 업로드</div>
                  <div style="font-size: 11.5px; color: #555; line-height: 1.5; word-break: keep-all;">
                    PDF, 구글 문서, 슬라이드, 웹 링크, 텍스트, <strong>유튜브 강의 링크</strong>까지 지원 (노트북당 50개 소스, 소스당 50만 단어)
                  </div>
                </div>

                <!-- 기능 2 -->
                <div style="background: #faf9f6; border: 1px solid var(--color-pumice); border-top: 3px solid #0284c7; border-radius: 14px; padding: 0.95rem 0.85rem; display: flex; flex-direction: column;">
                  <div style="font-weight: 700; font-size: 13px; color: #0284c7; margin-bottom: 6px; word-break: keep-all;">② 인라인 각주 원문 이동</div>
                  <div style="font-size: 11.5px; color: #555; line-height: 1.5; word-break: keep-all;">
                    답변 속 각주([1], [2]) 클릭 시 원본 문서의 해당 페이지와 형광펜 하이라이트 문장으로 즉시 화면 전환 및 1초 팩트체크
                  </div>
                </div>

                <!-- 기능 3 -->
                <div style="background: #faf9f6; border: 1px solid var(--color-pumice); border-top: 3px solid #0284c7; border-radius: 14px; padding: 0.95rem 0.85rem; display: flex; flex-direction: column;">
                  <div style="font-weight: 700; font-size: 13px; color: #0284c7; margin-bottom: 6px; word-break: keep-all;">③ Studio 자동 학습 도구</div>
                  <div style="font-size: 11.5px; color: #555; line-height: 1.5; word-break: keep-all;">
                    원클릭으로 <strong>스터디 가이드(핵심 질문·정답)</strong>, <strong>FAQ</strong>, <strong>브리핑 문서</strong>, <strong>타임라인</strong> 자동 생성
                  </div>
                </div>

                <!-- 기능 4 -->
                <div style="background: #faf9f6; border: 1px solid var(--color-pumice); border-top: 3px solid #0284c7; border-radius: 14px; padding: 0.95rem 0.85rem; display: flex; flex-direction: column;">
                  <div style="font-weight: 700; font-size: 13px; color: #0284c7; margin-bottom: 6px; word-break: keep-all;">④ 오디오 팟캐스트 복습</div>
                  <div style="font-size: 11.5px; color: #555; line-height: 1.5; word-break: keep-all;">
                    남/여 AI 호스트가 10~15분 라디오 토크로 재구성, 등하굣길이나 이동 중에 귀로 들으며 핵심 개념 복습
                  </div>
                </div>

                <!-- 기능 5 -->
                <div style="background: #faf9f6; border: 1px solid var(--color-pumice); border-top: 3px solid #0284c7; border-radius: 14px; padding: 0.95rem 0.85rem; display: flex; flex-direction: column;">
                  <div style="font-weight: 700; font-size: 13px; color: #0284c7; margin-bottom: 6px; word-break: keep-all;">⑤ 핀포인트 선택 Q&A</div>
                  <div style="font-size: 11.5px; color: #555; line-height: 1.5; word-break: keep-all;">
                    전체가 아니라 체크박스로 선택한 특정 1~2개 논문만을 타깃으로 지정해 질문하고 상반된 차이점 대조 분석
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 카드 3: 대학생 학업 실전 4대 시나리오 & 복사 가능한 실전 프롬프트 -->
          <div class="card" style="padding: 1.75rem 2rem; border: 1px solid var(--color-pumice); border-radius: 28px; background: #ffffff; margin-bottom: 1.5rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 1.25rem;">
              <h3 style="font-size: 18px; color: var(--color-obsidian); margin: 0; display: flex; align-items: center; gap: 8px;">
                <span>🎯 3. 대학생 학업 실전 활용 시나리오 4선 & 복사 프롬프트</span>
              </h3>
              <span style="font-size: 12.5px; color: #6b7280;">NotebookLM 채팅창에 붙여넣어 바로 실행하세요</span>
            </div>

            <div style="display: flex; flex-direction: column; gap: 1.15rem;">
              <!-- 시나리오 1 -->
              <div class="prompt-template-card" style="background: #faf9f6; border: 1px solid var(--color-pumice); border-radius: 18px; padding: 1.25rem 1.4rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;">
                  <div style="font-weight: 700; font-size: 14.5px; color: var(--color-obsidian); display: flex; align-items: center; gap: 6px;">
                    <span style="background: #0284c7; color: #fff; font-size: 11px; padding: 2px 7px; border-radius: 4px;">논문·원서 분석</span>
                    <span>시나리오 1. 50페이지가 넘는 전공 논문/원서 초고속 분석</span>
                  </div>
                  <button type="button" class="btn btn-outline" onclick="DashboardApp.copyPrompt(this)" style="font-size: 12px; padding: 4px 12px; border-radius: 999px; display: inline-flex; align-items: center; gap: 4px; border-color: #d1d5db; background: #ffffff; cursor: pointer;" title="프롬프트 복사하기">
                    <span>📋 프롬프트 복사</span>
                  </button>
                </div>
                <div style="font-size: 12.5px; color: #64748b; margin-bottom: 8px; line-height: 1.5; word-break: keep-all;">
                  <strong>활용 방법</strong>: 전공 논문 PDF를 소스로 등록한 뒤, 연구 가설과 방법론, 한계점을 인용 각주와 함께 10초 만에 추출합니다.
                </div>
                <pre style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 12px; font-size: 12px; color: #374151; white-space: pre-wrap; word-break: break-all; margin: 0; line-height: 1.55; font-family: inherit;">[역할] 너는 학술 논문 분석 전문 연구 튜터야.
[지시] 업로드된 논문 소스를 바탕으로 아래 핵심 내용을 명확하게 정리해 줘:
1. 연구의 핵심 배경 및 연구 질문(가설)
2. 실증 분석에 사용된 데이터와 연구 방법론
3. 최종 도출된 주요 결과 3가지와 연구의 한계점
[형식] 각 항목마다 반드시 본문 인용 각주([1], [2])를 표기하고, 표(Table) 또는 개조식으로 요약해 줘.</pre>
              </div>

              <!-- 시나리오 2 -->
              <div class="prompt-template-card" style="background: #faf9f6; border: 1px solid var(--color-pumice); border-radius: 18px; padding: 1.25rem 1.4rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;">
                  <div style="font-weight: 700; font-size: 14.5px; color: var(--color-obsidian); display: flex; align-items: center; gap: 6px;">
                    <span style="background: #0284c7; color: #fff; font-size: 11px; padding: 2px 7px; border-radius: 4px;">시험 대비</span>
                    <span>시나리오 2. 기말고사 대비 '나만의 족보 & 모의 퀴즈' 만들기</span>
                  </div>
                  <button type="button" class="btn btn-outline" onclick="DashboardApp.copyPrompt(this)" style="font-size: 12px; padding: 4px 12px; border-radius: 999px; display: inline-flex; align-items: center; gap: 4px; border-color: #d1d5db; background: #ffffff; cursor: pointer;" title="프롬프트 복사하기">
                    <span>📋 프롬프트 복사</span>
                  </button>
                </div>
                <div style="font-size: 12.5px; color: #64748b; margin-bottom: 8px; line-height: 1.5; word-break: keep-all;">
                  <strong>활용 방법</strong>: 교수님의 한 학기 교안(PPT)과 필기 노트를 모두 업로드하고, 서술형 예상 문제와 객관식 퀴즈를 출제합니다.
                </div>
                <pre style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 12px; font-size: 12px; color: #374151; white-space: pre-wrap; word-break: break-all; margin: 0; line-height: 1.55; font-family: inherit;">[역할] 너는 대학 전공 시험 출제 위원이자 학습 코치야.
[지시] 이번 학기 업로드된 교수님의 교안(PPT)과 강의 노트 전체를 분석해서:
1. 기말고사 서술형/단답형으로 출제될 확률이 가장 높은 핵심 개념 5개를 선정해 줘.
2. 각 개념마다 학부생 수준의 4지선다형 연습문제 1문제씩 출제하고, 해설과 정답은 맨 아래에 따로 배치해 줘.
[조건] 교안에 명시된 용어와 정의만을 근거로 출제할 것.</pre>
              </div>

              <!-- 시나리오 3 -->
              <div class="prompt-template-card" style="background: #faf9f6; border: 1px solid var(--color-pumice); border-radius: 18px; padding: 1.25rem 1.4rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;">
                  <div style="font-weight: 700; font-size: 14.5px; color: var(--color-obsidian); display: flex; align-items: center; gap: 6px;">
                    <span style="background: #0284c7; color: #fff; font-size: 11px; padding: 2px 7px; border-radius: 4px;">팀 프로젝트</span>
                    <span>시나리오 3. 팀 프로젝트 자료 취합 및 교차 비교 대조</span>
                  </div>
                  <button type="button" class="btn btn-outline" onclick="DashboardApp.copyPrompt(this)" style="font-size: 12px; padding: 4px 12px; border-radius: 999px; display: inline-flex; align-items: center; gap: 4px; border-color: #d1d5db; background: #ffffff; cursor: pointer;" title="프롬프트 복사하기">
                    <span>📋 프롬프트 복사</span>
                  </button>
                </div>
                <div style="font-size: 12.5px; color: #64748b; margin-bottom: 8px; line-height: 1.5; word-break: keep-all;">
                  <strong>활용 방법</strong>: 조원들이 각자 조사한 보고서·기사·통계를 한 노트북에 모으고, 상호 상충되는 관점이나 수치 차이를 비교합니다.
                </div>
                <pre style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 12px; font-size: 12px; color: #374151; white-space: pre-wrap; word-break: break-all; margin: 0; line-height: 1.55; font-family: inherit;">[역할] 너는 팀 프로젝트 리서치 검토 전문가야.
[지시] 우리 조원들이 각자 업로드한 소스 자료들을 교차 분석해 줘:
1. 각 소스가 공통적으로 동의하고 지지하는 핵심 논점 요약
2. 소스 간에 서로 상충되거나 데이터 수치 및 관점이 엇갈리는 부분 비교 대조
[형식] '논점 | 소스A 관점 | 소스B 관점 | 시사점' 형태의 비교표로 정리해 줘.</pre>
              </div>

              <!-- 시나리오 4 -->
              <div class="prompt-template-card" style="background: #faf9f6; border: 1px solid var(--color-pumice); border-radius: 18px; padding: 1.25rem 1.4rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;">
                  <div style="font-weight: 700; font-size: 14.5px; color: var(--color-obsidian); display: flex; align-items: center; gap: 6px;">
                    <span style="background: #0284c7; color: #fff; font-size: 11px; padding: 2px 7px; border-radius: 4px;">영상 특강</span>
                    <span>시나리오 4. 유튜브 학술 특강 & 긴 발표 영상 요약</span>
                  </div>
                  <button type="button" class="btn btn-outline" onclick="DashboardApp.copyPrompt(this)" style="font-size: 12px; padding: 4px 12px; border-radius: 999px; display: inline-flex; align-items: center; gap: 4px; border-color: #d1d5db; background: #ffffff; cursor: pointer;" title="프롬프트 복사하기">
                    <span>📋 프롬프트 복사</span>
                  </button>
                </div>
                <div style="font-size: 12.5px; color: #64748b; margin-bottom: 8px; line-height: 1.5; word-break: keep-all;">
                  <strong>활용 방법</strong>: 1~2시간짜리 해외 석학 강의나 세미나 유튜브 URL을 추가하여 핵심 메시지와 타임라인을 일목요연하게 파악합니다.
                </div>
                <pre style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 12px; font-size: 12px; color: #374151; white-space: pre-wrap; word-break: break-all; margin: 0; line-height: 1.55; font-family: inherit;">[역할] 너는 학술 세미나 및 콘퍼런스 전문 서머라이저야.
[지시] 추가된 유튜브 영상 소스의 전체 내용을 분석해서:
1. 연사가 청중에게 전달하고자 하는 3대 핵심 메시지 요약
2. 주요 발표 구간(타임스탬프 흐름)별 핵심 논의 내용 정리
3. 우리 전공 과제에 접목할 수 있는 실천 아이디어 2가지 제안</pre>
              </div>
            </div>
          </div>

          <!-- 카드 4: 슬라이드(PPT) & 인포그래픽 제작을 위한 스튜디오 활용 가이드 -->
          <div class="card" style="padding: 1.75rem 2rem; border: 1px solid var(--color-pumice); border-radius: 28px; background: #ffffff; margin-bottom: 1.5rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 1rem;">
              <h3 style="font-size: 18px; color: var(--color-obsidian); margin: 0; display: flex; align-items: center; gap: 8px;">
                <span>📊 4. 슬라이드 자료 & 인포그래픽 제작을 위한 스튜디오 활용 가이드</span>
              </h3>
            </div>

            <p style="font-size: 13.5px; color: #555; line-height: 1.6; margin-bottom: 1.25rem; word-break: keep-all;">
              NotebookLM은 직접 그래픽 이미지나 PPTX 파일을 그려내지는 않지만, 업로드된 방대한 문서에서 <strong>'슬라이드별 레이아웃·핵심 문구·발표 대본'</strong> 및 <strong>'인포그래픽용 데이터·비교 구조'</strong>를 가장 정확하게 추출해 주므로, 이를 복사하여 <strong>Gamma, Canva, PowerPoint</strong>에 붙여넣으면 5분 만에 고품질 시각 자료가 완성됩니다.
            </p>

            <div style="display: flex; flex-direction: column; gap: 1.15rem; margin-bottom: 1.5rem;">
              <!-- 1. 슬라이드 발표자료 제작용 프롬프트 -->
              <div class="prompt-template-card" style="background: #faf9f6; border: 1px solid var(--color-pumice); border-radius: 18px; padding: 1.25rem 1.4rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;">
                  <div style="font-weight: 700; font-size: 14.5px; color: var(--color-obsidian); display: flex; align-items: center; gap: 6px;">
                    <span style="background: #0284c7; color: #fff; font-size: 11px; padding: 2px 7px; border-radius: 4px;">PPT 제작</span>
                    <span>1. 📊 슬라이드(PPT) 발표 자료 제작용 요청 가이드</span>
                  </div>
                  <button type="button" class="btn btn-outline" onclick="DashboardApp.copyPrompt(this)" style="font-size: 12px; padding: 4px 12px; border-radius: 999px; display: inline-flex; align-items: center; gap: 4px; border-color: #d1d5db; background: #ffffff; cursor: pointer;" title="프롬프트 복사하기">
                    <span>📋 프롬프트 복사</span>
                  </button>
                </div>
                <div style="font-size: 12.5px; color: #64748b; margin-bottom: 8px; line-height: 1.5; word-break: keep-all;">
                  <strong>활용 방법</strong>: 긴 논문이나 전공 교안을 "발표용 6~8장 슬라이드 덱 구조"로 변환할 때 중앙 채팅창에 입력합니다.
                </div>
                <pre style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 12px; font-size: 12px; color: #374151; white-space: pre-wrap; word-break: break-all; margin: 0; line-height: 1.55; font-family: inherit;">[목표] 업로드된 소스 자료를 바탕으로 대학생 팀플 발표용 "7장 슬라이드 기획안"을 작성해 줘.

[자료 설명 및 청중]
- 대상 청중: 이 분야를 처음 접하는 동료 학부생 및 교수님
- 발표 시간: 약 7~10분

[슬라이드별 요청 구성]
각 슬라이드마다 다음 4가지 요소를 반드시 포함해서 정리해 줘:
1. 슬라이드 제목 & 한 줄 핵심 메시지(헤드카피)
2. 본문 내용 (단락 글이 아닌, 3~4개의 간결한 개조식 불릿포인트)
3. 화면 비주얼 연출 아이디어 (배치할 다이어그램 형태, 추천 이미지/아이콘, 좌우 2분할 배치 등)
4. 발표자 구술 스크립트 (30~40초 분량의 자연스러운 한국어 구어체)

[조건] 업로드된 소스의 수치와 핵심 용어를 그대로 유지하고, 각 슬라이드마다 원문 인용 각주([1], [2])를 달아 팩트체크할 수 있게 해 줘.</pre>
              </div>

              <!-- 2. 인포그래픽 제작용 프롬프트 -->
              <div class="prompt-template-card" style="background: #faf9f6; border: 1px solid var(--color-pumice); border-radius: 18px; padding: 1.25rem 1.4rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;">
                  <div style="font-weight: 700; font-size: 14.5px; color: var(--color-obsidian); display: flex; align-items: center; gap: 6px;">
                    <span style="background: #be185d; color: #fff; font-size: 11px; padding: 2px 7px; border-radius: 4px;">인포그래픽</span>
                    <span>2. 🎨 인포그래픽 & 카드뉴스 제작용 요청 가이드</span>
                  </div>
                  <button type="button" class="btn btn-outline" onclick="DashboardApp.copyPrompt(this)" style="font-size: 12px; padding: 4px 12px; border-radius: 999px; display: inline-flex; align-items: center; gap: 4px; border-color: #d1d5db; background: #ffffff; cursor: pointer;" title="프롬프트 복사하기">
                    <span>📋 프롬프트 복사</span>
                  </button>
                </div>
                <div style="font-size: 12.5px; color: #64748b; margin-bottom: 8px; line-height: 1.5; word-break: keep-all;">
                  <strong>활용 방법</strong>: 복잡한 개념이나 통계 자료를 한눈에 들어오는 디자인 기획서 포맷으로 추출합니다.
                </div>
                <pre style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 12px; font-size: 12px; color: #374151; white-space: pre-wrap; word-break: break-all; margin: 0; line-height: 1.55; font-family: inherit;">[목표] 업로드된 자료를 인포그래픽(또는 카드뉴스)으로 제작할 수 있도록 "시각화 기획 데이터"를 추출해 줘.

[요청 사항]
1. 핵심 데이터 & 수치 3선: 가장 충격적이거나 중요한 숫자(%, 연도, 증감율 등)를 큰 폰트로 강조할 수 있게 추출
2. 구조화 다이어그램:
   - 문서의 핵심 흐름을 '단계별 프로세스(Step 1 → Step 2 → Step 3)' 또는 '비교 대조(기존 vs 신규)' 구조로 정리
   - Mermaid 플로우차트 코드나 마크다운 표(Table)로 시각화 표현 제공
3. 키워드 & 픽토그램 매칭:
   - 슬라이드나 카드뉴스 아이콘으로 쓸 수 있는 핵심 키워드 4개와 어울리는 아이콘 메타포(예: 돋보기, 방패, 번개 등) 추천
4. 3줄 요약 테이크어웨이(Takeaway): 독자가 기억해야 할 핵심 결론

[조건] 텍스트를 길게 쓰지 말고, 디자이너에게 바로 전달할 수 있는 디자인 기획서 포맷으로 작성해 줘.</pre>
              </div>

              <!-- 3. 오디오 오버뷰 맞춤설정 프롬프트 -->
              <div class="prompt-template-card" style="background: #faf9f6; border: 1px solid var(--color-pumice); border-radius: 18px; padding: 1.25rem 1.4rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;">
                  <div style="font-weight: 700; font-size: 14.5px; color: var(--color-obsidian); display: flex; align-items: center; gap: 6px;">
                    <span style="background: #7c3aed; color: #fff; font-size: 11px; padding: 2px 7px; border-radius: 4px;">오디오 맞춤</span>
                    <span>3. 🎙️ 스튜디오 '오디오 오버뷰' 커스터마이징 지시문</span>
                  </div>
                  <button type="button" class="btn btn-outline" onclick="DashboardApp.copyPrompt(this)" style="font-size: 12px; padding: 4px 12px; border-radius: 999px; display: inline-flex; align-items: center; gap: 4px; border-color: #d1d5db; background: #ffffff; cursor: pointer;" title="프롬프트 복사하기">
                    <span>📋 프롬프트 복사</span>
                  </button>
                </div>
                <div style="font-size: 12.5px; color: #64748b; margin-bottom: 8px; line-height: 1.5; word-break: keep-all;">
                  <strong>활용 방법</strong>: NotebookLM 우측 Studio의 [오디오 생성] 옆 <strong>[맞춤설정(Customize)]</strong> 창에 입력하여 발표 전 예행연습 및 쟁점 토론을 유도합니다.
                </div>
                <pre style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 12px; font-size: 12px; color: #374151; white-space: pre-wrap; word-break: break-all; margin: 0; line-height: 1.55; font-family: inherit;">이번 발표 슬라이드의 핵심 주제는 [예: 인공지능 윤리와 저작권 분쟁]입니다. 
지루한 학술 용어 나열보다는, 대학생들이 실생활에서 겪을 수 있는 구체적인 딜레마 사례를 중심으로 남녀 호스트가 열띤 토론을 벌여 주세요. 
특히 청중들이 가장 궁금해할 '핵심 쟁점 3가지'와 '한계점'을 집중적으로 다뤄 주면 좋겠습니다.</pre>
              </div>
            </div>

            <!-- 4. 실전 연계 워크플로우 3단계 -->
            <div style="border-top: 1px solid #e5e7eb; padding-top: 1.25rem;">
              <div style="font-weight: 700; font-size: 14px; color: var(--color-obsidian); margin-bottom: 0.85rem;">
                🚀 4. 추천 실전 연계 워크플로우 (초고속 시각화 3단계)
              </div>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 0.85rem;">
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 1rem;">
                  <div style="font-weight: 700; font-size: 13px; color: #0284c7; margin-bottom: 4px;">Step 1. NotebookLM 추출 & 저장</div>
                  <div style="font-size: 12px; color: #555; line-height: 1.5; word-break: keep-all;">
                    위 프롬프트로 슬라이드 개요 및 시각화 데이터를 생성한 후, 우하단 <strong>[노트로 저장]</strong> 핀 아이콘을 누릅니다.
                  </div>
                </div>
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 1rem;">
                  <div style="font-weight: 700; font-size: 13px; color: #be185d; margin-bottom: 4px;">Step 2. Gamma App으로 10초 PPT</div>
                  <div style="font-size: 12px; color: #555; line-height: 1.5; word-break: keep-all;">
                    <a href="https://gamma.app" target="_blank" rel="noopener noreferrer" style="color: #be185d; font-weight: 600;">Gamma App ↗</a>에 추출된 슬라이드 개요를 붙여넣으면 10초 만에 완벽한 비주얼 슬라이드가 자동 렌더링됩니다.
                  </div>
                </div>
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 1rem;">
                  <div style="font-weight: 700; font-size: 13px; color: #10b981; margin-bottom: 4px;">Step 3. Canva & PPT 리허설</div>
                  <div style="font-size: 12px; color: #555; line-height: 1.5; word-break: keep-all;">
                    Canva 템플릿에 핵심 수치를 대입하거나, PowerPoint 발표자 메모란에 NotebookLM 구술 스크립트를 넣어 리허설을 진행합니다.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 카드 5: 200% 활용 꿀팁 및 학술 윤리 준수 가이드 -->
          <div class="card" style="padding: 1.75rem 2rem; border: 1px solid var(--color-pumice); border-radius: 28px; background: #ffffff; margin-bottom: 1.5rem;">
            <h3 style="font-size: 18px; color: var(--color-obsidian); margin-bottom: 1.25rem; display: flex; align-items: center; gap: 8px;">
              <span>💡 5. NotebookLM 200% 활용 실전 꿀팁 & 필수 학술 윤리</span>
            </h3>

            <!-- 꿀팁 3선 -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
              <div style="background: #faf9f6; border: 1px solid var(--color-pumice); border-radius: 16px; padding: 1.15rem;">
                <div style="font-weight: 700; font-size: 13.5px; color: var(--color-obsidian); margin-bottom: 5px;">1. 과목별/프로젝트별 노트북 분리</div>
                <div style="font-size: 12px; color: #555; line-height: 1.55; word-break: keep-all;">
                  모든 교양과 전공 자료를 한 노트북에 섞지 말고, [경영학 중간고사], [캡스톤 기획서]처럼 프로젝트별로 노트북을 분리해야 답변 정확도가 유지됩니다.
                </div>
              </div>
              <div style="background: #faf9f6; border: 1px solid var(--color-pumice); border-radius: 16px; padding: 1.15rem;">
                <div style="font-weight: 700; font-size: 13.5px; color: var(--color-obsidian); margin-bottom: 5px;">2. 복사한 메모(Notes)를 소스로 승격</div>
                <div style="font-size: 12px; color: #555; line-height: 1.55; word-break: keep-all;">
                  질문-답변 중 유용한 내용을 '노트로 저장'한 뒤, 해당 노트들을 다시 소스로 지정하여 2차 종합 보고서를 작성하는 '심층 학습 파이프라인'을 구성할 수 있습니다.
                </div>
              </div>
              <div style="background: #faf9f6; border: 1px solid var(--color-pumice); border-radius: 16px; padding: 1.15rem;">
                <div style="font-weight: 700; font-size: 13.5px; color: var(--color-obsidian); margin-bottom: 5px;">3. 영문 논문도 한국어로 질문 가능</div>
                <div style="font-size: 12px; color: #555; line-height: 1.55; word-break: keep-all;">
                  외국 원서나 영어 논문 PDF를 올린 뒤 한국어로 질문하면, 영문 원문의 맥락과 인용을 정확히 유지하면서 자연스러운 고품질 한국어로 답변합니다.
                </div>
              </div>
            </div>

            <!-- 대학생 이용 수칙 표 -->
            <div style="overflow-x: auto; -webkit-overflow-scrolling: touch;">
              <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; min-width: 580px; word-break: keep-all;">
                <thead>
                  <tr style="background: #fef2f2; border-bottom: 2px solid #fecaca;">
                    <th style="padding: 10px 14px; font-weight: 700; color: #991b1b; width: 25%;">필수 준수 수칙</th>
                    <th style="padding: 10px 14px; font-weight: 700; color: #991b1b; width: 75%;">핵심 실천 지침</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style="border-bottom: 1px solid #fee2e2;">
                    <td style="padding: 11px 14px; font-weight: 700; color: #b91c1c;">저작권 보호</td>
                    <td style="padding: 11px 14px; color: #4b5563;">유료 도서 전체 복제본이나 비공개 유료 학술 DB 논문을 외부에 무단 공개된 공용 노트북에 업로드하지 마세요.</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #fee2e2;">
                    <td style="padding: 11px 14px; font-weight: 700; color: #b91c1c;">정식 학술 인용</td>
                    <td style="padding: 11px 14px; color: #4b5563;">요약문을 그대로 복붙 제출하면 표절입니다. 반드시 인라인 각주를 클릭해 원저자·논문명·페이지를 확인 후 정식 출처를 명시하세요.</td>
                  </tr>
                  <tr>
                    <td style="padding: 11px 14px; font-weight: 700; color: #b91c1c;">시험 치팅 금지</td>
                    <td style="padding: 11px 14px; color: #4b5563;">시험 도중 실시간 검색 용도로 사용하는 것은 학칙상 부정행위입니다. 반드시 시험 전 사전 학습 및 복습 용도로만 활용해야 합니다.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        <!-- ======================================================== -->
        <!-- 6. Google 스프레드시트 =GEMINI() 함수 완벽 활용 가이드 -->
        <!-- ======================================================== -->
        <div style="margin-top: 3.5rem; margin-bottom: var(--spacing-20);">
          <span style="font-family: var(--font-display); font-size: 16px; color: #059669; letter-spacing: 0.05em; font-weight: 700;">SPREADSHEET AUTOMATION & BULK AI WORKFLOW</span>
          <h2 style="font-size: clamp(24px, 3.5vw, 32px); color: var(--color-obsidian); margin-top: 4px;">📊 Google 스프레드시트 =GEMINI() 함수 완벽 활용 가이드</h2>
        </div>

        <!-- 카드 6-1: 기본 개념 및 수식 문법 (Syntax) -->
        <div class="card" style="padding: 1.75rem 2rem; border: 1px solid var(--color-pumice); border-radius: 28px; background: #ffffff; margin-bottom: 1.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 1.15rem;">
            <h3 style="font-size: 18px; color: var(--color-obsidian); margin: 0; display: flex; align-items: center; gap: 8px;">
              <span>💡 1. 기본 개념 및 수식 문법 (Syntax & 작동 원리)</span>
            </h3>
            <span style="background: #ecfdf5; color: #047857; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 999px; border: 1px solid #a7f3d0;">
              Google Sheets × Gemini 1.5 Pro 대량 일괄 자동화
            </span>
          </div>

          <p style="font-size: 14px; color: #475569; line-height: 1.65; margin-bottom: 1.25rem; word-break: keep-all;">
            Google 스프레드시트의 <code>=GEMINI()</code> 함수는 시트의 셀 안에서 거대언어모델(Gemini)을 일반 엑셀 수식(<code>=SUM</code>, <code>=VLOOKUP</code> 등)처럼 직접 호출하여, <strong>텍스트 요약·분류·데이터 정제·번역·콘텐츠 생성</strong>을 수백~수천 행 단위로 일괄 자동화할 수 있는 강력한 기능입니다.
          </p>

          <!-- 기본 문법 박스 -->
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-left: 5px solid #10b981; padding: 1.25rem 1.5rem; border-radius: 16px; margin-bottom: 1.5rem;">
            <div style="font-weight: 700; font-size: 14px; color: #065f46; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
              <span>📌 기본 수식 문법 구조</span>
            </div>
            <div style="background: #ffffff; border: 1px solid #86efac; border-radius: 10px; padding: 12px 16px; margin-bottom: 12px;">
              <code style="font-family: var(--font-mono); font-size: 15px; color: #047857; font-weight: 700;">=GEMINI("프롬프트(지시문)", [참조_셀_또는_범위])</code>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 10px; font-size: 12.5px; color: #374151; line-height: 1.55;">
              <div style="background: rgba(255, 255, 255, 0.7); padding: 8px 12px; border-radius: 8px; border: 1px solid #dcfce7;">
                • <strong style="color: #065f46;">"프롬프트" (필수)</strong>: Gemini에게 시킬 구체적인 명령 및 처리 규칙 (따옴표 <code>""</code>로 감싸서 작성)
              </div>
              <div style="background: rgba(255, 255, 255, 0.7); padding: 8px 12px; border-radius: 8px; border: 1px solid #dcfce7;">
                • <strong style="color: #065f46;">[참조_셀_또는_범위] (선택/권장)</strong>: 분석하거나 변환할 텍스트가 들어있는 셀 (예: <code>A2</code>, <code>B2:C2</code>)
              </div>
            </div>
          </div>

          <!-- 핵심 특징 3대 배너 -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 0.85rem;">
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #10b981; padding: 1rem 1.15rem; border-radius: 14px;">
              <div style="font-weight: 700; font-size: 13.5px; color: var(--color-obsidian); margin-bottom: 4px;">🔄 셀 단위 대량 일괄 처리 (드래그 자동화)</div>
              <div style="font-size: 12px; color: #4b5563; line-height: 1.55; word-break: keep-all;">
                첫 행에 수식을 입력하고 핸들을 아래로 더블클릭/드래그하면 수백 건의 비정형 텍스트를 순식간에 일괄 가공합니다.
              </div>
            </div>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #0284c7; padding: 1rem 1.15rem; border-radius: 14px;">
              <div style="font-weight: 700; font-size: 13.5px; color: var(--color-obsidian); margin-bottom: 4px;">🤖 Gemini 1.5 Pro의 방대한 문맥 이해력</div>
              <div style="font-size: 12px; color: #4b5563; line-height: 1.55; word-break: keep-all;">
                단순 키워드 매칭을 넘어 글의 뉘앙스, 숨은 의도, 격식, 복잡한 비즈니스 문맥까지 정확하게 파악해 처리합니다.
              </div>
            </div>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid var(--color-ember); padding: 1rem 1.15rem; border-radius: 14px;">
              <div style="font-weight: 700; font-size: 13.5px; color: var(--color-obsidian); margin-bottom: 4px;">🔗 엑셀 연산자(&)와 결합된 동적 파이프라인</div>
              <div style="font-size: 12px; color: #4b5563; line-height: 1.55; word-break: keep-all;">
                고객명, 부서명, 설문 점수 등 여러 열의 데이터를 동적으로 주입하여 수백 명 대상 맞춤형 피드백을 자동 생성합니다.
              </div>
            </div>
          </div>
        </div>

        <!-- 카드 6-2: 대표 활용 분야 5선 & 실전 수식 템플릿 (9개 수식 완벽 수록) -->
        <div class="card" style="padding: 1.75rem 2rem; border: 1px solid var(--color-pumice); border-radius: 28px; background: #ffffff; margin-bottom: 1.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 1.15rem;">
            <h3 style="font-size: 18px; color: var(--color-obsidian); margin: 0; display: flex; align-items: center; gap: 8px;">
              <span>⚡ 2. 대표 활용 분야 5선 & 실전 수식 예시 (원클릭 복사)</span>
            </h3>
            <span style="background: #e0f2fe; color: #0369a1; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 999px; border: 1px solid #bae6fd;">
              GEMINI.md 9대 실전 엑셀 수식 전수 탑재
            </span>
          </div>

          <p style="font-size: 13.5px; color: #64748b; line-height: 1.6; margin-bottom: 1.5rem; word-break: keep-all;">
            실무와 학업에서 가장 자주 쓰이는 5가지 시나리오별 수식입니다. 우측의 <strong>[📋 수식 복사]</strong> 버튼을 누른 후 스프레드시트 셀에 붙여넣고 참조 셀 주소(<code>A2</code>, <code>B2</code> 등)만 알맞게 수정하세요.
          </p>

          <div style="display: flex; flex-direction: column; gap: 1.25rem;">
            <!-- ① 데이터 분류 및 감정 분석 -->
            <div style="background: #faf9f6; border: 1px solid var(--color-pumice); border-radius: 18px; padding: 1.25rem 1.4rem;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                <span style="font-size: 16px;">💬</span>
                <span style="font-weight: 700; font-size: 15px; color: var(--color-obsidian);">① 데이터 분류 및 감정 분석 (Sentiment Analysis)</span>
              </div>
              <div style="font-size: 13px; color: #64748b; margin-bottom: 12px; word-break: keep-all;">
                설문조사 주관식 답변, 고객 만족도 조사, 피드백을 단어 하나로 깔끔하게 라벨링합니다.
              </div>
              <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                <!-- 수식 1 -->
                <div class="prompt-template-card" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 0.95rem 1.1rem;">
                  <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 6px;">
                    <span style="font-weight: 700; font-size: 12.5px; color: #0284c7;">수식 A · 고객 리뷰 3단계 감정 라벨링</span>
                    <button type="button" class="btn btn-outline" onclick="DashboardApp.copyPrompt(this)" style="font-size: 11.5px; padding: 3px 10px; border-radius: 999px; background: #fff; border-color: #cbd5e1; cursor: pointer;">
                      <span>📋 수식 복사</span>
                    </button>
                  </div>
                  <pre style="background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px 12px; font-size: 12.5px; color: #1e293b; white-space: pre-wrap; word-break: break-all; margin: 0; font-family: var(--font-mono);">=GEMINI("다음 리뷰의 감정을 [긍정 / 부정 / 중립] 중 단어 하나로만 분류해줘:", A2)</pre>
                </div>
                <!-- 수식 2 -->
                <div class="prompt-template-card" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 0.95rem 1.1rem;">
                  <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 6px;">
                    <span style="font-weight: 700; font-size: 12.5px; color: #0284c7;">수식 B · CS 고객 문의 카테고리 자동 분류</span>
                    <button type="button" class="btn btn-outline" onclick="DashboardApp.copyPrompt(this)" style="font-size: 11.5px; padding: 3px 10px; border-radius: 999px; background: #fff; border-color: #cbd5e1; cursor: pointer;">
                      <span>📋 수식 복사</span>
                    </button>
                  </div>
                  <pre style="background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px 12px; font-size: 12.5px; color: #1e293b; white-space: pre-wrap; word-break: break-all; margin: 0; font-family: var(--font-mono);">=GEMINI("다음 문의 내용을 [결제 / 배송 / 환불 / 단순문의] 중 하나로만 분류해줘:", B2)</pre>
                </div>
              </div>
            </div>

            <!-- ② 비정형 텍스트 요약 및 핵심 추출 -->
            <div style="background: #faf9f6; border: 1px solid var(--color-pumice); border-radius: 18px; padding: 1.25rem 1.4rem;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                <span style="font-size: 16px;">📝</span>
                <span style="font-weight: 700; font-size: 15px; color: var(--color-obsidian);">② 비정형 텍스트 요약 및 핵심 추출 (Extraction)</span>
              </div>
              <div style="font-size: 13px; color: #64748b; margin-bottom: 12px; word-break: keep-all;">
                긴 줄글, 이메일 본문, 회의록 등에서 핵심만 1줄 요약하거나 특정 데이터만 뽑아냅니다.
              </div>
              <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                <!-- 수식 1 -->
                <div class="prompt-template-card" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 0.95rem 1.1rem;">
                  <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 6px;">
                    <span style="font-weight: 700; font-size: 12.5px; color: #0284c7;">수식 A · 상담 내용 핵심 쟁점 30자 한 줄 요약</span>
                    <button type="button" class="btn btn-outline" onclick="DashboardApp.copyPrompt(this)" style="font-size: 11.5px; padding: 3px 10px; border-radius: 999px; background: #fff; border-color: #cbd5e1; cursor: pointer;">
                      <span>📋 수식 복사</span>
                    </button>
                  </div>
                  <pre style="background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px 12px; font-size: 12.5px; color: #1e293b; white-space: pre-wrap; word-break: break-all; margin: 0; font-family: var(--font-mono);">=GEMINI("다음 고객 상담 내용의 핵심 쟁점을 30자 이내의 한 문장으로 요약해줘:", A2)</pre>
                </div>
                <!-- 수식 2 -->
                <div class="prompt-template-card" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 0.95rem 1.1rem;">
                  <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 6px;">
                    <span style="font-weight: 700; font-size: 12.5px; color: #0284c7;">수식 B · 줄글 속 이메일 주소 정밀 추출 (미존재 시 '없음')</span>
                    <button type="button" class="btn btn-outline" onclick="DashboardApp.copyPrompt(this)" style="font-size: 11.5px; padding: 3px 10px; border-radius: 999px; background: #fff; border-color: #cbd5e1; cursor: pointer;">
                      <span>📋 수식 복사</span>
                    </button>
                  </div>
                  <pre style="background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px 12px; font-size: 12.5px; color: #1e293b; white-space: pre-wrap; word-break: break-all; margin: 0; font-family: var(--font-mono);">=GEMINI("다음 텍스트에서 '이메일 주소'만 추출해서 출력해줘. 없으면 '없음'이라고 써줘:", C2)</pre>
                </div>
              </div>
            </div>

            <!-- ③ 데이터 정제 및 양식 표준화 -->
            <div style="background: #faf9f6; border: 1px solid var(--color-pumice); border-radius: 18px; padding: 1.25rem 1.4rem;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                <span style="font-size: 16px;">🧹</span>
                <span style="font-weight: 700; font-size: 15px; color: var(--color-obsidian);">③ 데이터 정제 및 양식 표준화 (Data Cleansing)</span>
              </div>
              <div style="font-size: 13px; color: #64748b; margin-bottom: 12px; word-break: keep-all;">
                오타 교정, 들쑥날쑥한 주소 체계 통일, 표준 규격 포맷팅을 수행합니다.
              </div>
              <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                <!-- 수식 1 -->
                <div class="prompt-template-card" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 0.95rem 1.1rem;">
                  <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 6px;">
                    <span style="font-weight: 700; font-size: 12.5px; color: #0284c7;">수식 A · 제품명 오타 교정 및 공식 표준 표기법 통일</span>
                    <button type="button" class="btn btn-outline" onclick="DashboardApp.copyPrompt(this)" style="font-size: 11.5px; padding: 3px 10px; border-radius: 999px; background: #fff; border-color: #cbd5e1; cursor: pointer;">
                      <span>📋 수식 복사</span>
                    </button>
                  </div>
                  <pre style="background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px 12px; font-size: 12.5px; color: #1e293b; white-space: pre-wrap; word-break: break-all; margin: 0; font-family: var(--font-mono);">=GEMINI("다음 오타가 섞인 제품명을 공식 표준 한국어 표기법으로 교정해줘:", A2)</pre>
                </div>
                <!-- 수식 2 -->
                <div class="prompt-template-card" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 0.95rem 1.1rem;">
                  <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 6px;">
                    <span style="font-weight: 700; font-size: 12.5px; color: #0284c7;">수식 B · 비정형 주소 표준 행정구역 포맷 변환</span>
                    <button type="button" class="btn btn-outline" onclick="DashboardApp.copyPrompt(this)" style="font-size: 11.5px; padding: 3px 10px; border-radius: 999px; background: #fff; border-color: #cbd5e1; cursor: pointer;">
                      <span>📋 수식 복사</span>
                    </button>
                  </div>
                  <pre style="background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px 12px; font-size: 12.5px; color: #1e293b; white-space: pre-wrap; word-break: break-all; margin: 0; font-family: var(--font-mono);">=GEMINI("다음 비정형 주소를 [시/도 구/군 동/면/읍] 표준 행정구역 포맷으로 변환해줘:", B2)</pre>
                </div>
              </div>
            </div>

            <!-- ④ 다국어 번역 및 비즈니스 문체 톤앤매너 변환 -->
            <div style="background: #faf9f6; border: 1px solid var(--color-pumice); border-radius: 18px; padding: 1.25rem 1.4rem;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                <span style="font-size: 16px;">🌐</span>
                <span style="font-weight: 700; font-size: 15px; color: var(--color-obsidian);">④ 다국어 번역 및 비즈니스 문체 톤앤매너 변환</span>
              </div>
              <div style="font-size: 13px; color: #64748b; margin-bottom: 12px; word-break: keep-all;">
                단순 직역을 넘어, 상황에 맞는 전문적인 비즈니스 톤으로 문장 구조를 바꿉니다.
              </div>
              <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                <!-- 수식 1 -->
                <div class="prompt-template-card" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 0.95rem 1.1rem;">
                  <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 6px;">
                    <span style="font-weight: 700; font-size: 12.5px; color: #0284c7;">수식 A · 바이어용 정중하고 격식 있는 비즈니스 영어 번역</span>
                    <button type="button" class="btn btn-outline" onclick="DashboardApp.copyPrompt(this)" style="font-size: 11.5px; padding: 3px 10px; border-radius: 999px; background: #fff; border-color: #cbd5e1; cursor: pointer;">
                      <span>📋 수식 복사</span>
                    </button>
                  </div>
                  <pre style="background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px 12px; font-size: 12.5px; color: #1e293b; white-space: pre-wrap; word-break: break-all; margin: 0; font-family: var(--font-mono);">=GEMINI("다음 문장을 해외 바이어에게 보낼 정중하고 격식 있는 비즈니스 영어로 번역해줘:", A2)</pre>
                </div>
                <!-- 수식 2 -->
                <div class="prompt-template-card" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 0.95rem 1.1rem;">
                  <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 6px;">
                    <span style="font-weight: 700; font-size: 12.5px; color: #0284c7;">수식 B · 딱딱한 공지문을 대학생 친화적 알림톡 말투로 변환</span>
                    <button type="button" class="btn btn-outline" onclick="DashboardApp.copyPrompt(this)" style="font-size: 11.5px; padding: 3px 10px; border-radius: 999px; background: #fff; border-color: #cbd5e1; cursor: pointer;">
                      <span>📋 수식 복사</span>
                    </button>
                  </div>
                  <pre style="background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px 12px; font-size: 12.5px; color: #1e293b; white-space: pre-wrap; word-break: break-all; margin: 0; font-family: var(--font-mono);">=GEMINI("다음 딱딱한 안내 공지문을 대학생들에게 친근한 카카오톡 알림톡 말투로 바꿔줘:", A2)</pre>
                </div>
              </div>
            </div>

            <!-- ⑤ 마케팅 카피 및 맞춤형 콘텐츠 대량 생성 -->
            <div style="background: #faf9f6; border: 1px solid var(--color-pumice); border-radius: 18px; padding: 1.25rem 1.4rem;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                <span style="font-size: 16px;">🎯</span>
                <span style="font-weight: 700; font-size: 15px; color: var(--color-obsidian);">⑤ 마케팅 카피 및 맞춤형 콘텐츠 대량 생성 (Column 조합)</span>
              </div>
              <div style="font-size: 13px; color: #64748b; margin-bottom: 12px; word-break: keep-all;">
                여러 열(Column)의 데이터를 조합하여 개인화된 문구나 상품 설명문을 생성합니다.
              </div>
              <div class="prompt-template-card" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 0.95rem 1.1rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 6px;">
                  <span style="font-weight: 700; font-size: 12.5px; color: #0284c7;">수식 · [상품명]과 [핵심 타깃] 범위(A2:B2) 결합 맞춤형 SNS 카피</span>
                  <button type="button" class="btn btn-outline" onclick="DashboardApp.copyPrompt(this)" style="font-size: 11.5px; padding: 3px 10px; border-radius: 999px; background: #fff; border-color: #cbd5e1; cursor: pointer;">
                    <span>📋 수식 복사</span>
                  </button>
                </div>
                <pre style="background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px 12px; font-size: 12.5px; color: #1e293b; white-space: pre-wrap; word-break: break-all; margin: 0; font-family: var(--font-mono);">=GEMINI("A열의 [상품명]과 B열의 [핵심 타깃]을 고려해 20자 내외의 매력적인 인스타그램 광고 카피를 써줘", A2:B2)</pre>
              </div>
            </div>
          </div>
        </div>

        <!-- 카드 6-3: 프롬프트 작성 시 핵심 팁 (시트 최적화 요령) -->
        <div class="card" style="padding: 1.75rem 2rem; border: 1px solid var(--color-pumice); border-radius: 28px; background: #ffffff; margin-bottom: 1.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 1.15rem;">
            <h3 style="font-size: 18px; color: var(--color-obsidian); margin: 0; display: flex; align-items: center; gap: 8px;">
              <span>🎯 3. 프롬프트 작성 시 핵심 팁 2선 (시트 최적화 요령)</span>
            </h3>
            <span style="background: #fef3c7; color: #92400e; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 999px; border: 1px solid #fde68a;">
              가독성 보호 & 동적 변수 주입 노하우
            </span>
          </div>

          <p style="font-size: 13.5px; color: #64748b; line-height: 1.6; margin-bottom: 1.25rem; word-break: keep-all;">
            일반 웹 챗봇과 스프레드시트는 사용 환경이 완전히 다릅니다. 셀 안에서 데이터를 다룰 때 아래 두 가지 핵심 작성 팁을 반드시 준수해야 깨끗한 데이터 표를 유지할 수 있습니다.
          </p>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.25rem;">
            <!-- 팁 1: 출력 형식 엄격히 제한하기 -->
            <div style="background: #faf9f6; border: 1px solid var(--color-pumice); border-radius: 18px; padding: 1.25rem 1.4rem; display: flex; flex-direction: column;">
              <div style="font-weight: 700; font-size: 14.5px; color: #b45309; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                <span>✂️ 1. 출력 형식 엄격히 제한하기 (매우 중요)</span>
              </div>
              <div style="font-size: 12.5px; color: #4b5563; line-height: 1.6; margin-bottom: 12px; word-break: keep-all;">
                일반 챗봇과 달리, 스프레드시트 셀에 장황한 설명이나 서론·결론이 들어가면 <strong>행 높이가 비정상적으로 커져 시트 전체의 가독성이 무너집니다.</strong>
              </div>
              <div style="background: #ffffff; border: 1px solid #fde68a; border-radius: 12px; padding: 10px 14px; margin-top: auto;">
                <div style="font-size: 12px; font-weight: 700; color: #92400e; margin-bottom: 4px;">💡 실전 팁: 프롬프트 끝에 반드시 다음 문구를 추가하세요!</div>
                <div style="font-family: var(--font-mono); font-size: 12px; color: #b45309; background: #fffbeb; padding: 4px 8px; border-radius: 6px; margin-bottom: 4px;">
                  "부가 설명 없이 [답변]만 출력할 것"
                </div>
                <div style="font-family: var(--font-mono); font-size: 12px; color: #b45309; background: #fffbeb; padding: 4px 8px; border-radius: 6px;">
                  "마크다운 기호 없이 텍스트만 출력할 것"
                </div>
              </div>
            </div>

            <!-- 팁 2: 조건부 결합 (문맥 참조) -->
            <div style="background: #faf9f6; border: 1px solid var(--color-pumice); border-radius: 18px; padding: 1.25rem 1.4rem; display: flex; flex-direction: column;">
              <div style="font-weight: 700; font-size: 14.5px; color: #0284c7; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                <span>🔗 2. 조건부 결합 (& 연산자 동적 문맥 참조)</span>
              </div>
              <div style="font-size: 12.5px; color: #4b5563; line-height: 1.6; margin-bottom: 12px; word-break: keep-all;">
                여러 열의 값을 조합할 때는 엑셀 문자열 연결 연산자인 <code>&</code>를 사용해 프롬프트 중간에 셀 주소를 직접 결합하여 지능형 템플릿을 구성합니다.
              </div>
              <div class="prompt-template-card" style="background: #ffffff; border: 1px solid #bae6fd; border-radius: 12px; padding: 10px 14px; margin-top: auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                  <span style="font-size: 12px; font-weight: 700; color: #0369a1;">실전 수식 예시</span>
                  <button type="button" class="btn btn-outline" onclick="DashboardApp.copyPrompt(this)" style="font-size: 11px; padding: 2px 8px; border-radius: 999px; background: #fff; border-color: #cbd5e1; cursor: pointer;">
                    <span>📋 복사</span>
                  </button>
                </div>
                <pre style="background: #f0f9ff; border: 1px solid #e0f2fe; border-radius: 6px; padding: 6px 10px; font-size: 11.5px; color: #0369a1; white-space: pre-wrap; word-break: break-all; margin: 0; font-family: var(--font-mono);">=GEMINI("다음 수강생 " & A2 & "님의 취약점인 " & B2 & " 영역을 보완할 한 줄 피드백을 작성해줘")</pre>
              </div>
            </div>
          </div>
        </div>

        <!-- 카드 6-4: 실무자가 반드시 알아야 할 주의사항 3가지 -->
        <div class="card" style="padding: 1.75rem 2rem; border: 1px solid var(--color-pumice); border-radius: 28px; background: #ffffff;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 1.15rem;">
            <h3 style="font-size: 18px; color: var(--color-obsidian); margin: 0; display: flex; align-items: center; gap: 8px;">
              <span>⚠️ 4. 실무자가 반드시 알아야 할 주의사항 3가지</span>
            </h3>
            <span style="background: #fee2e2; color: #b91c1c; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 999px; border: 1px solid #fecaca;">
              API 쿼터 관리 & 데이터 무결성 보장
            </span>
          </div>

          <p style="font-size: 13.5px; color: #64748b; line-height: 1.6; margin-bottom: 1.25rem; word-break: keep-all;">
            Google Sheets의 재계산 엔진 특성과 API Rate Limit을 이해하지 못하면 결과값이 의도치 않게 바뀌거나 에러가 발생할 수 있습니다. 아래 3가지 수칙을 철저히 지켜주세요.
          </p>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;">
            <!-- 주의사항 1: 값으로 붙여넣기 필수 -->
            <div style="background: #fffbeb; border: 1px solid #fde68a; border-left: 4px solid #f59e0b; border-radius: 16px; padding: 1.15rem 1.25rem;">
              <div style="font-weight: 700; font-size: 14px; color: #b45309; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                <span>1. '값으로 붙여넣기(Paste as Values)' 필수</span>
              </div>
              <div style="font-size: 12.5px; color: #78350f; line-height: 1.6; word-break: keep-all;">
                <code>=GEMINI()</code> 함수는 시트를 새로고침하거나 다른 셀을 편집할 때마다 <strong>함수가 재계산되면서 API를 다시 호출</strong>합니다. 원하는 결과가 도출되었다면 결과 열 전체를 복사(<code>Ctrl + C</code>)한 뒤, 반드시 <strong><code>값만 붙여넣기 (Ctrl + Shift + V)</code></strong>로 고정해야 불필요한 재호출과 결과값 변경을 방지할 수 있습니다.
              </div>
            </div>

            <!-- 주의사항 2: 행 단위 일괄 드래그 시 딜레이/Rate Limit -->
            <div style="background: #fffbeb; border: 1px solid #fde68a; border-left: 4px solid #f59e0b; border-radius: 16px; padding: 1.15rem 1.25rem;">
              <div style="font-weight: 700; font-size: 14px; color: #b45309; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                <span>2. 행 단위 일괄 드래그 시 딜레이/할당량(Rate Limit)</span>
              </div>
              <div style="font-size: 12.5px; color: #78350f; line-height: 1.6; word-break: keep-all;">
                수식 채우기 핸들(드래그)로 수백~수천 개 행에 한꺼번에 적용할 경우, Google API 호출 제한(쿼터)에 의해 일시적으로 <code>#ERROR!</code>나 지연이 발생할 수 있습니다. <strong>50~100행 단위</strong>로 나누어 순차적으로 적용하고 값으로 고정하는 방식을 강력히 권장합니다.
              </div>
            </div>

            <!-- 주의사항 3: 엄밀한 수식 계산/사실 검증 -->
            <div style="background: #fffbeb; border: 1px solid #fde68a; border-left: 4px solid #f59e0b; border-radius: 16px; padding: 1.15rem 1.25rem;">
              <div style="font-weight: 700; font-size: 14px; color: #b45309; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                <span>3. 엄밀한 수식 계산/사실 검증의 역할 분담</span>
              </div>
              <div style="font-size: 12.5px; color: #78350f; line-height: 1.6; word-break: keep-all;">
                사칙연산이나 통계 계산은 Gemini가 아닌 스프레드시트 고유 수식(<code>SUM</code>, <code>AVERAGE</code>, <code>COUNTIF</code>, <code>IF</code> 등)을 사용하는 것이 정확합니다. Gemini 함수는 텍스트 처리와 정성적 분석, 창의적 생성에 집중할 때 가장 효과적입니다.
              </div>
            </div>
          </div>
        </div>
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
          <p style="color: #444; font-size: 14px; margin-bottom: 0; line-height: 1.6;">
            행정 격식에 맞춘 톤앤매너 설정, 공문서·안내문 초안 생성 및 품의서 작성 시간을 80% 단축합니다.
          </p>
        </div>

        <!-- 모듈 2 -->
        <div class="card module-card">
          <h3><span>02</span> NotebookLM 활용</h3>
          <p style="color: #444; font-size: 14px; margin-bottom: 0; line-height: 1.6;">
            학내 보도자료나 규정집 PDF를 연동하여 근거 조항 기반의 행정 질의응답 및 홍보 카드뉴스 기획안을 도출합니다.
          </p>
        </div>

        <!-- 모듈 3 -->
        <div class="card module-card">
          <h3><span>03</span> 카드뉴스 제작(나노바나나 활용)</h3>
          <p style="color: #444; font-size: 14px; margin-bottom: 0; line-height: 1.6;">
            기획된 홍보 문구를 AI 시각 템플릿과 결합하여 모바일 친화형 고화질 카드뉴스를 신속하게 제작합니다.
          </p>
        </div>

        <!-- 모듈 4 -->
        <div class="card module-card">
          <h3><span>04</span> 구글 폼 제작 및 집계시스템 설정</h3>
          <p style="color: #444; font-size: 14px; margin-bottom: 0; line-height: 1.6;">
            AI로 행사 및 특강 설문 문항을 기획하고, 구글 폼 생성 후 스프레드시트 실시간 집계 대시보드를 구축합니다.
          </p>
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
  },

  /**
   * 진단 완료자 전용 5대 요인 문항 목록 아코디언 토글
   */
  toggleFactorQuestions(btn) {
    const parent = btn.parentElement;
    const details = parent.querySelector('.factor-q-details');
    const chevron = btn.querySelector('.chevron-icon');
    if (!details) return;

    const isOpen = details.style.display === 'block';
    details.style.display = isOpen ? 'none' : 'block';
    if (chevron) {
      chevron.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
    }
  },

  /**
   * 프롬프트 템플릿 클립보드 복사 헬퍼
   * @param {HTMLElement} btn
   */
  copyPrompt(btn) {
    const card = btn.closest('.prompt-template-card');
    const pre = card ? card.querySelector('pre') : null;
    if (!pre) return;
    const textToCopy = pre.innerText || pre.textContent;

    const onSuccess = () => {
      const originalHtml = btn.innerHTML;
      btn.innerHTML = '<span>✓ 복사완료!</span>';
      btn.style.background = 'var(--color-sulfur)';
      btn.style.color = 'var(--color-obsidian)';
      btn.style.borderColor = 'var(--color-sulfur)';
      btn.style.fontWeight = '700';
      setTimeout(() => {
        btn.innerHTML = originalHtml;
        btn.style.background = '#ffffff';
        btn.style.color = '';
        btn.style.borderColor = '#d1d5db';
        btn.style.fontWeight = '';
      }, 1800);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(textToCopy).then(onSuccess).catch(() => {
        this.fallbackCopyText(textToCopy, onSuccess);
      });
    } else {
      this.fallbackCopyText(textToCopy, onSuccess);
    }
  },

  /**
   * 클립보드 미지원 환경 대체 복사 헬퍼
   */
  fallbackCopyText(text, callback) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      if (callback) callback();
    } catch (e) {
      alert('복사에 실패했습니다. 텍스트를 직접 드래그하여 복사해 주세요.');
    }
    document.body.removeChild(textArea);
  }
};

window.DashboardApp = DashboardApp;
