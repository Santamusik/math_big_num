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

// 학습 데이터 저장소 (메모리 기반 - 나중에 DB로 업그레이드 가능)
const studentsData = new Map();

// 학급 코드 저장소 (코드 -> 학급 정보 매핑)
const classCodes = new Map();

// 학생 ID 생성 함수 (학교-학년-반-번호 기반)
function generateStudentId(schoolName, grade, classNumber, studentNumber) {
  const schoolCode = schoolName.slice(0, 2);
  const timestamp = Date.now().toString().slice(-6);
  return `${schoolCode}${grade}${classNumber
    .toString()
    .padStart(2, "0")}${studentNumber
    .toString()
    .padStart(2, "0")}_${timestamp}`;
}

// 전체 학생 ID 생성 (기존 방식 - 호환성용)
function generateSimpleStudentId() {
  return (
    "student_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)
  );
}

// 새로운 학생 등록 (학교 정보 포함)
app.post("/api/student/register", (req, res) => {
  try {
    const { schoolName, grade, classNumber, studentNumber, studentName } =
      req.body;

    // 필수 정보 확인
    if (
      !schoolName ||
      !grade ||
      !classNumber ||
      !studentNumber ||
      !studentName
    ) {
      return res.status(400).json({
        success: false,
        error: "모든 정보를 입력해주세요.",
      });
    }

    // 중복 학생 확인 (같은 학교, 학년, 반, 번호)
    for (const [id, student] of studentsData) {
      if (
        student.schoolName === schoolName &&
        student.grade === grade &&
        student.classNumber === classNumber &&
        student.studentNumber === studentNumber
      ) {
        return res.status(409).json({
          success: false,
          error: "이미 등록된 학생입니다.",
          existingStudent: {
            id: student.id,
            name: student.studentName,
          },
        });
      }
    }

    // 새 학생 ID 생성
    const newStudentId = generateStudentId(
      schoolName,
      grade,
      classNumber,
      studentNumber
    );

    const studentData = {
      id: newStudentId,
      schoolName: schoolName,
      grade: grade,
      classNumber: classNumber,
      studentNumber: studentNumber,
      studentName: studentName,
      createdAt: new Date().toISOString(),
      completedPages: [],
      scores: {},
      totalStudyTime: 0,
      lastAccess: new Date().toISOString(),
    };

    studentsData.set(newStudentId, studentData);

    res.json({
      success: true,
      student: studentData,
    });
  } catch (error) {
    console.error("학생 등록 오류:", error);
    res.status(500).json({
      success: false,
      error: "학생 등록 중 오류가 발생했습니다.",
    });
  }
});

// 학급 코드로 학생 등록
app.post("/api/student/register-with-code", (req, res) => {
  try {
    const { classCode, studentName, studentNumber } = req.body;

    if (!classCode || !studentName || !studentNumber) {
      return res.status(400).json({
        success: false,
        error: "모든 정보를 입력해주세요.",
      });
    }

    // 유효한 학급 코드인지 확인
    if (!classCodes.has(classCode)) {
      return res.status(404).json({
        success: false,
        error: "유효하지 않은 학급 코드입니다.",
      });
    }

    const classInfo = classCodes.get(classCode);

    // 중복 학생 확인 (같은 학급, 같은 학번)
    for (const [id, student] of studentsData) {
      if (
        student.schoolName === classInfo.schoolName &&
        student.grade === classInfo.grade &&
        student.classNumber === classInfo.classNumber &&
        student.studentNumber === studentNumber
      ) {
        return res.status(409).json({
          success: false,
          error: "이미 등록된 학번입니다.",
        });
      }
    }

    // 새 학생 ID 생성
    const newStudentId = generateStudentId(
      classInfo.schoolName,
      classInfo.grade,
      classInfo.classNumber,
      studentNumber
    );

    const studentData = {
      id: newStudentId,
      schoolName: classInfo.schoolName,
      grade: classInfo.grade,
      classNumber: classInfo.classNumber,
      studentNumber: studentNumber,
      studentName: studentName,
      createdAt: new Date().toISOString(),
      completedPages: [],
      scores: {},
      totalStudyTime: 0,
      lastAccess: new Date().toISOString(),
    };

    studentsData.set(newStudentId, studentData);

    res.json({
      success: true,
      student: studentData,
    });
  } catch (error) {
    console.error("학급 코드 등록 오류:", error);
    res.status(500).json({
      success: false,
      error: "등록 중 오류가 발생했습니다.",
    });
  }
});

