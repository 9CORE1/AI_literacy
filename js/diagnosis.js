/**
 * @file diagnosis.js
 * @description AI 리터러시 진단 평가(30문항), 알고리즘 점수 계산, 레이더 차트, 2페이지 레포트 및 PDF/JPG 내보내기 모듈
 */

const DiagnosisApp = {
  currentPage: 0,
  pageSize: 6, // 30문항을 6문항씩 5단계로 진행
  answers: {}, // { 1: 5, 2: 7, ... }
  chartInstance: null,
  calculatedReport: null,

  init() {
    const user = Auth.getCurrentUser();
    if (!user) {
      alert('AI 리터러시 역량 진단은 대학생 로그인 후 이용 가능한 서비스입니다. 로그인 화면으로 이동합니다.');
      window.location.href = 'index.html?login=true';
      return;
    }

    if (user.role !== 'student') {
      alert('AI 리터러시 진단 평가는 대학생 전용 평가 도구입니다. 교직원 맞춤형 행정 실습 대시보드로 이동합니다.');
      window.location.href = 'dashboard.html';
      return;
    }

    this.renderQuestionPage();
    this.bindEvents();
  },

  bindEvents() {
    document.getElementById('prev-step-btn')?.addEventListener('click', () => {
      if (this.currentPage > 0) {
        this.currentPage--;
        this.renderQuestionPage();
      }
    });

    document.getElementById('next-step-btn')?.addEventListener('click', () => {
      if (!this.validateCurrentPage()) {
        alert('현재 페이지의 모든 문항에 응답해 주세요.');
        return;
      }

      const totalPages = Math.ceil(SURVEY_DATA.questions.length / this.pageSize);
      if (this.currentPage < totalPages - 1) {
        this.currentPage++;
        this.renderQuestionPage();
      } else {
        // 마지막 단계 완료 -> 결과 계산 및 레포트 출력
        this.calculateAndRenderReport();
      }
    });

    // 다운로드 버튼 이벤트
    document.getElementById('download-pdf-btn')?.addEventListener('click', () => this.exportToPdf());
    document.getElementById('download-jpg-btn')?.addEventListener('click', () => this.exportToJpg());
    document.getElementById('retake-btn')?.addEventListener('click', () => {
      if (confirm('진단을 다시 진행하시겠습니까? 현재 결과 화면은 초기화됩니다.')) {
        this.answers = {};
        this.currentPage = 0;
        document.getElementById('report-container').style.display = 'none';
        document.getElementById('survey-container').style.display = 'block';
        this.renderQuestionPage();
      }
    });
  },

  /**
   * 현재 페이지의 문항 렌더링
   */
  renderQuestionPage() {
    const listEl = document.getElementById('question-list');
    if (!listEl) return;

    const startIdx = this.currentPage * this.pageSize;
    const endIdx = Math.min(startIdx + this.pageSize, SURVEY_DATA.questions.length);
    const questionsToShow = SURVEY_DATA.questions.slice(startIdx, endIdx);

    const totalPages = Math.ceil(SURVEY_DATA.questions.length / this.pageSize);
    const progressPercent = Math.round(((startIdx) / SURVEY_DATA.questions.length) * 100);

    document.getElementById('progress-bar').style.width = `${progressPercent}%`;
    document.getElementById('step-indicator').textContent = `${this.currentPage + 1} / ${totalPages} 단계`;

    listEl.innerHTML = questionsToShow.map(q => {
      const selectedVal = this.answers[q.id];
      return `
        <div class="question-item" id="q-item-${q.id}">
          <div class="question-title">
            <span class="question-num">${q.id}.</span>
            <span>${q.text}</span>
          </div>
          <div class="likert-scale">
            ${[1, 2, 3, 4, 5, 6, 7].map(val => `
              <label class="likert-option">
                <input type="radio" name="q_${q.id}" value="${val}" ${selectedVal === val ? 'checked' : ''} onchange="DiagnosisApp.onSelectAnswer(${q.id}, ${val})">
                <div class="likert-circle">${val}</div>
              </label>
            `).join('')}
          </div>
          <div class="likert-label-bar">
            <span>1 전혀 그렇지 않다</span>
            <span>4 보통이다</span>
            <span>7 매우 그렇다</span>
          </div>
        </div>
      `;
    }).join('');

    // 이전/다음 버튼 텍스트 제어
    const prevBtn = document.getElementById('prev-step-btn');
    const nextBtn = document.getElementById('next-step-btn');
    prevBtn.style.display = this.currentPage === 0 ? 'none' : 'inline-flex';
    nextBtn.textContent = this.currentPage === totalPages - 1 ? '진단 완료 및 레포트 보기' : '다음 단계';

    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  onSelectAnswer(questionId, value) {
    this.answers[questionId] = Number(value);
  },

  validateCurrentPage() {
    const startIdx = this.currentPage * this.pageSize;
    const endIdx = Math.min(startIdx + this.pageSize, SURVEY_DATA.questions.length);
    for (let i = startIdx; i < endIdx; i++) {
      const qId = SURVEY_DATA.questions[i].id;
      if (!this.answers[qId]) {
        const itemEl = document.getElementById(`q-item-${qId}`);
        itemEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return false;
      }
    }
    return true;
  },

  /**
   * 점수 계산 공식 및 등급 판정
   */
  calculateAndRenderReport() {
    const factors = SURVEY_DATA.factors;
    const factorResults = {};
    let totalScoreSum = 0;

    Object.keys(factors).forEach(key => {
      const f = factors[key];
      const qIds = f.questions;
      const sum = qIds.reduce((acc, id) => acc + (this.answers[id] || 4), 0);
      const mean = sum / qIds.length;

      // 능력점수 공식 = (평균 - 1) / (7 - 1) * 100
      const score = Math.round(((mean - 1) / 6) * 100 * 10) / 10;
      totalScoreSum += score;

      // 등급 판정 (하 / 중 / 상)
      let rating = '중';
      if (score < f.thresholds.lowMax) {
        rating = '하';
      } else if (score >= f.thresholds.midMax) {
        rating = '상';
      }

      factorResults[key] = {
        name: f.name,
        shortName: f.shortName,
        mean: Math.round(mean * 100) / 100,
        score: score,
        rating: rating,
        fixedMean: f.fixedMean,
        suggestion: rating === '상' ? f.suggestions.high : (rating === '중' ? f.suggestions.mid : f.suggestions.low),
        details: rating === '상' ? f.details.high : (rating === '중' ? f.details.mid : f.details.low)
      };
    });

    // 전체 역량 지수 = 요인별 능력점수 평균
    const overallScore = Math.round((totalScoreSum / 5) * 10) / 10;
    let overallRating = '중';
    if (overallScore < SURVEY_DATA.overallThresholds.lowMax) {
      overallRating = '하';
    } else if (overallScore >= SURVEY_DATA.overallThresholds.midMax) {
      overallRating = '상';
    }

    this.calculatedReport = {
      factorResults,
      overallScore,
      overallRating,
      timestamp: new Date().toLocaleDateString('ko-KR')
    };

    // 화면 전환
    document.getElementById('survey-container').style.display = 'none';
    document.getElementById('report-container').style.display = 'block';

    this.renderReportDOM(this.calculatedReport);
    this.renderRadarChart(factorResults);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  /**
   * 샘플 이미지 규격에 맞춰 1페이지 및 2페이지 레포트 DOM 렌더링
   */
  renderReportDOM(report) {
    const user = Auth.getCurrentUser() || {};
    const factors = report.factorResults;

    // 인적사항 주입
    document.getElementById('rep-dept').textContent = user.department || '인공지능';
    document.getElementById('rep-name').textContent = user.name || '정재원';
    document.getElementById('rep-grade').textContent = user.gradeOrPosition || '2학년';
    document.getElementById('rep-email').textContent = user.email || 'student@univ.ac.kr';

    // 결과 요약 표
    const tbody = document.getElementById('rep-summary-tbody');
    tbody.innerHTML = Object.keys(factors).map(k => `
      <tr>
        <td>${factors[k].shortName}</td>
        <td class="factor-name">${factors[k].name}</td>
        <td class="rating">${factors[k].rating}</td>
      </tr>
    `).join('');

    // 전체 역량 지수 (배지 포함)
    document.getElementById('rep-overall-score').textContent = `${report.overallScore} 점 (${report.overallRating})`;

    // 1페이지: 제안점 요약
    const sugBox1 = document.getElementById('rep-suggestions-p1');
    sugBox1.innerHTML = Object.keys(factors).map(k => `
      <div class="suggestion-block">
        <div class="suggestion-header-bar">[ ${factors[k].shortName} : ${factors[k].name} ] 이렇게 해보세요!</div>
        <div class="suggestion-body-text">${factors[k].suggestion}</div>
      </div>
    `).join('');

    // 2페이지: 제안점 재표시 + 제안 세부내용 4종
    const sugBox2 = document.getElementById('rep-details-p2');
    sugBox2.innerHTML = Object.keys(factors).map(k => `
      <div class="suggestion-item-group">
        <div class="suggestion-header-bar">[ ${factors[k].shortName} : ${factors[k].name} ] 이렇게 해보세요!</div>
        <div class="suggestion-body-text" style="margin-bottom: 6px;">${factors[k].suggestion}</div>
        <div class="detail-sub-title">▶ 추천 세부 실천 과제</div>
        <ul class="report-detail-list">
          ${factors[k].details.map(d => `<li>${d}</li>`).join('')}
        </ul>
      </div>
    `).join('');
  },

  /**
   * 레이더 차트 (Chart.js) 렌더링
   */
  renderRadarChart(factors) {
    const ctx = document.getElementById('radarChart').getContext('2d');
    if (this.chartInstance) {
      this.chartInstance.destroy();
    }

    const labels = [
      'AI 기반 문제해결·창의적 적용',
      'AI 개념·원리 및 생성형 AI 이해',
      'AI 활용 태도·진로 및 사회적 영향 인식',
      'AI 데이터·윤리·보안 인식',
      '프롬프트 설계 및 비판적 활용 역량'
    ];

    const myScores = [
      factors.factor1.score,
      factors.factor2.score,
      factors.factor3.score,
      factors.factor4.score,
      factors.factor5.score
    ];

    const fixedAverages = [
      factors.factor1.fixedMean,
      factors.factor2.fixedMean,
      factors.factor3.fixedMean,
      factors.factor4.fixedMean,
      factors.factor5.fixedMean
    ];

    this.chartInstance = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: labels,
        datasets: [
          {
            label: '내 점수',
            data: myScores,
            borderColor: '#f97316',
            backgroundColor: 'rgba(249, 115, 22, 0.45)',
            borderWidth: 2,
            pointBackgroundColor: '#ea580c',
            pointRadius: 4
          },
          {
            label: '영역별 평균',
            data: fixedAverages,
            borderColor: '#22c55e',
            backgroundColor: 'rgba(34, 197, 94, 0.35)',
            borderWidth: 2,
            pointBackgroundColor: '#16a34a',
            pointRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false } // 커스텀 레전드 사용
        },
        scales: {
          r: {
            min: 0,
            max: 100,
            ticks: {
              stepSize: 20,
              display: true,
              font: { size: 9.5, family: "'KoPubWorld Dotum', sans-serif" },
              color: '#333333'
            },
            pointLabels: {
              font: { size: 11, weight: 'bold', family: "'KoPubWorld Dotum', sans-serif" },
              color: '#000000',
              padding: 6
            },
            grid: {
              color: '#d1d5db'
            },
            angleLines: {
              color: '#9ca3af'
            }
          }
        }
      }
    });
  },

  /**
   * PDF 저장 다운로드 (사용자가 명시적으로 클릭했을 때만 실행)
   */
  async exportToPdf() {
    const user = Auth.getCurrentUser() || {};
    const fileName = `AI리터러시_역량프로파일_${user.name || '학생'}.pdf`;

    const page1 = document.getElementById('report-page-1');
    const page2 = document.getElementById('report-page-2');

    const downloadBtn = document.getElementById('download-pdf-btn');
    const originalText = downloadBtn.textContent;
    downloadBtn.textContent = 'PDF 생성 중...';
    downloadBtn.disabled = true;

    try {
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF('p', 'mm', 'a4');

      // 1페이지 캡처
      const canvas1 = await html2canvas(page1, { scale: 2, useCORS: true });
      const imgData1 = canvas1.toDataURL('image/jpeg', 0.95);
      pdf.addImage(imgData1, 'JPEG', 0, 0, 210, 297);

      // 2페이지 캡처
      pdf.addPage();
      const canvas2 = await html2canvas(page2, { scale: 2, useCORS: true });
      const imgData2 = canvas2.toDataURL('image/jpeg', 0.95);
      pdf.addImage(imgData2, 'JPEG', 0, 0, 210, 297);

      pdf.save(fileName);
    } catch (e) {
      console.error('PDF 생성 실패:', e);
      alert('PDF 생성 중 오류가 발생했습니다. 브라우저의 인쇄 기능(Ctrl+P)을 사용할 수도 있습니다.');
    } finally {
      downloadBtn.textContent = originalText;
      downloadBtn.disabled = false;
    }
  },

  /**
   * JPG 저장 다운로드 (1페이지, 2페이지 고화질 JPG 각각 다운로드)
   */
  async exportToJpg() {
    const user = Auth.getCurrentUser() || {};
    const downloadBtn = document.getElementById('download-jpg-btn');
    const originalText = downloadBtn.textContent;
    downloadBtn.textContent = 'JPG 저장 중...';
    downloadBtn.disabled = true;

    try {
      const page1 = document.getElementById('report-page-1');
      const page2 = document.getElementById('report-page-2');

      // 1페이지 다운로드
      const canvas1 = await html2canvas(page1, { scale: 2, useCORS: true });
      const link1 = document.createElement('a');
      link1.download = `AI리터러시_역량프로파일_${user.name || '학생'}_1p.jpg`;
      link1.href = canvas1.toDataURL('image/jpeg', 0.95);
      link1.click();

      // 2페이지 다운로드
      setTimeout(async () => {
        const canvas2 = await html2canvas(page2, { scale: 2, useCORS: true });
        const link2 = document.createElement('a');
        link2.download = `AI리터러시_실천가이드_${user.name || '학생'}_2p.jpg`;
        link2.href = canvas2.toDataURL('image/jpeg', 0.95);
        link2.click();
      }, 500);

    } catch (e) {
      console.error('JPG 생성 실패:', e);
      alert('JPG 이미지 저장 중 오류가 발생했습니다.');
    } finally {
      downloadBtn.textContent = originalText;
      downloadBtn.disabled = false;
    }
  }
};

window.DiagnosisApp = DiagnosisApp;
