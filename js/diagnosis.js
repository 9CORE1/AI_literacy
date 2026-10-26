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

    // PC(데스크톱) 환경에서 접속 시 'PDF 공유하기' 버튼 삭제 (모바일 환경에서만 노출)
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (window.innerWidth <= 768);
    if (!isMobileDevice) {
      document.getElementById('share-pdf-btn')?.remove();
    }

    this.bindEvents();

    // 이전에 완료한 진단 결과가 있는지 확인 (재진단 모드가 아닐 때 복원)
    const urlParams = new URLSearchParams(window.location.search);
    const forceRetake = urlParams.get('retake') === 'true';
    const savedData = localStorage.getItem('ai_lit_diagnosis_' + user.email);

    if (savedData && !forceRetake) {
      try {
        this.calculatedReport = JSON.parse(savedData);
        document.getElementById('survey-container').style.display = 'none';
        document.getElementById('report-container').style.display = 'block';
        this.renderReportDOM(this.calculatedReport);
        this.renderRadarChart(this.calculatedReport.factorResults);
        this.preparePdfBackground();
        return;
      } catch (e) {
        console.error('진단 결과 복원 오류:', e);
      }
    }

    this.renderQuestionPage();
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

    // 다운로드 및 공유 버튼 이벤트
    document.getElementById('download-pdf-btn')?.addEventListener('click', () => this.exportToPdf());
    document.getElementById('share-pdf-btn')?.addEventListener('click', () => this.sharePdf());
    document.getElementById('download-jpg-btn')?.addEventListener('click', () => this.exportToJpg('all'));
    document.getElementById('download-jpg-p1-btn')?.addEventListener('click', () => this.exportToJpg('1'));
    document.getElementById('download-jpg-p2-btn')?.addEventListener('click', () => this.exportToJpg('2'));
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
        questions: f.questions,
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

    // 진단 완료 데이터 로컬 영구 저장 (역량진단 완료자 식별)
    const user = Auth.getCurrentUser();
    if (user && user.email) {
      localStorage.setItem('ai_lit_diagnosis_' + user.email, JSON.stringify(this.calculatedReport));
      user.hasCompletedDiagnosis = true;
      user.lastDiagnosisAt = new Date().toISOString();
      localStorage.setItem('ai_lit_user', JSON.stringify(user));
    }

    // 화면 전환
    document.getElementById('survey-container').style.display = 'none';
    document.getElementById('report-container').style.display = 'block';

    this.renderReportDOM(this.calculatedReport);
    this.renderRadarChart(factorResults);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.preparePdfBackground();
  },

  /**
   * 샘플 이미지 규격에 맞춰 1페이지 및 2페이지 레포트 DOM 렌더링
   * (역량진단이 완료된 사용자에게만 각 요인별 해당 문항 번호가 표시됨)
   */
  renderReportDOM(report) {
    const user = Auth.getCurrentUser() || {};
    const factors = report.factorResults;

    // 인적사항 주입
    document.getElementById('rep-dept').textContent = user.department || '인공지능';
    document.getElementById('rep-name').textContent = user.name || '정재원';
    document.getElementById('rep-grade').textContent = user.gradeOrPosition || '2학년';
    document.getElementById('rep-email').textContent = user.email || 'student@univ.ac.kr';

    // 1. 결과 요약 표 (해당 문항 번호 포함)
    const tbody = document.getElementById('rep-summary-tbody');
    tbody.innerHTML = Object.keys(factors).map(k => {
      const qNums = factors[k].questions || (SURVEY_DATA.factors[k] ? SURVEY_DATA.factors[k].questions : []);
      const qText = qNums.length > 0 ? `(해당 문항: ${qNums.join(', ')}번)` : '';
      return `
        <tr>
          <td>${factors[k].shortName}</td>
          <td class="factor-name">
            <div style="font-weight: 700;">${factors[k].name}</div>
            <div style="font-size: 11px; color: #4b5563; margin-top: 2px; font-weight: 500;">${qText}</div>
          </td>
          <td class="rating">${factors[k].rating}</td>
        </tr>
      `;
    }).join('');

    // 전체 역량 지수 (배지 포함)
    document.getElementById('rep-overall-score').textContent = `${report.overallScore} 점 (${report.overallRating})`;

    // 2. 1페이지: 제안점 요약 (해당 문항 번호 배지 포함)
    const sugBox1 = document.getElementById('rep-suggestions-p1');
    sugBox1.innerHTML = Object.keys(factors).map(k => {
      const qNums = factors[k].questions || (SURVEY_DATA.factors[k] ? SURVEY_DATA.factors[k].questions : []);
      const qBadge = qNums.length > 0 ? `<span style="font-size: 11px; font-weight: 600; color: #374151; background: #e5e7eb; padding: 2px 7px; border-radius: 4px;">해당 문항: ${qNums.join(', ')}번</span>` : '';
      return `
        <div class="suggestion-block">
          <div class="suggestion-header-bar" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 4px;">
            <span>[ ${factors[k].shortName} : ${factors[k].name} ] 이렇게 해보세요!</span>
            ${qBadge}
          </div>
          <div class="suggestion-body-text">${factors[k].suggestion}</div>
        </div>
      `;
    }).join('');

    // 3. 2페이지: 제안점 재표시 + 제안 세부내용 4종 (해당 문항 번호 배지 포함)
    const sugBox2 = document.getElementById('rep-details-p2');
    sugBox2.innerHTML = Object.keys(factors).map(k => {
      const qNums = factors[k].questions || (SURVEY_DATA.factors[k] ? SURVEY_DATA.factors[k].questions : []);
      const qBadge = qNums.length > 0 ? `<span style="font-size: 11px; font-weight: 600; color: #374151; background: #e5e7eb; padding: 2px 7px; border-radius: 4px;">해당 문항: ${qNums.join(', ')}번</span>` : '';
      return `
        <div class="suggestion-item-group">
          <div class="suggestion-header-bar" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 4px;">
            <span>[ ${factors[k].shortName} : ${factors[k].name} ] 이렇게 해보세요!</span>
            ${qBadge}
          </div>
          <div class="suggestion-body-text" style="margin-bottom: 6px;">${factors[k].suggestion}</div>
          <div class="detail-sub-title">▶ 추천 세부 실천 과제</div>
          <ul class="report-detail-list">
            ${factors[k].details.map(d => `<li>${d}</li>`).join('')}
          </ul>
        </div>
      `;
    }).join('');
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
              font: { size: 11.5, weight: 'bold', family: "'KoPubWorld Dotum', sans-serif" },
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
   * 백그라운드에서 PDF Blob 사전 생성 (모바일 공유 시 사용자 제스처 만료 에러 방지)
   */
  preparePdfBackground() {
    setTimeout(async () => {
      try {
        if (!this.cachedPdfBlob) {
          const res = await this.generatePdfDocument(null);
          if (res && res.pdfBlob) {
            this.cachedPdf = res.pdf;
            this.cachedPdfBlob = res.pdfBlob;
            this.cachedFileName = res.fileName;
          }
        }
      } catch (err) {
        console.warn('PDF 백그라운드 프리렌더링 대기:', err);
      }
    }, 800);
  },

  /**
   * PDF 문서 인스턴스 생성 헬퍼
   * @param {HTMLElement} btn - 로딩 상태를 표시할 버튼 엘리먼트
   * @returns {Promise<{ pdf: any, fileName: string, user: any, pdfBlob: Blob }>}
   */
  async generatePdfDocument(btn) {
    const user = Auth.getCurrentUser() || {};
    const fileName = `AI리터러시_역량프로파일_${user.name || '학생'}.pdf`;
    const page1 = document.getElementById('report-page-1');
    const page2 = document.getElementById('report-page-2');

    // 모바일 기기는 메모리 효율과 렌더링 속도를 위해 1.5배율, 데스크톱은 2배율 적용
    const captureScale = (window.innerWidth <= 768) ? 1.5 : 2;

    if (btn) btn.textContent = '1p 캡처 중 (1/2)...';
    const canvas1 = await html2canvas(page1, { scale: captureScale, useCORS: true, logging: false });
    const imgData1 = canvas1.toDataURL('image/jpeg', 0.95);

    if (btn) btn.textContent = '2p 캡처 중 (2/2)...';
    const canvas2 = await html2canvas(page2, { scale: captureScale, useCORS: true, logging: false });
    const imgData2 = canvas2.toDataURL('image/jpeg', 0.95);

    if (btn) btn.textContent = 'PDF 합성 중...';
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    pdf.addImage(imgData1, 'JPEG', 0, 0, 210, 297);
    pdf.addPage();
    pdf.addImage(imgData2, 'JPEG', 0, 0, 210, 297);

    const pdfBlob = pdf.output('blob');
    this.cachedPdf = pdf;
    this.cachedPdfBlob = pdfBlob;
    this.cachedFileName = fileName;

    return { pdf, fileName, user, pdfBlob };
  },

  /**
   * PDF 저장 다운로드
   */
  async exportToPdf() {
    const downloadBtn = document.getElementById('download-pdf-btn');
    const originalText = downloadBtn ? downloadBtn.textContent : '📥 PDF 다운로드';
    if (downloadBtn) downloadBtn.disabled = true;

    try {
      if (this.cachedPdf) {
        this.cachedPdf.save(this.cachedFileName || 'AI리터러시_역량프로파일.pdf');
        return;
      }
      const { pdf, fileName } = await this.generatePdfDocument(downloadBtn);
      if (downloadBtn) downloadBtn.textContent = 'PDF 저장 중...';
      pdf.save(fileName);
    } catch (e) {
      console.error('PDF 생성 실패:', e);
      alert('PDF 생성 중 오류가 발생했습니다. 브라우저의 인쇄 기능(Ctrl+P)을 사용할 수도 있습니다.');
    } finally {
      if (downloadBtn) {
        downloadBtn.textContent = originalText;
        downloadBtn.disabled = false;
      }
    }
  },

  /**
   * 모바일/브라우저 네이티브 PDF 공유 (Web Share API)
   */
  async sharePdf() {
    const shareBtn = document.getElementById('share-pdf-btn');
    const originalText = shareBtn ? shareBtn.textContent : '📤 PDF 공유하기';
    if (shareBtn) shareBtn.disabled = true;

    try {
      const user = Auth.getCurrentUser() || {};
      const koreanFileName = `AI리터러시_역량프로파일_${user.name || '학생'}.pdf`;
      const asciiFileName = `AI_Literacy_Profile_${Date.now()}.pdf`;

      let pdfBlob = this.cachedPdfBlob;
      let pdfObj = this.cachedPdf;

      // 캐시된 PDF가 아직 없다면 즉시 생성
      if (!pdfBlob) {
        if (shareBtn) shareBtn.textContent = 'PDF 생성 중...';
        const res = await this.generatePdfDocument(shareBtn);
        pdfObj = res.pdf;
        pdfBlob = res.pdfBlob;
      }

      if (shareBtn) shareBtn.textContent = '공유 창 여는 중...';

      const ua = navigator.userAgent || '';
      const isKakao = /KAKAOTALK/i.test(ua);
      const isNaver = /NAVER/i.test(ua);

      // WebKit/Chrome 파일 공유용 안전 File 객체 (영문 파일명으로 iOS/Android 호환성 확보)
      const pdfFile = new File([pdfBlob], asciiFileName, { type: 'application/pdf' });
      let sharedSuccessfully = false;

      // Web Share API 지원 확인 및 실행
      if (!isKakao && !isNaver && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        try {
          await navigator.share({
            files: [pdfFile],
            title: `[AI 리터러시 진단 결과] ${user.name || '학생'}`,
            text: `${user.name || '학생'}님의 대학생 AI 리터러시 역량 진단 결과 레포트입니다.`
          });
          sharedSuccessfully = true;
        } catch (shareErr) {
          if (shareErr.name === 'AbortError') {
            // 사용자가 공유 창을 닫은 경우 (정상 취소)
            return;
          }
          console.warn('Web Share API 파일 공유 실패, 대체 방식 시도:', shareErr);
        }
      }

      // 공유 실패 또는 인앱 브라우저일 때 대체 방식: PDF 새 탭 열기 & 자동 다운로드
      if (!sharedSuccessfully) {
        const blobUrl = URL.createObjectURL(pdfBlob);

        if (isKakao) {
          alert('카카오톡 인앱 브라우저에서는 파일 직접 공유가 제한되어 있습니다.\n새 창으로 열리는 PDF 화면에서 다운로드하시거나, 우측 상단 메뉴(⋮)에서 [다른 브라우저로 열기]를 권장합니다.');
        }

        // 모바일 브라우저 새 탭에 PDF 뷰어 띄우기 (iOS 사파리는 기본 뷰어에서 바로 공유 [↑] 가능)
        const openWin = window.open(blobUrl, '_blank');
        if (!openWin) {
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = koreanFileName;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => a.remove(), 600);
        }
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.error('PDF 공유 실패:', e);
        alert('PDF 공유 중 문제가 발생했습니다. 상단의 [📥 PDF 다운로드] 또는 [1p JPG 저장] 기능을 이용해 주세요.');
      }
    } finally {
      if (shareBtn) {
        shareBtn.textContent = originalText;
        shareBtn.disabled = false;
      }
    }
  },

  /**
   * 캔버스를 고화질 JPG 파일로 안전하게 다운로드 트리거
   * @param {HTMLCanvasElement} canvas
   * @param {string} fileName
   * @returns {Promise<void>}
   */
  downloadCanvasAsJpg(canvas, fileName) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('이미지 Blob 변환에 실패했습니다.'));
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();

        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          resolve();
        }, 300);
      }, 'image/jpeg', 0.95);
    });
  },

  /**
   * JPG 저장 다운로드 (1페이지, 2페이지 고화질 JPG 각각 다운로드)
   * @param {'all' | '1' | '2'} pageOption
   */
  async exportToJpg(pageOption = 'all') {
    const user = Auth.getCurrentUser() || {};
    const downloadBtn = document.getElementById('download-jpg-btn');
    const originalText = downloadBtn ? downloadBtn.textContent : '🖼️ JPG 전체 저장';

    const allJpgBtns = [
      downloadBtn,
      document.getElementById('download-jpg-p1-btn'),
      document.getElementById('download-jpg-p2-btn')
    ].filter(Boolean);

    allJpgBtns.forEach(btn => { btn.disabled = true; });

    try {
      const page1 = document.getElementById('report-page-1');
      const page2 = document.getElementById('report-page-2');
      const userName = user.name || '학생';
      const file1Name = `AI리터러시_역량프로파일_${userName}_1p.jpg`;
      const file2Name = `AI리터러시_실천가이드_${userName}_2p.jpg`;

      // 1페이지 단독 다운로드
      if (pageOption === '1') {
        if (downloadBtn) downloadBtn.textContent = '1p 캡처 중...';
        const canvas1 = await html2canvas(page1, { scale: 2, useCORS: true, logging: false });
        await this.downloadCanvasAsJpg(canvas1, file1Name);
        return;
      }

      // 2페이지 단독 다운로드
      if (pageOption === '2') {
        if (downloadBtn) downloadBtn.textContent = '2p 캡처 중...';
        const canvas2 = await html2canvas(page2, { scale: 2, useCORS: true, logging: false });
        await this.downloadCanvasAsJpg(canvas2, file2Name);
        return;
      }

      // 1페이지 & 2페이지 모두 순차 다운로드 ('all')
      if (downloadBtn) downloadBtn.textContent = '1p 캡처 중 (1/2)...';
      const canvas1 = await html2canvas(page1, { scale: 2, useCORS: true, logging: false });

      if (downloadBtn) downloadBtn.textContent = '2p 캡처 중 (2/2)...';
      const canvas2 = await html2canvas(page2, { scale: 2, useCORS: true, logging: false });

      // 1페이지 다운로드
      if (downloadBtn) downloadBtn.textContent = '1p 파일 저장 중...';
      await this.downloadCanvasAsJpg(canvas1, file1Name);

      // 브라우저의 '다중 다운로드 자동 차단' 정책 우회를 위해 대기 후 2페이지 다운로드 실행
      if (downloadBtn) downloadBtn.textContent = '2p 파일 저장 중...';
      await new Promise(resolve => setTimeout(resolve, 800));
      await this.downloadCanvasAsJpg(canvas2, file2Name);

      if (downloadBtn) downloadBtn.textContent = '✅ 1·2p 저장 완료!';
      await new Promise(resolve => setTimeout(resolve, 800));

    } catch (e) {
      console.error('JPG 생성 실패:', e);
      alert('JPG 이미지 저장 중 오류가 발생했습니다.');
    } finally {
      if (downloadBtn) downloadBtn.textContent = originalText;
      allJpgBtns.forEach(btn => { btn.disabled = false; });
    }
  }
};

window.DiagnosisApp = DiagnosisApp;
