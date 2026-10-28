/**
 * @file dashboard.js
 * @description Caldera Design System 적용 학생/교직원 맞춤형 교육 대시보드
 */

const DashboardApp = {
  init() {
    const user = Auth.getCurrentUser();
    if (!user || !user.email) {
      alert('로그인이 필요한 서비스입니다.\n메인 화면에서 로그인 또는 회원가입 후 입장해 주세요.');
      window.location.replace('index.html?login=true');
      return;
    }

    if (!user.role) {
      alert('대학생 또는 교직원 구분을 먼저 선택해 주셔야 합니다.');
      window.location.replace('index.html?selectRole=true');
      return;
    }

    // [RBAC 보안] URL 쿼리스트링(?role=...)을 통한 타 대상자 코스 부정 접근 엄격 차단
    const urlParams = new URLSearchParams(window.location.search);
    const requestedRole = urlParams.get('role');
    if (requestedRole && requestedRole !== user.role) {
      if (requestedRole === 'staff' && user.role === 'student') {
        alert('⛔ [접근 제한 안내]\n\n해당 코스는 🏛️ [교직원 전용] 코스입니다.\n대학생 계정으로는 교직원 코스를 열람하실 수 없습니다.\n\n대학생 전용 강의실로 이동합니다.');
      } else if (requestedRole === 'student' && user.role === 'staff') {
        alert('⛔ [접근 제한 안내]\n\n해당 코스는 🎓 [대학생 전용] 코스입니다.\n교직원 계정으로는 대학생 코스를 열람하실 수 없습니다.\n\n교직원 전용 강의실로 이동합니다.');
      }
      // 불법 요청 파라미터를 정리하고 본인의 전용 대시보드로 이동
      window.location.replace('dashboard.html');
      return;
    }

    // 네비게이션 태그 업데이트
    const navTag = document.getElementById('nav-mode-tag');
    if (navTag) {
      navTag.textContent = user.role === 'student' ? 'STUDENT LAB' : 'STAFF LAB';
    }

    this.renderDashboard(user);
    this.renderQuickNav(user);
    this.bindCopyEvents();
    this.initScrollSpy(user);
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
      <!-- 학생 전용 AI 리터러시 진단 CTA 배너 (Matching index.html CORE COMPETENCE Card) -->
      <div class="card dashboard-header-card" style="margin-bottom: var(--spacing-32); margin-top: var(--spacing-16);">
        <!-- Halftone Top Badge Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 14px;">
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <span class="tag-sulfur">CORE COMPETENCE</span>
            <span style="background: rgba(0, 0, 0, 0.28); color: var(--color-sulfur); font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 999px; letter-spacing: 0.04em;">
              STUDENT LAB · 5-FACTOR
            </span>
          </div>
          <div style="display: flex; flex-wrap: wrap; gap: 6px; align-items: center;">
            <span style="background: rgba(255, 255, 255, 0.18); backdrop-filter: blur(8px); border: 1px solid rgba(255, 255, 255, 0.2); color: #fff; padding: 4px 12px; border-radius: var(--radius-pills); font-size: 11.5px; font-weight: 600; white-space: nowrap;">
              🎓 ${displayName} 님 (${affiliation})
            </span>
            <span style="background: rgba(255, 255, 255, 0.12); color: rgba(255, 255, 255, 0.9); padding: 4px 10px; border-radius: var(--radius-pills); font-size: 11.5px; white-space: nowrap;" class="desktop-only">
              🕒 최근 입장: ${loginTime} (${loginMethodTag})
            </span>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--spacing-20);">
          <div style="flex: 1; max-width: 820px;">
            <h2 style="font-size: clamp(26px, 3.8vw, 38px); margin: 0 0 0.6rem 0; color: var(--color-chalk); font-weight: 800; letter-spacing: -0.01em;">
              나의 AI 리터러시 역량 진단 평가
            </h2>
            <p style="opacity: 0.95; font-size: 14.5px; color: #fff3ee; line-height: 1.6; margin: 0; word-break: keep-all;">
              30문항(약 7분 소요) 표준 척도를 통해 5대 핵심 역량 강점·취약점 방사형 차트 분석과 맞춤 학습 가이드, 그리고 공식 A4 레포트를 발급받으세요.
            </p>
            ${completedBadge}
          </div>
          <div style="display: flex; align-items: center;">
            <a href="diagnosis.html" class="btn btn-secondary" style="background: var(--color-chalk); border-color: var(--color-chalk); color: var(--color-obsidian); font-weight: 800; font-size: 16px; padding: 14px 28px; box-shadow: 0 6px 16px rgba(0, 0, 0, 0.18);">
              ${ctaBtnText}
            </a>
          </div>
        </div>
      </div>

      <!-- 학생 120분 강의 모듈 헤더 -->
      <div style="margin-bottom: var(--spacing-20);">
        <span style="font-family: var(--font-display); font-size: 16px; color: var(--color-ember); letter-spacing: 0.05em;">CURRICULUM FOR UNIVERSITY STUDENTS</span>
        <h2 style="font-size: 32px; color: var(--color-obsidian); margin: 0.25rem 0 0 0;">🎓 대학생 120분 AI 리터러시 마스터 코스</h2>
      </div>

      <!-- 모듈 그리드 (대상자별 4대 핵심 교육 & 실습 모듈) -->
      <div class="dashboard-grid">
        <!-- 모듈 1 -->
        <div class="card module-card" style="cursor: pointer; border: 1px solid var(--color-pumice); background: #ffffff; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.04); transition: transform 0.2s, box-shadow 0.2s; display: flex; flex-direction: column; height: 100%;" onclick="DashboardApp.scrollToSection('lecture-sec-1')">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 12px; font-weight: 800; color: var(--color-ember); letter-spacing: 0.05em;">MODULE 01</span>
            <span style="background: #f1f5f9; color: #334155; font-size: 11px; font-weight: 800; padding: 2px 10px; border-radius: 999px;">30문항 표준 척도</span>
          </div>
          <h3 style="font-size: 17px; margin-bottom: 8px;"><span>01</span> 대학생의 AI 리터러시 진단 & 레포트</h3>
          <p style="color: #444; font-size: 13.5px; margin-bottom: 10px; line-height: 1.55;">
            대학생 전용 30문항(7점 리커트) 표준 척도를 통해 나의 5대 리터러시 역량을 정밀 진단하고 개별 성과 레포트를 발급받습니다.
          </p>
          <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 10px;">
            <span style="background: #f1f5f9; color: #475569; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 6px;">📊 5대 역량 진단</span>
            <span style="background: #eef2ff; color: #4338ca; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 6px;">📝 30문항 표준척도</span>
            <span style="background: #ecfdf5; color: #047857; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 6px;">📑 A4 공인 레포트</span>
            <span style="background: #fff7ed; color: #c2410c; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 6px;">🎯 맞춤 로드맵</span>
          </div>
          <div style="margin-top: auto; padding-top: 12px; font-size: 13px; color: var(--color-ember); font-weight: 800; display: flex; align-items: center; gap: 4px;">
            <span>👉 01 섹션으로 바로 이동하기</span>
            <span>↓</span>
          </div>
        </div>

        <!-- 모듈 2 -->
        <div class="card module-card" style="cursor: pointer; border: 1px solid var(--color-pumice); background: #ffffff; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.04); transition: transform 0.2s, box-shadow 0.2s; display: flex; flex-direction: column; height: 100%;" onclick="DashboardApp.scrollToSection('lecture-sec-2')">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 12px; font-weight: 800; color: var(--color-ember); letter-spacing: 0.05em;">MODULE 02</span>
            <span style="background: #e0f2fe; color: #0369a1; font-size: 11px; font-weight: 800; padding: 2px 10px; border-radius: 999px;">학술 과제 & 리서치</span>
          </div>
          <h3 style="font-size: 17px; margin-bottom: 8px;"><span>02</span> 프롬프트 공식 4+2 & 리서치 기법</h3>
          <p style="color: #444; font-size: 13.5px; margin-bottom: 10px; line-height: 1.55;">
            [역할·배경·지시·형식]의 4대 뼈대와 [조건·샘플]의 2대 보강재를 결합하여 전공 리포트 및 과제 리서치 답변의 정확도를 극대화합니다.
          </p>
          <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 10px;">
            <span style="background: #f1f5f9; color: #475569; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 6px;">📋 4+2 공식</span>
            <span style="background: #eef2ff; color: #4338ca; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 6px;">🔍 과제 리서치</span>
            <span style="background: #ecfdf5; color: #047857; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 6px;">💡 CoT 추론설계</span>
            <span style="background: #fff7ed; color: #c2410c; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 6px;">🛡️ 표절·환각 차단</span>
          </div>
          <div style="margin-top: auto; padding-top: 12px; font-size: 13px; color: var(--color-ember); font-weight: 800; display: flex; align-items: center; gap: 4px;">
            <span>👉 02 섹션으로 바로 이동하기</span>
            <span>↓</span>
          </div>
        </div>

        <!-- 모듈 3 -->
        <div class="card module-card" style="cursor: pointer; border: 1px solid var(--color-pumice); background: #ffffff; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.04); transition: transform 0.2s, box-shadow 0.2s; display: flex; flex-direction: column; height: 100%;" onclick="DashboardApp.scrollToSection('lecture-sec-3')">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 12px; font-weight: 800; color: var(--color-ember); letter-spacing: 0.05em;">MODULE 03</span>
            <span style="background: #fdf4ff; color: #9333ea; font-size: 11px; font-weight: 800; padding: 2px 10px; border-radius: 999px;">논문·전공서 스터디</span>
          </div>
          <h3 style="font-size: 17px; margin-bottom: 8px;"><span>03</span> NotebookLM 논문 분석 & 팩트체크</h3>
          <p style="color: #444; font-size: 13.5px; margin-bottom: 10px; line-height: 1.55;">
            전공 교재 PDF나 학술 논문을 소스로 지정하여 할루시네이션 없는 각주 기반의 팩트체크 스터디 및 시험 대비 Q&A 비서를 구축합니다.
          </p>
          <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 10px;">
            <span style="background: #f1f5f9; color: #475569; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 6px;">📚 논문·PDF 원문</span>
            <span style="background: #eef2ff; color: #4338ca; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 6px;">📌 각주 출처인용</span>
            <span style="background: #ecfdf5; color: #047857; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 6px;">📑 시험대비 가이드</span>
            <span style="background: #fff7ed; color: #c2410c; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 6px;">🎧 Audio 요약</span>
          </div>
          <div style="margin-top: auto; padding-top: 12px; font-size: 13px; color: var(--color-ember); font-weight: 800; display: flex; align-items: center; gap: 4px;">
            <span>👉 03 섹션으로 바로 이동하기</span>
            <span>↓</span>
          </div>
        </div>

        <!-- 모듈 4 -->
        <div class="card module-card" style="cursor: pointer; border: 1px solid var(--color-pumice); background: #ffffff; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.04); transition: transform 0.2s, box-shadow 0.2s; display: flex; flex-direction: column; height: 100%;" onclick="DashboardApp.scrollToSection('lecture-sec-4')">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 12px; font-weight: 800; color: var(--color-ember); letter-spacing: 0.05em;">MODULE 04</span>
            <span style="background: var(--color-sulfur); color: var(--color-obsidian); font-size: 11px; font-weight: 800; padding: 2px 10px; border-radius: 999px;">데이터 분석 & 번역</span>
          </div>
          <h3 style="font-size: 17px; margin-bottom: 8px;"><span>04</span> 구글 시트 =GEMINI() 함수 자동화</h3>
          <p style="color: #444; font-size: 13.5px; margin-bottom: 10px; line-height: 1.55;">
            스프레드시트에서 함수 하나로 설문 주관식 텍스트의 감정 분석, 카테고리 분류, 다국어 번역 및 데이터 정제를 수백 행 단위로 자동화합니다.
          </p>
          <div style="display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px;">
            <div style="display: flex; gap: 4px; align-items: center;">
              <span style="background: #f1f5f9; color: #475569; font-size: 10.5px; font-weight: 600; padding: 2px 6px; border-radius: 6px; white-space: nowrap;">⚡ =GEMINI() 수식</span>
              <span style="background: #eef2ff; color: #4338ca; font-size: 10.5px; font-weight: 600; padding: 2px 6px; border-radius: 6px; white-space: nowrap;">📈 감정분석·라벨링</span>
            </div>
            <div style="display: flex; gap: 4px; align-items: center;">
              <span style="background: #ecfdf5; color: #047857; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 6px; white-space: nowrap;">🌐 다국어 번역</span>
              <span style="background: #fff7ed; color: #c2410c; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 6px; white-space: nowrap;">🧹 비정형 정제</span>
            </div>
          </div>
          <div style="margin-top: auto; padding-top: 12px; font-size: 13px; color: var(--color-ember); font-weight: 800; display: flex; align-items: center; gap: 4px;">
            <span>👉 04 섹션으로 바로 이동하기</span>
            <span>↓</span>
          </div>
        </div>
      </div>

      <!-- 대학생의 AI리터러시 진단 개요 섹션 -->
      <div id="lecture-sec-1" class="lecture-nav-section" style="margin-top: var(--spacing-48); margin-bottom: var(--spacing-32); scroll-margin-top: 96px;">
        <div style="margin-bottom: var(--spacing-20);">
          <span style="font-family: var(--font-display); font-size: 16px; color: var(--color-ember); letter-spacing: 0.05em;">DIAGNOSIS OVERVIEW & FRAMEWORK</span>
          <h2 style="font-size: clamp(24px, 3.5vw, 32px); color: var(--color-obsidian); margin-top: 4px;">📊 대학생의 AI리터러시 진단 개요</h2>
        </div>

        <!-- 진단 프로파일 2페이지 샘플 이미지 1줄 배치 -->
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
          <div style="border-radius: 18px; overflow: hidden; border: 1px solid var(--color-pumice); box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04); background: #ffffff;">
            <img src="images/AILiteracy_profile01.jpg?v=20261027" alt="대학생 AI 리터러시 진단 프로파일 레포트 1페이지" style="width: 100%; height: auto; display: block; object-fit: contain;" loading="lazy">
          </div>
          <div style="border-radius: 18px; overflow: hidden; border: 1px solid var(--color-pumice); box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04); background: #ffffff;">
            <img src="images/AILiteracy_profile02.jpg?v=20261027" alt="대학생 AI 리터러시 진단 프로파일 레포트 2페이지" style="width: 100%; height: auto; display: block; object-fit: contain;" loading="lazy">
          </div>
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
            <span style="font-size: 12px; font-weight: 500; color: #6b7280;">(대학생 기준 평균 대비 비교)</span>
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
      ${this.getPromptSectionHtml()}

      <!-- Google NotebookLM 완벽 사용 & 학업 활용 가이드 섹션 -->
      ${this.getNotebookLMSectionHtml()}

        <!-- ======================================================== -->
        <!-- 6. Google 스프레드시트 =GEMINI() 함수 완벽 활용 가이드 -->
        <!-- ======================================================== -->
        <div id="lecture-sec-4" class="lecture-nav-section" style="margin-top: 3.5rem; margin-bottom: var(--spacing-20); scroll-margin-top: 96px;">
          <span style="font-family: var(--font-display); font-size: 16px; color: var(--color-ember); letter-spacing: 0.05em;">SPREADSHEET AUTOMATION & BULK AI WORKFLOW</span>
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
      <!-- 교직원 안내 배너 (Matching index.html CORE COMPETENCE Card) -->
      <div class="card dashboard-header-card" style="margin-bottom: var(--spacing-32); margin-top: var(--spacing-16);">
        <!-- Halftone Top Badge Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 14px;">
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <span class="tag-sulfur">CORE COMPETENCE</span>
            <span style="background: rgba(0, 0, 0, 0.28); color: var(--color-sulfur); font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 999px; letter-spacing: 0.04em;">
              STAFF LAB · SMART ADMIN
            </span>
          </div>
          <div style="display: flex; flex-wrap: wrap; gap: 6px; align-items: center;">
            <span style="background: rgba(255, 255, 255, 0.18); backdrop-filter: blur(8px); border: 1px solid rgba(255, 255, 255, 0.2); color: #fff; padding: 4px 12px; border-radius: var(--radius-pills); font-size: 11.5px; font-weight: 600; white-space: nowrap;">
              🏛️ ${displayName} 님 (${affiliation})
            </span>
            <span style="background: rgba(255, 255, 255, 0.12); color: rgba(255, 255, 255, 0.9); padding: 4px 10px; border-radius: var(--radius-pills); font-size: 11.5px; white-space: nowrap;" class="desktop-only">
              🕒 최근 입장: ${loginTime} (${loginMethodTag})
            </span>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--spacing-20);">
          <div style="flex: 1; max-width: 820px;">
            <h2 style="font-size: clamp(26px, 3.8vw, 38px); margin: 0 0 0.6rem 0; color: var(--color-chalk); font-weight: 800; letter-spacing: -0.01em;">
              스마트 행정 업무 혁신 &amp; 홍보 콘텐츠 AI 실무
            </h2>
            <p style="opacity: 0.95; font-size: 14.5px; color: #fff3ee; line-height: 1.6; margin: 0; word-break: keep-all;">
              공문 기안, 학칙 규정집 질의응답 챗봇, 원클릭 카드뉴스 제작 및 설문 집계 자동화까지 교직원의 반복 업무를 줄이고 행정 생산성을 극대화합니다.
            </p>
          </div>
          <div style="display: flex; align-items: center;">
            <span class="btn btn-secondary" style="background: var(--color-chalk); border-color: var(--color-chalk); color: var(--color-obsidian); font-weight: 800; font-size: 15px; padding: 14px 26px; box-shadow: 0 6px 16px rgba(0, 0, 0, 0.18); cursor: default;">
              🏛️ 120분 실습 코스
            </span>
          </div>
        </div>
      </div>

      <!-- 교직원 120분 강의 모듈 헤더 -->
      <div style="margin-bottom: var(--spacing-20);">
        <span style="font-family: var(--font-display); font-size: 16px; color: var(--color-ember); letter-spacing: 0.05em;">ADMINISTRATIVE PRODUCTIVITY WORKFLOW</span>
        <h2 style="font-size: 32px; color: var(--color-obsidian); margin: 0.25rem 0 0 0;">📋 교직원 120분 스마트 행정 커리큘럼</h2>
      </div>

      <!-- 교직원 모듈 그리드 (대상자별 4대 핵심 교육 & 실습 모듈) -->
      <div class="dashboard-grid">
        <!-- 모듈 1 -->
        <div class="card module-card" style="cursor: pointer; border: 1px solid var(--color-pumice); background: #ffffff; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.04); transition: transform 0.2s, box-shadow 0.2s; display: flex; flex-direction: column; height: 100%;" onclick="DashboardApp.scrollToSection('lecture-sec-2')">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 12px; font-weight: 800; color: var(--color-ember); letter-spacing: 0.05em;">MODULE 01</span>
            <span style="background: #f1f5f9; color: #334155; font-size: 11px; font-weight: 800; padding: 2px 10px; border-radius: 999px;">공문서 & 품의서 혁신</span>
          </div>
          <h3 style="font-size: 17px; margin-bottom: 8px;"><span>01</span> 프롬프트 공식 4+2 & 기안문 작성</h3>
          <p style="color: #444; font-size: 13.5px; margin-bottom: 10px; line-height: 1.55;">
            행정 격식에 맞춘 톤앤매너 설정, 공문서·안내문 초안 생성 및 품의서 작성 시간을 80% 단축합니다.
          </p>
          <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 10px;">
            <span style="background: #f1f5f9; color: #475569; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 6px;">📋 4+2 공식</span>
            <span style="background: #eef2ff; color: #4338ca; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 6px;">✍️ 품의서 초안</span>
            <span style="background: #ecfdf5; color: #047857; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 6px;">⚡ 톤앤매너</span>
            <span style="background: #fff7ed; color: #c2410c; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 6px;">🛡️ 보안·환각예방</span>
          </div>
          <div style="margin-top: auto; padding-top: 12px; font-size: 13px; color: var(--color-ember); font-weight: 800; display: flex; align-items: center; gap: 4px;">
            <span>👉 01 섹션으로 바로 이동하기</span>
            <span>↓</span>
          </div>
        </div>

        <!-- 모듈 2 -->
        <div class="card module-card" style="cursor: pointer; border: 1px solid var(--color-pumice); background: #ffffff; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.04); transition: transform 0.2s, box-shadow 0.2s; display: flex; flex-direction: column; height: 100%;" onclick="DashboardApp.scrollToSection('lecture-sec-3')">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 12px; font-weight: 800; color: var(--color-ember); letter-spacing: 0.05em;">MODULE 02</span>
            <span style="background: #e0f2fe; color: #0369a1; font-size: 11px; font-weight: 800; padding: 2px 10px; border-radius: 999px;">규정 Q&A & 근거 접지</span>
          </div>
          <h3 style="font-size: 17px; margin-bottom: 8px;"><span>02</span> NotebookLM 활용 행정 실무</h3>
          <p style="color: #444; font-size: 13.5px; margin-bottom: 10px; line-height: 1.55;">
            학내 보도자료나 규정집 PDF를 연동하여 근거 조항 기반의 행정 질의응답 및 홍보 카드뉴스 기획안을 도출합니다.
          </p>
          <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 10px;">
            <span style="background: #f1f5f9; color: #475569; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 6px;">📚 학칙·규정 연동</span>
            <span style="background: #eef2ff; color: #4338ca; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 6px;">📌 100% 출처인용</span>
            <span style="background: #ecfdf5; color: #047857; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 6px;">🔍 보도자료 요약</span>
            <span style="background: #fff7ed; color: #c2410c; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 6px;">📑 행정 FAQ 추출</span>
          </div>
          <div style="margin-top: auto; padding-top: 12px; font-size: 13px; color: var(--color-ember); font-weight: 800; display: flex; align-items: center; gap: 4px;">
            <span>👉 02 섹션으로 바로 이동하기</span>
            <span>↓</span>
          </div>
        </div>

        <!-- 모듈 3 -->
        <div class="card module-card" style="cursor: pointer; border: 1px solid var(--color-pumice); background: #ffffff; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.04); transition: transform 0.2s, box-shadow 0.2s; display: flex; flex-direction: column; height: 100%;" onclick="DashboardApp.scrollToSection('lecture-staff-sec-3')">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 12px; font-weight: 800; color: var(--color-ember); letter-spacing: 0.05em;">MODULE 03</span>
            <span style="background: #fdf4ff; color: #9333ea; font-size: 11px; font-weight: 800; padding: 2px 10px; border-radius: 999px;">고화질 비주얼 & 홍보</span>
          </div>
          <h3 style="font-size: 17px; margin-bottom: 8px;"><span>03</span> 카드뉴스 제작 (나노바나나 활용)</h3>
          <p style="color: #444; font-size: 13.5px; margin-bottom: 10px; line-height: 1.55;">
            기획된 홍보 문구를 AI 시각 템플릿과 결합하여 모바일 친화형 고화질 카드뉴스를 신속하게 제작합니다.
          </p>
          <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 10px;">
            <span style="background: #f1f5f9; color: #475569; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 6px;">🎨 나노바나나 AI</span>
            <span style="background: #eef2ff; color: #4338ca; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 6px;">📐 한글 타이포마감</span>
            <span style="background: #ecfdf5; color: #047857; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 6px;">📱 모바일 최적화</span>
            <span style="background: #fff7ed; color: #c2410c; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 6px;">⚖️ 공공 저작권</span>
          </div>
          <div style="margin-top: auto; padding-top: 12px; font-size: 13px; color: var(--color-ember); font-weight: 800; display: flex; align-items: center; gap: 4px;">
            <span>👉 03 섹션으로 바로 이동하기</span>
            <span>↓</span>
          </div>
        </div>

        <!-- 모듈 4 -->
        <div class="card module-card" style="cursor: pointer; border: 1px solid var(--color-pumice); background: #ffffff; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.04); transition: transform 0.2s, box-shadow 0.2s; display: flex; flex-direction: column; height: 100%;" onclick="DashboardApp.scrollToSection('lecture-staff-sec-4')">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 12px; font-weight: 800; color: var(--color-ember); letter-spacing: 0.05em;">MODULE 04</span>
            <span style="background: var(--color-sulfur); color: var(--color-obsidian); font-size: 11px; font-weight: 800; padding: 2px 10px; border-radius: 999px;">설문 자동화 & 실시간 집계</span>
          </div>
          <h3 style="font-size: 17px; margin-bottom: 8px;"><span>04</span> 구글 폼 제작 및 집계시스템 설정</h3>
          <p style="color: #444; font-size: 13.5px; margin-bottom: 10px; line-height: 1.55;">
            15분 라이브 시연 로드맵, AI 문항 기획, 1클릭 자동생성 스크립트(GAS), 스프레드시트 실시간 수식 및 =GEMINI() 감정분석.
          </p>
          <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 10px;">
            <span style="background: #f1f5f9; color: #475569; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 6px;">⏱️ 15분 로드맵</span>
            <span style="background: #eef2ff; color: #4338ca; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 6px;">⚡ 1클릭 생성</span>
            <span style="background: #ecfdf5; color: #047857; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 6px;">📊 실시간 집계</span>
            <span style="background: #fff7ed; color: #c2410c; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 6px;">🤖 =GEMINI() 분석</span>
          </div>
          <div style="margin-top: auto; padding-top: 12px; font-size: 13px; color: var(--color-ember); font-weight: 800; display: flex; align-items: center; gap: 4px;">
            <span>👉 04 섹션으로 바로 이동하기</span>
            <span>↓</span>
          </div>
        </div>
      </div>

      <!-- 교직원 4대 핵심 커리큘럼 실무 가이드 연동 -->
      ${this.getStaffPromptSectionHtml()}

      ${this.getStaffNotebookLMSectionHtml()}

      ${this.getStaffCardNewsSectionHtml()}

      ${this.getStaffGoogleFormSectionHtml()}
    `;
  },

  /**
   * 교직원 전용: 스마트 행정 프롬프트 공식 4+2 & LLM 안전 활용 가이드 섹션 HTML 반환
   */
  getStaffPromptSectionHtml() {
    return `
      <!-- 교직원 전용: 프롬프트 공식 4+2 & 스마트 행정 안전 활용 가이드 섹션 -->
      <div id="lecture-sec-2" class="lecture-nav-section" style="margin-top: var(--spacing-48); margin-bottom: var(--spacing-32); scroll-margin-top: 96px;">
        <div style="margin-bottom: var(--spacing-20);">
          <span style="font-family: var(--font-display); font-size: 16px; color: var(--color-ember); letter-spacing: 0.05em;">ADMINISTRATIVE PROMPT FRAMEWORK & COMPLIANCE</span>
          <h2 style="font-size: clamp(24px, 3.5vw, 32px); color: var(--color-obsidian); margin-top: 4px;">🏛️ 교직원 스마트 행정 프롬프트 공식 4+2 & 실무 활용 가이드</h2>
        </div>

        <!-- 1. 「프롬프트 공식 4+2」 프레임워크 카드 -->
        <div class="card" style="padding: 1.75rem 2rem; border: 1px solid var(--color-pumice); border-radius: 28px; background: #ffffff; margin-bottom: 1.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 1rem;">
            <h3 style="font-size: 18px; color: var(--color-obsidian); margin: 0; display: flex; align-items: center; gap: 8px;">
              <span>🧱 「스마트 행정 프롬프트 공식 4+2」 프레임워크</span>
            </h3>
            <span style="background: var(--color-sulfur); color: var(--color-obsidian); font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 999px;">
              4대 뼈대 (역·배·지·형) + 2대 보강재 (조·샘)
            </span>
          </div>
          
          <p style="font-size: 13.5px; color: #555; line-height: 1.6; margin-bottom: 1.25rem; word-break: keep-all;">
            생성형 AI로부터 행정 실무 및 교수학습 지원에 즉시 활용 가능한 고품질의 답변을 얻기 위한 표준 프레임워크입니다. 행정 문서의 뼈대를 이루는 <strong>핵심 요소 4개</strong>와, 행정적 오류(환각)를 원천 차단하고 규격에 부합하는 결과를 완성하는 <strong>추가 보강 요소 2개</strong>를 결합합니다.
          </p>

          <!-- 표: 4+2 공식 상세 (교직원 실무 버전) -->
          <div style="overflow-x: auto; -webkit-overflow-scrolling: touch; margin-bottom: 1.5rem;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13.5px; text-align: left; min-width: 620px; word-break: keep-all;">
              <thead>
                <tr style="background-color: #f3f4f6; border-bottom: 2px solid #e5e7eb;">
                  <th style="padding: 12px 14px; width: 14%; text-align: center; color: var(--color-obsidian); font-weight: 700; white-space: nowrap;">구분</th>
                  <th style="padding: 12px 14px; width: 18%; color: var(--color-obsidian); font-weight: 700;">요소 (영문)</th>
                  <th style="padding: 12px 14px; width: 34%; color: var(--color-obsidian); font-weight: 700;">정의 및 역할</th>
                  <th style="padding: 12px 14px; color: var(--color-obsidian); font-weight: 700;">작성 팁 & 실무 예시 문구</th>
                </tr>
              </thead>
              <tbody>
                <!-- 핵심 4대 뼈대 -->
                <tr style="border-bottom: 1px solid #e5e7eb; background: #fffcfb;">
                  <td rowspan="4" style="padding: 12px 14px; text-align: center; font-weight: 700; color: var(--color-ember); border-right: 1px solid #e5e7eb; white-space: nowrap;">
                    핵심 4대 요소<br><span style="font-size: 11px; font-weight: 600; color: #6b7280;">(뼈대)</span>
                  </td>
                  <td style="padding: 12px 14px; font-weight: 700; color: var(--color-obsidian);">1. 역할 (Role)</td>
                  <td style="padding: 12px 14px; color: #4b5563; line-height: 1.5;">AI에게 부여할 <strong>전문적 직무 정체성과 시각</strong> 설정</td>
                  <td style="padding: 12px 14px; color: #374151; font-size: 12.5px;">"너는 대학 학생처 15년 차 학생활동 기획 전문가야."</td>
                </tr>
                <tr style="border-bottom: 1px solid #e5e7eb; background: #fffcfb;">
                  <td style="padding: 12px 14px; font-weight: 700; color: var(--color-obsidian);">2. 배경 (Context)</td>
                  <td style="padding: 12px 14px; color: #4b5563; line-height: 1.5;">업무를 추진하게 된 <strong>추진 배경, 대학 환경, 대상 청중</strong> 제시</td>
                  <td style="padding: 12px 14px; color: #374151; font-size: 12.5px;">"신입생 중도 탈락 방지를 위한 2학기 멘토링 사업 기획 중이야."</td>
                </tr>
                <tr style="border-bottom: 1px solid #e5e7eb; background: #fffcfb;">
                  <td style="padding: 12px 14px; font-weight: 700; color: var(--color-obsidian);">3. 지시 (Task)</td>
                  <td style="padding: 12px 14px; color: #4b5563; line-height: 1.5;">AI가 실제로 수행해야 할 <strong>구체적 행정 과업 및 요구사항</strong></td>
                  <td style="padding: 12px 14px; color: #374151; font-size: 12.5px;">"사업 목적, 세부 절차, 소요 예산 항목, 기대효과를 도출해 줘."</td>
                </tr>
                <tr style="border-bottom: 2px solid #e5e7eb; background: #fffcfb;">
                  <td style="padding: 12px 14px; font-weight: 700; color: var(--color-obsidian);">4. 형식 (Format)</td>
                  <td style="padding: 12px 14px; color: #4b5563; line-height: 1.5;">행정 결재 및 배포에 적합한 <strong>시각적 구조 및 문서 형태</strong></td>
                  <td style="padding: 12px 14px; color: #374151; font-size: 12.5px;">"대학 공문서 규격 개조식(1. - 가. - 1)) 또는 표 형태로 정리해 줘."</td>
                </tr>

                <!-- 추가 2대 보강재 -->
                <tr style="border-bottom: 1px solid #e5e7eb; background: #fdfdfd;">
                  <td rowspan="2" style="padding: 12px 14px; text-align: center; font-weight: 700; color: #0d9488; border-right: 1px solid #e5e7eb; white-space: nowrap;">
                    추가 2대 요소<br><span style="font-size: 11px; font-weight: 600; color: #6b7280;">(보강재)</span>
                  </td>
                  <td style="padding: 12px 14px; font-weight: 700; color: var(--color-obsidian);">5. 조건 (Constraint)</td>
                  <td style="padding: 12px 14px; color: #4b5563; line-height: 1.5;">반드시 지켜야 할 <strong>학칙 규정, 분량, 톤앤매너, 보안 금지사항</strong></td>
                  <td style="padding: 12px 14px; color: #374151; font-size: 12.5px;">"개인정보는 일체 배제하고 가짜 법령을 지어내지 말 것."</td>
                </tr>
                <tr>
                  <td style="padding: 12px 14px; font-weight: 700; color: var(--color-obsidian);">6. 샘플 (Example)</td>
                  <td style="padding: 12px 14px; color: #4b5563; line-height: 1.5;">결재 서식에 맞춘 <strong>모범 서식 예시(기안 양식, 템플릿)</strong> 직접 제공</td>
                  <td style="padding: 12px 14px; color: #374151; font-size: 12.5px;">'[추진배경] ➔ [세부계획] ➔ [소요예산] ➔ [기대효과]' 목차 준수</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Before vs After 비교 박스 (행정 실무 버전) -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;">
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 16px; padding: 1rem 1.25rem;">
              <div style="font-weight: 700; font-size: 13.5px; color: #991b1b; margin-bottom: 6px;">❌ 단순 지시형 (일반적인 프롬프트)</div>
              <div style="font-size: 13px; color: #7f1d1d; line-height: 1.5; font-style: italic;">
                "신입생 멘토링 프로그램 기획안 써줘."
              </div>
              <div style="font-size: 12px; color: #991b1b; margin-top: 6px;">
                ➔ 인터넷에 흔히 있는 뜬구름 잡는 일반론 나열로 실제 학내 기안문으로 사용 불가
              </div>
            </div>

            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 16px; padding: 1rem 1.25rem;">
              <div style="font-weight: 700; font-size: 13.5px; color: #166534; margin-bottom: 6px;">✅ 4+2 공식 결합형 (고품질 행정 프롬프트)</div>
              <div style="font-size: 12.5px; color: #14532d; line-height: 1.5;">
                <strong>[역할]</strong> 학생처 기획 디렉터 / <strong>[배경]</strong> 2학기 신입생 적응 멘토링<br>
                <strong>[지시]</strong> 목적, 운영절차(선발-매칭-평가), 예산, 기대효과 도출<br>
                <strong>[형식]</strong> 공문 개조식(1.-가.-1)) / <strong>[조건]</strong> 장학금 인센티브 및 예산 근거 명시
              </div>
              <div style="font-size: 12px; color: #166534; margin-top: 6px;">
                ➔ 내부 결재선에 즉시 상신할 수 있는 체계적이고 완성도 높은 기안문 초안 완성
              </div>
            </div>
          </div>
        </div>

        <!-- 2. 교직원을 위한 실전 행정·교육 프롬프트 템플릿 5선 (카드) -->
        <div class="card" style="padding: 1.75rem 2rem; border: 1px solid var(--color-pumice); border-radius: 28px; background: #ffffff; margin-bottom: 1.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 1rem;">
            <h3 style="font-size: 18px; color: var(--color-obsidian); margin: 0;">
              📋 교직원 추천 실전 행정·교육 프롬프트 템플릿 5선
            </h3>
            <span style="font-size: 12.5px; color: #6b7280;">[대괄호] 부분만 담당 부서 실무 내용으로 변경하여 복사·활용하세요.</span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 1rem;">
            <!-- 템플릿 1: 기획/기안 -->
            <div class="prompt-template-card" style="background: #faf9f6; border: 1px solid var(--color-pumice); border-radius: 16px; padding: 1.1rem 1.25rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;">
                <div style="font-weight: 700; font-size: 14.5px; color: var(--color-obsidian); display: flex; align-items: center; gap: 6px;">
                  <span style="background: var(--color-ember); color: #fff; font-size: 11px; padding: 2px 7px; border-radius: 4px;">기획·기안</span>
                  <span>1. [기획/기안] 교육사업 기획서 및 결과보고서 초안 생성</span>
                </div>
                <button type="button" class="btn btn-outline prompt-copy-btn" onclick="DashboardApp.copyPrompt(this)" style="font-size: 12px; padding: 4px 12px; border-radius: 999px; display: inline-flex; align-items: center; gap: 4px; border-color: #d1d5db; background: #ffffff; cursor: pointer;" title="프롬프트 템플릿 복사하기">
                  <span>📋 프롬프트 복사</span>
                </button>
              </div>
              <pre style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 12px; font-size: 12px; color: #374151; white-space: pre-wrap; word-break: break-all; margin: 0; line-height: 1.55; font-family: inherit;">[역할] 너는 대학 기획처 및 국고 재정지원사업 총괄 PM이자 교육행정 기획관이야.
