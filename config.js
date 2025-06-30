// 페이지 설정
const pageConfig = {
  pages: [
    {
      id: 1,
      title: "만 알아보기",
      file: "page1.html",
      description:
        "1000의 10개인 수를 10000 또는 1만이라 쓰고, 만 또는 일만 이라고 읽습니다",
      problems: [
        {
          question: "9996 - 9997 - __ - __ - 10000",
          answer: ["9998", "9999"],
          type: "fill_blanks",
        },
        {
          question: "9960 - __ - __ - 9990 - 10000",
          answer: ["9970", "9980"],
          type: "fill_blanks",
        },
        {
          question: "9600 - __ - 9800 - __ - 10000",
          answer: ["9700", "9900"],
          type: "fill_blanks",
        },
        {
          question: "6000 - 7000 - __ - __ - 10000",
          answer: ["8000", "9000"],
          type: "fill_blanks",
        },
      ],
    },
    {
      id: 2,
      title: "다섯 자리 수 알아보기",
      file: "page2.html",
      description: "46571 -> 4만 6천 5백 7십 1",
      problems: [
        {
          question: "46571",
          answer: "사만 육천오백칠십일",
          type: "number_to_korean",
        },
        {
          question: "46571 = 40000+6000+500+70+1",
          answer: true,
          type: "decomposition",
        },
        {
          question: "93475",
          answer: "구만 삼천사백칠십오",
          type: "number_to_korean",
        },
        {
          question: "56871",
          answer: "오만 육천팔백칠십일",
          type: "number_to_korean",
        },
      ],
    },
    {
      id: 3,
      title: "십만, 백만, 천만을 알아보기",
      file: "page3.html",
      description: "1만 -> 10만 -> 100만 -> 1000만",
      problems: [
        {
          question: "10000이 86297개인 수는",
          answer: "862970000",
          type: "calculation",
        },
        { question: "1만이 10개", answer: "10만", type: "unit_conversion" },
        { question: "10만이 10개", answer: "100만", type: "unit_conversion" },
        { question: "100만이 10개", answer: "1000만", type: "unit_conversion" },
      ],
    },
    {
      id: 4,
      title: "억을 알아보기",
      file: "page4.html",
      description: "1억은 1000만이 10개인 수에요!",
      problems: [
        {
          question: "1000만이 10개인 수는",
          answer: "1억",
          type: "unit_conversion",
        },
        {
          question: "1억이 8670개, 1만이 1593개, 1이 4260개인 수는",
          answer: "867015934260",
          type: "place_value",
        },
      ],
    },
    {
      id: 5,
      title: "조를 알아보기",
      file: "page5.html",
      description: "1조는 1000억이 10개인 수에요!",
      problems: [
        {
          question: "1000억이 10개인 수는",
          answer: "1조",
          type: "unit_conversion",
        },
        {
          question:
            "1조가 3745개, 1억이 8670개, 1만이 15937개, 1이 4260개인 수는",
          answer: "374586701593742600",
          type: "place_value",
        },
      ],
    },
    {
      id: 6,
      title: "뛰어세기",
      file: "page6.html",
      description: "만씩 뛰어세기: 만의 자리 숫자가 1씩 커져.",
      problems: [
        {
          question: "25000 - 35000 - __ - __",
          answer: ["45000", "55000"],
          type: "skip_counting",
        },
        {
          question: "10억씩 뛰어 세기: 910억 - 920억 - __ - 940억 - __",
          answer: ["930억", "950억"],
          type: "skip_counting",
        },
        {
          question: "10만씩 뛰어 세기: 1500000 - 2500000 - __ - __",
          answer: ["3500000", "4500000"],
          type: "skip_counting",
        },
      ],
    },
    {
      id: 7,
      title: "수의 크기를 비교하기",
      file: "page7.html",
      description: "두 수의 크기를 비교하세요.",
      problems: [
        { question: "214590 > 35710", answer: true, type: "comparison" },
        { question: "2790340 > 2770340", answer: true, type: "comparison" },
        { question: "1632만 ○ 971만", answer: ">", type: "comparison_symbol" },
        {
          question: "4670000000 ○ 4770000000",
          answer: "<",
          type: "comparison_symbol",
        },
      ],
    },
  ],

  // 현재 학생 정보
  currentStudent: null,

  // 학생 초기화 (페이지 로드시 호출)
  initStudent: async function () {
    try {
      // localStorage에서 학생 ID 확인
      let studentId = localStorage.getItem("studentId");

      if (!studentId) {
        // 학생 정보가 없으면 등록 페이지로 리다이렉트
        if (
          window.location.pathname !== "/student-register.html" &&
          !window.location.pathname.includes("student-register.html")
        ) {
          window.location.href = "student-register.html";
          return false;
        }
        return false;
      }

      const response = await fetch(`/api/progress/${studentId}`, {
        method: "GET",
      });

      const data = await response.json();

      if (data.success) {
        this.currentStudent = data.student;
        console.log(
          "학생 로그인:",
          this.currentStudent.studentName,
          `${this.currentStudent.schoolName} ${this.currentStudent.grade}학년 ${this.currentStudent.classNumber}반 ${this.currentStudent.studentNumber}번`
        );
        return true;
      } else {
        // 학생을 찾을 수 없으면 등록 페이지로
        localStorage.removeItem("studentId");
        localStorage.removeItem("studentInfo");
        if (
          window.location.pathname !== "/student-register.html" &&
          !window.location.pathname.includes("student-register.html")
        ) {
          window.location.href = "student-register.html";
        }
        return false;
      }
    } catch (error) {
      console.error("학생 초기화 오류:", error);
      // 오류시 등록 페이지로 리다이렉트
      if (
        window.location.pathname !== "/student-register.html" &&
        !window.location.pathname.includes("student-register.html")
      ) {
        window.location.href = "student-register.html";
      }
      return false;
    }
  },

  // 페이지 완료 상태 관리
  getCompletedPages: function () {
    if (this.currentStudent) {
      return this.currentStudent.completedPages || [];
    }
    // fallback to localStorage
    const completed = localStorage.getItem("completedPages");
    return completed ? JSON.parse(completed) : [];
  },

  markPageCompleted: async function (pageId) {
    try {
      console.log(`📝 페이지 ${pageId} 완료 처리 시작...`);

      if (this.currentStudent) {
        console.log(
          `👤 학생 정보: ${this.currentStudent.studentName} (ID: ${this.currentStudent.id})`
        );
        console.log(
          `📊 현재 완료 페이지: [${this.currentStudent.completedPages.join(
            ", "
          )}]`
        );

        // 서버에 진도 저장
        const response = await fetch("/api/progress", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            studentId: this.currentStudent.id,
            pageId: pageId,
            studyTime: 5, // 기본 5분으로 설정 (나중에 실제 시간 측정 추가)
          }),
        });

        const data = await response.json();
        console.log(`🌐 서버 응답:`, data);

        if (data.success) {
          this.currentStudent = data.student;
          console.log(`✅ 페이지 ${pageId} 완료 저장 성공!`);
          console.log(
            `📊 업데이트된 완료 페이지: [${this.currentStudent.completedPages.join(
              ", "
            )}]`
          );
        } else {
          console.error(`❌ 서버 저장 실패:`, data.error);
        }
      } else {
        console.log(`⚠️ 학생 정보 없음, localStorage 사용`);
        // fallback to localStorage
        const completed = this.getCompletedPages();
        if (!completed.includes(pageId)) {
          completed.push(pageId);
          localStorage.setItem("completedPages", JSON.stringify(completed));
          console.log(`💾 localStorage에 저장: [${completed.join(", ")}]`);
        }
      }
    } catch (error) {
      console.error("❌ 진도 저장 오류:", error);
      // 오류시 localStorage에 저장
      const completed = this.getCompletedPages();
      if (!completed.includes(pageId)) {
        completed.push(pageId);
        localStorage.setItem("completedPages", JSON.stringify(completed));
        console.log(
          `💾 오류 발생, localStorage에 저장: [${completed.join(", ")}]`
        );
      }
    }
  },

  isPageAccessible: function (pageId) {
    if (pageId === 1) return true; // 첫 페이지는 항상 접근 가능
    const completed = this.getCompletedPages();
    return completed.includes(pageId - 1); // 이전 페이지가 완료되어야 접근 가능
  },

  isCertificateAccessible: function () {
    const completed = this.getCompletedPages();
    console.log(
      `🏆 증명서 접근 체크: 완료된 페이지 [${completed.join(", ")}], 개수: ${
        completed.length
      }`
    );

    // 1부터 7까지 모든 페이지가 완료되었는지 확인
    const requiredPages = [1, 2, 3, 4, 5, 6, 7];
    const allCompleted = requiredPages.every((pageId) =>
      completed.includes(pageId)
    );

    console.log(
      `🏆 증명서 접근 가능: ${allCompleted} (필요: 7페이지, 완료: ${completed.length}페이지)`
    );
    return allCompleted;
  },

  // 사용자 답안 서버에 저장
  saveUserAnswers: async function (pageId, answers) {
    try {
      if (this.currentStudent) {
        console.log(`💾 페이지 ${pageId} 답안 저장 중...`, answers);

        const response = await fetch("/api/progress", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            studentId: this.currentStudent.id,
            pageId: pageId,
            scores: answers, // 사용자 답안 저장
            studyTime: 1,
          }),
        });

        const data = await response.json();
        if (data.success) {
          this.currentStudent = data.student;
          console.log(`✅ 페이지 ${pageId} 답안 저장 완료`);
        }
      } else {
        // localStorage에 저장
        const key = `answers_page${pageId}`;
        localStorage.setItem(key, JSON.stringify(answers));
        console.log(`💾 localStorage에 답안 저장: ${key}`);
      }
    } catch (error) {
      console.error("❌ 답안 저장 오류:", error);
      // 오류시 localStorage에 저장
      const key = `answers_page${pageId}`;
      localStorage.setItem(key, JSON.stringify(answers));
    }
  },

  // 사용자 답안 불러오기
  loadUserAnswers: function (pageId) {
    try {
      if (this.currentStudent && this.currentStudent.scores) {
        const answers = this.currentStudent.scores[`page${pageId}`];
        if (answers) {
          console.log(`📂 서버에서 페이지 ${pageId} 답안 불러옴:`, answers);
          return answers;
        }
      }

      // localStorage에서 불러오기
      const key = `answers_page${pageId}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        const answers = JSON.parse(stored);
        console.log(
          `📂 localStorage에서 페이지 ${pageId} 답안 불러옴:`,
          answers
        );
        return answers;
      }

      console.log(`📂 페이지 ${pageId} 저장된 답안 없음`);
      return null;
    } catch (error) {
      console.error("❌ 답안 불러오기 오류:", error);
      return null;
    }
  },

  // 현재 페이지 정보 가져오기
  getCurrentPage: function () {
    const currentFile =
      window.location.pathname.split("/").pop() || "index.html";
    if (currentFile === "index.html") return null;
    return this.pages.find((page) => page.file === currentFile);
  },

  // 이전/다음 페이지 정보
  getNavigation: function (currentPageId) {
    const currentIndex = this.pages.findIndex(
      (page) => page.id === currentPageId
    );
    return {
      prev: currentIndex > 0 ? this.pages[currentIndex - 1] : null,
      next:
        currentIndex < this.pages.length - 1
          ? this.pages[currentIndex + 1]
          : null,
      current: this.pages[currentIndex],
    };
  },

  // 페이지 접근 권한 확인
  checkPageAccess: function () {
    const currentPage = this.getCurrentPage();
    if (!currentPage) return true; // 홈페이지는 항상 접근 가능

    if (!this.isPageAccessible(currentPage.id)) {
      alert(`${currentPage.id - 1}단계를 먼저 완료해주세요!`);
      window.location.href = `page${currentPage.id - 1}.html`;
      return false;
    }
    return true;
  },
};