// 학급 코드 + 이름으로 학생 검색 (개선된 방식)
app.post("/api/student/search-by-class", (req, res) => {
  try {
    const { classCode, studentName } = req.body;

    if (!classCode || !studentName) {
      return res.status(400).json({
        success: false,
        error: "학급 코드와 학생 이름을 모두 입력해주세요.",
      });
    }

    // 유효한 학급 코드인지 확인
    if (!classCodes.has(classCode)) {
      return res.status(404).json({
        success: false,
        error: "유효하지 않은 학급 코드입니다.",
      });
    }

    const classInfo = classCodes.get(classCode);

    // 해당 학급 내에서만 이름으로 학생 검색
    const matchingStudents = [];
    for (const [id, student] of studentsData) {
      if (
        student.schoolName === classInfo.schoolName &&
        student.grade === classInfo.grade &&
        student.classNumber === classInfo.classNumber &&
        student.studentName &&
        student.studentName.includes(studentName)
      ) {
        matchingStudents.push(student);
      }
    }

    res.json({
      success: true,
      students: matchingStudents,
      classInfo: classInfo, // 학급 정보도 함께 반환
    });
  } catch (error) {
    console.error("학급별 학생 검색 오류:", error);
    res.status(500).json({
      success: false,
      error: "학생 검색 중 오류가 발생했습니다.",
    });
  }
});

// 이름으로 학생 검색 (기존 방식 - 호환성용)
app.post("/api/student/search", (req, res) => {
  try {
    const { studentName } = req.body;

    if (!studentName) {
      return res.status(400).json({
        success: false,
        error: "학생 이름을 입력해주세요.",
      });
    }

    // 이름으로 학생 검색 (부분 일치)
    const matchingStudents = [];
    for (const [id, student] of studentsData) {
      if (student.studentName && student.studentName.includes(studentName)) {
        matchingStudents.push(student);
      }
    }

    res.json({
      success: true,
      students: matchingStudents,
    });
  } catch (error) {
    console.error("학생 검색 오류:", error);
    res.status(500).json({
      success: false,
      error: "학생 검색 중 오류가 발생했습니다.",
    });
  }
});

// 기존 학생 정보 가져오기 (호환성용)
app.post("/api/student", (req, res) => {
  try {
    const { studentId, studentName } = req.body;

    if (studentId && studentsData.has(studentId)) {
      // 기존 학생 정보 반환
      res.json({
        success: true,
        student: studentsData.get(studentId),
      });
    } else {
      // 새 학생 생성 (기존 방식 - 호환성용)
      const newStudentId = generateSimpleStudentId();
      const studentData = {
        id: newStudentId,
        studentName: studentName || "익명 학생",
        createdAt: new Date().toISOString(),
        completedPages: [],
        scores: {},
        totalStudyTime: 0,
        lastAccess: new Date().toISOString(),
      };

      studentsData.set(newStudentId, studentData);

      res.json({
        success: true,
        student: studentData,
      });
    }
  } catch (error) {
    console.error("학생 등록 오류:", error);
    res.status(500).json({
      success: false,
      error: "학생 등록 중 오류가 발생했습니다.",
    });
  }
});