[배경] 우리 대학 재학생들의 미래 신기술 적응력 강화를 위한 [2026학년도 비교과 AI 리터러시 역량 강화 워크숍] 사업 기획안을 수립 중이야.
[지시] 교내 내부 결재용 기안문 초안을 작성해 줘. 
1. 사업 추진 배경 및 필요성 (최근 산업계 수요 및 교육부 정책 방향 반영)
2. 운영 개요 (대상, 일정, 운영 방식)
3. 세부 운영 프로그램 구성 (입문-실습-성과발표 3단계)
4. 소요 예산 산출 내역 (강사료, 다과비, 운영비)
5. 기대 효과 (정량적 성과 지표 포함)
[형식] 대학 공문서 표준 개조식(1. - 가. - 1)) 양식으로 작성해 줘.
[조건] 추상적인 미사여구는 배제하고, 실무 행정에 즉시 반영할 수 있는 구체적인 일정과 숫자를 가상으로 배치해 줘.
[샘플]
1. 추진 배경 및 목적
  가. 추진 배경:
  나. 사업 목적:
2. 세부 추진 계획</pre>
            </div>

            <!-- 템플릿 2: 교수/학습 -->
            <div class="prompt-template-card" style="background: #faf9f6; border: 1px solid var(--color-pumice); border-radius: 16px; padding: 1.1rem 1.25rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;">
                <div style="font-weight: 700; font-size: 14.5px; color: var(--color-obsidian); display: flex; align-items: center; gap: 6px;">
                  <span style="background: var(--color-ember); color: #fff; font-size: 11px; padding: 2px 7px; border-radius: 4px;">교수·학습</span>
                  <span>2. [교수/학습] 강의계획서(Syllabus) 및 루브릭(평가기준표) 설계</span>
                </div>
                <button type="button" class="btn btn-outline prompt-copy-btn" onclick="DashboardApp.copyPrompt(this)" style="font-size: 12px; padding: 4px 12px; border-radius: 999px; display: inline-flex; align-items: center; gap: 4px; border-color: #d1d5db; background: #ffffff; cursor: pointer;" title="프롬프트 템플릿 복사하기">
                  <span>📋 프롬프트 복사</span>
                </button>
              </div>
              <pre style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 12px; font-size: 12px; color: #374151; white-space: pre-wrap; word-break: break-all; margin: 0; line-height: 1.55; font-family: inherit;">[역할] 너는 대학교육 평가 전문가이자 고등교육 교수설계자(Instructional Designer)야.
[배경] [경영학/IT융합] 전공 3학년 대상의 [생성형 AI를 활용한 비즈니스 모델 기획 및 창업 실습] 전공 선택 과목(3학점, 15주차) 강의계획서를 새로 개발하고 있어.
[지시]
1. 15주차 주별 강의 세부 계획 (주차 / 강의 주제 / 학습 목표 / 학생 실습 과제)을 표로 설계해 줘.
2. 학생들이 학기 말 제출할 [AI 활용 비즈니스 기획서 과제]의 공정한 채점을 위한 4단계 루브릭(Rubric)을 제작해 줘.
[형식]
- 1단계: 15주차 강의 계획표 (Table)
- 2단계: 평가 루브릭 표 (평가 항목 / 배점(비중) / 탁월(A) / 보통(B) / 미흡(C) / 부적합(D) 세부 기준)
[조건] 평가 루브릭에는 '문제 정의의 독창성', 'AI 도구 활용의 적절성 및 윤리성(출처 명시)', '사업 실현 가능성'을 핵심 평가 척도로 반드시 포함할 것.</pre>
            </div>

            <!-- 템플릿 3: 문서 요약 -->
            <div class="prompt-template-card" style="background: #faf9f6; border: 1px solid var(--color-pumice); border-radius: 16px; padding: 1.1rem 1.25rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;">
                <div style="font-weight: 700; font-size: 14.5px; color: var(--color-obsidian); display: flex; align-items: center; gap: 6px;">
                  <span style="background: var(--color-ember); color: #fff; font-size: 11px; padding: 2px 7px; border-radius: 4px;">문서 요약</span>
                  <span>3. [문서 요약] 긴 회의록 및 교육부 지침 문서의 핵심 1장 요약</span>
                </div>
                <button type="button" class="btn btn-outline prompt-copy-btn" onclick="DashboardApp.copyPrompt(this)" style="font-size: 12px; padding: 4px 12px; border-radius: 999px; display: inline-flex; align-items: center; gap: 4px; border-color: #d1d5db; background: #ffffff; cursor: pointer;" title="프롬프트 템플릿 복사하기">
                  <span>📋 프롬프트 복사</span>
                </button>
              </div>
              <pre style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 12px; font-size: 12px; color: #374151; white-space: pre-wrap; word-break: break-all; margin: 0; line-height: 1.55; font-family: inherit;">[역할] 너는 대학 총장실 및 처장단 회의를 보좌하는 수석 행정관이야.
