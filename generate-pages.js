const fs = require("fs");

// 페이지 데이터
const pages = [
  {
    id: 2,
    title: "곱셈 연습 2",
    progress: "28.6%",
    num1: "284",
    op1: "6",
    num2: "284",
    op2: "60",
    vert1: "352",
    vertOp1: "4",
    vert2: "352",
    vertOp2: "40",
    prev: "page1.html",
    next: "page3.html",
  },
  {
    id: 3,
    title: "곱셈 연습 3",
    progress: "42.9%",
    num1: "196",
    op1: "7",
    num2: "196",
    op2: "70",
    vert1: "273",
    vertOp1: "5",
    vert2: "273",
    vertOp2: "50",
    prev: "page2.html",
    next: "page4.html",
  },
  {
    id: 4,
    title: "곱셈 연습 4",
    progress: "57.1%",
    num1: "428",
    op1: "3",
    num2: "428",
    op2: "30",
    vert1: "567",
    vertOp1: "2",
    vert2: "567",
    vertOp2: "20",
    prev: "page3.html",
    next: "page5.html",
  },
  {
    id: 5,
    title: "곱셈 연습 5",
    progress: "71.4%",
    num1: "315",
    op1: "8",
    num2: "315",
    op2: "80",
    vert1: "492",
    vertOp1: "6",
    vert2: "492",
    vertOp2: "60",
    prev: "page4.html",
    next: "page6.html",
  },
  {
    id: 6,
    title: "곱셈 연습 6",
    progress: "85.7%",
    num1: "638",
    op1: "4",
    num2: "638",
    op2: "40",
    vert1: "729",
    vertOp1: "3",
    vert2: "729",
    vertOp2: "30",
    prev: "page5.html",
    next: "page7.html",
  },
  {
    id: 7,
    title: "곱셈 연습 7",
    progress: "100%",
    num1: "856",
    op1: "5",
    num2: "856",
    op2: "50",
    vert1: "943",
    vertOp1: "7",
    vert2: "943",
    vertOp2: "70",
    prev: "page6.html",
    next: null,
  },
];

// HTML 템플릿 생성 함수
function generatePageHTML(pageData) {
  const nextButton = pageData.next
    ? `<a href="${pageData.next}" class="nav-button">다음 ➡️</a>`
    : `<span class="nav-button disabled">완료! 🎉</span>`;

  return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${pageData.title} - 수학 학습</title>
    <link rel="stylesheet" href="style.css" />
</head>
<body>
    <div class="container">
        <!-- 네비게이션 -->
        <div class="navigation">
            <a href="${pageData.prev}" class="nav-button">⬅️ 이전</a>
            <a href="index.html" class="nav-button home-button">🏠 홈으로</a>
            <div class="page-info">
                <div>${pageData.title}</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${pageData.progress}"></div>
                </div>
                <small>${pageData.id} / 7</small>
            </div>
            ${nextButton}
        </div>

        <h1>${pageData.title}</h1>
        
        <div class="problem-section">
            <div class="problem-number">${pageData.id}</div>
            <div class="instruction">안에 알맞은 수를 써넣으세요.</div>
            
            <div class="math-problem">
                <div class="equation-row">
                    <span class="number">${pageData.num1}</span>
                    <span class="operator">×</span>
                    <span class="number">${pageData.op1}</span>
                    <span class="equals">=</span>
                    <input type="text" class="answer-input" id="answer1" maxlength="4" />
                </div>
                
                <div class="arrow">↓</div>
                
                <div class="equation-row">
                    <span class="number">${pageData.num2}</span>
                    <span class="operator">×</span>
                    <span class="number">${pageData.op2}</span>
                    <span class="equals">=</span>
                    <input type="text" class="answer-input" id="answer2" maxlength="5" />
                </div>
            </div>
            
            <div class="vertical-multiplication">
                <div class="multiplication-problem">
                    <div class="multiplicand">
                        <span>${pageData.vert1[0]}</span>
                        <span>${pageData.vert1[1]}</span>
                        <span>${pageData.vert1[2]}</span>
                    </div>
                    <div class="multiplier">
                        <span>×</span>
                        <span class="multiplier-digit">${pageData.vertOp1}</span>
                    </div>
                    <div class="line"></div>
                    <div class="result">
                        <input type="text" class="digit-input" id="digit1" maxlength="1" />
                        <input type="text" class="digit-input" id="digit2" maxlength="1" />
                        <input type="text" class="digit-input" id="digit3" maxlength="1" />
                        <input type="text" class="digit-input" id="digit4" maxlength="1" />
                    </div>
                </div>
                
                <div class="arrow-right">→</div>
                
                <div class="multiplication-problem">
                    <div class="multiplicand">
                        <span>${pageData.vert2[0]}</span>
                        <span>${pageData.vert2[1]}</span>
                        <span>${pageData.vert2[2]}</span>
                    </div>
                    <div class="multiplier">
                        <span>×</span>
                        <span class="multiplier-digit">${pageData.vertOp2[0]}</span>
                        <span class="multiplier-digit">${pageData.vertOp2[1]}</span>
                    </div>
                    <div class="line"></div>
                    <div class="result">
                        <input type="text" class="digit-input" id="digit5" maxlength="1" />
                        <input type="text" class="digit-input" id="digit6" maxlength="1" />
                        <input type="text" class="digit-input" id="digit7" maxlength="1" />
                        <input type="text" class="digit-input" id="digit8" maxlength="1" />
                        <input type="text" class="digit-input" id="digit9" maxlength="1" />
                    </div>
                </div>
            </div>
            
            <div class="button-container">
                <button id="checkAnswer" class="check-button">정답 확인</button>
                <button id="resetAnswer" class="reset-button">다시 풀기</button>
            </div>
            
            <div id="result" class="result-message"></div>
        </div>
    </div>
    
    <script src="config.js"></script>
    <script src="page-script.js"></script>
</body>
</html>`;
}

// 페이지 생성
pages.forEach((pageData) => {
  const html = generatePageHTML(pageData);
  const filename = `page${pageData.id}.html`;

  fs.writeFileSync(filename, html, "utf8");
  console.log(`${filename} 생성 완료`);
});

console.log("모든 페이지 생성 완료!");
