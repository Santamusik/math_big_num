const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");
require("dotenv").config({ path: "key.env" });

const app = express();
const port = 3000;

// CORS 설정
app.use(
  cors({
    origin: ["http://localhost:8080", "http://127.0.0.1:8080", "file://"],
    credentials: true,
  })
);

app.use(express.json());

// 정적 파일 서빙 (HTML, CSS, JS 파일들)
app.use(express.static("."));

// OpenAI 설정
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// AI 피드백 엔드포인트
app.post("/chat", async (req, res) => {
  try {
    const { question, correctAnswer, studentAnswer } = req.body;

    const prompt = `
문제: ${question}
정답: ${correctAnswer}  
학생의 답: ${studentAnswer}

먼저 학생의 답이 정답과 일치하는지 정확히 판단해주세요.

만약 정답이면:
- "정답이에요!" 또는 "맞았어요!"로 시작
- 어떤 규칙이나 패턴을 잘 찾았는지 칭찬
- 다음 단계로의 격려 메시지

만약 틀렸다면:  
- "다시 한번 생각해볼까요?" 또는 "거의 다 왔어요!"로 시작
- 정답을 직접 알려주지 말고, 힌트나 유도 질문 제공
- 예: "어떤 규칙으로 숫자가 변하는지 살펴보세요", "앞의 숫자들 사이의 차이를 계산해보세요"
- 학습자가 스스로 답을 찾을 수 있도록 사고의 방향 제시

절대 정답을 직접 말하지 말고, 초등학생이 스스로 발견할 수 있도록 친근한 힌트를 주세요. "~해보세요", "~를 살펴보세요" 같은 유도 질문으로 2-3문장 작성해주세요.
`;

    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "당신은 초등학생을 위한 친근한 수학 선생님입니다. 학생이 어떤 부분을 어려워하는지 파악하고, 쉽고 부드러운 말투로 도움을 줍니다. '~네요', '~해보세요' 같은 친근한 표현을 사용하며, 어려운 용어보다는 초등학생이 이해하기 쉬운 말로 설명합니다.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "gpt-4o",
      max_tokens: 150,
      temperature: 0.7,
    });

    const feedback = completion.choices[0].message.content;

    res.json({
      success: true,
      reply: feedback,
    });
  } catch (error) {
    console.error("OpenAI API 오류:", error);
    res.status(500).json({
      success: false,
      error: "AI 피드백을 생성하는 중 오류가 발생했습니다.",
    });
  }
});

app.listen(port, () => {
  console.log(`서버가 http://localhost:${port}에서 실행 중입니다.`);
});
