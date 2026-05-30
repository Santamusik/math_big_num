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
          question: "삼만구천오백이십삼을 숫자로 바꾸기",
          answer: "39523",
          type: "number_conversion",
        },
        {
          question: "56871을 한글로 바꾸기",
          answer: "오만육천팔백칠십일",
          type: "korean_conversion",
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

  getStudentAuthHeaders: function () {
    const token = localStorage.getItem("studentAccessToken");
    return token ? { Authorization: `Bearer ${token}` } : {};
  },

  saveStudentSession: function (student, accessToken) {
    localStorage.setItem("studentId", student.id);
    localStorage.setItem("studentInfo", JSON.stringify(student));
    if (accessToken) {
      localStorage.setItem("studentAccessToken", accessToken);
    }
  },

  // 학생 초기화 (페이지 로드시 호출)
  initStudent: async function () {
    try {
      console.log("🚀 학생 초기화 시작...");

      // localStorage에서 학생 ID 확인
      let studentId = localStorage.getItem("studentId");
      console.log("📱 localStorage에서 studentId 확인:", studentId);

      if (!studentId) {
        console.log("❌ studentId가 없음, 등록 페이지로 리다이렉트");
        // 기존 데이터 정리
        this.clearStudentData();

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

      console.log(`🌐 서버에서 학생 정보 요청: /api/progress/${studentId}`);
      const response = await fetch(`/api/progress/${studentId}`, {
        method: "GET",
        headers: this.getStudentAuthHeaders(),
      });

      console.log("🌐 서버 응답 상태:", response.status, response.statusText);
      const data = await response.json();
      console.log("🌐 서버 응답 데이터:", data);

      if (data.success) {
        // 🔧 새로운 학생이면 이전 데이터 정리
        const previousStudentId = this.currentStudent
          ? this.currentStudent.id
          : null;
        if (previousStudentId && previousStudentId !== data.student.id) {
          console.log(
            `🔄 학생 변경 감지: ${previousStudentId} → ${data.student.id}`
          );
          this.clearStudentData();
        }

        this.currentStudent = data.student;
        console.log("✅ 학생 정보 로드 성공!");
        console.log(
          "👤 학생 정보:",
          this.currentStudent.studentName,
          `${this.currentStudent.schoolName} ${this.currentStudent.grade}학년 ${this.currentStudent.classNumber}반 ${this.currentStudent.studentNumber}번`
        );
        console.log("📊 완료된 페이지:", this.currentStudent.completedPages);
        return true;
      } else {
        console.log("❌ 서버에서 학생을 찾을 수 없음:", data.error);

        // 🔧 새로운 해결책: localStorage에 저장된 학생 정보로 서버에 재등록 시도
        const storedStudentInfo = localStorage.getItem("studentInfo");
        if (storedStudentInfo) {
          try {
            const studentInfo = JSON.parse(storedStudentInfo);
            console.log(
              "🔄 저장된 학생 정보로 서버에 재등록 시도:",
              studentInfo
            );

            const reregisterResponse = await fetch("/api/student/register", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(studentInfo),
            });

            const reregisterData = await reregisterResponse.json();
            console.log("🔄 재등록 서버 응답:", reregisterData);

            if (reregisterData.success) {
              // 새로운 학생 ID로 업데이트
              this.saveStudentSession(
                reregisterData.student,
                reregisterData.accessToken
              );

              // 이전 데이터 정리
              this.clearStudentData();

              this.currentStudent = reregisterData.student;
              console.log(
                "✅ 재등록 성공! 새 학생 ID:",
                reregisterData.student.id
              );
              return true;
            }
          } catch (reregisterError) {
            console.error("❌ 재등록 실패:", reregisterError);
          }
        }

        // 재등록도 실패하면 등록 페이지로
        this.clearStudentData();
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
      console.error("❌ 학생 초기화 오류:", error);
      console.log("⚠️ 네트워크 오류 또는 서버 연결 실패");

      // 오류시 데이터 정리
      this.clearStudentData();

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

  // 답안 체크 및 확인 버튼 상태 관리
  checkAnswers: function (pageId) {
    console.log(`🔍 페이지 ${pageId} 답안 체크 시작...`);

    const currentPage = this.pages.find((page) => page.id === pageId);
    if (!currentPage) {
      console.error(`❌ 페이지 ${pageId}를 찾을 수 없음`);
      return false;
    }

    const problems = currentPage.problems;
    let allCorrect = true;
    let results = [];

    problems.forEach((problem, index) => {
      let inputElements = [];
      let isCorrect = false;
      let userAnswer = "";

      // 페이지별 특별한 input 구조 처리
      if (pageId === 2) {
        // page2의 특별한 ID 구조 (korean2, korean3)
        if (index === 0) {
          inputElements = [document.getElementById("korean2")];
        } else if (index === 1) {
          inputElements = [document.getElementById("korean3")];
        }
      } else {
        // 일반적인 data-question 속성 사용
        inputElements = document.querySelectorAll(`[data-question="${index}"]`);
      }

      if (inputElements.length > 0 && inputElements[0]) {
        if (problem.type === "fill_blanks") {
          // 빈칸 채우기 - 여러 입력값 체크
          const userAnswers = Array.from(inputElements).map((input) =>
            input.value.trim()
          );
          userAnswer = userAnswers;
          isCorrect =
            userAnswers.length === problem.answer.length &&
            userAnswers.every((answer, i) => answer === problem.answer[i]);
        } else if (problem.type === "multiple_choice") {
          // 객관식 - 선택된 라디오 버튼 체크
          const selectedInput = document.querySelector(
            `input[name="q${index}"]:checked`
          );
          userAnswer = selectedInput ? selectedInput.value : "";
          isCorrect = userAnswer === problem.answer;
        } else {
          // 단답형 - 단일 입력값 체크 (number_to_korean, decomposition 등)
          userAnswer = inputElements[0].value.trim();

          // 정답 타입에 따른 체크
          if (typeof problem.answer === "string") {
            isCorrect = userAnswer === problem.answer;
          } else if (typeof problem.answer === "boolean") {
            isCorrect =
              userAnswer.toLowerCase() === "true" ||
              userAnswer === "맞음" ||
              userAnswer === "1";
          }
        }

        // 시각적 피드백 제공
        inputElements.forEach((input) => {
          if (isCorrect) {
            input.style.backgroundColor = "#d4edda";
            input.style.borderColor = "#28a745";
          } else {
            input.style.backgroundColor = "#f8d7da";
            input.style.borderColor = "#dc3545";
          }
        });
      }

      results.push({
        question: problem.question,
        userAnswer: userAnswer,
        correctAnswer: problem.answer,
        isCorrect: isCorrect,
      });

      if (!isCorrect) {
        allCorrect = false;
      }
    });

    console.log(`📊 답안 체크 결과:`, results);
    console.log(`✅ 모든 정답 맞춤: ${allCorrect}`);

    // 답안 저장
    this.saveUserAnswers(pageId, results);

    // 결과 메시지 표시
    const resultElement = document.getElementById("result");
    if (resultElement) {
      const correctCount = results.filter((r) => r.isCorrect).length;
      const totalCount = results.length;
      const emptyCount = results.filter(
        (r) => !r.userAnswer || r.userAnswer === ""
      ).length;

      if (emptyCount > 0) {
        // 빈 답안이 있는 경우
        resultElement.textContent = `📝 답안을 모두 입력해주세요 (${
          totalCount - emptyCount
        }/${totalCount} 입력됨)`;
        resultElement.className = "result-message partial";
      } else if (allCorrect) {
        resultElement.textContent = `🎉 완벽합니다! 모든 문제를 맞혔어요! (${correctCount}/${totalCount})`;
        resultElement.className = "result-message correct";
      } else {
        resultElement.textContent = `${correctCount}/${totalCount} 정답입니다. 다시 한번 생각해보세요!`;
        resultElement.className = "result-message partial";
      }
    }

    // 확인 버튼 상태 업데이트
    const confirmButton = document.getElementById("confirmAnswers");
    if (confirmButton) {
      const emptyCount = results.filter(
        (r) => !r.userAnswer || r.userAnswer === ""
      ).length;

      if (emptyCount > 0) {
        // 빈 답안이 있는 경우
        confirmButton.disabled = true;
        confirmButton.innerHTML = `📝 답안을 모두 입력해주세요`;
        confirmButton.classList.add("btn-secondary");
        confirmButton.classList.remove("btn-success");
      } else if (allCorrect) {
        confirmButton.disabled = false;
        confirmButton.innerHTML = `✅ 모든 정답! 다음 단계로 →`;
        confirmButton.classList.add("btn-success");
        confirmButton.classList.remove("btn-secondary");

        // 자동으로 페이지 완료 처리
        this.markPageCompleted(pageId);
      } else {
        confirmButton.disabled = true;
        confirmButton.innerHTML = `❌ 다시 확인해주세요`;
        confirmButton.classList.add("btn-secondary");
        confirmButton.classList.remove("btn-success");
      }
    }

    return allCorrect;
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

        // 이미 완료된 페이지인지 확인
        if (this.currentStudent.completedPages.includes(pageId)) {
          console.log(`⚠️ 페이지 ${pageId}는 이미 완료됨`);
          return;
        }

        // 서버에 진도 저장
        const response = await fetch("/api/progress", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...this.getStudentAuthHeaders(),
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

          // 🏆 모든 페이지 완료 시 인증서 페이지로 이동
          if (this.currentStudent.completedPages.length === 7) {
            console.log("🎉 모든 페이지 완료! 인증서 발급 가능");
            setTimeout(() => {
              if (
                confirm(
                  "🎉 축하합니다! 모든 학습을 완료했습니다!\n\n학습 증명서를 받으시겠습니까?"
                )
              ) {
                window.location.href = "certificate.html";
              }
            }, 1000);
          }
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
            ...this.getStudentAuthHeaders(),
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
        console.log("⚠️ 학생 정보 없음, localStorage 사용 안함");
        // 학생 정보가 없으면 localStorage에 저장하지 않음
      }
    } catch (error) {
      console.error("❌ 답안 저장 오류:", error);
      // 오류시에도 localStorage에 저장하지 않음 (학생별 분리를 위해)
    }
  },

  // 사용자 답안 불러오기 (학생별 분리)
  loadUserAnswers: function (pageId) {
    try {
      if (this.currentStudent && this.currentStudent.scores) {
        const answers = this.currentStudent.scores[`page${pageId}`];
        if (answers) {
          console.log(`📂 서버에서 페이지 ${pageId} 답안 불러옴:`, answers);
          return answers;
        }
      }

      console.log(
        `📂 페이지 ${pageId} 저장된 답안 없음 (새 학생 또는 처음 접속)`
      );
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

  // 디버깅용 함수 - 현재 상태 확인
  debugStatus: function () {
    console.log("🔍 === 현재 상태 디버깅 ===");
    console.log(
      "📱 localStorage studentId:",
      localStorage.getItem("studentId")
    );
    console.log("👤 currentStudent:", this.currentStudent);
    if (this.currentStudent) {
      console.log("📊 완료된 페이지:", this.currentStudent.completedPages);
      console.log("📈 점수 데이터:", this.currentStudent.scores);
    }
    console.log(
      "💾 localStorage 완료 페이지:",
      localStorage.getItem("completedPages")
    );
    console.log("🔍 === 디버깅 완료 ===");
  },

  // 학생 변경 시 localStorage 정리
  clearStudentData: function () {
    console.log("🧹 이전 학생 데이터 정리 중...");

    // 답안 관련 localStorage 정리
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith("answers_page")) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => {
      localStorage.removeItem(key);
      console.log(`🗑️ ${key} 삭제됨`);
    });

    // 기타 이전 데이터 정리
    localStorage.removeItem("completedPages");
    localStorage.removeItem("studentAccessToken");

    console.log("✅ 이전 학생 데이터 정리 완료");
  },
};