[배경] 아래 제공된 [회의록 / 교육부 공문 지침 / 평가 편람]의 텍스트를 검토하여 부서장 보고용 1장(One-page) 핵심 브리핑 문서를 작성해야 해.
[지시]
1. 핵심 안건 및 결정 사항 요약 (3줄 이내)
2. 부서별(교무처, 학생처, 기획처, 전산원) 후속 조치 과제(Action Item) 및 추진 기한
3. 예상되는 행정적 리스크 및 사전 검토 규정 조항
---
[문서 텍스트 입력]
(여기에 긴 회의록 원문이나 지침 텍스트를 붙여넣기 하세요)
---
[형식]
• [핵심 결정 사항]
• [부서별 조치 과제 표: 부서명 | 세부 실행 과제 | 담당자 | 권장 완료일]
• [행정 주의사항 & 규정 검토 사항]
[조건] 원문에 언급되지 않은 내용을 임의로 추측하여 지어내지 말 것. 불확실한 사안은 '원문 추가 확인 필요'로 명시할 것.</pre>
            </div>

            <!-- 템플릿 4: 학생 소통 -->
            <div class="prompt-template-card" style="background: #faf9f6; border: 1px solid var(--color-pumice); border-radius: 16px; padding: 1.1rem 1.25rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;">
                <div style="font-weight: 700; font-size: 14.5px; color: var(--color-obsidian); display: flex; align-items: center; gap: 6px;">
                  <span style="background: var(--color-ember); color: #fff; font-size: 11px; padding: 2px 7px; border-radius: 4px;">학생 소통</span>
                  <span>4. [학생 소통] 복잡한 학사규정·안내의 학생 눈높이 공지문/FAQ 변환</span>
                </div>
                <button type="button" class="btn btn-outline prompt-copy-btn" onclick="DashboardApp.copyPrompt(this)" style="font-size: 12px; padding: 4px 12px; border-radius: 999px; display: inline-flex; align-items: center; gap: 4px; border-color: #d1d5db; background: #ffffff; cursor: pointer;" title="프롬프트 템플릿 복사하기">
                  <span>📋 프롬프트 복사</span>
                </button>
              </div>
              <pre style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 12px; font-size: 12px; color: #374151; white-space: pre-wrap; word-break: break-all; margin: 0; line-height: 1.55; font-family: inherit;">[역할] 너는 학생들의 눈높이에 맞추어 친절하고 명확하게 소통하는 학사지원팀 소통 전문가야.
[배경] 이번 학기 변경된 [복수전공 이수 요건 및 수강신청 학점 변경 규정]에 대한 공식 학칙 개정문을 재학생 대상 카카오톡 알림톡 및 홈페이지 공지사항으로 게시하려고 해.
[지시] 딱딱하고 난해한 규정 조항을 학생들이 오해 없이 쉽게 이해할 수 있는 친절한 공지문과 FAQ로 변환해 줘.
---
[학칙 개정 조항 원문]
(여기에 대학 규정집 조항이나 개정 공문 문구를 입력하세요)
---
[형식]
1. 30초 한눈에 보기 요약 (카드뉴스형 3대 핵심 변경사항)
2. 친절한 본문 상세 안내 (적용 대상, 필수 이수 요건, 신청 기간)
3. 학생들이 가장 많이 묻는 예상 Q&A 3선
[조건] 공문서 특유의 한자어(기이수자, 득점 등)를 쉬운 순화어로 바꾸고, 학생들이 놓치기 쉬운 마감 기한과 불이익 사항을 눈에 띄게 강조할 것.</pre>
            </div>

            <!-- 템플릿 5: 데이터 분석 -->
            <div class="prompt-template-card" style="background: #faf9f6; border: 1px solid var(--color-pumice); border-radius: 16px; padding: 1.1rem 1.25rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;">
                <div style="font-weight: 700; font-size: 14.5px; color: var(--color-obsidian); display: flex; align-items: center; gap: 6px;">
                  <span style="background: var(--color-ember); color: #fff; font-size: 11px; padding: 2px 7px; border-radius: 4px;">데이터 분석</span>
                  <span>5. [데이터 분석] 설문조사/강의평가 주관식 피드백 분류 및 개선과제 도출</span>
                </div>
                <button type="button" class="btn btn-outline prompt-copy-btn" onclick="DashboardApp.copyPrompt(this)" style="font-size: 12px; padding: 4px 12px; border-radius: 999px; display: inline-flex; align-items: center; gap: 4px; border-color: #d1d5db; background: #ffffff; cursor: pointer;" title="프롬프트 템플릿 복사하기">
                  <span>📋 프롬프트 복사</span>
                </button>
              </div>
              <pre style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 12px; font-size: 12px; color: #374151; white-space: pre-wrap; word-break: break-all; margin: 0; line-height: 1.55; font-family: inherit;">[역할] 너는 대학 교육성과관리센터(IR)의 교육 품질 분석관이자 정성 데이터 분석 전문가야.