// 학습 진도 저장
app.post("/api/progress", (req, res) => {
  try {
    const { studentId, pageId, scores, studyTime } = req.body;

    if (!studentsData.has(studentId)) {
      return res.status(404).json({
        success: false,
        error: "학생을 찾을 수 없습니다.",
      });
    }

    const student = studentsData.get(studentId);

    // 페이지 완료 표시
    if (!student.completedPages.includes(pageId)) {
      student.completedPages.push(pageId);
    }

    // 점수 저장
    if (scores) {
      student.scores[`page${pageId}`] = scores;
    }

    // 학습 시간 누적
    if (studyTime) {
      student.totalStudyTime += studyTime;
    }

    // 마지막 접속 시간 업데이트
    student.lastAccess = new Date().toISOString();

    studentsData.set(studentId, student);

    res.json({
      success: true,
      student: student,
    });
  } catch (error) {
    console.error("진도 저장 오류:", error);
    res.status(500).json({
      success: false,
      error: "진도 저장 중 오류가 발생했습니다.",
    });
  }
});

// 학습 데이터 조회
app.get("/api/progress/:studentId", (req, res) => {
  try {
    const { studentId } = req.params;

    if (!studentsData.has(studentId)) {
      return res.status(404).json({
        success: false,
        error: "학생을 찾을 수 없습니다.",
      });
    }

    const student = studentsData.get(studentId);
    student.lastAccess = new Date().toISOString();
    studentsData.set(studentId, student);

    res.json({
      success: true,
      student: student,
    });
  } catch (error) {
    console.error("데이터 조회 오류:", error);
    res.status(500).json({
      success: false,
      error: "데이터 조회 중 오류가 발생했습니다.",
    });
  }
});

// OpenAI 설정
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 관리자 기능 - 학급 현황 조회
app.post("/api/admin/class-stats", (req, res) => {
  try {
    const { schoolName, grade, classNumber } = req.body;

    if (!schoolName || !grade || !classNumber) {
      return res.status(400).json({
        success: false,
        error: "학급 정보를 모두 입력해주세요.",
      });
    }

    // 해당 학급 학생들 필터링
    const classStudents = [];
    for (const [id, student] of studentsData) {
      if (
        student.schoolName === schoolName &&
        student.grade === grade &&
        student.classNumber === classNumber
      ) {
        classStudents.push(student);
      }
    }

    // 통계 계산
    const totalStudents = classStudents.length;
    const completedStudents = classStudents.filter(
      (s) => s.completedPages.length === 7
    ).length;
    const totalProgress = classStudents.reduce(
      (sum, s) => sum + s.completedPages.length,
      0
    );
    const averageProgress =
      totalStudents > 0
        ? Math.round((totalProgress / (totalStudents * 7)) * 100)
        : 0;

    // 학번순 정렬
    classStudents.sort((a, b) => a.studentNumber - b.studentNumber);

    res.json({
      success: true,
      stats: {
        totalStudents,
        completedStudents,
        averageProgress,
      },
      students: classStudents,
    });
  } catch (error) {
    console.error("학급 현황 조회 오류:", error);
    res.status(500).json({
      success: false,
      error: "현황 조회 중 오류가 발생했습니다.",
    });
  }
});

// 관리자 기능 - 학급 코드 생성 API
app.post("/api/admin/create-class-code", (req, res) => {
  try {
    const { classCode, schoolName, grade, classNumber } = req.body;

    if (!classCode || !schoolName || !grade || !classNumber) {
      return res.status(400).json({
        success: false,
        error: "모든 정보를 입력해주세요.",
      });
    }

    // 학급 코드 저장
    classCodes.set(classCode, {
      schoolName,
      grade,
      classNumber,
      createdAt: new Date().toISOString(),
    });

    console.log(
      `새 학급 코드 생성: ${classCode} (${schoolName} ${grade}학년 ${classNumber}반)`
    );

    res.json({
      success: true,
      message: "학급 코드가 생성되었습니다.",
      classCode: classCode,
    });
  } catch (error) {
    console.error("학급 코드 생성 오류:", error);
    res.status(500).json({
      success: false,
      error: "학급 코드 생성 중 오류가 발생했습니다.",
    });
  }
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
