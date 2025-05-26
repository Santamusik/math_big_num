// 현재 페이지 정보
let currentPageData = null;
let correctAnswers = {};

// DOM 요소들
const checkButton = document.getElementById("checkAnswer");
const resetButton = document.getElementById("resetAnswer");
const resultDiv = document.getElementById("result");
const allInputs = document.querySelectorAll('input[type="text"]');

// 페이지 로드 시 초기화
document.addEventListener("DOMContentLoaded", function () {
  initializePage();
  setupInputHandlers();
  setupButtons();
  focusFirstInput();
});

// 페이지 초기화
function initializePage() {
  // 현재 페이지 파일명 가져오기
  const currentFile = window.location.pathname.split("/").pop();

  // 페이지 번호 추출 (page1.html -> 1)
  const pageNumber = parseInt(
    currentFile.replace("page", "").replace(".html", "")
  );

  // 페이지 데이터 설정
  currentPageData = pageConfig.pages.find((page) => page.id === pageNumber);

  if (currentPageData) {
    // 정답 설정
    setCorrectAnswers();

    // 페이지 제목 업데이트
    document.title = `${currentPageData.title} - 수학 학습`;
  }
}

// 정답 설정 (페이지별로 동적 설정)
function setCorrectAnswers() {
  const pageId = currentPageData.id;

  switch (pageId) {
    case 1:
      correctAnswers = {
        answer1: "1875", // 375 × 5
        answer2: "18750", // 375 × 50
        digit1: "1", // 461 × 3 = 1383
        digit2: "3",
        digit3: "8",
        digit4: "3",
        digit5: "1", // 461 × 30 = 13830
        digit6: "3",
        digit7: "8",
        digit8: "3",
        digit9: "0",
      };
      break;
    case 2:
      correctAnswers = {
        answer1: "1704", // 284 × 6
        answer2: "17040", // 284 × 60
        digit1: "1", // 352 × 4 = 1408
        digit2: "4",
        digit3: "0",
        digit4: "8",
        digit5: "1", // 352 × 40 = 14080
        digit6: "4",
        digit7: "0",
        digit8: "8",
        digit9: "0",
      };
      break;
    case 3:
      correctAnswers = {
        answer1: "1372", // 196 × 7
        answer2: "13720", // 196 × 70
        digit1: "1", // 273 × 5 = 1365
        digit2: "3",
        digit3: "6",
        digit4: "5",
        digit5: "1", // 273 × 50 = 13650
        digit6: "3",
        digit7: "6",
        digit8: "5",
        digit9: "0",
      };
      break;
    case 4:
      correctAnswers = {
        answer1: "1284", // 428 × 3
        answer2: "12840", // 428 × 30
        digit1: "1", // 567 × 2 = 1134
        digit2: "1",
        digit3: "3",
        digit4: "4",
        digit5: "1", // 567 × 20 = 11340
        digit6: "1",
        digit7: "3",
        digit8: "4",
        digit9: "0",
      };
      break;
    case 5:
      correctAnswers = {
        answer1: "2520", // 315 × 8
        answer2: "25200", // 315 × 80
        digit1: "2", // 492 × 6 = 2952
        digit2: "9",
        digit3: "5",
        digit4: "2",
        digit5: "2", // 492 × 60 = 29520
        digit6: "9",
        digit7: "5",
        digit8: "2",
        digit9: "0",
      };
      break;
    case 6:
      correctAnswers = {
        answer1: "2552", // 638 × 4
        answer2: "25520", // 638 × 40
        digit1: "2", // 729 × 3 = 2187
        digit2: "1",
        digit3: "8",
        digit4: "7",
        digit5: "2", // 729 × 30 = 21870
        digit6: "1",
        digit7: "8",
        digit8: "7",
        digit9: "0",
      };
      break;
    case 7:
      correctAnswers = {
        answer1: "4280", // 856 × 5
        answer2: "42800", // 856 × 50
        digit1: "6", // 943 × 7 = 6601
        digit2: "6",
        digit3: "0",
        digit4: "1",
        digit5: "6", // 943 × 70 = 66010
        digit6: "6",
        digit7: "0",
        digit8: "1",
        digit9: "0",
      };
      break;
  }
}

