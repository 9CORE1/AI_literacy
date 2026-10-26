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
            <div style="background: #faf9f6; border: 1px solid var(--color-pumice); border-radius: 16px; padding: 1.1rem 1.25rem;">
              <div style="font-weight: 700; font-size: 14.5px; color: var(--color-obsidian); margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                <span style="background: var(--color-ember); color: #fff; font-size: 11px; padding: 2px 7px; border-radius: 4px;">과제 기획</span>
                <span>1. 뻔한 주제를 차별화하는 「주제 구체화 프롬프트」</span>
              </div>
              <pre style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 12px; font-size: 12px; color: #374151; white-space: pre-wrap; word-break: break-all; margin: 0; line-height: 1.55; font-family: inherit;">[역할] 너는 대학 학술 글쓰기 지도 교수이자 연구 설계 전문가야.
[배경] [경영학/컴퓨터공학/사회복지학] 전공 과제로 [생성형 AI의 도입]에 관한 A4 5장 분량의 리포트 주제를 정해야 해.
[지시] 뻔하고 흔한 주제 대신, 최신 쟁점과 구체적인 타깃이 결합된 독창적인 리포트 소주제 3가지를 제안해 줘. 각 주제마다 '문제 제기 - 핵심 연구 질문 - 기대 효과'를 제시해 줘.
[형식] 표(Table) 형태로 정리해 줘.
[조건] 학부생 수준에서 한 학기 동안 국내외 학술 논문과 기사를 찾아 분석할 수 있는 현실적인 범위여야 해.
[샘플] | 순번 | 추천 소주제 | 핵심 연구 질문 | 분석 대상 및 데이터 |</pre>
            </div>

            <!-- 템플릿 2 -->
            <div style="background: #faf9f6; border: 1px solid var(--color-pumice); border-radius: 16px; padding: 1.1rem 1.25rem;">
              <div style="font-weight: 700; font-size: 14.5px; color: var(--color-obsidian); margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                <span style="background: var(--color-ember); color: #fff; font-size: 11px; padding: 2px 7px; border-radius: 4px;">시험 대비</span>
                <span>2. 어려운 전공 개념을 뚫어주는 「파인만 튜터 프롬프트」</span>
              </div>
              <pre style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 12px; font-size: 12px; color: #374151; white-space: pre-wrap; word-break: break-all; margin: 0; line-height: 1.55; font-family: inherit;">[역할] 너는 복잡한 전공 이론을 아주 쉽고 직관적으로 설명해 주는 친절한 대학 1:1 튜터야.
[배경] 나는 [전공명] 전공 [학년] 학생이고, 이번 중간고사를 위해 [이해하기 어려운 개념이나 공식 명칭]을 완벽히 이해해야 해.
[지시]
1. 이 개념의 핵심 원리를 비유(일상생활 속 쉬운 예시)를 들어 중학생도 이해할 수 있게 설명해 줘.
2. 대학 학부생 수준에서 반드시 알아야 할 기술적/학문적 핵심 포인트 3가지를 짚어줘.
3. 내가 제대로 이해했는지 자가 점검할 수 있는 4지선다형 연습문제 2문제를 출제하고, 정답과 해설은 맨 밑에 따로 배치해 줘.
[형식] 1단계(직관적 비유) -> 2단계(학술적 핵심 요약) -> 3단계(확인 퀴즈) 순서로 구분해 줘.
[조건] 단순 사전적 정의 나열은 금지하며, 친근한 대화체로 설명해 줘.</pre>
            </div>

            <!-- 템플릿 3 -->
            <div style="background: #faf9f6; border: 1px solid var(--color-pumice); border-radius: 16px; padding: 1.1rem 1.25rem;">
              <div style="font-weight: 700; font-size: 14.5px; color: var(--color-obsidian); margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                <span style="background: var(--color-ember); color: #fff; font-size: 11px; padding: 2px 7px; border-radius: 4px;">팀 프로젝트</span>
                <span>3. 발표 전 약점을 미리 잡는 「악마의 변호인(반박 검증) 프롬프트」</span>
              </div>
              <pre style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 12px; font-size: 12px; color: #374151; white-space: pre-wrap; word-break: break-all; margin: 0; line-height: 1.55; font-family: inherit;">[역할] 너는 팀 프로젝트 평가에서 가장 까다롭고 날카로운 질문을 던지는 심사위원(악마의 변호인)이야.
[배경] 우리 팀은 [과목명] 수업에서 [팀 프로젝트 주제/기획안 개요 요약]에 대해 15분간 발표할 예정이야.
[지시] 아래 작성된 우리 팀의 발표 개요를 비판적으로 검토하고, 발표 당일 교수님이나 청중이 공격할 수 있는 취약점 3가지와 예상 압박 질문을 뽑아줘. 그리고 각 질문에 대한 방어 논리(대응 가이드)도 함께 제시해 줘.
---
[우리 팀의 기획안 요약 내용 붙여넣기]
---
[형식] '[취약점 분석] -> [예상 압박 질문] -> [추천 방어 답변]' 구조로 정리해 줘.
[조건] 칭찬이나 빈말은 일체 생략하고, 논리적 비약과 실현 가능성의 한계 위주로 엄격하게 비판해 줘.</pre>
            </div>

            <!-- 템플릿 4 -->
            <div style="background: #faf9f6; border: 1px solid var(--color-pumice); border-radius: 16px; padding: 1.1rem 1.25rem;">
              <div style="font-weight: 700; font-size: 14.5px; color: var(--color-obsidian); margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                <span style="background: var(--color-ember); color: #fff; font-size: 11px; padding: 2px 7px; border-radius: 4px;">글쓰기 윤리</span>
                <span>4. 표절 없이 문장력만 올리는 「논리 구조 첨삭 프롬프트」</span>
              </div>
              <pre style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 12px; font-size: 12px; color: #374151; white-space: pre-wrap; word-break: break-all; margin: 0; line-height: 1.55; font-family: inherit;">[역할] 너는 학술 논문 및 대학 리포트 전문 에디터야.
