// 정답 데이터
const correctAnswers = {
  answer1: "1875", // 375 × 5
  answer2: "18750", // 375 × 50
  digit1: "1", // 461 × 3 = 1383의 첫 번째 자리
  digit2: "3", // 461 × 3 = 1383의 두 번째 자리
  digit3: "8", // 461 × 3 = 1383의 세 번째 자리
  digit4: "1", // 461 × 30 = 13830의 첫 번째 자리
  digit5: "3", // 461 × 30 = 13830의 두 번째 자리
  digit6: "8", // 461 × 30 = 13830의 세 번째 자리
  digit7: "3", // 461 × 30 = 13830의 네 번째 자리
  digit8: "0", // 461 × 30 = 13830의 다섯 번째 자리
};

// DOM 요소들
const checkButton = document.getElementById("checkAnswer");
const resetButton = document.getElementById("resetAnswer");
const resultDiv = document.getElementById("result");
const allInputs = document.querySelectorAll('input[type="text"]');

// 페이지 로드 시 초기화
document.addEventListener("DOMContentLoaded", function () {
  setupInputHandlers();
  setupButtons();
  focusFirstInput();
});

// 입력 필드 이벤트 핸들러 설정
function setupInputHandlers() {
  allInputs.forEach((input, index) => {
    // 숫자만 입력 허용
    input.addEventListener("input", function (e) {
      // 숫자가 아닌 문자 제거
      this.value = this.value.replace(/[^0-9]/g, "");

      // 자동으로 다음 입력 필드로 이동 (한 자리 입력 필드의 경우)
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

  // 모든 입력 필드 확인
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

  // 결과 메시지 표시
  displayResult(correctCount, totalCount);

  // 콘솔에 상세 결과 출력 (디버깅용)
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

// 힌트 기능 (선택사항)
function showHint() {
  const hints = [
    "375 × 5를 먼저 계산해보세요.",
    "375 × 50은 375 × 5 × 10과 같습니다.",
    "461 × 3을 세로셈으로 계산해보세요.",
    "461 × 30은 461 × 3 × 10과 같습니다.",
  ];

  const randomHint = hints[Math.floor(Math.random() * hints.length)];
  alert(`💡 힌트: ${randomHint}`);
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
      case "h":
        e.preventDefault();
        showHint();
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