[배경] 지난 학기 교내 [교직원 직무 연수 프로그램 / 학생 비교과 특강] 종료 후 수집된 주관식 서술형 피드백 응답 텍스트야.
[지시]
1. 수집된 모든 주관식 의견을 감정(만족 / 불만족 / 건의사항)별로 분류하고 비율을 요약해 줘.
2. 불만족 및 건의사항에서 반복적으로 등장하는 핵심 키워드 3가지를 도출해 줘.
3. 차기 프로그램 개선을 위한 행정 부서 조치 권고사항 3가지를 제안해 줘.
---
[설문 주관식 응답 데이터]
(여기에 학생 또는 교직원의 주관식 응답을 엑셀 등에서 복사하여 붙여넣기 하세요. *개인정보 제외)
---
[형식] 표(Table)로 감정 및 카테고리별 분류 정리 후, 하단에 [주요 쟁점 분석] 및 [차기 추진 개선안] 서술
[조건] 특정 개인을 비난하는 어조는 완곡한 행정 과제로 순화하여 보고서형 문체로 작성할 것.</pre>
            </div>
          </div>
        </div>

        <!-- 3. 교직원 LLM 행정 안전 활용 5대 수칙 카드 -->
        <div class="card" style="padding: 1.75rem 2rem; border: 1px solid var(--color-pumice); border-radius: 28px; background: #ffffff;">
          <h3 style="font-size: 18px; color: var(--color-obsidian); margin-bottom: 1rem; display: flex; align-items: center; gap: 8px;">
            <span>⚠️ 교직원 LLM 행정 안전 활용 5대 수칙</span>
          </h3>

          <!-- 5대 유의사항 가로 1줄 배치 (5열 그리드 + 반응형 터치 스크롤) -->
          <div style="overflow-x: auto; -webkit-overflow-scrolling: touch; margin-bottom: 1.5rem;">
            <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.65rem; width: 100%; min-width: 680px;">
              <!-- 유의사항 1 -->
              <div style="background: #faf9f6; border: 1px solid var(--color-pumice); border-top: 3px solid var(--color-ember); padding: 1rem 1rem; border-radius: 14px;">
                <div style="font-weight: 700; font-size: 13.5px; color: var(--color-obsidian); margin-bottom: 6px; word-break: keep-all;">1. 법령·학칙 팩트체크</div>
                <div style="font-size: 12px; color: #555; line-height: 1.55; word-break: keep-all;">
                  AI는 가짜 조항을 지어낼 수 있습니다. 인용한 학칙 번호와 법령 문구는 반드시 규정집 원문과 직접 대조하세요.
                </div>
              </div>

              <!-- 유의사항 2 -->
              <div style="background: #faf9f6; border: 1px solid var(--color-pumice); border-top: 3px solid var(--color-ember); padding: 1rem 1rem; border-radius: 14px;">
                <div style="font-weight: 700; font-size: 13.5px; color: var(--color-obsidian); margin-bottom: 6px; word-break: keep-all;">2. 개인정보·대외비 금지</div>
                <div style="font-size: 12px; color: #555; line-height: 1.55; word-break: keep-all;">
                  학생 성명, 학번, 성적, 심층 상담일지, 입시 면접 채점표 등 민감정보는 입력 전 반드시 비식별(가명) 처리하세요.
                </div>
              </div>

              <!-- 유의사항 3 -->
              <div style="background: #faf9f6; border: 1px solid var(--color-pumice); border-top: 3px solid var(--color-ember); padding: 1rem 1rem; border-radius: 14px;">
                <div style="font-weight: 700; font-size: 13.5px; color: var(--color-obsidian); margin-bottom: 6px; word-break: keep-all;">3. 행정 윤리·최종 책임</div>
                <div style="font-size: 12px; color: #555; line-height: 1.55; word-break: keep-all;">
                  공문서와 보도자료의 모든 행정적·법적 책임은 결재자 본인에게 있습니다. AI는 초안 보조 도구로만 활용하세요.
                </div>
              </div>

              <!-- 유의사항 4 -->
              <div style="background: #faf9f6; border: 1px solid var(--color-pumice); border-top: 3px solid var(--color-ember); padding: 1rem 1rem; border-radius: 14px;">
                <div style="font-weight: 700; font-size: 13.5px; color: var(--color-obsidian); margin-bottom: 6px; word-break: keep-all;">4. 사정·평가 공정성</div>
                <div style="font-size: 12px; color: #555; line-height: 1.55; word-break: keep-all;">
                  장학생 선발이나 학생 평가에 AI 편향이 투영되지 않도록, AI 결과에만 의존하지 말고 위원회 교차 검증을 거치세요.
                </div>
              </div>

              <!-- 유의사항 5 -->
              <div style="background: #faf9f6; border: 1px solid var(--color-pumice); border-top: 3px solid var(--color-ember); padding: 1rem 1rem; border-radius: 14px;">
                <div style="font-weight: 700; font-size: 13.5px; color: var(--color-obsidian); margin-bottom: 6px; word-break: keep-all;">5. 업무 주도권 유지</div>
                <div style="font-size: 12px; color: #555; line-height: 1.55; word-break: keep-all;">
                  대학 발전 계획 및 핵심 정책 수립은 사람의 치열한 논의가 먼저이며, AI에 결정을 외주화해서는 안 됩니다.
                </div>
              </div>
            </div>
          </div>

          <!-- 자가 점검 체크리스트 바 (행정 결재 버전) -->
          <div style="background: #fdfbf7; border: 1px solid #fed7aa; border-radius: 16px; padding: 1.1rem 1.4rem;">
            <div style="font-weight: 700; font-size: 13.5px; color: #9a3412; margin-bottom: 6px;">📋 결재 상신 및 공지 배포 전 3초 자가 점검 체크리스트</div>
            <div style="font-size: 12.5px; color: #7c2d12; line-height: 1.6; display: flex; flex-direction: column; gap: 3px;">
              <span>✓ 학생 및 교직원의 개인정보(성명, 학번, 주민번호, 성적, 상담기록)가 프롬프트에 입력되지 않았는가?</span>
              <span>✓ 인용된 법령, 대학 학칙 조항 번호, 공문 번호, 예산 통계가 실제 규정집 원문과 일치하는가?</span>
              <span>✓ 난해한 행정 용어가 수신자(학생, 학부모, 일반인)의 눈높이에 맞춰 친절하고 명확하게 작성되었는가?</span>
              <span>✓ AI가 제안한 정책 및 사업 계획의 현실적 실현 가능성을 기안자 본인이 꼼꼼히 확인하였는가?</span>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * 교직원 전용: 스마트 행정 Google NotebookLM 완벽 사용 & 실무 활용 가이드 섹션 HTML 반환
   */
  getStaffNotebookLMSectionHtml() {
    return `
      <!-- 교직원 전용: Google NotebookLM 완벽 사용 및 스마트 행정 실무 활용 가이드 섹션 -->
      <div id="lecture-sec-3" class="lecture-nav-section" style="margin-top: var(--spacing-48); margin-bottom: var(--spacing-32); scroll-margin-top: 96px;">
        <!-- 섹션 헤더 -->
        <div style="margin-bottom: var(--spacing-20);">
          <span style="font-family: var(--font-display); font-size: 16px; color: var(--color-ember); letter-spacing: 0.05em;">ADMINISTRATIVE RAG & COMPLIANCE RESEARCH</span>
          <h2 style="font-size: clamp(24px, 3.5vw, 32px); color: var(--color-obsidian); margin-top: 4px;">🏛️ 교직원 스마트 행정 NotebookLM 완벽 사용 & 실무 활용 가이드</h2>
        </div>

        <!-- 카드 1: NotebookLM 개념 및 ChatGPT와의 결정적 차이 비교표 -->
        <div class="card" style="padding: 1.75rem 2rem; border: 1px solid var(--color-pumice); border-radius: 28px; background: #ffffff; margin-bottom: 1.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 1rem;">
            <h3 style="font-size: 18px; color: var(--color-obsidian); margin: 0; display: flex; align-items: center; gap: 8px;">
              <span>🔍 1. NotebookLM이란? (ChatGPT와의 결정적 차이)</span>
            </h3>
            <span style="background: #e0f2fe; color: #0369a1; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 999px;">
              Google Gemini 1.5 Pro 기반 소스 접지(Source-Grounded) 스마트 행정 RAG
            </span>
          </div>
          
          <p style="font-size: 13.5px; color: #555; line-height: 1.6; margin-bottom: 1.25rem; word-break: keep-all;">
            Google NotebookLM은 구글의 최신 거대언어모델(Gemini 1.5 Pro) 기반의 <strong>'소스 접지형(Source-Grounded) 스마트 행정 연구 및 문서 분석 AI 도구'</strong>입니다. 일반 범용 챗봇과 달리 교직원이 직접 업로드한 <strong>학내 규정집, 사업 편람, 회의록만을 엄격한 진실의 원천(Source of Truth)</strong>으로 삼아 답변을 생성합니다.
          </p>

          <!-- 비교 테이블 -->
          <div style="overflow-x: auto; -webkit-overflow-scrolling: touch; margin-bottom: 1.5rem;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13.5px; text-align: left; min-width: 620px; word-break: keep-all;">
              <thead>
                <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                  <th style="padding: 12px 14px; font-weight: 700; color: #334155; width: 18%;">구분</th>
                  <th style="padding: 12px 14px; font-weight: 700; color: #64748b; width: 41%;">일반 범용 LLM (ChatGPT, Claude 등)</th>
                  <th style="padding: 12px 14px; font-weight: 700; color: #0284c7; width: 41%; background: #f0f9ff;">Google NotebookLM (스마트 행정 특화)</th>
                </tr>
              </thead>
              <tbody>
                <tr style="border-bottom: 1px solid #e5e7eb;">
                  <td style="padding: 12px 14px; font-weight: 700; color: #475569; background: #fdfbf9;">지식 출처</td>
                  <td style="padding: 12px 14px; color: #6b7280;">인터넷 전체 학습 데이터 (방대하지만 부정확할 수 있음)</td>
                  <td style="padding: 12px 14px; font-weight: 600; color: #0369a1; background: #f0f9ff;">교직원이 직접 업로드한 학내 규정·공문·편람에만 엄격히 한정</td>
                </tr>
                <tr style="border-bottom: 1px solid #e5e7eb;">
                  <td style="padding: 12px 14px; font-weight: 700; color: #475569; background: #fdfbf9;">환각 (거짓 정보)</td>
                  <td style="padding: 12px 14px; color: #6b7280;">가짜 법령 조항이나 없는 학칙 번호를 지어낼 위험 상존</td>
                  <td style="padding: 12px 14px; font-weight: 600; color: #0369a1; background: #f0f9ff;">내가 준 규정집 밖의 정보는 원칙적으로 답변하지 않아 환각 극소화</td>
                </tr>
                <tr style="border-bottom: 1px solid #e5e7eb;">
                  <td style="padding: 12px 14px; font-weight: 700; color: #475569; background: #fdfbf9;">출처 표기</td>
                  <td style="padding: 12px 14px; color: #6b7280;">출처가 없거나 지어낸 가짜 링크를 제공하는 경우 발생</td>
                  <td style="padding: 12px 14px; font-weight: 600; color: #0369a1; background: #f0f9ff;">모든 문장마다 원문 페이지/조항 번호 인라인 각주([1], [2]) 자동 첨부</td>
                </tr>
                <tr>
                  <td style="padding: 12px 14px; font-weight: 700; color: #475569; background: #fdfbf9;">최적 용도</td>
                  <td style="padding: 12px 14px; color: #6b7280;">브레인스토밍, 범용 코딩, 창의적 글쓰기, 다국어 번역</td>
                  <td style="padding: 12px 14px; font-weight: 600; color: #0369a1; background: #f0f9ff;">학내 규정 Q&A, 국고사업 편람 분석, 회의록 1장 요약, 홍보 기획안 도출</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- 핵심 특징 3대 배너 -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 0.85rem;">
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #0284c7; padding: 1rem 1.15rem; border-radius: 12px;">
              <div style="font-weight: 700; font-size: 13.5px; color: var(--color-obsidian); margin-bottom: 4px;">📌 철저한 소스 접지(Source-Grounded)</div>
              <div style="font-size: 12.5px; color: #4b5563; line-height: 1.55; word-break: keep-all;">
                인터넷이 아니라 내가 직접 올린 학내 규정과 사업 편람만을 근거로 하므로 행정적 맥락이 100% 보존됩니다.
              </div>
            </div>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid var(--color-ember); padding: 1rem 1.15rem; border-radius: 12px;">
              <div style="font-weight: 700; font-size: 13.5px; color: var(--color-obsidian); margin-bottom: 4px;">🔍 환각(거짓 규정)의 원천 차단</div>
              <div style="font-size: 12.5px; color: #4b5563; line-height: 1.55; word-break: keep-all;">
                문서에 명시되지 않은 조항은 답변을 거부하므로, 엄밀한 사실 확인이 필요한 공문 기안과 법률 검토에 최적입니다.
              </div>
            </div>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #10b981; padding: 1rem 1.15rem; border-radius: 12px;">
              <div style="font-weight: 700; font-size: 13.5px; color: var(--color-obsidian); margin-bottom: 4px;">📑 1초 만에 규정 원문 대조 (인라인 각주)</div>
              <div style="font-size: 12.5px; color: #4b5563; line-height: 1.55; word-break: keep-all;">
                각주 번호를 클릭하면 원본 규정집의 해당 페이지와 형광펜 하이라이트로 즉시 이동하여 결재선 검증이 끝납니다.
              </div>
            </div>
          </div>
        </div>

        <!-- 카드 2: 교직원을 위한 핵심 탑재 기능 5선 (상세 가이드) -->
        <div class="card" style="padding: 1.75rem 2rem; border: 1px solid var(--color-pumice); border-radius: 28px; background: #ffffff; margin-bottom: 1.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 1.25rem;">
            <h3 style="font-size: 18px; color: var(--color-obsidian); margin: 0; display: flex; align-items: center; gap: 8px;">
              <span>⚡ 2. 교직원을 위한 핵심 탑재 기능 5선</span>
            </h3>
            <span style="font-size: 12.5px; color: #6b7280;">행정 연구 및 공문 분석 생산성을 5배 끌어올리는 특화 엔진</span>
          </div>

          <!-- 가로 1줄 5열 균등 배치 컨테이너 -->
          <div style="overflow-x: auto; -webkit-overflow-scrolling: touch; padding-bottom: 4px;">
            <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.75rem; width: 100%; min-width: 980px;">
              <!-- 기능 1 -->
              <div style="background: #faf9f6; border: 1px solid var(--color-pumice); border-top: 3px solid #0284c7; border-radius: 16px; padding: 1rem 0.9rem; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                  <div style="font-weight: 700; font-size: 13.5px; color: #0284c7; margin-bottom: 8px; word-break: keep-all;">
                    ① 멀티 포맷 업로드
                  </div>
                  <p style="font-size: 12px; color: #4b5563; line-height: 1.5; margin: 0 0 10px 0; word-break: keep-all;">
                    PDF, 구글 문서, 슬라이드, 웹 URL, <strong>유튜브 설명회 영상 링크</strong>까지 지원합니다.
                  </p>
                </div>
                <div style="font-size: 11px; color: #64748b; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 6px 8px; line-height: 1.45; word-break: keep-all;">
                  💡 <strong>용량</strong>: 노트북당 50개 소스, 소스당 50만 단어 탑재 가능
                </div>
              </div>

              <!-- 기능 2 -->
              <div style="background: #faf9f6; border: 1px solid var(--color-pumice); border-top: 3px solid #0284c7; border-radius: 16px; padding: 1rem 0.9rem; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                  <div style="font-weight: 700; font-size: 13.5px; color: #0284c7; margin-bottom: 8px; word-break: keep-all;">
                    ② 인라인 각주 원문 대조
                  </div>
                  <p style="font-size: 12px; color: #4b5563; line-height: 1.5; margin: 0 0 10px 0; word-break: keep-all;">
                    답변 속 각주(<strong>[1]</strong>, <strong>[2]</strong>) 클릭 시 원본 규정집의 해당 페이지와 형광펜 조항으로 즉시 화면 전환됩니다.
                  </p>
                </div>
                <div style="font-size: 11px; color: #64748b; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 6px 8px; line-height: 1.45; word-break: keep-all;">
                  💡 <strong>실무</strong>: 결재 근거 조항을 1초 만에 팩트체크 검증
                </div>
              </div>

              <!-- 기능 3 -->
              <div style="background: #faf9f6; border: 1px solid var(--color-pumice); border-top: 3px solid #0284c7; border-radius: 16px; padding: 1rem 0.9rem; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                  <div style="font-weight: 700; font-size: 13.5px; color: #0284c7; margin-bottom: 8px; word-break: keep-all;">
                    ③ Studio 자동 행정 도구
                  </div>
                  <p style="font-size: 12px; color: #4b5563; line-height: 1.5; margin: 0 0 10px 0; word-break: keep-all;">
                    버튼 하나로 <strong>브리핑 문서(One-page)</strong>, <strong>행정 FAQ</strong>, <strong>업무 매뉴얼</strong>, <strong>추진 타임라인</strong>을 자동 생성합니다.
                  </p>
                </div>
                <div style="font-size: 11px; color: #64748b; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 6px 8px; line-height: 1.45; word-break: keep-all;">
                  💡 <strong>산출물</strong>: 브리핑문서 / FAQ / 스터디가이드 / 타임라인
                </div>
              </div>

              <!-- 기능 4 -->
              <div style="background: #faf9f6; border: 1px solid var(--color-pumice); border-top: 3px solid #0284c7; border-radius: 16px; padding: 1rem 0.9rem; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                  <div style="font-weight: 700; font-size: 13.5px; color: #0284c7; margin-bottom: 8px; word-break: keep-all;">
                    ④ 오디오 정책 브리핑
                  </div>
                  <p style="font-size: 12px; color: #4b5563; line-height: 1.5; margin: 0 0 10px 0; word-break: keep-all;">
                    수십 장의 정부 정책 보고서를 남/여 AI 호스트가 <strong>10~15분 대화형 라디오 방송</strong>으로 재구성합니다.
                  </p>
                </div>
                <div style="font-size: 11px; color: #64748b; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 6px 8px; line-height: 1.45; word-break: keep-all;">
                  💡 <strong>실무</strong>: 출퇴근길/이동 중 핵심 정책 쟁점 사전 청취
                </div>
              </div>

              <!-- 기능 5 -->
              <div style="background: #faf9f6; border: 1px solid var(--color-pumice); border-top: 3px solid #0284c7; border-radius: 16px; padding: 1rem 0.9rem; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                  <div style="font-weight: 700; font-size: 13.5px; color: #0284c7; margin-bottom: 8px; word-break: keep-all;">
                    ⑤ 핀포인트 선택 Q&A
                  </div>
                  <p style="font-size: 12px; color: #4b5563; line-height: 1.5; margin: 0 0 10px 0; word-break: keep-all;">
                    전체가 아닌 <strong>체크박스로 선택한 특정 1~2개 규정이나 공고문만을 타깃</strong>으로 지정해 정밀 대조 분석합니다.
                  </p>
                </div>
                <div style="font-size: 11px; color: #64748b; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 6px 8px; line-height: 1.45; word-break: keep-all;">
                  💡 <strong>실무</strong>: 개정 전/후 2개 규정만 체크해 변경점 비교표 도출
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 카드 3: 교직원 스마트 행정 실전 활용 시나리오 4선 & 추천 프롬프트 (템플릿 복사 기능 탑재) -->
        <div class="card" style="padding: 1.75rem 2rem; border: 1px solid var(--color-pumice); border-radius: 28px; background: #ffffff; margin-bottom: 1.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 1.25rem;">
            <h3 style="font-size: 18px; color: var(--color-obsidian); margin: 0; display: flex; align-items: center; gap: 8px;">
              <span>🎯 3. 교직원 스마트 행정 실전 활용 시나리오 4선 & 추천 프롬프트</span>
            </h3>
            <span style="font-size: 12.5px; color: #6b7280;">NotebookLM 중앙 채팅창에 그대로 복사·붙여넣기하여 사용하세요.</span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 1.15rem;">
            <!-- 시나리오 1: 규정집 Q&A -->
            <div class="prompt-template-card" style="background: #faf9f6; border: 1px solid var(--color-pumice); border-radius: 18px; padding: 1.25rem 1.4rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;">
                <div style="font-weight: 700; font-size: 14.5px; color: var(--color-obsidian); display: flex; align-items: center; gap: 6px;">
                  <span style="background: var(--color-ember); color: #fff; font-size: 11px; padding: 2px 7px; border-radius: 4px;">학칙·규정</span>
                  <span>1. 📜 학내 규정집 연동 '근거 조항 기반 스마트 행정 Q&A 비서'</span>
                </div>
                <button type="button" class="btn btn-outline prompt-copy-btn" onclick="DashboardApp.copyPrompt(this)" style="font-size: 12px; padding: 4px 12px; border-radius: 999px; display: inline-flex; align-items: center; gap: 4px; border-color: #d1d5db; background: #ffffff; cursor: pointer;" title="프롬프트 복사하기">
                  <span>📋 프롬프트 복사</span>
                </button>
              </div>
              <div style="font-size: 12.5px; color: #64748b; margin-bottom: 8px; line-height: 1.5; word-break: keep-all;">
                <strong>활용 부서</strong>: 교무처, 총무처, 기획처, 학생처 등 전 행정부서 / <strong>활용 방법</strong>: 학내 규정집 PDF를 소스로 등록하고 여비, 복무, 전결 규정을 조항 번호와 함께 즉시 확인합니다.
              </div>
              <pre style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 12px; font-size: 12px; color: #374151; white-space: pre-wrap; word-break: break-all; margin: 0; line-height: 1.55; font-family: inherit;">[역할] 너는 우리 대학 학칙 및 교직원 복무 규정 전문 행정 자문 비서야.
[지시] 업로드된 [교직원 복무 규정 및 여비 지급 규정] 소스만을 근거로 아래 질문에 명확하게 답변해 줘:
1. 교직원이 공무로 국외 출장을 갈 경우 일비 및 숙박비 지급 기준과 출장 후 정산 기한은 며칠 이내인가?
2. 출장 신청 시 결재 전결 기준과 필수 첨부 증빙 서류 목록을 정리해 줘.
[조건] 업로드된 규정에 명시되지 않은 내용은 임의로 추측하지 말고, 답변의 모든 항목마다 반드시 관련 규정의 조항 번호([제0조 제0항])와 인라인 각주([1], [2])를 정확히 표기할 것.</pre>
            </div>

            <!-- 시나리오 2: 국고사업 편람 분석 -->
            <div class="prompt-template-card" style="background: #faf9f6; border: 1px solid var(--color-pumice); border-radius: 18px; padding: 1.25rem 1.4rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;">
                <div style="font-weight: 700; font-size: 14.5px; color: var(--color-obsidian); display: flex; align-items: center; gap: 6px;">
                  <span style="background: var(--color-ember); color: #fff; font-size: 11px; padding: 2px 7px; border-radius: 4px;">국고 사업</span>
                  <span>2. 📊 교육부 국고 재정지원사업(RISE 등) 편람 분석 및 핵심 지표 추출</span>
                </div>
                <button type="button" class="btn btn-outline prompt-copy-btn" onclick="DashboardApp.copyPrompt(this)" style="font-size: 12px; padding: 4px 12px; border-radius: 999px; display: inline-flex; align-items: center; gap: 4px; border-color: #d1d5db; background: #ffffff; cursor: pointer;" title="프롬프트 복사하기">
                  <span>📋 프롬프트 복사</span>
                </button>
              </div>
              <div style="font-size: 12.5px; color: #64748b; margin-bottom: 8px; line-height: 1.5; word-break: keep-all;">
                <strong>활용 부서</strong>: 기획처, 산학협력단, 국고사업추진단 / <strong>활용 방법</strong>: 수백 페이지의 정부 공모 편람에서 신청 자격, 배점 상위 성과지표, 예산 불인정 기준을 1분 만에 도출합니다.
              </div>
              <pre style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 12px; font-size: 12px; color: #374151; white-space: pre-wrap; word-break: break-all; margin: 0; line-height: 1.55; font-family: inherit;">[역할] 너는 교육부 대학 재정지원사업 기획 및 평가 대응 수석 컨설턴트야.
[지시] 업로드된 [2026 교육부 재정지원사업 신청 편람] 소스를 정밀 분석해서 아래 항목을 일목요연하게 정리해 줘:
1. 사업 신청 필수 요건 및 결격 사유 (참여 배제 조건)
2. 정량·정성 평가 항목 중 배점이 가장 높은 3대 핵심 성과지표 및 산출 방식
3. 국고 사업비 집행 시 '집행 불가 항목(불인정 기준)' 5가지
[형식] 표(Table) 또는 개조식 보고서 형식으로 작성하고, 세부 페이지 각주를 표기할 것.</pre>
            </div>

            <!-- 시나리오 3: 회의록 1장 요약 -->
            <div class="prompt-template-card" style="background: #faf9f6; border: 1px solid var(--color-pumice); border-radius: 18px; padding: 1.25rem 1.4rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;">
                <div style="font-weight: 700; font-size: 14.5px; color: var(--color-obsidian); display: flex; align-items: center; gap: 6px;">
                  <span style="background: var(--color-ember); color: #fff; font-size: 11px; padding: 2px 7px; border-radius: 4px;">보고서 요약</span>
                  <span>3. 📋 처장단/위원회 회의록 및 자체평가보고서 핵심 1장(One-Page) 브리핑</span>
                </div>
                <button type="button" class="btn btn-outline prompt-copy-btn" onclick="DashboardApp.copyPrompt(this)" style="font-size: 12px; padding: 4px 12px; border-radius: 999px; display: inline-flex; align-items: center; gap: 4px; border-color: #d1d5db; background: #ffffff; cursor: pointer;" title="프롬프트 복사하기">
                  <span>📋 프롬프트 복사</span>
                </button>
              </div>
              <div style="font-size: 12.5px; color: #64748b; margin-bottom: 8px; line-height: 1.5; word-break: keep-all;">
                <strong>활용 부서</strong>: 총장실, 기획평가팀, 교원인사팀 / <strong>활용 방법</strong>: 긴 회의록 원문을 부서별 후속 조치 과제(Action Item)와 함께 결재용 1장 브리핑으로 압축합니다.
              </div>
              <pre style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 12px; font-size: 12px; color: #374151; white-space: pre-wrap; word-break: break-all; margin: 0; line-height: 1.55; font-family: inherit;">[역할] 너는 총장단 및 교무위원회를 보좌하는 기획조정실 수석 행정관이야.
[지시] 업로드된 [제3차 교무위원회 회의록 및 부서별 현안 보고서]를 바탕으로 부서장 보고용 1장(One-page) 브리핑 문서를 작성해 줘:
1. 주요 안건별 최종 의결 사항 요약 (의결/보류/조건부 승인 구분)
2. 각 행정부서별(교무, 학생, 기획, 총무) 향후 실행 조치 과제(Action Item) 및 완료 권장 기한
3. 차기 회의 전까지 사전 법률·규정 검토가 필요한 잠재적 행정 리스크 2가지
[형식] '안건 요약 ➔ 부서별 조치 과제 표 ➔ 행정 유의사항' 3단계 구조로 정리해 줘.</pre>
            </div>

            <!-- 시나리오 4: 홍보 카드뉴스 기획 -->
            <div class="prompt-template-card" style="background: #faf9f6; border: 1px solid var(--color-pumice); border-radius: 18px; padding: 1.25rem 1.4rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;">
                <div style="font-weight: 700; font-size: 14.5px; color: var(--color-obsidian); display: flex; align-items: center; gap: 6px;">
                  <span style="background: var(--color-ember); color: #fff; font-size: 11px; padding: 2px 7px; border-radius: 4px;">행정 홍보</span>
                  <span>4. 📢 학내 보도자료 및 행사 요강 기반 홍보 카드뉴스/공지안 도출</span>
                </div>
                <button type="button" class="btn btn-outline prompt-copy-btn" onclick="DashboardApp.copyPrompt(this)" style="font-size: 12px; padding: 4px 12px; border-radius: 999px; display: inline-flex; align-items: center; gap: 4px; border-color: #d1d5db; background: #ffffff; cursor: pointer;" title="프롬프트 복사하기">
                  <span>📋 프롬프트 복사</span>
                </button>
              </div>
              <div style="font-size: 12.5px; color: #64748b; margin-bottom: 8px; line-height: 1.5; word-break: keep-all;">
                <strong>활용 부서</strong>: 입학홍보처, 학생지원팀, 대외협력팀 / <strong>활용 방법</strong>: 딱딱한 행사 요강을 모바일 친화형 6장 카드뉴스 문구로 자동 변환합니다.
              </div>
              <pre style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 12px; font-size: 12px; color: #374151; white-space: pre-wrap; word-break: break-all; margin: 0; line-height: 1.55; font-family: inherit;">[역할] 너는 대학 공식 SNS 및 대외 홍보 전문 콘텐츠 디렉터야.
[지시] 업로드된 [신입생 역량강화 캠프 모집 요강 및 보도자료] 소스를 분석하여 학생들이 쉽게 읽을 수 있는 '인스타그램 6장 카드뉴스 기획안'을 작성해 줘:
- 1장 (표지): 학생들의 호기심을 자극하는 직관적인 헤드카피 및 서브카피
- 2~4장 (핵심 혜택): 참가자에게 주어지는 3대 핵심 특전 (장학금 마일리지, 1:1 멘토링 등)
- 5장 (신청 안내): 지원 자격, 선발 인원, 접수 일정, 온라인 신청 링크 안내
- 6장 (마무리): 참여 독려 메시지 및 문의처 (학생처 번호/이메일)
[조건] 어려운 행정 용어를 배제하고, 모바일 카드뉴스 템플릿에 맞추어 슬라이드별 3줄 이내의 간결한 문구로 작성할 것.</pre>
            </div>
          </div>
        </div>

        <!-- 카드 4: 슬라이드(PPT) 보고서 & 카드뉴스 스튜디오 활용 가이드 -->
        <div class="card" style="padding: 1.75rem 2rem; border: 1px solid var(--color-pumice); border-radius: 28px; background: #ffffff; margin-bottom: 1.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 1.25rem;">
            <h3 style="font-size: 18px; color: var(--color-obsidian); margin: 0; display: flex; align-items: center; gap: 8px;">
              <span>📊 4. 보고용 슬라이드 & 카드뉴스 제작을 위한 스튜디오 가이드</span>
            </h3>
            <span style="background: #ecfdf5; color: #047857; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 999px;">
              Gamma · PPT 연동 10초 완성
            </span>
          </div>

          <p style="font-size: 13.5px; color: #555; line-height: 1.6; margin-bottom: 1.25rem; word-break: keep-all;">
            NotebookLM은 직접 그래픽 이미지나 PPT 파일을 생성하지는 않지만, 소스 문서에서 <strong>'보고서용 슬라이드 덱 구조·헤드카피·구술 대본'</strong> 및 <strong>'인포그래픽용 데이터 시트'</strong>를 가장 정확한 팩트 기반으로 추출해 주므로, 이를 복사하여 <strong>Gamma, PowerPoint 등</strong>에 붙여넣으면 5분 만에 완성도 높은 행정 시각 자료가 완성됩니다.
          </p>

          <div style="display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1.5rem;">
            <!-- 1. 보고용 PPT 제작 프롬프트 -->
            <div class="prompt-template-card" style="background: #faf9f6; border: 1px solid var(--color-pumice); border-radius: 18px; padding: 1.25rem 1.4rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;">
                <div style="font-weight: 700; font-size: 14.5px; color: var(--color-obsidian); display: flex; align-items: center; gap: 6px;">
                  <span style="background: #0284c7; color: #fff; font-size: 11px; padding: 2px 7px; border-radius: 4px;">PPT 기획</span>
                  <span>1. 📊 처장단/위원회 보고용 "5장 슬라이드 덱" 기획안 추출</span>
                </div>
                <button type="button" class="btn btn-outline prompt-copy-btn" onclick="DashboardApp.copyPrompt(this)" style="font-size: 12px; padding: 4px 12px; border-radius: 999px; display: inline-flex; align-items: center; gap: 4px; border-color: #d1d5db; background: #ffffff; cursor: pointer;" title="프롬프트 복사하기">
                  <span>📋 프롬프트 복사</span>
                </button>
              </div>
              <div style="font-size: 12.5px; color: #64748b; margin-bottom: 8px; line-height: 1.5; word-break: keep-all;">
                <strong>활용 방법</strong>: 긴 사업계획서나 정책 보고서를 처장단 보고용 5장 슬라이드 구조와 구술 대본으로 변환합니다.
              </div>
              <pre style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 12px; font-size: 12px; color: #374151; white-space: pre-wrap; word-break: break-all; margin: 0; line-height: 1.55; font-family: inherit;">[목표] 업로드된 소스 자료를 바탕으로 처장단 회의 보고용 "5장 슬라이드 기획안"을 작성해 줘.

[발표 환경]
- 대상 청중: 총장 및 주요 처장단 (신속한 의사결정 필요)
- 발표 시간: 약 5~7분

[슬라이드별 필수 구성]
1. 슬라이드 제목 & 한 줄 핵심 의사결정 메시지(헤드카피)
2. 본문 내용 (단락 글이 아닌, 3개의 명확한 개조식 불릿포인트)
3. 화면 비주얼 연출 아이디어 (비교 표, 단계별 프로세스 다이어그램 등 추천)
4. 발표자 구술 스크립트 (30~40초 분량의 정중하고 격식 있는 행정 구어체)

[조건] 원문의 수치(예산, 일정, 통계)를 왜곡 없이 그대로 반영하고, 슬라이드마다 원문 인용 각주([1], [2])를 달아 팩트체크할 수 있게 해 줘.</pre>
            </div>

            <!-- 2. 프로세스형 인포그래픽 프롬프트 -->
            <div class="prompt-template-card" style="background: #faf9f6; border: 1px solid var(--color-pumice); border-radius: 18px; padding: 1.25rem 1.4rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;">
                <div style="font-weight: 700; font-size: 14.5px; color: var(--color-obsidian); display: flex; align-items: center; gap: 6px;">
                  <span style="background: #059669; color: #fff; font-size: 11px; padding: 2px 7px; border-radius: 4px;">절차 인포그래픽</span>
                  <span>2. 📌 [프로세스형] 학사·사업 신청 절차 인포그래픽 데이터 시트 추출</span>
                </div>
                <button type="button" class="btn btn-outline prompt-copy-btn" onclick="DashboardApp.copyPrompt(this)" style="font-size: 12px; padding: 4px 12px; border-radius: 999px; display: inline-flex; align-items: center; gap: 4px; border-color: #d1d5db; background: #ffffff; cursor: pointer;" title="프롬프트 복사하기">
                  <span>📋 프롬프트 복사</span>
                </button>
              </div>
              <div style="font-size: 12.5px; color: #64748b; margin-bottom: 8px; line-height: 1.5; word-break: keep-all;">
                <strong>활용 방법</strong>: 장학금, 비교과, 연구비 정산 등 복잡한 학사·사업 공고를 4단계 순서도 및 D-Day 일정표 인포그래픽으로 구조화합니다.
              </div>
              <pre style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 12px; font-size: 12px; color: #374151; white-space: pre-wrap; word-break: break-all; margin: 0; line-height: 1.55; font-family: inherit;">[목표] 업로드된 소스 문서를 분석하여 학내 포털 및 웹페이지 게시용 "단계별 절차 인포그래픽(Process Infographic) 기획안"을 작성해 줘.

[시각화 타깃]
- 대상: 복잡한 공문을 읽기 힘들어하는 학생 및 신임 교직원
- 형식: 웹 공지용 세로형(Long Form) 인포그래픽

[요청 구성]
1. 인포그래픽 헤드카피: 사업의 핵심 혜택을 담은 직관적인 제목 (예: "3단계로 끝내는 2026 00장학금 올인원 가이드")
2. 단계별 프로세스 흐름 (Timeline Flow):
   - [1단계 신청] ➔ [2단계 자격 검증] ➔ [3단계 심사/면접] ➔ [4단계 최종 선발 및 지급]
   - 각 단계마다 [행정 일정/기한], [신청자 필수 액션], [제출 서류 체크리스트]를 2~3줄로 압축 정리
3. 💡 담당 부서 꿀팁 & 주의사항 (Callout Box): 탈락 방지를 위한 빈출 실수 2가지와 문의처
4. 시각화 아이콘 가이드: 각 단계별로 배치하면 어울릴 추천 아이콘 명칭 (예: 캘린더, 서류, 돋보기, 계좌 등)

[규칙] 일정, 기한, 서류명은 원문 소스의 명칭을 100% 동일하게 유지해 줘.</pre>
            </div>

            <!-- 3. 성과/통계형 인포그래픽 프롬프트 -->
            <div class="prompt-template-card" style="background: #faf9f6; border: 1px solid var(--color-pumice); border-radius: 18px; padding: 1.25rem 1.4rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;">
                <div style="font-weight: 700; font-size: 14.5px; color: var(--color-obsidian); display: flex; align-items: center; gap: 6px;">
                  <span style="background: #ea580c; color: #fff; font-size: 11px; padding: 2px 7px; border-radius: 4px;">성과 인포그래픽</span>
                  <span>3. 📊 [성과/통계형] 대학 재정지원사업 & 성과보고 1페이지 인포그래픽</span>
                </div>
                <button type="button" class="btn btn-outline prompt-copy-btn" onclick="DashboardApp.copyPrompt(this)" style="font-size: 12px; padding: 4px 12px; border-radius: 999px; display: inline-flex; align-items: center; gap: 4px; border-color: #d1d5db; background: #ffffff; cursor: pointer;" title="프롬프트 복사하기">
                  <span>📋 프롬프트 복사</span>
                </button>
              </div>
              <div style="font-size: 12.5px; color: #64748b; margin-bottom: 8px; line-height: 1.5; word-break: keep-all;">
                <strong>활용 방법</strong>: 사업 결과보고서의 핵심 수치 3~4선과 전년 대비 성과(Before vs After)를 1페이지 대시보드형으로 추출합니다.
              </div>
              <pre style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 12px; font-size: 12px; color: #374151; white-space: pre-wrap; word-break: break-all; margin: 0; line-height: 1.55; font-family: inherit;">[목표] 업로드된 사업 결과보고서 소스를 분석하여 "1페이지 대시보드형 성과 인포그래픽(Stat Infographic) 기획안"을 추출해 줘.

[청중 및 목적]
- 대상 청중: 대학 본부 보직자 및 대외 평가위원
- 목적: 사업의 핵심 성과 수치와 전년 대비 성장세를 단 10초 만에 인지시키는 것

[요청 구성]
1. Big Numbers (핵심 강조 지표 3~4선):
   - 폰트를 가장 크게 키워 배치할 핵심 수치 추출 (예: 예산 집행률 98.5%, 참여 학생 수 1,240명, 만족도 4.8/5.0 등)
   - 각 숫자 밑에 들어갈 설명 문구 (15자 이내)
2. 성과 비교표 (Before vs After):
   - 사업 도입 전과 도입 후의 변화를 비교할 수 있는 3대 비교 항목과 수치
3. 우수 사례(Highlight) 1선:
   - 정량 지표 외에 가장 돋보이는 정성적 성공 사례 또는 학생 대표 수기 1문장 요약
4. 색상 및 차트 연출 제안:
   - 본 지표를 가장 잘 전달할 수 있는 차트 형태(원형 차트, 막대그래프, 게이지 바 등) 추천

[규칙] 수치는 반올림하지 말고 원문 데이터 그대로 정확하게 표기해 줘.</pre>
            </div>

            <!-- 4. 오디오 오버뷰 맞춤설정 프롬프트 -->
            <div class="prompt-template-card" style="background: #faf9f6; border: 1px solid var(--color-pumice); border-radius: 18px; padding: 1.25rem 1.4rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;">
                <div style="font-weight: 700; font-size: 14.5px; color: var(--color-obsidian); display: flex; align-items: center; gap: 6px;">
                  <span style="background: #7c3aed; color: #fff; font-size: 11px; padding: 2px 7px; border-radius: 4px;">오디오 브리핑</span>
                  <span>4. 🎙️ 스튜디오 '오디오 오버뷰' 정책 쟁점 토론 맞춤설정 지시문</span>
                </div>
                <button type="button" class="btn btn-outline prompt-copy-btn" onclick="DashboardApp.copyPrompt(this)" style="font-size: 12px; padding: 4px 12px; border-radius: 999px; display: inline-flex; align-items: center; gap: 4px; border-color: #d1d5db; background: #ffffff; cursor: pointer;" title="프롬프트 복사하기">
                  <span>📋 프롬프트 복사</span>
                </button>
              </div>
              <div style="font-size: 12.5px; color: #64748b; margin-bottom: 8px; line-height: 1.5; word-break: keep-all;">
                <strong>활용 방법</strong>: NotebookLM 우측 Studio의 [오디오 생성] 옆 <strong>[맞춤설정(Customize)]</strong> 창에 입력하여 정책 쟁점 사전 토론을 유도합니다.
              </div>
              <pre style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 12px; font-size: 12px; color: #374151; white-space: pre-wrap; word-break: break-all; margin: 0; line-height: 1.55; font-family: inherit;">이번 보고서의 핵심 주제는 [예: 2026 RISE 사업 개편안 및 학과 구조혁신 방향]입니다. 
단순한 요약 나열보다는, 대학 구성원(교수, 학생, 행정) 간에 발생할 수 있는 주요 갈등 요인과 행정적 쟁점을 중심으로 남녀 호스트가 객관적인 토론을 진행해 주세요. 
특히 의사결정권자가 검토해야 할 '핵심 성공 요인 3가지'와 '예산 리스크'를 집중적으로 다뤄 주세요.</pre>
            </div>
          </div>

          <!-- 실전 연계 워크플로우 3단계 -->
          <div style="border-top: 1px solid #e5e7eb; padding-top: 1.25rem;">
            <div style="font-weight: 700; font-size: 14px; color: var(--color-obsidian); margin-bottom: 0.85rem;">
              🚀 5. 추천 실전 행정 연계 워크플로우 (초고속 시각화 3단계)
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 0.85rem;">
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 1rem;">
                <div style="font-weight: 700; font-size: 13px; color: #0284c7; margin-bottom: 4px;">Step 1. NotebookLM 추출 & 저장</div>
                <div style="font-size: 12px; color: #555; line-height: 1.5; word-break: keep-all;">
                  위 프롬프트로 슬라이드 개요 및 핵심 데이터를 생성한 후, 우하단 <strong>[노트로 저장]</strong> 핀 아이콘을 누릅니다.
                </div>
              </div>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 1rem;">
                <div style="font-weight: 700; font-size: 13px; color: #be185d; margin-bottom: 4px;">Step 2. Gamma App으로 10초 PPT</div>
                <div style="font-size: 12px; color: #555; line-height: 1.5; word-break: keep-all;">
                  <a href="https://gamma.app" target="_blank" rel="noopener noreferrer" style="color: #be185d; font-weight: 600;">Gamma App ↗</a>에 추출된 슬라이드 개요를 붙여넣으면 10초 만에 완벽한 비주얼 슬라이드가 자동 렌더링됩니다.
                </div>
              </div>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 1rem;">
                <div style="font-weight: 700; font-size: 13px; color: #10b981; margin-bottom: 4px;">Step 3. PPT 실무 리허설</div>
                <div style="font-size: 12px; color: #555; line-height: 1.5; word-break: keep-all;">
                  PowerPoint 발표자 메모란에 NotebookLM 구술 스크립트를 넣고 슬라이드와 대조하며 리허설을 진행합니다.
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 카드 5: 200% 활용 꿀팁 4선 & 교직원 필수 데이터 보안 3대 수칙 -->
        <div class="card" style="padding: 1.75rem 2rem; border: 1px solid var(--color-pumice); border-radius: 28px; background: #ffffff; margin-bottom: 1.5rem;">
          <h3 style="font-size: 18px; color: var(--color-obsidian); margin-bottom: 1.25rem; display: flex; align-items: center; gap: 8px;">
            <span>💡 5. NotebookLM 200% 활용 실전 꿀팁 4선 & 필수 데이터 보안 수칙</span>
          </h3>

          <!-- 실전 꿀팁 4선 그리드 (완벽 반영) -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-bottom: 1.75rem;">
            <div style="background: #faf9f6; border: 1px solid var(--color-pumice); border-radius: 16px; padding: 1.15rem;">
              <div style="font-weight: 700; font-size: 13.5px; color: var(--color-obsidian); margin-bottom: 5px;">
                1. 📂 부서별/업무단위별 노트북 분리
              </div>
              <div style="font-size: 12px; color: #555; line-height: 1.55; word-break: keep-all;">
                모든 업무 문서를 한 곳에 섞지 말고, [2026 학내 규정집 Q&A], [글로컬대학 편람]처럼 업무 단위로 노트북을 분리해야 답변 정확도가 유지됩니다.
              </div>
            </div>
            <div style="background: #faf9f6; border: 1px solid var(--color-pumice); border-radius: 16px; padding: 1.15rem;">
              <div style="font-weight: 700; font-size: 13.5px; color: var(--color-obsidian); margin-bottom: 5px;">
                2. 👥 부서원 실시간 공유(Share) 협업
              </div>
              <div style="font-size: 12px; color: #555; line-height: 1.55; word-break: keep-all;">
                노트북 우측 상단 '공유(Share)' 버튼으로 부서원들을 초대하여, 부서 전체가 동일한 규정 소스를 기반으로 AI 자문 비서를 공동 활용할 수 있습니다.
              </div>
            </div>
            <div style="background: #faf9f6; border: 1px solid var(--color-pumice); border-radius: 16px; padding: 1.15rem;">
              <div style="font-weight: 700; font-size: 13.5px; color: var(--color-obsidian); margin-bottom: 5px;">
                3. 📝 중간 답변 메모(Notes)를 소스로 승격
              </div>
              <div style="font-size: 12px; color: #555; line-height: 1.55; word-break: keep-all;">
                질문-답변 중 유용한 내용을 '노트로 저장'한 뒤, 해당 노트들을 다시 소스로 지정하여 2차 종합 보고서를 작성하는 '심층 행정 파이프라인'을 구성할 수 있습니다.
              </div>
            </div>
            <div style="background: #faf9f6; border: 1px solid var(--color-pumice); border-radius: 16px; padding: 1.15rem;">
              <div style="font-weight: 700; font-size: 13.5px; color: var(--color-obsidian); margin-bottom: 5px;">
                4. 🌐 외국인 유학생 영문 규정 한/영 교차 질문
              </div>
              <div style="font-size: 12px; color: #555; line-height: 1.55; word-break: keep-all;">
                GKS 정부초청장학생 지침이나 해외 대학 협약서(MOU) 등 영문 문서를 올리고 한국어로 질문해도 완벽한 한국어 행정 용어로 답변을 받을 수 있습니다.
              </div>
            </div>
          </div>

          <!-- 교직원 필수 데이터 보안 준수 수칙 표 -->
          <div style="margin-bottom: 1.5rem;">
            <div style="font-weight: 700; font-size: 14.5px; color: #991b1b; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 6px;">
              <span>🔒 교직원이 반드시 준수해야 할 데이터 보안 및 컴플라이언스 3대 수칙</span>
            </div>
            <div style="overflow-x: auto; -webkit-overflow-scrolling: touch;">
              <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; min-width: 580px; word-break: keep-all;">
                <thead>
                  <tr style="background: #fef2f2; border-bottom: 2px solid #fecaca;">
                    <th style="padding: 10px 14px; font-weight: 700; color: #991b1b; width: 28%;">보안 수칙</th>
                    <th style="padding: 10px 14px; font-weight: 700; color: #991b1b; width: 72%;">핵심 실천 지침</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style="border-bottom: 1px solid #fee2e2;">
                    <td style="padding: 11px 14px; font-weight: 700; color: #b91c1c;">개인정보 및 기밀 입력 절대 금지</td>
                    <td style="padding: 11px 14px; color: #4b5563; line-height: 1.5;">
                      <strong>학생 성명, 주민번호, 학번, 성적, 장학금 소득분위, 학생상담센터 심층 상담일지, 입시 면접 채점표</strong> 등 민감 정보가 포함된 원본 문서는 절대 소스로 업로드하지 마세요. (반드시 사전 가명/비식별화 처리)
                    </td>
                  </tr>
                  <tr style="border-bottom: 1px solid #fee2e2;">
                    <td style="padding: 11px 14px; font-weight: 700; color: #b91c1c;">대학 공식 Google Workspace 계정 사용</td>
                    <td style="padding: 11px 14px; color: #4b5563; line-height: 1.5;">
                      개인 무료 Gmail 계정 대신 대학 기관 도메인(<strong>@ac.kr</strong>)의 Google Workspace for Education 계정을 활용하여 기관 데이터 보호 정책을 적용받으세요.
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 11px 14px; font-weight: 700; color: #b91c1c;">노트북 공유 권한(Share) 보안 관리</td>
                    <td style="padding: 11px 14px; color: #4b5563; line-height: 1.5;">
                      대외비 성격의 사업 기획서나 자체평가 자료가 포함된 노트북은 <strong>'링크가 있는 모든 사용자 공개'를 엄격히 금지</strong>하고, 인가된 학내 업무 담당자 이메일로만 제한적 접근 권한을 부여하세요.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- 소스 업로드 전 교직원 보안 자가점검 체크리스트 (인터랙티브 UI) -->
          <div style="background: #fffbeb; border: 1px solid #fef3c7; border-radius: 18px; padding: 1.25rem 1.4rem;">
            <div style="font-weight: 700; font-size: 14px; color: #92400e; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
              <span>🛡️ 소스 문서 업로드 전 교직원 보안 자가점검 체크리스트</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 8px; font-size: 12.5px; color: #78350f;">
              <label style="display: flex; align-items: flex-start; gap: 8px; cursor: pointer;">
                <input type="checkbox" style="margin-top: 3px; accent-color: var(--color-ember);">
                <span>업로드할 문서에 학생·교직원의 주민등록번호, 계좌번호, 휴대전화번호 등 고유식별정보가 마스킹(삭제)되었는가?</span>
              </label>
              <label style="display: flex; align-items: flex-start; gap: 8px; cursor: pointer;">
                <input type="checkbox" style="margin-top: 3px; accent-color: var(--color-ember);">
                <span>입학전형 채점표, 징계위원회 회의록 등 비공개 대외비(Confidential) 문서가 원본 그대로 포함되지 않았는가?</span>
              </label>
              <label style="display: flex; align-items: flex-start; gap: 8px; cursor: pointer;">
                <input type="checkbox" style="margin-top: 3px; accent-color: var(--color-ember);">
                <span>개인 무료 계정이 아닌 대학 기관 공식 Google Workspace(@ac.kr) 계정으로 로그인하여 작업 중인가?</span>
              </label>
              <label style="display: flex; align-items: flex-start; gap: 8px; cursor: pointer;">
                <input type="checkbox" style="margin-top: 3px; accent-color: var(--color-ember);">
                <span>노트북 공유 링크가 외부 불특정 다수가 아닌 학내 부서원 이메일로만 한정되어 있는가?</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * 프롬프트 공식 4+2 & LLM 안전 활용 가이드 섹션 HTML 반환
   */
  getPromptSectionHtml() {
    return `
      <!-- 프롬프트 공식 4+2 & LLM 안전 활용 가이드 섹션 -->
      <div id="lecture-sec-2" class="lecture-nav-section" style="margin-top: var(--spacing-48); margin-bottom: var(--spacing-32); scroll-margin-top: 96px;">
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
      </div>
    `;
  },

  /**
   * Google NotebookLM 완벽 사용 가이드 섹션 HTML 반환
   */
  getNotebookLMSectionHtml() {
    return `
      <!-- Google NotebookLM 완벽 사용 및 대학생 학업 활용 가이드 섹션 -->
      <div id="lecture-sec-3" class="lecture-nav-section" style="margin-top: var(--spacing-48); margin-bottom: var(--spacing-32); scroll-margin-top: 96px;">
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

          <!-- 4대 시나리오 리스트 -->
          <div style="display: flex; flex-direction: column; gap: 1.15rem;">
            <!-- 시나리오 1 -->
            <div class="prompt-template-card" style="background: #faf9f6; border: 1px solid var(--color-pumice); border-radius: 18px; padding: 1.25rem 1.4rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;">
                <div style="font-weight: 700; font-size: 14.5px; color: var(--color-obsidian); display: flex; align-items: center; gap: 6px;">
                  <span style="background: #0284c7; color: #fff; font-size: 11px; padding: 2px 7px; border-radius: 4px;">논문 리서치</span>
                  <span>시나리오 1. 50페이지 학술 논문에서 핵심 가설 & 한계점 추출</span>
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
            NotebookLM은 직접 그래픽 이미지나 PPTX 파일을 그려내지는 않지만, 업로드된 방대한 문서에서 <strong>'슬라이드별 레이아웃·핵심 문구·발표 대본'</strong> 및 <strong>'인포그래픽용 데이터·비교 구조'</strong>를 가장 정확하게 추출해 주므로, 이를 복사하여 <strong>Gamma, PowerPoint 등</strong>에 붙여넣으면 5분 만에 고품질 시각 자료가 완성됩니다.
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
                <div style="font-weight: 700; font-size: 13px; color: #10b981; margin-bottom: 4px;">Step 3. PPT 실무 리허설</div>
                <div style="font-size: 12px; color: #555; line-height: 1.5; word-break: keep-all;">
                  PowerPoint 발표자 메모란에 NotebookLM 구술 스크립트를 넣고 슬라이드와 대조하며 리허설을 진행합니다.
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
  },

  /**
   * 카드뉴스 결과 이미지 팝업 모달 열기
   * @param {string} imageSrc 이미지 경로
   * @param {string} title 모달 타이틀
   */
  showImageModal(imageSrc, title) {
    let modal = document.getElementById('cardnews-image-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'cardnews-image-modal';
      modal.style.cssText = 'position: fixed; inset: 0; z-index: 99999; display: flex; align-items: center; justify-content: center; background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(6px); padding: 16px; opacity: 0; transition: opacity 0.2s ease;';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');

      modal.innerHTML = `
        <div id="cardnews-modal-content" style="background: #ffffff; border-radius: 24px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.4); max-width: 640px; width: 100%; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; transform: scale(0.95); transition: transform 0.2s ease; border: 1px solid rgba(255,255,255,0.2);">
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; border-bottom: 1px solid #f1f5f9; background: #fafafa;">
            <div id="cardnews-modal-title" style="font-size: 14.5px; font-weight: 700; color: #0f172a; display: flex; align-items: center; gap: 6px; word-break: keep-all;"></div>
            <button type="button" onclick="DashboardApp.closeImageModal()" style="background: #f1f5f9; border: none; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-size: 16px; cursor: pointer; color: #64748b; transition: background 0.15s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'" aria-label="닫기">✕</button>
          </div>
          <div style="padding: 16px; text-align: center; background: #0b1120; display: flex; align-items: center; justify-content: center; overflow: hidden;">
            <img id="cardnews-modal-img" src="" alt="프롬프트 결과 이미지" style="max-width: 100%; max-height: 58vh; object-fit: contain; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.5);">
          </div>
          <div style="padding: 12px 20px; background: #fafafa; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; font-size: 12px; color: #64748b;">
            <span>💡 나노바나나 / 비주얼 AI 생성 예시 결과물</span>
            <a id="cardnews-modal-link" href="" target="_blank" rel="noopener noreferrer" style="color: var(--color-ember); font-weight: 700; text-decoration: none;">원본 새창 보기 ↗</a>
          </div>
        </div>
      `;

      // 배경 오버레이 클릭 시 닫기
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          DashboardApp.closeImageModal();
        }
      });

      // ESC 키 입력 시 닫기
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display !== 'none') {
          DashboardApp.closeImageModal();
        }
      });

      document.body.appendChild(modal);
    }

    const titleEl = document.getElementById('cardnews-modal-title');
    const imgEl = document.getElementById('cardnews-modal-img');
    const linkEl = document.getElementById('cardnews-modal-link');
    const contentEl = document.getElementById('cardnews-modal-content');

    if (titleEl) titleEl.textContent = title || '프롬프트 결과 이미지';
    if (imgEl) {
      imgEl.dataset.triedFallback = '';
      imgEl.src = imageSrc;
      imgEl.onerror = function() {
        if (!this.dataset.triedFallback) {
          this.dataset.triedFallback = '1';
          this.src = imageSrc.startsWith('public/') ? imageSrc.replace('public/', '') : 'public/' + imageSrc;
        }
      };
    }
    if (linkEl) linkEl.href = imageSrc;

    modal.style.display = 'flex';
    setTimeout(() => {
      modal.style.opacity = '1';
      if (contentEl) contentEl.style.transform = 'scale(1)';
    }, 10);
  },

  /**
   * 카드뉴스 결과 이미지 팝업 모달 닫기
   */
  closeImageModal() {
    const modal = document.getElementById('cardnews-image-modal');
    if (!modal) return;
    const contentEl = document.getElementById('cardnews-modal-content');
    modal.style.opacity = '0';
    if (contentEl) contentEl.style.transform = 'scale(0.95)';
    setTimeout(() => {
      modal.style.display = 'none';
    }, 200);
  },

  /**
   * 우측 하단 플로팅 퀵 네비게이션 토글 (열기/닫기)
   */
  toggleQuickNav() {
    const nav = document.getElementById('floating-quick-nav');
    const btn = document.getElementById('quick-nav-toggle-btn');
    if (!nav) return;
    const isOpen = nav.classList.toggle('open');
    if (btn) btn.setAttribute('aria-expanded', String(isOpen));
  },

  /**
   * 지정된 강의 섹션으로 부드러운 스크롤 이동
   * @param {string} sectionId
   */
  scrollToSection(sectionId) {
    const target = document.getElementById(sectionId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // 모바일 환경 등에서 이동 후 패널 닫기
      if (window.innerWidth <= 768) {
        const nav = document.getElementById('floating-quick-nav');
        const btn = document.getElementById('quick-nav-toggle-btn');
        if (nav) nav.classList.remove('open');
        if (btn) btn.setAttribute('aria-expanded', 'false');
      }
    }
  },

  /**
   * 학습자 역할(대학생 / 교직원)에 맞춘 플로팅 퀵 네비게이션 목록 렌더링
   * @param {Object} user
   */
  renderQuickNav(user) {
    const listEl = document.getElementById('quick-nav-list');
    const titleEl = document.getElementById('quick-nav-title');
    if (!listEl) return;

    if (user && user.role === 'staff') {
      if (titleEl) titleEl.textContent = '🏛️ 교직원 커리큘럼 이동';
      listEl.innerHTML = `
        <button type="button" class="quick-nav-item" data-target="lecture-sec-2" onclick="DashboardApp.scrollToSection('lecture-sec-2')">
          <span class="nav-badge">01</span>
          <span class="nav-text">프롬프트 공식 4+2</span>
        </button>
        <button type="button" class="quick-nav-item" data-target="lecture-sec-3" onclick="DashboardApp.scrollToSection('lecture-sec-3')">
          <span class="nav-badge">02</span>
          <span class="nav-text">NotebookLM 활용</span>
        </button>
        <button type="button" class="quick-nav-item" data-target="lecture-staff-sec-3" onclick="DashboardApp.scrollToSection('lecture-staff-sec-3')">
          <span class="nav-badge">03</span>
          <span class="nav-text">카드뉴스 제작</span>
        </button>
        <button type="button" class="quick-nav-item" data-target="lecture-staff-sec-4" onclick="DashboardApp.scrollToSection('lecture-staff-sec-4')">
          <span class="nav-badge">04</span>
          <span class="nav-text">구글 폼 & 집계</span>
        </button>
      `;
    } else {
      if (titleEl) titleEl.textContent = '📚 강의 바로가기';
      listEl.innerHTML = `
        <button type="button" class="quick-nav-item" data-target="lecture-sec-1" onclick="DashboardApp.scrollToSection('lecture-sec-1')">
          <span class="nav-badge">01</span>
          <span class="nav-text">AI 리터러시 진단</span>
        </button>
        <button type="button" class="quick-nav-item" data-target="lecture-sec-2" onclick="DashboardApp.scrollToSection('lecture-sec-2')">
          <span class="nav-badge">02</span>
          <span class="nav-text">프롬프트 공식 4+2</span>
        </button>
        <button type="button" class="quick-nav-item" data-target="lecture-sec-3" onclick="DashboardApp.scrollToSection('lecture-sec-3')">
          <span class="nav-badge">03</span>
          <span class="nav-text">NotebookLM 활용</span>
        </button>
        <button type="button" class="quick-nav-item" data-target="lecture-sec-4" onclick="DashboardApp.scrollToSection('lecture-sec-4')">
          <span class="nav-badge">04</span>
          <span class="nav-text">구글 시트 Gemini</span>
        </button>
      `;
    }
  },

  /**
   * 스크롤 위치에 따른 현재 활성 강의 섹션 하이라이트 감지
   * @param {Object} user
   */
  initScrollSpy(user) {
    const isStaff = user && user.role === 'staff';
    const sectionIds = isStaff
      ? ['lecture-sec-2', 'lecture-sec-3', 'lecture-staff-sec-3', 'lecture-staff-sec-4']
      : ['lecture-sec-1', 'lecture-sec-2', 'lecture-sec-3', 'lecture-sec-4'];
    let ticking = false;

    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollPos = window.scrollY + 160;
          let currentSecId = '';

          for (const id of sectionIds) {
            const el = document.getElementById(id);
            if (el && el.offsetTop <= scrollPos) {
              currentSecId = id;
            }
          }

          document.querySelectorAll('.quick-nav-item').forEach(item => {
            if (item.getAttribute('data-target') === currentSecId) {
              item.classList.add('active');
            } else {
              item.classList.remove('active');
            }
          });

          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  },

  /**
   * 교직원 모듈 03: 카드뉴스 제작(나노바나나 활용) 실무 가이드 HTML
   */
  getStaffCardNewsSectionHtml() {
    return `
      <!-- 03. 카드뉴스 제작(나노바나나 활용) 실무 가이드 섹션 -->
      <div id="lecture-staff-sec-3" class="lecture-nav-section" style="margin-top: var(--spacing-48); margin-bottom: var(--spacing-32); scroll-margin-top: 96px;">
        <!-- 섹션 헤더 -->
        <div style="margin-bottom: var(--spacing-20);">
          <span style="font-family: var(--font-display); font-size: 16px; color: var(--color-ember); letter-spacing: 0.05em;">CARD NEWS & VISUAL ASSET WORKFLOW</span>
          <h2 style="font-size: clamp(24px, 3.5vw, 32px); color: var(--color-obsidian); margin-top: 4px;">🎨 03. 카드뉴스 제작 (나노바나나 & 비주얼 AI 활용)</h2>
        </div>

        <!-- 카드 3-1: 3단계 카드뉴스 제작 파이프라인 & 나노바나나 프롬프트 팁 -->
        <div class="card" style="padding: 1.75rem 2rem; border: 1px solid var(--color-pumice); border-radius: 28px; background: #ffffff; margin-bottom: 1.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 1rem;">
            <h3 style="font-size: 18px; color: var(--color-obsidian); margin: 0; display: flex; align-items: center; gap: 8px;">
              <span>📐 1. 나노바나나 & 생성형 AI 연계 3단계 제작 파이프라인</span>
            </h3>
            <span style="background: var(--color-sulfur); color: var(--color-obsidian); font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 999px;">
              기획 → AI 비주얼 생성 → 한글 타이포 마감
            </span>
          </div>

          <p style="font-size: 13.5px; color: #555; line-height: 1.6; margin-bottom: 1.25rem; word-break: keep-all;">
            복잡한 학사 공지나 행사 요강을 모바일 화면에 최적화된 4~5컷 카드뉴스로 신속하게 시각화합니다. <strong>NotebookLM/Gemini</strong>로 도출한 홍보 카피를 <strong>나노바나나(NanoBanana)</strong> 등 비주얼 생성 AI에 입력하여 맞춤형 그래픽을 생성하고, 미리캔버스 등 그래픽 도구에서 타이포그래피를 완성합니다.
          </p>

          <!-- 3단계 그리드 -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
            <div style="background: #fdfbf7; border: 1px solid #fde68a; border-radius: 16px; padding: 16px;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <span style="background: var(--color-ember); color: #fff; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800;">1</span>
                <strong style="font-size: 14.5px; color: var(--color-obsidian);">콘텐츠 컷 구성 기획</strong>
              </div>
              <p style="font-size: 13px; color: #4b5563; margin: 0; line-height: 1.5; word-break: keep-all;">
                표지 컷(시선 유도 헤드라인) → 본문 3컷(핵심 혜택/일정/장소) → 마감 컷(신청 링크/문의처) 표준 5컷 구조 도출
              </p>
            </div>

            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 16px; padding: 16px;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <span style="background: #16a34a; color: #fff; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800;">2</span>
                <strong style="font-size: 14.5px; color: var(--color-obsidian);">AI 비주얼 에셋 생성</strong>
              </div>
              <p style="font-size: 13px; color: #4b5563; margin: 0; line-height: 1.5; word-break: keep-all;">
                나노바나나 등 이미지 생성 AI로 대학 캠퍼스 분위기, 미니멀 3D 일러스트, 인포그래픽 배경을 1:1 또는 4:5 비율로 일관성 있게 생성
              </p>
            </div>

            <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 16px; padding: 16px;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <span style="background: #2563eb; color: #fff; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800;">3</span>
                <strong style="font-size: 14.5px; color: var(--color-obsidian);">타이포그래피 & 배포</strong>
              </div>
              <p style="font-size: 13px; color: #4b5563; margin: 0; line-height: 1.5; word-break: keep-all;">
                미리캔버스 등 그래픽 도구에 생성된 이미지를 배경으로 얹고, 정갈한 안심 고딕 폰트(Pretendard, 에스코어 드림)로 교내 공식 로고와 함께 마감
              </p>
            </div>
          </div>

          <!-- 나노바나나 프롬프트 실무 팁 4선 배너 -->
          <div style="background: #faf9f6; border: 1px solid var(--color-pumice); border-radius: 18px; padding: 1.25rem 1.4rem;">
            <div style="font-weight: 700; font-size: 14px; color: var(--color-obsidian); margin-bottom: 0.75rem;">
              💡 나노바나나 프롬프트 작성 시 교직원 실무 핵심 팁 4가지
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 0.75rem;">
              <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 10px 12px;">
                <strong style="font-size: 13px; color: var(--color-ember);">① 여백(Negative Space) 확보 ⭐</strong>
                <p style="font-size: 12px; color: #555; margin: 4px 0 0 0; line-height: 1.45;">
                  <code>ample negative space for text overlay</code>를 추가하여 한글 문구가 들어갈 빈 공간을 남겨둡니다.
                </p>
              </div>
              <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 10px 12px;">
                <strong style="font-size: 13px; color: #0284c7;">② 화면 비율(Aspect Ratio) 지정</strong>
                <p style="font-size: 12px; color: #555; margin: 4px 0 0 0; line-height: 1.45;">
                  인스타그램/알림톡용 <code>--ar 1:1</code>(정사각) 또는 <code>--ar 4:5</code>(모바일 세로형)를 지정합니다.
                </p>
              </div>
              <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 10px 12px;">
                <strong style="font-size: 13px; color: #059669;">③ 시리즈 화풍(Style) 일관성</strong>
                <p style="font-size: 12px; color: #555; margin: 4px 0 0 0; line-height: 1.45;">
                  1~5컷 전체에 <code>modern 3D claymorphism</code> 등 동일한 스타일 키워드를 고정하여 브랜드 톤을 통일합니다.
                </p>
              </div>
              <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 10px 12px;">
                <strong style="font-size: 13px; color: #7c3aed;">④ 한글 텍스트 분리 원칙</strong>
                <p style="font-size: 12px; color: #555; margin: 4px 0 0 0; line-height: 1.45;">
                  AI에게 한글을 직접 쓰게 하지 말고, 이미지는 '순수 배경/오브젝트'로만 뽑고 글자는 그래픽 도구에서 얹습니다.
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- 카드 3-2: 카드뉴스 생성 실무 프롬프트 예시 (4종) -->
        <div class="card" style="padding: 1.75rem 2rem; border: 1px solid var(--color-pumice); border-radius: 28px; background: #ffffff; margin-bottom: 1.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 1rem;">
            <h3 style="font-size: 18px; color: var(--color-obsidian); margin: 0; display: flex; align-items: center; gap: 8px;">
              <span>💬 2. 교직원 실무: 카드뉴스 기획 & 나노바나나 이미지 프롬프트 복사</span>
            </h3>
            <span style="font-size: 12.5px; color: #6b7280;">원클릭 복사 후 나노바나나 또는 챗봇에 붙여넣기 하세요.</span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 1.15rem;">
            <!-- 프롬프트 1: 5컷 기획안 -->
            <div class="prompt-template-card" style="background: #faf9f6; border: 1px solid var(--color-pumice); border-radius: 18px; padding: 1.25rem 1.4rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;">
                <div style="font-weight: 700; font-size: 14.5px; color: var(--color-obsidian); display: flex; align-items: center; gap: 6px;">
                  <span style="background: var(--color-ember); color: #fff; font-size: 11px; padding: 2px 7px; border-radius: 4px;">카피 기획</span>
                  <span>1. 📋 [Gemini/GPT용] 5컷 카드뉴스 기획안 도출</span>
                </div>
                <button type="button" class="btn btn-outline prompt-copy-btn" onclick="DashboardApp.copyPrompt(this)" style="font-size: 12px; padding: 4px 12px; border-radius: 999px; display: inline-flex; align-items: center; gap: 4px; border-color: #d1d5db; background: #ffffff; cursor: pointer;" title="프롬프트 복사하기">
                  <span>📋 프롬프트 복사</span>
                </button>
              </div>
              <div style="font-size: 12.5px; color: #64748b; margin-bottom: 8px; line-height: 1.5; word-break: keep-all;">
                <strong>활용 방법</strong>: 공문서나 행사 요강을 바탕으로 인스타그램 5컷 카드뉴스 구성안과 슬라이드별 이미지 프롬프트를 한 번에 기획합니다.
              </div>
              <pre style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 12px; font-size: 12px; color: #374151; white-space: pre-wrap; word-break: break-all; margin: 0; line-height: 1.55; font-family: inherit;">다음 대학 행사 공문(또는 특강 안내문)을 분석하여 인스타그램·카카오톡 배포용 5컷 카드뉴스 기획안을 작성해줘.

[공문 내용 / 행사 요강 붙여넣기]

[작성 규칙]
1. 1컷(표지): 클릭을 유도하는 직관적이고 매력적인 헤드카피 (15자 이내)
2. 2~4컷(본문): 학생들이 얻을 수 있는 실질적 혜택 3가지를 컷당 1개씩 요약
3. 5컷(신청 안내): 일시, 장소, 신청 기한, 구글 폼 링크 안내 문구
4. 각 컷마다 배경 이미지로 생성할 수 있는 AI 이미지 프롬프트(영문)를 1줄씩 제안해줘.</pre>
            </div>

            <!-- 프롬프트 2: 특강 홍보 배경 -->
            <div class="prompt-template-card" style="background: #faf9f6; border: 1px solid var(--color-pumice); border-radius: 18px; padding: 1.25rem 1.4rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;">
                <div style="font-weight: 700; font-size: 14.5px; color: var(--color-obsidian); display: flex; align-items: center; gap: 6px;">
                  <span style="background: var(--color-ember); color: #fff; font-size: 11px; padding: 2px 7px; border-radius: 4px;">특강 표지</span>
                  <span>2. 🚀 [비교과/특강] AI·SW 신기술 워크숍 홍보 표지</span>
                </div>
                <div style="display: inline-flex; align-items: center; gap: 6px;">
                  <button type="button" class="btn btn-outline" onclick="DashboardApp.showImageModal('public/Gemini_cardnews01.png', '🚀 [비교과/특강] AI·SW 신기술 워크숍 홍보 표지 프롬프트 결과')" style="font-size: 12px; padding: 4px 12px; border-radius: 999px; display: inline-flex; align-items: center; gap: 4px; border-color: var(--color-ember); color: var(--color-ember); background: #ffffff; cursor: pointer; font-weight: 700; transition: all 0.15s ease;" title="생성 결과 이미지 팝업 보기">
                    <span>🖼️ 프롬프트 결과</span>
                  </button>
                  <button type="button" class="btn btn-outline prompt-copy-btn" onclick="DashboardApp.copyPrompt(this)" style="font-size: 12px; padding: 4px 12px; border-radius: 999px; display: inline-flex; align-items: center; gap: 4px; border-color: #d1d5db; background: #ffffff; cursor: pointer;" title="프롬프트 복사하기">
                    <span>📋 프롬프트 복사</span>
                  </button>
                </div>
              </div>
              <div style="font-size: 12.5px; color: #64748b; margin-bottom: 8px; line-height: 1.5; word-break: keep-all;">
                <strong>활용 방법</strong>: AI 신기술 워크숍, 코딩 캠프 등 미래지향적 특강의 메인 표지 배경(정사각형 1:1)을 생성합니다.
              </div>
              <pre style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 12px; font-size: 12px; color: #374151; white-space: pre-wrap; word-break: break-all; margin: 0; line-height: 1.55; font-family: inherit;">A bright and futuristic university computer lab, glowing 3D AI nodes and data particles floating in the air, modern minimalist claymorphism style, soft pastel orange and corporate navy color palette, ample clean negative space at the center for Korean text overlay, bright daylight, 8k resolution, professional academic flyer aesthetic --ar 1:1</pre>
            </div>

            <!-- 프롬프트 3: 학사/장학 본문컷 -->
            <div class="prompt-template-card" style="background: #faf9f6; border: 1px solid var(--color-pumice); border-radius: 18px; padding: 1.25rem 1.4rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;">
                <div style="font-weight: 700; font-size: 14.5px; color: var(--color-obsidian); display: flex; align-items: center; gap: 6px;">
                  <span style="background: var(--color-ember); color: #fff; font-size: 11px; padding: 2px 7px; border-radius: 4px;">학사 안내</span>
                  <span>3. 📜 [학사/장학] 장학금 신청 및 학사일정 안내 본문컷</span>
                </div>
                <div style="display: inline-flex; align-items: center; gap: 6px;">
                  <button type="button" class="btn btn-outline" onclick="DashboardApp.showImageModal('public/Gemini_cardnews02.png', '📜 [학사/장학] 장학금 신청 및 학사일정 안내 본문컷 프롬프트 결과')" style="font-size: 12px; padding: 4px 12px; border-radius: 999px; display: inline-flex; align-items: center; gap: 4px; border-color: var(--color-ember); color: var(--color-ember); background: #ffffff; cursor: pointer; font-weight: 700; transition: all 0.15s ease;" title="생성 결과 이미지 팝업 보기">
                    <span>🖼️ 프롬프트 결과</span>
                  </button>
                  <button type="button" class="btn btn-outline prompt-copy-btn" onclick="DashboardApp.copyPrompt(this)" style="font-size: 12px; padding: 4px 12px; border-radius: 999px; display: inline-flex; align-items: center; gap: 4px; border-color: #d1d5db; background: #ffffff; cursor: pointer;" title="프롬프트 복사하기">
                    <span>📋 프롬프트 복사</span>
                  </button>
                </div>
              </div>
              <div style="font-size: 12.5px; color: #64748b; margin-bottom: 8px; line-height: 1.5; word-break: keep-all;">
                <strong>활용 방법</strong>: 장학금 신청 기간, 성적 기준, 학사일정을 안내하는 본문 카드(텍스트 여백 확보형 1:1)를 생성합니다.
              </div>
              <pre style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 12px; font-size: 12px; color: #374151; white-space: pre-wrap; word-break: break-all; margin: 0; line-height: 1.55; font-family: inherit;">Minimalist 3D isometric university desk with an open scholarship certificate, graduation cap, and golden star coins, clean white background, soft studio lighting, subtle blue accents, lots of empty space on the right side for text, neat and professional educational infographic style --ar 1:1</pre>
            </div>

            <!-- 프롬프트 4: 행사/캠프 홍보컷 -->
            <div class="prompt-template-card" style="background: #faf9f6; border: 1px solid var(--color-pumice); border-radius: 18px; padding: 1.25rem 1.4rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;">
                <div style="font-weight: 700; font-size: 14.5px; color: var(--color-obsidian); display: flex; align-items: center; gap: 6px;">
                  <span style="background: var(--color-ember); color: #fff; font-size: 11px; padding: 2px 7px; border-radius: 4px;">행사 홍보</span>
                  <span>4. 🤝 [행사/캠프] 선후배 멘토링 프로그램 모집 홍보컷</span>
                </div>
                <div style="display: inline-flex; align-items: center; gap: 6px;">
                  <button type="button" class="btn btn-outline" onclick="DashboardApp.showImageModal('public/Gemini_cardnews03.png', '🤝 [행사/캠프] 선후배 멘토링 프로그램 모집 홍보컷 프롬프트 결과')" style="font-size: 12px; padding: 4px 12px; border-radius: 999px; display: inline-flex; align-items: center; gap: 4px; border-color: var(--color-ember); color: var(--color-ember); background: #ffffff; cursor: pointer; font-weight: 700; transition: all 0.15s ease;" title="생성 결과 이미지 팝업 보기">
                    <span>🖼️ 프롬프트 결과</span>
                  </button>
                  <button type="button" class="btn btn-outline prompt-copy-btn" onclick="DashboardApp.copyPrompt(this)" style="font-size: 12px; padding: 4px 12px; border-radius: 999px; display: inline-flex; align-items: center; gap: 4px; border-color: #d1d5db; background: #ffffff; cursor: pointer;" title="프롬프트 복사하기">
                    <span>📋 프롬프트 복사</span>
                  </button>
                </div>
              </div>
              <div style="font-size: 12.5px; color: #64748b; margin-bottom: 8px; line-height: 1.5; word-break: keep-all;">
                <strong>활용 방법</strong>: 모바일 피드에 최적화된 세로형(4:5) 구도로 대학생 라이프스타일 멘토링 모집 홍보컷을 생성합니다.
              </div>
              <pre style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 12px; font-size: 12px; color: #374151; white-space: pre-wrap; word-break: break-all; margin: 0; line-height: 1.55; font-family: inherit;">Two cheerful Korean university students discussing together with laptops in a sunny modern campus lounge, bright aesthetic, soft focus background, warm and welcoming atmosphere, modern college lifestyle photography, clean composition with negative space on top for headline --ar 4:5</pre>
            </div>
          </div>
        </div>

        <!-- 카드 3-3: 글꼴(폰트) 사용 및 저작권 준수 실무 가이드 (신규) -->
        <div class="card" style="padding: 1.75rem 2rem; border: 1px solid var(--color-pumice); border-radius: 28px; background: #ffffff; margin-bottom: 1.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 1rem;">
            <h3 style="font-size: 18px; color: var(--color-obsidian); margin: 0; display: flex; align-items: center; gap: 8px;">
              <span>✍️ 3. 글꼴(폰트) 사용 및 라이선스 안심 실무 가이드</span>
            </h3>
            <span style="background: #fee2e2; color: #991b1b; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 999px;">
              폰트 저작권 분쟁 원천 예방
            </span>
          </div>

          <p style="font-size: 13.5px; color: #555; line-height: 1.6; margin-bottom: 1.25rem; word-break: keep-all;">
            한글(HWP)이나 MS 오피스 기본 탑재 폰트는 '문서 작성용'일 뿐, 웹/SNS 이미지로 제작 시 <strong>저작권 침해 합의금 요구 사고</strong>가 발생할 수 있습니다. 반드시 <strong>'상업적 이용 가능한 안심 무료 폰트(OFL)'</strong>만을 사용해야 합니다.
          </p>

          <!-- 추천 폰트 테이블 -->
          <div style="overflow-x: auto; -webkit-overflow-scrolling: touch; margin-bottom: 1.5rem; border: 1px solid #e5e7eb; border-radius: 14px; background: #ffffff;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; min-width: 890px;">
              <thead>
                <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                  <th style="padding: 12px 16px; width: 14%; min-width: 125px; color: var(--color-obsidian); font-weight: 700; white-space: nowrap;">구분</th>
                  <th style="padding: 12px 16px; width: 22%; min-width: 170px; color: var(--color-obsidian); font-weight: 700; white-space: nowrap;">추천 폰트명</th>
                  <th style="padding: 12px 16px; width: 48%; min-width: 460px; color: var(--color-obsidian); font-weight: 700; white-space: nowrap;">특징 및 권장 용도</th>
                  <th style="padding: 12px 16px; width: 16%; min-width: 135px; color: var(--color-obsidian); font-weight: 700; white-space: nowrap;">배포처</th>
                </tr>
              </thead>
              <tbody>
                <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.15s;" onmouseover="this.style.background='#fafaf9'" onmouseout="this.style.background='transparent'">
                  <td style="padding: 11px 16px; font-weight: 700; color: var(--color-ember); white-space: nowrap;">제목용 (헤드카피)</td>
                  <td style="padding: 11px 16px; font-weight: 700; color: var(--color-obsidian); white-space: nowrap;">에스코어 드림</td>
                  <td style="padding: 11px 16px; color: #374151; white-space: nowrap;">1~9단계 굵기 지원. 모바일 화면에서 한눈에 꽂히는 단단하고 신뢰감 있는 제목 서체</td>
                  <td style="padding: 11px 16px; white-space: nowrap;"><span style="display: inline-block; padding: 2px 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 12px; color: #64748b;">눈누 / 에스코어</span></td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.15s;" onmouseover="this.style.background='#fafaf9'" onmouseout="this.style.background='transparent'">
                  <td style="padding: 11px 16px; font-weight: 700; color: var(--color-ember); white-space: nowrap;">제목용 (헤드카피)</td>
                  <td style="padding: 11px 16px; font-weight: 700; color: var(--color-obsidian); white-space: nowrap;">Gmarket Sans</td>
                  <td style="padding: 11px 16px; color: #374151; white-space: nowrap;">세련되고 트렌디한 인상. 비교과 워크숍, 페스티벌, 창업 특강 표지에 최적</td>
                  <td style="padding: 11px 16px; white-space: nowrap;"><span style="display: inline-block; padding: 2px 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 12px; color: #64748b;">눈누 / G마켓</span></td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.15s;" onmouseover="this.style.background='#fafaf9'" onmouseout="this.style.background='transparent'">
                  <td style="padding: 11px 16px; font-weight: 700; color: #0284c7; white-space: nowrap;">본문용 (상세내용)</td>
                  <td style="padding: 11px 16px; font-weight: 700; color: var(--color-obsidian); white-space: nowrap;">Pretendard (프리텐다드)</td>
                  <td style="padding: 11px 16px; color: #374151; white-space: nowrap;">현대적 UI 표준 고딕. 작은 글씨로 축소되어도 뭉개지지 않고 가독성 최상</td>
                  <td style="padding: 11px 16px; white-space: nowrap;"><span style="display: inline-block; padding: 2px 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 12px; color: #64748b;">눈누 / 웹폰트</span></td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.15s;" onmouseover="this.style.background='#fafaf9'" onmouseout="this.style.background='transparent'">
                  <td style="padding: 11px 16px; font-weight: 700; color: #0284c7; white-space: nowrap;">본문용 (상세내용)</td>
                  <td style="padding: 11px 16px; font-weight: 700; color: var(--color-obsidian); white-space: nowrap;">Noto Sans KR (본고딕)</td>
                  <td style="padding: 11px 16px; color: #374151; white-space: nowrap;">구글-어도비 표준 폰트. 공식 학사일정, 장학 공지 등 정중한 공문에 적합</td>
                  <td style="padding: 11px 16px; white-space: nowrap;"><span style="display: inline-block; padding: 2px 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 12px; color: #64748b;">Google Fonts</span></td>
                </tr>
                <tr style="transition: background 0.15s;" onmouseover="this.style.background='#fafaf9'" onmouseout="this.style.background='transparent'">
                  <td style="padding: 11px 16px; font-weight: 700; color: #059669; white-space: nowrap;">브랜드 아이덴티티</td>
                  <td style="padding: 11px 16px; font-weight: 700; color: var(--color-obsidian); white-space: nowrap;">대학 자체 전용 서체</td>
                  <td style="padding: 11px 16px; color: #374151; white-space: nowrap;">대학별 자체 개발 공식 무료 서체(서울대체 등). 소속감 및 브랜드 통일</td>
                  <td style="padding: 11px 16px; white-space: nowrap;"><span style="display: inline-block; padding: 2px 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 12px; color: #64748b;">각 대학 홍보팀</span></td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- 가독성 4대 원칙 그리드 -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 0.85rem;">
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 3px solid var(--color-ember); padding: 12px 14px; border-radius: 12px;">
              <strong style="font-size: 13px; color: var(--color-obsidian);">1. 원/투 폰트(One/Two) 룰</strong>
              <p style="font-size: 12px; color: #555; margin: 4px 0 0 0; line-height: 1.45;">
                한 카드뉴스에 서체를 3개 이상 섞지 말고, [제목: 에스코어 드림] + [본문: 프리텐다드] 2개로 통일합니다.
              </p>
            </div>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 3px solid #0284c7; padding: 12px 14px; border-radius: 12px;">
              <strong style="font-size: 13px; color: var(--color-obsidian);">2. 명도 대비 & 딤(Dim) 처리</strong>
              <p style="font-size: 12px; color: #555; margin: 4px 0 0 0; line-height: 1.45;">
                밝은 배경엔 차콜 글씨, 어두운 배경엔 흰색 글씨를 얹고, 복잡한 그림 위엔 반투명 박스를 깔아 글자를 분리합니다.
              </p>
            </div>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 3px solid #059669; padding: 12px 14px; border-radius: 12px;">
              <strong style="font-size: 13px; color: var(--color-obsidian);">3. 크기 계층(Hierarchy) 분리</strong>
              <p style="font-size: 12px; color: #555; margin: 4px 0 0 0; line-height: 1.45;">
                헤드라인(가장 큼) → 소제목(중간) → 본문 세부 설명(작음)으로 폰트 크기 위계를 명확히 둡니다.
              </p>
            </div>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 3px solid #7c3aed; padding: 12px 14px; border-radius: 12px;">
              <strong style="font-size: 13px; color: var(--color-obsidian);">4. 의미 단위 줄바꿈(keep-all)</strong>
              <p style="font-size: 12px; color: #555; margin: 4px 0 0 0; line-height: 1.45;">
                모바일 화면에서 단어 중간이 끊기지 않고 의미 단위로 읽히도록 문장 개행을 조절합니다.
              </p>
            </div>
          </div>
        </div>

        <!-- 카드 3-4: 공공기관 및 대학 AI 저작권 표기 & 최종 자가 점검표 -->
        <div class="card" style="padding: 1.75rem 2rem; border: 1px solid var(--color-pumice); border-radius: 28px; background: #ffffff;">
          <h3 style="font-size: 18px; color: var(--color-obsidian); margin: 0 0 1rem 0; display: flex; align-items: center; gap: 8px;">
            <span>🛡️ 4. 대학 행정 실무자를 위한 AI 저작권 표기 & 최종 자가 점검표</span>
          </h3>

          <div style="background: #fffafb; border: 1px solid #fee2e2; border-radius: 16px; padding: 1.15rem 1.35rem; margin-bottom: 1.25rem;">
            <div style="font-weight: 700; font-size: 13.5px; color: #991b1b; margin-bottom: 6px;">공공 표기 및 컴플라이언스 3대 수칙</div>
            <ul style="margin: 0; padding-left: 20px; font-size: 12.5px; color: #7f1d1d; line-height: 1.6; word-break: keep-all;">
              <li><strong>AI 생성물 표기 권장:</strong> 교내 공식 홍보물에 AI 생성 이미지를 사용할 경우, 하단 귀퉁이에 <em>"본 이미지는 생성형 AI를 활용하여 제작되었습니다."</em> 안내 문구를 표기하는 것이 권장됩니다.</li>
              <li><strong>특정인 초상권 및 상표권 침해 금지:</strong> 특정 재학생 얼굴이나 타 대학 상징 로고를 AI 프롬프트에 넣지 마세요.</li>
              <li><strong>개인정보 비식별화:</strong> 이벤트 당첨자나 수혜자 안내 카드뉴스에 학생 성명(홍*동 처리), 학번, 전화번호를 이미지로 박제 배포하지 않습니다.</li>
            </ul>
          </div>

          <!-- 자가 점검 체크리스트 바 -->
          <div style="background: #fdfbf7; border: 1px solid #fed7aa; border-radius: 16px; padding: 1.1rem 1.4rem;">
            <div style="font-weight: 700; font-size: 13.5px; color: #9a3412; margin-bottom: 6px;">📋 카드뉴스 배포 전 3초 자가 점검 체크리스트</div>
            <div style="font-size: 12.5px; color: #7c2d12; line-height: 1.6; display: flex; flex-direction: column; gap: 3px;">
              <span>✓ 공문 문구를 NotebookLM으로 5컷 구조(헤드라인+혜택+신청)로 압축했는가?</span>
              <span>✓ 나노바나나에 '텍스트가 들어갈 여백(Negative Space)'을 지정하여 이미지를 생성했는가?</span>
              <span>✓ 상업적 이용이 검증된 안심 폰트(에스코어 드림, 프리텐다드 등)를 사용했는가?</span>
              <span>✓ 모바일 작은 화면으로 보았을 때 글씨가 배경에 묻히지 않고 또렷하게 읽히는가?</span>
              <span>✓ AI 생성물 표기 문구를 넣고, 학생 개인 식별 정보를 비식별화했는가?</span>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * 교직원 모듈 04: 구글 폼 제작 및 집계시스템 설정 (15분 라이브 시연 실무 가이드 - 구글폼2.md 기반)
   */
  getStaffGoogleFormSectionHtml() {
    return `
      <!-- 04. 구글 폼 제작 및 집계시스템 설정 실무 가이드 섹션 -->
      <div id="lecture-staff-sec-4" class="lecture-nav-section" style="margin-top: var(--spacing-48); margin-bottom: var(--spacing-32); scroll-margin-top: 96px;">
        <!-- 섹션 헤더 -->
        <div style="margin-bottom: var(--spacing-20);">
          <span style="font-family: var(--font-display); font-size: 16px; color: var(--color-ember); letter-spacing: 0.05em;">FORM DESIGN & AUTOMATED REPORTING</span>
          <h2 style="font-size: clamp(24px, 3.5vw, 32px); color: var(--color-obsidian); margin-top: 4px;">📋 04. 구글 폼 제작 & 스프레드시트 실시간 집계</h2>
        </div>

        <!-- 카드 4-0: ⏱️ 15분 완성: 라이브 시연 8단계 로드맵 & 타임라인 -->
        <div class="card" style="padding: 1.75rem 2rem; border: 1px solid var(--color-pumice); border-radius: 28px; background: #ffffff; margin-bottom: 1.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 1rem;">
            <h3 style="font-size: 18px; color: var(--color-obsidian); margin: 0; display: flex; align-items: center; gap: 8px;">
              <span>⏱️ 15분 완성: 라이브 시연 8단계 로드맵 & 타임라인</span>
            </h3>
          </div>

          <p style="font-size: 13.5px; color: #555; line-height: 1.6; margin-bottom: 1.25rem; word-break: keep-all;">
            교직원 연수 및 워크숍에서 <strong>문항 기획 ➔ GAS 1클릭 폼 생성 ➔ 폼 배포 설정 ➔ 실시간 시트 집계 ➔ =GEMINI() 감정 분석 ➔ 1-Page 보고서</strong>까지 15분 동안 물 흐르듯 시연할 수 있도록 최적화된 8단계 순서도입니다.
          </p>

          <!-- 8단계 인포그래픽 비주얼 로드맵 -->
          <div style="border-radius: 18px; overflow: hidden; border: 1px solid var(--color-pumice); box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04); background: #ffffff;">
            <img src="images/staff_form_roadmap_infographic2.png?v=20261027_v2" alt="15분 완성: 라이브 시연 8단계 로드맵 & 타임라인 한국어 인포그래픽" style="width: 100%; height: auto; display: block; object-fit: cover;" loading="lazy">
          </div>
        </div>

        <!-- 카드 4-1: [STEP 1 & 2] AI 문항 기획 & 비전문가용 GAS 코드 요청 프롬프트 -->
        <div class="card" style="padding: 1.75rem 2rem; border: 1px solid var(--color-pumice); border-radius: 28px; background: #ffffff; margin-bottom: 1.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 1rem;">
            <h3 style="font-size: 18px; color: var(--color-obsidian); margin: 0; display: flex; align-items: center; gap: 8px;">
              <span>💬 [STEP 1 & 2] AI 문항 기획 & 비전문가용 GAS 코드 요청 프롬프트</span>
            </h3>
          </div>


          <div style="display: flex; flex-direction: column; gap: 1rem;">
            <!-- 프롬프트 1: 설문 문항 설계 -->
            <div class="prompt-template-card" style="background: #faf9f6; border: 1px solid var(--color-pumice); border-radius: 18px; padding: 1.25rem 1.4rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;">
                <div style="font-weight: 700; font-size: 14.5px; color: var(--color-obsidian); display: flex; align-items: center; gap: 6px;">
                  <span style="background: var(--color-ember); color: #fff; font-size: 11px; padding: 2px 7px; border-radius: 4px; font-weight: 700;">STEP 1</span>
                  <span>🎯 [복사용 프롬프트 1] 교육·연수 만족도 조사 문항 설계</span>
                </div>
                <button type="button" class="btn btn-outline prompt-copy-btn" onclick="DashboardApp.copyPrompt(this)" style="font-size: 12px; padding: 4px 12px; border-radius: 999px; display: inline-flex; align-items: center; gap: 4px; border-color: var(--color-ember); color: var(--color-ember); background: #ffffff; cursor: pointer; font-weight: 700;" title="프롬프트 복사하기">
                  <span>📋 프롬프트 복사</span>
                </button>
              </div>
              <pre style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; font-size: 12px; color: #374151; white-space: pre-wrap; word-break: break-all; margin: 0; line-height: 1.55; font-family: inherit;">당신은 대학교 및 교육기관의 교육 프로그램 기획 및 성과관리 전문 행정관입니다.
이번에 진행된 [프로그램명: 생성형 AI 활용 행정 실무 역량 강화 워크숍]의 사후 만족도 조사를 구글 폼(Google Forms)으로 제작하려고 합니다.

[기본 정보]
- 교육 대상: [대학 교직원 60명]
- 교육 형태: [3시간 실습 및 이론 병행]
- 평가 목적: 향후 차기 교육과정 개편 및 대학혁신지원사업 성과보고서 증빙 데이터 확보

다음 조건에 맞추어 구글 폼에 바로 복사-붙여넣기 할 수 있는 문항 목록을 작성해 주세요:
1. 설문 도입 안내문 (조사 목적, 소요 시간 2분, 익명성 보장 멘트 포함)
2. 정량 평가 문항 (리커트 5점 척도: 1점 전혀 그렇지 않다 ~ 5점 매우 그렇다)
   - 강사 전문성 및 전달력 (1문항)
   - 교육 내용의 실무 적합성 및 유용성 (1문항)
   - 교육 환경 및 운영 지원 (1문항)
   - 종합 만족도 및 타인 추천 의향 (1문항)
3. 객관식 선택 문항 (가장 도움이 되었던 실무 세션 1개 선택)
4. 정성 평가 문항 (향후 희망 연수 주제 또는 행정 개선 건의사항 - 장문형)
5. 각 문항마다 [문항 유형: 선형 배율 / 객관식 질문 / 장문형], [필수 여부]를 명시해 주세요.</pre>
            </div>

            <!-- 프롬프트 2: GAS 코드 요청문 -->
            <div class="prompt-template-card" style="background: #faf9f6; border: 1px solid var(--color-pumice); border-radius: 18px; padding: 1.25rem 1.4rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;">
                <div style="font-weight: 700; font-size: 14.5px; color: var(--color-obsidian); display: flex; align-items: center; gap: 6px;">
                  <span style="background: #2563eb; color: #fff; font-size: 11px; padding: 2px 7px; border-radius: 4px; font-weight: 700;">STEP 2</span>
                  <span>⚡ [복사용 프롬프트 2] 비전문가용 원클릭 스크립트(GAS) 요청문</span>
                </div>
                <button type="button" class="btn btn-outline prompt-copy-btn" onclick="DashboardApp.copyPrompt(this)" style="font-size: 12px; padding: 4px 12px; border-radius: 999px; display: inline-flex; align-items: center; gap: 4px; border-color: #2563eb; color: #2563eb; background: #ffffff; cursor: pointer; font-weight: 700;" title="프롬프트 복사하기">
                  <span>📋 프롬프트 복사</span>
                </button>
              </div>
              <pre style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; font-size: 12px; color: #374151; white-space: pre-wrap; word-break: break-all; margin: 0; line-height: 1.55; font-family: inherit;">위에서 만든 설문 문항들을 내가 구글 폼에 일일이 타이핑하기 번거로워.
구글 드라이브에서 복사해 넣고 [실행] 버튼만 누르면 이 설문지가 자동으로 뚝딱 만들어지는 '구글 앱스 스크립트(Google Apps Script)' 코드로 작성해 줘.

- 5점 척도, 객관식, 주관식에 맞게 알아서 설정해 줘.
- 필수 질문도 잘 체크해 줘.
- 다 만들고 나면 내가 수정할 수 있는 편집 링크와 참가자에게 보낼 응답 링크가 콘솔 로그에 나오게 해줘.
- 코딩을 전혀 모르니까 손댈 필요 없이 그냥 통째로 복사해서 쓸 수 있게 완성된 코드만 줘.</pre>
            </div>
          </div>
        </div>

        <!-- 카드 4-2: [STEP 3] Google Apps Script 원클릭 폼 자동 생성 (10초 실행 & 표준 코드) -->
        <div class="card prompt-template-card" style="padding: 1.75rem 2rem; border: 1px solid var(--color-pumice); border-radius: 28px; background: #ffffff; margin-bottom: 1.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 1rem;">
            <h3 style="font-size: 18px; color: var(--color-obsidian); margin: 0; display: flex; align-items: center; gap: 8px;">
              <span>⚡ [STEP 3] Google Apps Script 원클릭 폼 자동 완성 (10초 실행 & 표준 코드)</span>
            </h3>
            <div style="display: flex; align-items: center; gap: 8px;">
              <button type="button" class="btn btn-outline prompt-copy-btn" onclick="DashboardApp.copyPrompt(this)" style="font-size: 12px; padding: 4px 12px; border-radius: 999px; display: inline-flex; align-items: center; gap: 4px; border-color: #16a34a; color: #16a34a; background: #ffffff; cursor: pointer; font-weight: 700;" title="GAS 코드 전체 복사하기">
                <span>📋 GAS 코드 전체 복사</span>
              </button>
            </div>
          </div>


          <!-- 4단계 조작 순서 안내 -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.75rem; margin-bottom: 1rem;">
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px;">
              <strong style="font-size: 12.5px; color: var(--color-obsidian); display: block; margin-bottom: 4px;">1. script.google.com 접속</strong>
              <span style="font-size: 12px; color: #64748b; line-height: 1.45;">새 창에서 접속 후 좌측 상단 <strong>[+ 새 프로젝트]</strong> 클릭</span>
            </div>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px;">
              <strong style="font-size: 12.5px; color: var(--color-obsidian); display: block; margin-bottom: 4px;">2. 코드 붙여넣기 및 저장</strong>
              <span style="font-size: 12px; color: #64748b; line-height: 1.45;">기존 기본 텍스트를 지우고 아래 코드 붙여넣기 ➔ <strong>[💾 저장]</strong></span>
            </div>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px;">
              <strong style="font-size: 12.5px; color: var(--color-obsidian); display: block; margin-bottom: 4px;">3. [▶ 실행] 및 1회 권한 승인</strong>
              <span style="font-size: 12px; color: #64748b; line-height: 1.45;">팝업창 [권한 검토] ➔ [고급] ➔ [안전하지 않음 이동] ➔ [허용]</span>
            </div>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px;">
              <strong style="font-size: 12.5px; color: var(--color-obsidian); display: block; margin-bottom: 4px;">4. 실행 로그 링크 확인</strong>
              <span style="font-size: 12px; color: #64748b; line-height: 1.45;">하단 콘솔에 나타난 <strong>[관리자 편집용 URL]</strong> 클릭하여 폼 확인</span>
            </div>
          </div>

          <pre style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; font-size: 11.5px; color: #334151; overflow-x: auto; margin: 0; line-height: 1.5; font-family: monospace;">function createSurveyForm() {
  // 1. 새 구글 폼 생성 및 안내문 설정
  var form = FormApp.create('[만족도 조사] 생성형 AI 활용 행정 실무 워크숍');
  form.setDescription('본 조사는 연수 만족도 및 의견 수렴을 위한 설문입니다. 성실한 응답 부탁드립니다. (소요시간: 약 2분)');
  form.setAllowResponseEdits(false); // 제출 후 수정 금지
  form.setRequireLogin(false);       // 외부인 응답 가능 (익명 보장)

  // 2. 5점 리커트 척도 문항
  form.addScaleItem()
    .setTitle('1. 강사는 교육 주제에 대해 전문성을 가지고 알기 쉽게 강의하였습니까?')
    .setBounds(1, 5)
    .setLabels('전혀 그렇지 않다', '매우 그렇다')
    .setRequired(true);

  form.addScaleItem()
    .setTitle('2. 본 교육에서 다룬 내용은 실제 업무 및 행정 실무에 유용하다고 생각하십니까?')
    .setBounds(1, 5)
    .setLabels('전혀 그렇지 않다', '매우 그렇다')
    .setRequired(true);

  form.addScaleItem()
    .setTitle('3. 본 교육 프로그램에 전반적으로 만족하며 타인에게 추천할 의향이 있습니까?')
    .setBounds(1, 5)
    .setLabels('전혀 그렇지 않다', '매우 그렇다')
    .setRequired(true);

  // 3. 객관식 선택 문항
  form.addMultipleChoiceItem()
    .setTitle('4. 오늘 교육 중 가장 도움이 되었던 실무 세션을 선택해 주세요.')
    .setChoiceValues([
      '프롬프트 공식 4+2 & 기안문 작성',
      '카드뉴스 및 비주얼 에셋 제작',
      '구글 폼 & 스프레드시트 =GEMINI() 자동화'
    ])
    .setRequired(true);

  // 4. 주관식 서술형 문항
  form.addParagraphTextItem()
    .setTitle('5. 향후 개설을 희망하는 연수 주제나 개선 건의사항을 자유롭게 작성해 주세요.')
    .setRequired(false);

  // 5. 완료 후 링크 출력
  Logger.log('✅ 폼 생성이 성공적으로 완료되었습니다!');
  Logger.log('👉 [관리자 편집용 URL]: ' + form.getEditUrl());
  Logger.log('👉 [응답자 배포용 URL]: ' + form.getPublishedUrl());
}</pre>
        </div>

        <!-- 카드 4-3: [STEP 4] 구글 폼 배포 전 필수 설정 체크리스트 4선 -->
        <div class="card" style="padding: 1.75rem 2rem; border: 1px solid var(--color-pumice); border-radius: 28px; background: #ffffff; margin-bottom: 1.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 1rem;">
            <h3 style="font-size: 18px; color: var(--color-obsidian); margin: 0; display: flex; align-items: center; gap: 8px;">
              <span>⚙️ [STEP 4] 구글 폼 배포 전 필수 설정 체크리스트 4선</span>
            </h3>
          </div>


          <!-- 체크리스트 표 -->
          <div style="overflow-x: auto; -webkit-overflow-scrolling: touch; margin-bottom: 0.5rem; border: 1px solid #e5e7eb; border-radius: 14px; background: #ffffff;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; min-width: 720px;">
              <thead>
                <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                  <th style="padding: 12px 16px; width: 22%; color: var(--color-obsidian); font-weight: 700; white-space: nowrap;">설정 항목</th>
                  <th style="padding: 12px 16px; width: 20%; color: var(--color-obsidian); font-weight: 700; white-space: nowrap;">권장 설정</th>
                  <th style="padding: 12px 16px; color: var(--color-obsidian); font-weight: 700;">실무 팁 및 설정 이유</th>
                </tr>
              </thead>
              <tbody>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 11px 16px; font-weight: 700; color: var(--color-ember); white-space: nowrap;">조직 도메인 사용자 제한</td>
                  <td style="padding: 11px 16px; font-weight: 600; color: #1e293b; white-space: nowrap;">교내 구성원: <strong>ON</strong><br>외부/수강생: <strong>OFF</strong></td>
                  <td style="padding: 11px 16px; color: #4b5563; line-height: 1.5; word-break: keep-all;">학교 계정(@univ.ac.kr) 로그인 필수 여부입니다. 예비 대학생이나 외부 참가자 대상 행사에서 ON으로 켜두면 접근 불가 민원이 발생합니다.</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 11px 16px; font-weight: 700; color: var(--color-ember); white-space: nowrap;">응답 1회로 제한</td>
                  <td style="padding: 11px 16px; font-weight: 600; color: #0284c7; white-space: nowrap;">만족도 조사: <strong>ON 권장</strong></td>
                  <td style="padding: 11px 16px; color: #4b5563; line-height: 1.5; word-break: keep-all;">동일 인물의 중복 제출로 인한 평가 결과 왜곡을 막습니다. (단, 응답자의 구글 계정 로그인이 필수가 됩니다)</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 11px 16px; font-weight: 700; color: var(--color-ember); white-space: nowrap;">이메일 주소 수집</td>
                  <td style="padding: 11px 16px; font-weight: 600; color: #059669; white-space: nowrap;">익명 평가: <strong>수집 안 함</strong><br>출석/기프티콘: <strong>직접 입력</strong></td>
                  <td style="padding: 11px 16px; color: #4b5563; line-height: 1.5; word-break: keep-all;">솔직한 주관식 피드백이 필요한 만족도 조사는 '수집 안 함'으로 설정해야 익명성이 보장되어 솔직한 응답률이 올라갑니다.</td>
                </tr>
                <tr>
                  <td style="padding: 11px 16px; font-weight: 700; color: var(--color-ember); white-space: nowrap;">제출 후 확인 메시지</td>
                  <td style="padding: 11px 16px; font-weight: 600; color: #7c3aed; white-space: nowrap;"><strong>맞춤 메시지 설정</strong></td>
                  <td style="padding: 11px 16px; color: #4b5563; line-height: 1.5; word-break: keep-all;">"응답이 기록되었습니다" 대신 <strong>'강의 교안/수료증 다운로드 드라이브 링크'</strong>나 <strong>'차기 일정 안내'</strong>를 적어두면 행정 문의가 70% 감소합니다.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 카드 4-4: [STEP 5 & 6] 가상 응답 제출 & 스프레드시트 실시간 집계 대시보드 세팅 -->
        <div class="card" style="padding: 1.75rem 2rem; border: 1px solid var(--color-pumice); border-radius: 28px; background: #ffffff; margin-bottom: 1.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 1rem;">
            <h3 style="font-size: 18px; color: var(--color-obsidian); margin: 0; display: flex; align-items: center; gap: 8px;">
              <span>📊 [STEP 5 & 6] 가상 응답 제출 & 스프레드시트 실시간 집계 대시보드</span>
            </h3>
          </div>


          <!-- 2단계 절차 안내 -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-bottom: 1.25rem;">
            <div style="background: #fffaf0; border: 1px solid #fed7aa; border-radius: 16px; padding: 1.15rem;">
              <div style="font-weight: 700; font-size: 14px; color: #9a3412; margin-bottom: 6px;">STEP 5. 응답 제출 & 시트 연동</div>
              <p style="font-size: 12.5px; color: #7c2d12; margin: 0; line-height: 1.5; word-break: keep-all;">
                미리보기(눈 모양 <code>👁️</code>)에서 가상 응답을 1회 제출한 뒤, 폼 편집창 <strong>[응답] ➔ [Sheets에 연결]</strong>을 눌러 새 스프레드시트를 생성합니다.
              </p>
            </div>
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 16px; padding: 1.15rem;">
              <div style="font-weight: 700; font-size: 14px; color: #166534; margin-bottom: 6px;">STEP 6. [집계 대시보드] 탭 분리 철칙</div>
              <p style="font-size: 12.5px; color: #14532d; margin: 0; line-height: 1.5; word-break: keep-all;">
                원본 탭(<code>'설문지 응답 1'</code>)을 직접 편집하면 수식이 깨집니다. 하단 <code>+</code>를 눌러 <strong>[집계 대시보드]</strong> 탭을 만들고 수식을 연결합니다.
              </p>
            </div>
          </div>

          <!-- 실무 수식 코드 블록 -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 1.25rem 1.4rem;">
            <div style="font-weight: 700; font-size: 14px; color: var(--color-obsidian); margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
              <span>💡 [집계 대시보드] 탭에 바로 넣는 실전 핵심 통계 수식</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 8px; font-size: 13px; color: #334155; font-family: inherit;">
              <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 8px;">
                <span style="font-weight: 700; color: var(--color-ember); min-width: 170px;">• 총 응답 인원 카운트:</span>
                <code style="background: #ffffff; border: 1px solid #cbd5e1; padding: 3px 10px; border-radius: 6px; font-size: 12.5px; color: #0f172a; font-family: inherit; font-weight: 600;">=COUNTA('설문지 응답 1'!A2:A)</code>
              </div>
              <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 8px;">
                <span style="font-weight: 700; color: #0284c7; min-width: 170px;">• 강사 전문성 평균 (5점):</span>
                <code style="background: #ffffff; border: 1px solid #cbd5e1; padding: 3px 10px; border-radius: 6px; font-size: 12.5px; color: #0f172a; font-family: inherit; font-weight: 600;">=AVERAGE('설문지 응답 1'!C2:C)</code>
              </div>
              <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 8px;">
                <span style="font-weight: 700; color: #059669; min-width: 170px;">• 실무 유용성 평균 (5점):</span>
                <code style="background: #ffffff; border: 1px solid #cbd5e1; padding: 3px 10px; border-radius: 6px; font-size: 12.5px; color: #0f172a; font-family: inherit; font-weight: 600;">=AVERAGE('설문지 응답 1'!D2:D)</code>
              </div>
              <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 8px;">
                <span style="font-weight: 700; color: #7c3aed; min-width: 170px;">• 우수 만족 비율 (4점↑):</span>
                <code style="background: #ffffff; border: 1px solid #cbd5e1; padding: 3px 10px; border-radius: 6px; font-size: 12.5px; color: #0f172a; font-family: inherit; font-weight: 600;">=COUNTIF('설문지 응답 1'!C2:C, ">=4") / COUNTA('설문지 응답 1'!C2:C)</code>
              </div>
            </div>
          </div>
        </div>

        <!-- 카드 4-5: [STEP 7] 스프레드시트 =GEMINI() 함수로 주관식 피드백 실시간 자동 분류 & 감정 분석 -->
        <div class="card" style="padding: 1.75rem 2rem; border: 1px solid var(--color-pumice); border-radius: 28px; background: #ffffff; margin-bottom: 1.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 1rem;">
            <h3 style="font-size: 18px; color: var(--color-obsidian); margin: 0; display: flex; align-items: center; gap: 8px;">
              <span>🤖 [STEP 7] 스프레드시트 =GEMINI() 함수로 주관식 피드백 자동 분류 & 감정 분석</span>
            </h3>
          </div>


          <p style="font-size: 13.5px; color: #555; line-height: 1.6; margin-bottom: 1rem; word-break: keep-all;">
            <code>'설문지 응답 1'</code> 시트의 주관식 열(예: <code>F열</code>) 옆에 새 열을 생성하고 아래 수식을 입력합니다:
          </p>

          <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 1.25rem;">
            <!-- 감정 분석 수식 -->
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 14px;">
              <div style="font-weight: 700; font-size: 13px; color: #4338ca; margin-bottom: 4px;">① 감정 분석 및 라벨링 (단어 하나로 출력)</div>
              <code style="display: block; background: #ffffff; border: 1px solid #cbd5e1; padding: 8px 12px; border-radius: 8px; font-size: 12.5px; color: #0f172a; font-family: inherit; font-weight: 600; word-break: break-all; line-height: 1.5;">=GEMINI("다음 수강생 주관식 피드백의 감정을 [매우긍정 / 긍정 / 건의사항 / 불만족] 중 단어 하나로만 분류해줘. 부가 설명 없이 단어만 출력:", F2)</code>
            </div>

            <!-- 키워드 추출 수식 -->
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 14px;">
              <div style="font-weight: 700; font-size: 13px; color: #c2410c; margin-bottom: 4px;">② 핵심 행정 개선 키워드 추출</div>
              <code style="display: block; background: #ffffff; border: 1px solid #cbd5e1; padding: 8px 12px; border-radius: 8px; font-size: 12.5px; color: #0f172a; font-family: inherit; font-weight: 600; word-break: break-all; line-height: 1.5;">=GEMINI("다음 피드백에서 행정 지원 개선이 필요한 핵심 키워드를 단어 2개 이내로 추출해줘. 쉼표로 구분:", F2)</code>
            </div>
          </div>

          <!-- 실무 팁 안내 -->
          <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 14px; padding: 12px 16px; font-size: 12.5px; color: #78350f; line-height: 1.55;">
            <strong>💡 실무자 필수 꿀팁 (값으로 붙여넣기)</strong>: <code>=GEMINI()</code> 함수는 시트를 새로고침할 때마다 재계산되어 API 할당량을 소모합니다. 계산이 끝나면 열 전체를 복사(<code>Ctrl + C</code>)한 후 <strong>'값만 붙여넣기(Ctrl + Shift + V)'</strong>로 고정해야 데이터가 불변 상태로 보존됩니다.
          </div>
        </div>

        <!-- 카드 4-6: [STEP 8] 전체 설문 결과 상급자 보고용 1-Page 요약 생성 프롬프트 -->
        <div class="card prompt-template-card" style="padding: 1.75rem 2rem; border: 1px solid var(--color-pumice); border-radius: 28px; background: #ffffff; margin-bottom: 1.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 1rem;">
            <h3 style="font-size: 18px; color: var(--color-obsidian); margin: 0; display: flex; align-items: center; gap: 8px;">
              <span>📑 [STEP 8] 전체 설문 결과 상급자 보고용 1-Page 요약 생성 프롬프트</span>
            </h3>
            <div style="display: flex; align-items: center; gap: 8px;">
              <button type="button" class="btn btn-outline prompt-copy-btn" onclick="DashboardApp.copyPrompt(this)" style="font-size: 12px; padding: 4px 12px; border-radius: 999px; display: inline-flex; align-items: center; gap: 4px; border-color: var(--color-ember); color: var(--color-ember); background: #ffffff; cursor: pointer; font-weight: 700;" title="프롬프트 복사하기">
                <span>📋 프롬프트 복사</span>
              </button>
            </div>
          </div>


          <pre style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; font-size: 12px; color: #334155; white-space: pre-wrap; word-break: break-all; margin: 0; line-height: 1.6; font-family: inherit;">다음은 [생성형 AI 활용 행정 실무 워크숍] 종료 후 수집된 주관식 피드백 원문 데이터입니다.