// 입력 필드 이벤트 핸들러 설정
function setupInputHandlers() {
  allInputs.forEach((input, index) => {
    // 숫자만 입력 허용
    input.addEventListener("input", function (e) {
      this.value = this.value.replace(/[^0-9]/g, "");

      // 자동으로 다음 입력 필드로 이동
      if (this.classList.contains("digit-input") && this.value.length === 1) {
        const nextInput = getNextInput(this);
        if (nextInput) {
          nextInput.focus();
        }
      }
    });

    // 키보드 네비게이션
    input.addEventListener("keydown", function (e) {
      switch (e.key) {
        case "Enter":
          checkAnswers();
          break;
        case "ArrowRight":
        case "Tab":
          if (!e.shiftKey) {
            e.preventDefault();
            const nextInput = getNextInput(this);
            if (nextInput) nextInput.focus();
          }
          break;
        case "ArrowLeft":
          e.preventDefault();
          const prevInput = getPrevInput(this);
          if (prevInput) prevInput.focus();
          break;
        case "Backspace":
          if (this.value === "" && this.classList.contains("digit-input")) {
            const prevInput = getPrevInput(this);
            if (prevInput) {
              prevInput.focus();
              prevInput.value = "";
            }
          }
          break;
      }
    });

    // 포커스 시 내용 선택
    input.addEventListener("focus", function () {
      this.select();
    });
  });
}

// 다음 입력 필드 찾기
function getNextInput(currentInput) {
  const inputs = Array.from(allInputs);
  const currentIndex = inputs.indexOf(currentInput);
  return inputs[currentIndex + 1] || null;
}

// 이전 입력 필드 찾기
function getPrevInput(currentInput) {
  const inputs = Array.from(allInputs);
  const currentIndex = inputs.indexOf(currentInput);
  return inputs[currentIndex - 1] || null;
}

// 버튼 이벤트 설정
function setupButtons() {
  checkButton.addEventListener("click", checkAnswers);
  resetButton.addEventListener("click", resetAnswers);
}

// 첫 번째 입력 필드에 포커스
function focusFirstInput() {
  if (allInputs.length > 0) {
    allInputs[0].focus();
  }
}

// 정답 확인 함수
function checkAnswers() {
  let correctCount = 0;
  let totalCount = 0;
  let results = [];

  allInputs.forEach((input) => {
    const inputId = input.id;
    const userAnswer = input.value.trim();
    const correctAnswer = correctAnswers[inputId];

    totalCount++;

    if (userAnswer === correctAnswer) {
      correctCount++;
      input.style.borderColor = "#27ae60";
      input.style.backgroundColor = "#d5f4e6";
      results.push(`${inputId}: 정답`);
    } else if (userAnswer === "") {
      input.style.borderColor = "#f39c12";
      input.style.backgroundColor = "#fef9e7";
      results.push(`${inputId}: 미입력`);
    } else {
      input.style.borderColor = "#e74c3c";
      input.style.backgroundColor = "#fadbd8";
      results.push(`${inputId}: 오답 (정답: ${correctAnswer})`);
    }
  });

  displayResult(correctCount, totalCount);
  console.log("정답 확인 결과:", results);
}

// 결과 메시지 표시
function displayResult(correctCount, totalCount) {
  const percentage = Math.round((correctCount / totalCount) * 100);

  resultDiv.className = "result-message";

  if (correctCount === totalCount) {
    resultDiv.classList.add("correct");
    resultDiv.innerHTML = `
            🎉 완벽합니다! 모든 답이 정확합니다! 
            <br>정답률: ${percentage}% (${correctCount}/${totalCount})
            <br><small>다음 문제로 넘어가세요!</small>
        `;
  } else if (correctCount >= totalCount * 0.7) {
    resultDiv.classList.add("partial");
    resultDiv.innerHTML = `
            👍 잘했어요! 조금만 더 노력하면 완벽해요!
            <br>정답률: ${percentage}% (${correctCount}/${totalCount})
        `;
  } else {
    resultDiv.classList.add("incorrect");
    resultDiv.innerHTML = `
            💪 다시 한번 도전해보세요!
            <br>정답률: ${percentage}% (${correctCount}/${totalCount})
        `;
  }
}

// 답안 초기화
function resetAnswers() {
  allInputs.forEach((input) => {
    input.value = "";
    input.style.borderColor = "#f39c12";
    input.style.backgroundColor = "#fff9e6";
  });

  resultDiv.innerHTML = "";
  resultDiv.className = "result-message";

  focusFirstInput();
}

// 키보드 단축키
document.addEventListener("keydown", function (e) {
  if (e.ctrlKey || e.metaKey) {
    switch (e.key) {
      case "Enter":
        e.preventDefault();
        checkAnswers();
        break;
      case "r":
        e.preventDefault();
        resetAnswers();
        break;
    }
  }
});

// 터치 디바이스 지원
if ("ontouchstart" in window) {
  allInputs.forEach((input) => {
    input.addEventListener("touchstart", function () {
      this.focus();
    });
  });
}