[배경] 대학 전공 과제로 내가 직접 작성한 리포트 단락이야. 인공지능이 새로 글을 창작해서는 안 되며, 내 원래 문장과 주장을 그대로 살려야 해.
[지시] 아래 글의 문맥 흐름, 비문, 단어 중복, 논리적 비약을 교정해 줘.
---
[내가 작성한 초안 텍스트 붙여넣기]
---
[형식] 
1. 교정 전/후 비교 표
2. 주요 수정 이유 (문법, 어휘, 논리성 측면) 3가지 요약
[조건] 내 고유의 주장이나 문맥의 핵심 의미를 왜곡하지 말 것. 학술 보고서에 어울리는 정중하고 객관적인 문체(~다, ~이다)를 유지할 것.</pre>
            </div>

            <!-- 템플릿 5 -->
            <div style="background: #faf9f6; border: 1px solid var(--color-pumice); border-radius: 16px; padding: 1.1rem 1.25rem;">
              <div style="font-weight: 700; font-size: 14.5px; color: var(--color-obsidian); margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                <span style="background: var(--color-ember); color: #fff; font-size: 11px; padding: 2px 7px; border-radius: 4px;">취업·진로</span>
                <span>5. 학과 활동을 스펙으로 바꾸는 「STAR 역량 분해 프롬프트」</span>
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

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
            <!-- 유의사항 1 -->
            <div style="background: #faf9f6; border-left: 4px solid var(--color-ember); padding: 1rem 1.25rem; border-radius: 12px;">
              <div style="font-weight: 700; font-size: 14px; color: var(--color-obsidian); margin-bottom: 4px;">1. 환각 현상(Hallucination) 팩트체크</div>
              <div style="font-size: 12.5px; color: #555; line-height: 1.55; word-break: keep-all;">
                AI는 그럴듯한 거짓말을 지어낼 수 있습니다. 논문명, 저자, 통계 수치는 반드시 RISS나 학술 DB에서 직접 원문을 교차 검증하세요.
              </div>
            </div>

            <!-- 유의사항 2 -->
            <div style="background: #faf9f6; border-left: 4px solid var(--color-ember); padding: 1rem 1.25rem; border-radius: 12px;">
              <div style="font-weight: 700; font-size: 14px; color: var(--color-obsidian); margin-bottom: 4px;">2. 개인정보 및 기밀 데이터 입력 금지</div>
              <div style="font-size: 12.5px; color: #555; line-height: 1.55; word-break: keep-all;">
                입력한 프롬프트는 AI 재학습에 활용될 수 있습니다. 주민번호, 학번, 미발표 연구 데이터, 기업 대외비 문서는 절대 입력하지 마세요.
              </div>
            </div>

            <!-- 유의사항 3 -->
            <div style="background: #faf9f6; border-left: 4px solid var(--color-ember); padding: 1rem 1.25rem; border-radius: 12px;">
              <div style="font-weight: 700; font-size: 14px; color: var(--color-obsidian); margin-bottom: 4px;">3. 학술 윤리 준수 및 출처 명시</div>
              <div style="font-size: 12.5px; color: #555; line-height: 1.55; word-break: keep-all;">
                AI 답변을 그대로 복사·제출하면 표절에 해당합니다. AI는 초안 검토 튜터로만 활용하고, 과제 제출 시 AI 활용 사실을 정직하게 밝히세요.
              </div>
            </div>

            <!-- 유의사항 4 -->
            <div style="background: #faf9f6; border-left: 4px solid var(--color-ember); padding: 1rem 1.25rem; border-radius: 12px;">
              <div style="font-weight: 700; font-size: 14px; color: var(--color-obsidian); margin-bottom: 4px;">4. 데이터 편향성(Bias) 비판적 검토</div>
              <div style="font-size: 12.5px; color: #555; line-height: 1.55; word-break: keep-all;">
                학습 데이터에 내재된 성별, 인종, 문화적 편향이 답변에 투영될 수 있습니다. AI 의견을 맹신하지 말고 다각도에서 검토하세요.
              </div>
            </div>

            <!-- 유의사항 5 -->
            <div style="background: #faf9f6; border-left: 4px solid var(--color-ember); padding: 1rem 1.25rem; border-radius: 12px;">
              <div style="font-weight: 700; font-size: 14px; color: var(--color-obsidian); margin-bottom: 4px;">5. 생각의 외주화(Thinking Delegation) 경계</div>
              <div style="font-size: 12.5px; color: #555; line-height: 1.55; word-break: keep-all;">
                스스로 고민하는 사고 과정을 AI에 넘기면 문제해결력이 퇴화합니다. 항상 내 생각과 가설이 먼저이고, AI는 보조 도구여야 합니다.
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