당신은 교육 성과분석관으로서, 상급자 보고용 [결과 요약 보고서]를 작성해야 합니다.

[주관식 원문 데이터]
"""
(여기에 스프레드시트의 주관식 열 텍스트를 그대로 복사하여 붙여넣기)
"""

다음 구조로 요약 분석해 주세요:
1. 총평 (주요 긍정 반응 요약 - 3줄 이내)
2. 가장 호평받은 핵심 요인 TOP 3
3. 제기된 주요 불만 및 개선 건의사항 (우선순위순 정렬)
4. 차기 연수 기획 시 반영해야 할 실무 제언 (Action Item 3가지)
5. 결과 보고서 본문에 인용하기 좋은 대표 생생 후기(Best Quote) 3선</pre>
        </div>

        <!-- 카드 4-7: 교직원 행정 실무자를 위한 꿀팁 & 보안 원칙 3대 수칙 -->
        <div class="card" style="padding: 1.75rem 2rem; border: 1px solid var(--color-pumice); border-radius: 28px; background: #ffffff;">
          <h3 style="font-size: 18px; color: var(--color-obsidian); margin: 0 0 1rem 0; display: flex; align-items: center; gap: 8px;">
            <span>🛡️ 교직원 행정 실무자를 위한 꿀팁 & 보안 원칙 3대 수칙</span>
          </h3>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem;">
            <div style="background: #fffafb; border: 1px solid #fee2e2; border-radius: 16px; padding: 1rem 1.2rem;">
              <strong style="font-size: 13.5px; color: #991b1b; display: block; margin-bottom: 6px;">1. 개인정보 최소 수집 원칙</strong>
              <p style="font-size: 12.5px; color: #7f1d1d; margin: 0; line-height: 1.5; word-break: keep-all;">
                기프티콘 추첨용 학번/전화번호는 본 설문과 섞지 마세요. <strong>'별도 섹션'</strong>으로 분리하거나 <strong>'추첨용 별도 폼 링크'</strong>로 유도해야 본 설문의 익명성이 철저히 보장됩니다.
              </p>
            </div>

            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 16px; padding: 1rem 1.2rem;">
              <strong style="font-size: 13.5px; color: #166534; display: block; margin-bottom: 6px;">2. 단축 URL & QR코드 즉시 생성</strong>
              <p style="font-size: 12.5px; color: #14532d; margin: 0; line-height: 1.5; word-break: keep-all;">
                구글 폼 [보내기] ➔ [URL 단축]을 체크하여 짧은 링크를 만들고, 마지막 강의 슬라이드에 QR코드를 띄워 <strong>"현장에서 완료 후 퇴실"</strong>을 유도하면 응답률이 85% 이상 달성됩니다.
              </p>
            </div>

            <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 16px; padding: 1rem 1.2rem;">
              <strong style="font-size: 13.5px; color: #1e40af; display: block; margin-bottom: 6px;">3. 공유 권한(협업자) 철저 관리</strong>
              <p style="font-size: 12.5px; color: #1e3a8a; margin: 0; line-height: 1.5; word-break: keep-all;">
                동료 교직원과 공동 작업 시 [보내기] 링크가 아니라 더보기(⋮) ➔ <strong>[공동작업자 추가]</strong>로 권한을 부여하세요. 이때 '링크가 있는 모든 사용자'에게 편집자 권한을 주지 않도록 주의합니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    `;
  }
};

window.DashboardApp = DashboardApp;
