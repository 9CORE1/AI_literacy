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

    // 진단 완료자에게만 표시되는 5대 요인별 측정 문항 가이드
    const factorQuestionsSection = isCompleted
      ? `<div style="margin-top: 14px; padding-top: 12px; border-top: 1.5px dashed #d5d5d0;">
          <button type="button" onclick="DashboardApp.toggleFactorQuestions(this)" style="background: none; border: none; padding: 0; color: var(--color-ember); font-weight: 700; font-size: 12.5px; cursor: pointer; display: flex; align-items: center; gap: 6px;">
            <span>💡 5대 요인별 측정 문항 확인하기</span>
            <span class="chevron-icon" style="display: inline-block; transition: transform 0.2s; font-size: 10px;">▼</span>
          </button>
          <div class="factor-q-details" style="display: none; margin-top: 10px; font-size: 12px; color: #374151; background: #faf9f6; padding: 12px 14px; border-radius: 14px; border: 1px solid var(--color-pumice); line-height: 1.65;">
            <div style="font-weight: 700; color: var(--color-obsidian); margin-bottom: 6px; font-size: 12.5px;">📋 나의 역량 진단 문항 매핑</div>
            <div style="margin-bottom: 4px;">• <strong>역량 1 (문제해결·적용)</strong>: 7, 9, 10, 15, 21~25번 (9문항)</div>
            <div style="margin-bottom: 4px;">• <strong>역량 2 (개념·원리 이해)</strong>: 1~5, 8, 14번 (7문항)</div>
            <div style="margin-bottom: 4px;">• <strong>역량 3 (태도·진로 인식)</strong>: 6, 26~30번 (6문항)</div>
            <div style="margin-bottom: 4px;">• <strong>역량 4 (윤리·보안 인식)</strong>: 16, 17, 18, 20번 (4문항)</div>
            <div>• <strong>역량 5 (프롬프트·비판적)</strong>: 11, 12, 13, 19번 (4문항)</div>
          </div>
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
          <span style="font-family: var(--font-display); font-size: 15px; color: var(--color-ember); letter-spacing: 0.05em; font-weight: 700;">DIAGNOSIS OVERVIEW & FRAMEWORK</span>
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
            <div style="font-size: 15px; font-weight: 700; color: var(--color-obsidian); margin-bottom: 6px;">30문항 · 5점 척도 (약 7분)</div>
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
  }
};

window.DashboardApp = DashboardApp;
