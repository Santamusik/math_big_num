const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");
const path = require("path");
const fs = require("fs"); // [추가 기능] 학교 데이터 파일 로드
const crypto = require("crypto"); // [추가 기능] QR 서명 및 세션 토큰 생성
const QRCode = require("qrcode"); // [추가 기능] QR PNG 생성
require("dotenv").config({ path: "key.env" });

const app = express();
const isProduction = process.env.NODE_ENV === "production";
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const sensitivePattern =
  /(eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}|sk-[A-Za-z0-9_-]{20,}|Bearer\s+[A-Za-z0-9._-]{20,}|password["']?\s*[:=]\s*["']?[^"',}\s]+|pin["']?\s*[:=]\s*["']?\d{4,})/gi;

function redactLogValue(value) {
  if (typeof value === "string") return value.replace(sensitivePattern, "[redacted]");
  if (!value || typeof value !== "object") return value;
  try {
    return JSON.stringify(value).replace(sensitivePattern, "[redacted]");
  } catch (_error) {
    return "[unserializable]";
  }
}

function safeCompare(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

const originalConsoleError = console.error.bind(console);
const originalConsoleWarn = console.warn.bind(console);
const originalConsoleLog = console.log.bind(console);
console.error = (...args) => originalConsoleError(...args.map(redactLogValue));
console.warn = (...args) => originalConsoleWarn(...args.map(redactLogValue));
if (isProduction) {
  console.log = () => {};
  console.debug = () => {};
} else {
  console.log = (...args) => originalConsoleLog(...args.map(redactLogValue));
}

app.disable("x-powered-by");
app.set("trust proxy", 1);

// Railway V2 호환성을 위한 포트/호스트 설정 (강제 0.0.0.0)
const port = parseInt(process.env.PORT) || 3000;
const host = "0.0.0.0"; // Railway는 반드시 0.0.0.0에 바인딩해야 함

console.log(`🚀 Starting server...`);
console.log(`📍 Environment: ${process.env.NODE_ENV || "development"}`);
console.log(
  `🌐 Railway Static URL: ${process.env.RAILWAY_STATIC_URL || "not set"}`
);
console.log(`🔧 Host: ${host}, Port: ${port}`);

// CORS 설정 - Railway 환경을 위한 더 관대한 설정
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Blocked by CORS policy"));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "32kb" }));

// CORS 설정 (유니티에서 API 접근 가능하도록)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
    if (origin) res.header("Access-Control-Allow-Origin", origin);
  }
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Vary", "Origin");
  res.header("X-Content-Type-Options", "nosniff");
  res.header("Referrer-Policy", "strict-origin-when-cross-origin");
  res.header("X-Frame-Options", "SAMEORIGIN");
  res.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (req.secure || req.headers["x-forwarded-proto"] === "https") {
    res.header("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }

  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

// 정적 파일 서빙 (HTML, CSS, JS 파일들)
// 실행 디렉터리 변화에 영향을 받지 않도록 절대경로 기반으로 서빙
const rateLimitBuckets = new Map();
function rateLimit(scope, limit, windowMs) {
  return (req, res, next) => {
    const now = Date.now();
    const key = `${scope}:${req.ip}`;
    const bucket = rateLimitBuckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    bucket.count += 1;
    if (bucket.count > limit) {
      return res
        .status(429)
        .set("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)))
        .json({ success: false, error: "Too many requests. Please try again later." });
    }

    next();
  };
}
app.use(express.static(path.join(__dirname)));

// [추가 기능] 간단한 쿠키 파서 및 관리자 세션 관리
const adminSessions = new Map(); // sessionId -> { expiresAt }
function parseCookies(cookieHeader) {
  const list = {};
  if (!cookieHeader) return list;
  cookieHeader.split(";").forEach(function (cookie) {
    const parts = cookie.split("=");
    const key = parts.shift().trim();
    const value = decodeURIComponent(parts.join("="));
    list[key] = value;
  });
  return list;
}
// [개선된 인증] 교사별 개별 인증 + 기존 글로벌 관리자 인증 병행
const teacherSessions = new Map(); // classCode -> { pin, sessionId, expiresAt }

function isAdminAuthenticated(req) {
  const cookies = parseCookies(req.headers.cookie || "");
  const sessionId = cookies["admin_session"];
  if (!sessionId) return false;
  const session = adminSessions.get(sessionId);
  if (!session) return false;
  if (session.expiresAt < Date.now()) {
    adminSessions.delete(sessionId);
    return false;
  }
  return true;
}

function isTeacherAuthenticated(req) {
  const { classCode, pin } = req.body || req.query;
  if (!classCode || !pin) return false;

  const teacherSession = teacherSessions.get(classCode);
  if (!teacherSession || !safeCompare(teacherSession.pin, pin)) return false;

  // 세션 만료 확인 (24시간)
  if (teacherSession.expiresAt < Date.now()) {
    teacherSessions.delete(classCode);
    return false;
  }

  return true;
}

function requireAdminAuth(req, res) {
  // 1순위: 교사 인증 확인
  if (isTeacherAuthenticated(req)) {
    return null; // 통과
  }

  // 2순위: 글로벌 관리자 인증 확인 (백업용)
  if (isAdminAuthenticated(req)) {
    return null; // 통과
  }

  return res.status(401).json({
    success: false,
    error: "인증이 필요합니다. 학급 코드와 PIN을 확인해주세요.",
  });
}

// Railway V2 호환 헬스체크 (즉시 응답)
app.get("/healthz", (req, res) => {
  console.log(
    `🏥 Health check requested from ${req.ip || req.connection.remoteAddress}`
  );
  res.status(200).type("text/plain").send("OK");
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    port: port,
    host: host,
  });
});

app.get("/ping", (req, res) => {
  res.status(200).type("text/plain").send("pong");
});

// [추가 기능] 전국 학교 데이터 로딩/가공 (초등학교만)
let schoolsMapCache = null; // 캐시 초기화 // [{ region_code, region_name, schools: [{school_code, school_name}] }]
function normalizeRegionName(name) {
  if (!name) return "기타";
  return name
    .replace("특별시", "")
    .replace("광역시", "")
    .replace("특별자치시", "")
    .replace("특별자치도", "")
    .replace("자치도", "")
    .replace("도", "")
    .trim();
}
function buildMapFromArray(rows) {
  const byRegion = new Map();
  for (const row of rows) {
    const level = row["학교급구분"] || row["학교급"] || "";
    if (!String(level).includes("초등")) continue;
    const code =
      row["표준학교코드"] || row["학교ID"] || row["학교코드"] || null;
    const name = row["학교명"] || row["학교명칭"] || row["school_name"] || null;
    if (!name) continue;
    let region = row["시도교육청명"] || row["시도명"] || row["지역"] || null;
    if (!region) {
      const addr = row["소재지도로명주소"] || row["주소"] || "";
      region = addr.split(" ")[0];
    }
    const regionName = normalizeRegionName(region);
    if (!byRegion.has(regionName)) byRegion.set(regionName, new Map());
    const schools = byRegion.get(regionName);
    const schoolCode = code || `${regionName}-${name}`;
    schools.set(schoolCode, name);
  }
  // to array
  const result = [];
  for (const [regionName, schools] of byRegion) {
    const list = Array.from(schools.entries())
      .map(([school_code, school_name]) => ({ school_code, school_name }))
      .sort((a, b) => a.school_name.localeCompare(b.school_name, "ko"));
    result.push({
      region_code: regionName,
      region_name: regionName,
      schools: list,
    });
  }
  result.sort((a, b) => a.region_name.localeCompare(b.region_name, "ko"));
  return result;
}

// 가공된 데이터 형식 {"지역": ["학교1", "학교2"]} 을 표준 형식으로 변환
function buildMapFromProcessedData(processedData) {
  const result = [];
  const regionMapping = {
    서울: "서울특별시",
    부산: "부산광역시",
    대구: "대구광역시",
    인천: "인천광역시",
    광주: "광주광역시",
    대전: "대전광역시",
    울산: "울산광역시",
    세종: "세종특별자치시",
    경기: "경기도",
    강원: "강원특별자치도",
    충북: "충청북도",
    충남: "충청남도",
    전북: "전북특별자치도",
    전남: "전라남도",
    경북: "경상북도",
    경남: "경상남도",
    제주: "제주특별자치도",
  };

  for (const [regionCode, schoolNames] of Object.entries(processedData)) {
    const regionName = regionMapping[regionCode] || regionCode;
    const schools = schoolNames.map((schoolName, index) => {
      // 학교 코드 자동 생성 (지역코드 2자리 + 순번)
      const codePrefix = regionCode.slice(0, 2).toUpperCase();
      const schoolCode = `${codePrefix}-${String(index + 1).padStart(4, "0")}`;
      return {
        school_code: schoolCode,
        school_name: schoolName,
      };
    });

    result.push({
      region_code: regionCode,
      region_name: regionName,
      schools: schools,
    });
  }

  // 지역명으로 정렬
  result.sort((a, b) => a.region_name.localeCompare(b.region_name, "ko"));
  return result;
}

function loadSchoolsMap() {
  if (schoolsMapCache) {
    console.log("캐시된 학교 데이터 사용");
    return schoolsMapCache;
  }
  console.log("학교 데이터 로드 시작...");
  // 우선순위: 1) 가공된 파일 2) 전국 원본 파일 3) 샘플 파일
  // 환경변수 SCHOOLS_SOURCE로 강제 가능: \"processed\" | \"national\" | \"sample\"
  const prefer = (process.env.SCHOOLS_SOURCE || "").toLowerCase();

  // 1) 가공된 파일 시도 (최우선) - schools_processed.json
  try {
    if (prefer === "processed" || prefer === "") {
      const processedPath = path.join(
        __dirname,
        "data",
        "schools_processed.json"
      );
      if (fs.existsSync(processedPath)) {
        console.log(`가공된 학교 데이터 로드 시도: ${processedPath}`);
        const txt = fs.readFileSync(processedPath, "utf8");
        const parsed = JSON.parse(txt);

        // 새로운 형식: {"서울": ["학교1", "학교2"], "부산": [...]}
        if (typeof parsed === "object" && !Array.isArray(parsed)) {
          console.log(
            `가공된 학교 데이터 로드 성공: ${Object.keys(parsed).length}개 지역`
          );
          schoolsMapCache = buildMapFromProcessedData(parsed);
          console.log(`변환된 지역 수: ${schoolsMapCache.length}`);
          return schoolsMapCache;
        }
      }
    }
  } catch (e) {
    console.error("가공된 학교 데이터 파싱 실패:", e);
  }

  // 2) 전국 원본 파일 시도 (기존 로직 유지)
  try {
    if (prefer === "national" || prefer === "") {
      const altName = "전국초중등학교위치표준데이터.json";
      const paths = [
        path.join(__dirname, altName), // 루트
        path.join(__dirname, "data", altName), // data 폴더
      ];

      for (const altPath of paths) {
        if (fs.existsSync(altPath)) {
          console.log(`전국 학교 데이터 로드 시도: ${altPath}`);
          const txt = fs.readFileSync(altPath, "utf8");
          const parsed = JSON.parse(txt); // 대용량일 수 있음
          if (Array.isArray(parsed)) {
            console.log(
              `전국 학교 데이터 로드 성공: ${parsed.length}개 레코드`
            );
            schoolsMapCache = buildMapFromArray(parsed);
            return schoolsMapCache;
          } else if (parsed && Array.isArray(parsed.data)) {
            console.log(
              `전국 학교 데이터 로드 성공: ${parsed.data.length}개 레코드`
            );
            schoolsMapCache = buildMapFromArray(parsed.data);
            return schoolsMapCache;
          } else if (parsed && Array.isArray(parsed.records)) {
            console.log(
              `전국 학교 데이터 로드 성공: ${parsed.records.length}개 레코드`
            );
            console.log(
              "첫 번째 레코드 샘플:",
              JSON.stringify(parsed.records[0], null, 2)
            );
            schoolsMapCache = buildMapFromArray(parsed.records);
            console.log(`가공된 지역 수: ${schoolsMapCache.length}`);
            return schoolsMapCache;
          }
        }
      }
    }
  } catch (e) {
    console.error("전국 학교 데이터 파싱 실패:", e);
  }

  // 3) 샘플 파일 시도
  try {
    if (prefer === "sample" || prefer === "") {
      const jsonPath = path.join(__dirname, "data", "schools.json");
      if (fs.existsSync(jsonPath)) {
        const txt = fs.readFileSync(jsonPath, "utf8");
        const parsed = JSON.parse(txt);
        if (Array.isArray(parsed)) {
          schoolsMapCache = parsed;
          return schoolsMapCache;
        }
      }
    }
  } catch (e) {
    console.warn("data/schools.json 로드 실패, 대체 파일 사용 시도", e.message);
  }
  // fallback 샘플
  schoolsMapCache = [
    {
      region_code: "서울",
      region_name: "서울",
      schools: [
        { school_code: "SE-0001", school_name: "서울숲초등학교" },
        { school_code: "SE-0002", school_name: "서울초등학교" },
      ],
    },
  ];
  return schoolsMapCache;
}
function listAllSchoolNames() {
  const map = loadSchoolsMap();
  const names = [];
  map.forEach((r) => r.schools.forEach((s) => names.push(s.school_name)));
  return names;
}

// 최적화된 학교 검색을 위한 함수 (schools_processed.json 활용)
function searchSchoolsOptimized(query) {
  const map = loadSchoolsMap();
  const results = [];

  if (!query || query.length < 1) return results;

  const searchTerm = query.toLowerCase();

  map.forEach((region) => {
    region.schools.forEach((school) => {
      if (school.school_name.toLowerCase().includes(searchTerm)) {
        results.push({
          school_name: school.school_name,
          school_code: school.school_code,
          region_name: region.region_name,
          region_code: region.region_code,
        });
      }
    });
  });

  // 정확히 일치하는 것을 먼저, 그 다음 포함하는 것 순으로 정렬
  results.sort((a, b) => {
    const aExact = a.school_name.toLowerCase() === searchTerm;
    const bExact = b.school_name.toLowerCase() === searchTerm;
    const aStarts = a.school_name.toLowerCase().startsWith(searchTerm);
    const bStarts = b.school_name.toLowerCase().startsWith(searchTerm);

    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;

    return a.school_name.localeCompare(b.school_name, "ko");
  });

  return results.slice(0, 20); // 최대 20개 결과
}

// [추가 기능] 가공된 지역/학교 맵 공개 API (학생 등록용)
app.get("/api/schools-map", (req, res) => {
  try {
    const map = loadSchoolsMap();
    res.json({ success: true, regions: map });
  } catch (e) {
    res.status(500).json({ success: false, error: "학교 데이터 로드 실패" });
  }
});

// [개선된 기능] 학교명 최적화 검색 (인증 필요)
app.get("/api/admin/schools", (req, res) => {
  const authCheck = requireAdminAuth(req, res);
  if (authCheck) return;
  try {
    const q = (req.query.q || "").toString().trim();
    if (!q) return res.json({ success: true, schools: [] });

    const results = searchSchoolsOptimized(q);
    const schoolNames = results.map((r) => r.school_name);

    res.json({ success: true, schools: schoolNames });
  } catch (e) {
    console.error("학교 검색 오류:", e);
    res.status(500).json({ success: false, error: "검색 오류" });
  }
});

// [개선된 기능] 공개 학교 최적화 검색 (학생 등록용, 인증 불필요)
app.get("/api/schools", (req, res) => {
  try {
    const q = (req.query.q || "").toString().trim();
    if (!q) return res.json({ success: true, schools: [] });

    const results = searchSchoolsOptimized(q);
    const schoolNames = results.map((r) => r.school_name);

    res.json({ success: true, schools: schoolNames });
  } catch (e) {
    console.error("공개 학교 검색 오류:", e);
    res.status(500).json({ success: false, error: "검색 오류" });
  }
});

// 루트 요청은 명시적으로 index.html 반환 (정적 서빙 보강)
app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// 학습 데이터 저장소 (메모리 기반 - 나중에 DB로 업그레이드 가능)
const studentsData = new Map();

// 학급 코드 저장소 (코드 -> 학급 정보 매핑)
const classCodes = new Map();

// [추가 기능] QR 토큰 저장소
const qrTokens = new Map(); // token -> { classCode, exp }

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

// 세션 ID 생성 함수
function generateSessionId() {
  return crypto.randomBytes(24).toString("hex");
}

// 전체 학생 ID 생성 (기존 방식 - 호환성용)
function generateSimpleStudentId() {
  return (
    "student_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)
  );
}

function issueStudentAccessToken(student) {
  const accessToken = crypto.randomBytes(32).toString("base64url");
  student.accessTokenHash = crypto
    .createHash("sha256")
    .update(accessToken)
    .digest("hex");
  return accessToken;
}

function getRequestAccessToken(req) {
  const authHeader = req.headers.authorization || "";
  if (authHeader.startsWith("Bearer ")) return authHeader.slice(7);
  return req.headers["x-student-token"] || "";
}

function verifyStudentAccess(req, student) {
  const token = getRequestAccessToken(req);
  if (!token || !student.accessTokenHash) return false;
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(tokenHash, "hex"),
    Buffer.from(student.accessTokenHash, "hex")
  );
}

function sanitizeStudent(student) {
  const { accessTokenHash, ...safeStudent } = student;
  return safeStudent;
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

    const accessToken = issueStudentAccessToken(studentData);
    studentsData.set(newStudentId, studentData);

    res.json({
      success: true,
      student: sanitizeStudent(studentData),
      accessToken,
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

    const accessToken = issueStudentAccessToken(studentData);
    studentsData.set(newStudentId, studentData);

    res.json({
      success: true,
      student: sanitizeStudent(studentData),
      accessToken,
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

    const loginStudents = matchingStudents.map((student) => ({
      ...sanitizeStudent(student),
      accessToken: issueStudentAccessToken(student),
    }));

    res.json({
      success: true,
      students: loginStudents,
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
  const authCheck = requireAdminAuth(req, res);
  if (authCheck) return;
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
        matchingStudents.push(sanitizeStudent(student));
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
      const student = studentsData.get(studentId);
      if (!verifyStudentAccess(req, student)) {
        return res.status(403).json({ success: false, error: "Forbidden" });
      }
      // 기존 학생 정보 반환
      res.json({
        success: true,
        student: sanitizeStudent(student),
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

      const accessToken = issueStudentAccessToken(studentData);
      studentsData.set(newStudentId, studentData);

      res.json({
        success: true,
        student: sanitizeStudent(studentData),
        accessToken,
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
    if (!verifyStudentAccess(req, student)) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

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
      student: sanitizeStudent(student),
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
    if (!verifyStudentAccess(req, student)) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }
    student.lastAccess = new Date().toISOString();
    studentsData.set(studentId, student);

    res.json({
      success: true,
      student: sanitizeStudent(student),
    });
  } catch (error) {
    console.error("진도 조회 오류:", error);
    res.status(500).json({
      success: false,
      error: "진도 조회 중 오류가 발생했습니다.",
    });
  }
});

// 디버깅용 테스트 엔드포인트
app.get("/api/progress/test", (req, res) => {
  const authCheck = requireAdminAuth(req, res);
  if (authCheck) return;
  try {
    const serverStatus = {
      success: true,
      message: "서버가 정상적으로 작동하고 있습니다.",
      timestamp: new Date().toISOString(),
      totalStudents: studentsData.size,
      totalClasses: classCodes.size,
      serverUptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
    };

    console.log("🔍 서버 상태 확인 요청:", serverStatus);
    res.json(serverStatus);
  } catch (error) {
    console.error("서버 상태 확인 오류:", error);
    res.status(500).json({
      success: false,
      error: "서버 상태 확인 중 오류가 발생했습니다.",
    });
  }
});

// 전체 학생 목록 조회 (관리용)
app.get("/api/students", (req, res) => {
  const authCheck = requireAdminAuth(req, res);
  if (authCheck) return;
  try {
    const students = Array.from(studentsData.values()).map((student) => ({
      id: student.id,
      name: student.studentName,
      school: student.schoolName,
      grade: student.grade,
      class: student.classNumber,
      number: student.studentNumber,
      completedPages: student.completedPages.length,
      totalStudyTime: student.totalStudyTime,
      lastAccess: student.lastAccess,
    }));

    res.json({
      success: true,
      students: students,
      totalCount: students.length,
    });
  } catch (error) {
    console.error("학생 목록 조회 오류:", error);
    res.status(500).json({
      success: false,
      error: "학생 목록 조회 중 오류가 발생했습니다.",
    });
  }
});

// 서버 데이터 초기화 (관리용)
app.post("/api/admin/reset", (req, res) => {
  const authCheck = requireAdminAuth(req, res); // [추가 기능] 관리자 인증
  if (authCheck) return;
  try {
    const { confirmPassword } = req.body;

    // 간단한 비밀번호 확인 (실제 운영에서는 더 보안적인 방법 사용)
    const resetPassword = process.env.ADMIN_RESET_PASS || process.env.ADMIN_PASS;
    if (!resetPassword || confirmPassword !== resetPassword) {
      return res.status(403).json({
        success: false,
        error: "비밀번호가 틀렸습니다.",
      });
    }

    // 모든 데이터 초기화
    const beforeCount = studentsData.size;
    studentsData.clear();
    classCodes.clear();

    console.log(`🗑️ 서버 데이터 초기화 완료. 삭제된 학생 수: ${beforeCount}`);

    res.json({
      success: true,
      message: "서버 데이터가 초기화되었습니다.",
      deletedStudents: beforeCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("데이터 초기화 오류:", error);
    res.status(500).json({
      success: false,
      error: "데이터 초기화 중 오류가 발생했습니다.",
    });
  }
});

// 특정 학생 삭제 (관리용)
app.delete("/api/admin/student/:studentId", (req, res) => {
  const authCheck = requireAdminAuth(req, res); // [추가 기능] 관리자 인증
  if (authCheck) return;
  try {
    const { studentId } = req.params;

    if (studentsData.has(studentId)) {
      const student = studentsData.get(studentId);
      studentsData.delete(studentId);

      console.log(`🗑️ 학생 삭제 완료: ${student.studentName} (${studentId})`);

      res.json({
        success: true,
        message: "학생이 삭제되었습니다.",
        deletedStudent: {
          id: studentId,
          name: student.studentName,
        },
      });
    } else {
      res.status(404).json({
        success: false,
        error: "학생을 찾을 수 없습니다.",
      });
    }
  } catch (error) {
    console.error("학생 삭제 오류:", error);
    res.status(500).json({
      success: false,
      error: "학생 삭제 중 오류가 발생했습니다.",
    });
  }
});

// OpenAI 설정
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const promptInjectionPattern =
  /(ignore\s+(all\s+)?previous|system\s+prompt|developer\s+message|print\s+instructions|reveal\s+(the\s+)?prompt|api\s*key|secret)/i;

function normalizeAiInput(value, maxLength = 500) {
  const text = String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  return text.slice(0, maxLength);
}

function hasPromptInjectionAttempt(...values) {
  return values.some((value) => promptInjectionPattern.test(String(value ?? "")));
}

// [추가 기능] 관리자 로그인/세션 확인
app.post("/api/admin/login", rateLimit("admin-login", 5, 15 * 60 * 1000), (req, res) => {
  try {
    const { password } = req.body || {};
    const adminPass = process.env.ADMIN_PASS;
    if (!adminPass) {
      return res
        .status(500)
        .json({ success: false, error: "서버 ADMIN_PASS 미설정" });
    }
    if (!safeCompare(password, adminPass)) {
      return res
        .status(401)
        .json({ success: false, error: "로그인 정보를 확인할 수 없습니다." });
    }
    const sessionId = crypto.randomBytes(24).toString("hex");
    adminSessions.set(sessionId, {
      expiresAt: Date.now() + 1000 * 60 * 60 * 2,
    }); // 2시간
    res.setHeader(
      "Set-Cookie",
      `admin_session=${sessionId}; HttpOnly; SameSite=Lax; Max-Age=${
        60 * 60 * 2
      }; Path=/${isProduction ? "; Secure" : ""}`
    );
    res.json({ success: true });
  } catch (error) {
    console.error("관리자 로그인 오류:", error);
    res.status(500).json({ success: false, error: "로그인 처리 중 오류" });
  }
});

// 교사 로그인 API (학급 코드 + PIN)
app.post("/api/admin/teacher-login", rateLimit("teacher-login", 10, 15 * 60 * 1000), (req, res) => {
  try {
    const { classCode, pin } = req.body;

    if (!classCode || !pin) {
      return res.status(400).json({
        success: false,
        error: "학급 코드와 PIN을 모두 입력해주세요.",
      });
    }

    const teacherSession = teacherSessions.get(classCode);
    if (!teacherSession || !safeCompare(teacherSession.pin, pin)) {
      return res.status(401).json({
        success: false,
        error: "잘못된 학급 코드 또는 PIN입니다.",
      });
    }

    // 세션 만료 확인
    if (teacherSession.expiresAt < Date.now()) {
      teacherSessions.delete(classCode);
      return res.status(401).json({
        success: false,
        error: "세션이 만료되었습니다. 학급 코드를 다시 생성해주세요.",
      });
    }

    // 세션 갱신
    teacherSession.expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24시간 연장
    teacherSession.lastAccess = new Date().toISOString();

    res.json({
      success: true,
      message: "로그인 성공",
      classInfo: {
        schoolName: teacherSession.schoolName,
        grade: teacherSession.grade,
        classNumber: teacherSession.classNumber,
      },
    });
  } catch (error) {
    console.error("교사 로그인 오류:", error);
    res
      .status(500)
      .json({ success: false, error: "로그인 처리 중 오류가 발생했습니다." });
  }
});

app.get("/api/admin/session", (req, res) => {
  const { classCode, pin } = req.query;

  // 교사 인증 확인
  if (classCode && pin) {
    const teacherSession = teacherSessions.get(classCode);
    if (
      teacherSession &&
      safeCompare(teacherSession.pin, pin) &&
      teacherSession.expiresAt > Date.now()
    ) {
      return res.json({ success: true, type: "teacher" });
    }
  }

  // 글로벌 관리자 인증 확인 (백업용)
  if (isAdminAuthenticated(req)) {
    return res.json({ success: true, type: "global" });
  }

  return res.status(401).json({ success: false });
});

// 관리자 기능 - 학급 현황 조회
app.post("/api/admin/class-stats", (req, res) => {
  const authCheck = requireAdminAuth(req, res); // [추가 기능] 관리자 인증
  if (authCheck) return;
  try {
    let { schoolName, grade, classNumber, classCode, pin } = req.body;

    // [추가 기능] classCode + pin 우선 사용
    if (classCode) {
      if (!classCodes.has(classCode)) {
        return res
          .status(404)
          .json({ success: false, error: "유효하지 않은 학급 코드입니다." });
      }
      const classInfo = classCodes.get(classCode);
      if (classInfo.pin && classInfo.pin !== pin) {
        return res
          .status(403)
          .json({ success: false, error: "학급 PIN이 올바르지 않습니다." });
      }
      schoolName = classInfo.schoolName;
      grade = classInfo.grade;
      classNumber = classInfo.classNumber;
    } else {
      if (!schoolName || !grade || !classNumber) {
        return res
          .status(400)
          .json({ success: false, error: "학급 정보를 모두 입력해주세요." });
      }
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

// PIN 변경 API
app.post("/api/admin/change-pin", (req, res) => {
  try {
    const { classCode, oldPin, newPin, teacherCode } = req.body;

    if (!classCode || !oldPin || !newPin || !teacherCode) {
      return res.status(400).json({
        success: false,
        error: "필수 정보가 누락되었습니다.",
      });
    }

    // 새 PIN 검증
    if (!/^\d{6}$/.test(newPin)) {
      return res.status(400).json({
        success: false,
        error: "PIN은 6자리 숫자여야 합니다.",
      });
    }

    // 교사 코드 검증
    const validCodes = (process.env.TEACHER_CODES || "")
      .split(",")
      .map((code) => code.trim());
    if (!validCodes.includes(teacherCode)) {
      return res.status(401).json({
        success: false,
        error: "유효하지 않은 교사 코드입니다.",
      });
    }

    // 학급 코드 존재 확인
    if (!classCodes.has(classCode)) {
      return res.status(404).json({
        success: false,
        error: "존재하지 않는 학급 코드입니다.",
      });
    }

    const classInfo = classCodes.get(classCode);

    // 기존 PIN 검증
    if (classInfo.pin !== oldPin) {
      return res.status(401).json({
        success: false,
        error: "기존 PIN이 올바르지 않습니다.",
      });
    }

    // PIN 변경
    classInfo.pin = newPin;
    classCodes.set(classCode, classInfo);

    // 교사 세션 업데이트
    if (teacherSessions.has(classCode)) {
      const teacherSession = teacherSessions.get(classCode);
      teacherSession.pin = newPin;
      teacherSessions.set(classCode, teacherSession);
    }

    console.log(`PIN 변경 완료: ${classCode} (교사: ${teacherCode})`);

    res.json({
      success: true,
      message: "PIN이 성공적으로 변경되었습니다.",
    });
  } catch (error) {
    console.error("PIN 변경 오류:", error);
    res.status(500).json({
      success: false,
      error: "PIN 변경 중 오류가 발생했습니다.",
    });
  }
});

// 교사 코드 검증 API
app.post("/api/admin/verify-teacher-code", (req, res) => {
  try {
    const { teacherCode } = req.body;

    if (!teacherCode) {
      return res.status(400).json({
        success: false,
        error: "교사 코드를 입력해주세요.",
      });
    }

    // 환경변수에서 유효한 교사 코드 목록 가져오기
    const validCodes = (process.env.TEACHER_CODES || "")
      .split(",")
      .map((code) => code.trim());

    if (!validCodes.includes(teacherCode)) {
      return res.status(401).json({
        success: false,
        error:
          "유효하지 않은 교사 코드입니다. 교육청에서 배포한 코드를 확인해주세요.",
      });
    }

    // 교사 코드에서 지역 정보 추출
    const region = teacherCode.split("_")[0];
    const regionNames = {
      SEOUL: "서울특별시",
      BUSAN: "부산광역시",
      DAEGU: "대구광역시",
      INCHEON: "인천광역시",
      GWANGJU: "광주광역시",
      DAEJEON: "대전광역시",
      ULSAN: "울산광역시",
      SEJONG: "세종특별자치시",
      GYEONGGI: "경기도",
      GANGWON: "강원특별자치도",
      CHUNGBUK: "충청북도",
      CHUNGNAM: "충청남도",
      JEONBUK: "전북특별자치도",
      JEONNAM: "전라남도",
      GYEONGBUK: "경상북도",
      GYEONGNAM: "경상남도",
      JEJU: "제주특별자치도",
    };

    res.json({
      success: true,
      message: "교사 코드 인증 성공",
      region: region,
      regionName: regionNames[region] || region,
    });
  } catch (error) {
    console.error("교사 코드 검증 오류:", error);
    res
      .status(500)
      .json({ success: false, error: "인증 처리 중 오류가 발생했습니다." });
  }
});

// 관리자 기능 - 학급 코드 생성 API (교사 세션 등록 포함)
app.post("/api/admin/create-class-code", (req, res) => {
  try {
    const { classCode, schoolName, grade, classNumber, pin, teacherCode } =
      req.body;

    if (
      !classCode ||
      !schoolName ||
      !grade ||
      !classNumber ||
      !pin ||
      !teacherCode
    ) {
      return res.status(400).json({
        success: false,
        error:
          "학급 코드, 학교명, 학년, 반, PIN, 교사 코드를 모두 입력해주세요.",
      });
    }

    // 교사 코드 검증
    const validCodes = (process.env.TEACHER_CODES || "")
      .split(",")
      .map((code) => code.trim());
    if (!validCodes.includes(teacherCode)) {
      return res.status(401).json({
        success: false,
        error: "유효하지 않은 교사 코드입니다.",
      });
    }

    // PIN 검증 (6자리 숫자)
    if (!/^\d{6}$/.test(pin)) {
      return res.status(400).json({
        success: false,
        error: "PIN은 6자리 숫자여야 합니다.",
      });
    }

    // 학급 코드 저장
    classCodes.set(classCode, {
      schoolName,
      grade,
      classNumber,
      pin: pin,
      createdAt: new Date().toISOString(),
    });

    // 교사 세션 등록 (24시간 유효)
    teacherSessions.set(classCode, {
      pin: pin,
      sessionId: generateSessionId(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24시간
      createdAt: new Date().toISOString(),
      schoolName: schoolName,
      grade: grade,
      classNumber: classNumber,
      teacherCode: teacherCode, // 교사 코드 저장
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

// [추가 기능] QR 토큰 생성 API
app.post("/api/admin/qr-token", (req, res) => {
  const authCheck = requireAdminAuth(req, res);
  if (authCheck) return;
  try {
    const { classCode, pin, expiresInSec } = req.body || {};
    if (!classCode || !classCodes.has(classCode)) {
      return res
        .status(400)
        .json({ success: false, error: "유효한 학급 코드가 필요합니다." });
    }
    const classInfo = classCodes.get(classCode);
    if (classInfo.pin && classInfo.pin !== pin) {
      return res
        .status(403)
        .json({ success: false, error: "학급 PIN이 올바르지 않습니다." });
    }
    const exp = Date.now() + 1000 * (expiresInSec || 60 * 60 * 24 * 7);
    const payload = `${classCode}|${exp}`;
    const secret = process.env.QR_SECRET;
    if (!secret) {
      return res.status(500).json({ success: false, error: "QR secret is not configured." });
    }
    const sig = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
    const token = Buffer.from(`${classCode}|${exp}|${sig}`).toString(
      "base64url"
    );
    qrTokens.set(token, { classCode, exp });
    const hostUrl = process.env.RAILWAY_STATIC_URL
      ? `https://${process.env.RAILWAY_STATIC_URL}`
      : `http://localhost:${port}`;
    const shortUrl = `${hostUrl}/r/${token}`;
    res.json({ success: true, token, shortUrl, exp });
  } catch (error) {
    console.error("QR 토큰 생성 오류:", error);
    res.status(500).json({ success: false, error: "QR 토큰 생성 중 오류" });
  }
});

// [추가 기능] QR PNG 생성
app.get("/api/admin/qr.png", async (req, res) => {
  const authCheck = requireAdminAuth(req, res);
  if (authCheck) return;
  try {
    const { token } = req.query;
    if (!token) return res.status(400).send("token 필요");
    const hostUrl = process.env.RAILWAY_STATIC_URL
      ? `https://${process.env.RAILWAY_STATIC_URL}`
      : `http://localhost:${port}`;
    const url = `${hostUrl}/r/${token}`;
    const buf = await QRCode.toBuffer(url, {
      type: "png",
      width: 320,
      margin: 2,
    });
    res.setHeader("Content-Type", "image/png");
    res.send(buf);
  } catch (error) {
    console.error("QR PNG 생성 오류:", error);
    res.status(500).send("QR 생성 오류");
  }
});

// [추가 기능] 짧은 URL 리다이렉트
app.get("/r/:token", (req, res) => {
  try {
    const token = req.params.token;
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const [classCode, expStr, sig] = decoded.split("|");
    const exp = parseInt(expStr, 10);
    if (!classCode || !exp || !sig)
      return res.redirect("/student-register.html?error=invalid");
    const secret = process.env.QR_SECRET;
    if (!secret) return res.redirect("/student-register.html?error=invalid");
    const expectedSig = crypto
      .createHmac("sha256", secret)
      .update(`${classCode}|${exp}`)
      .digest("hex");
    if (expectedSig !== sig)
      return res.redirect("/student-register.html?error=invalid");
    if (Date.now() > exp)
      return res.redirect("/student-register.html?error=expired");
    return res.redirect(
      `/student-register.html?classCode=${encodeURIComponent(
        classCode
      )}&exp=${exp}`
    );
  } catch (error) {
    console.error("리다이렉트 오류:", error);
    return res.redirect("/student-register.html?error=invalid");
  }
});

// 유니티용 AI 피드백 엔드포인트 (CORS 설정 포함)
app.post("/unity/feedback", rateLimit("ai-feedback", 30, 60 * 1000), async (req, res) => {
  // CORS 헤더 추가 (유니티에서 접근 가능하도록)
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");

  try {
    const question = normalizeAiInput(req.body.question);
    const correctAnswer = normalizeAiInput(req.body.correctAnswer, 200);
    const studentAnswer = normalizeAiInput(req.body.studentAnswer, 200);
    const gameContext = normalizeAiInput(req.body.gameContext, 300);

    if (hasPromptInjectionAttempt(question, correctAnswer, studentAnswer, gameContext)) {
      console.warn("Blocked prompt injection attempt", { ip: req.ip });
      return res.status(400).json({ success: false, error: "Invalid request." });
    }

    // 게임 맥락을 고려한 프롬프트
    const prompt = `
게임 환경에서의 수학 문제 피드백입니다.

문제: ${question}
정답: ${correctAnswer}  
학생의 답: ${studentAnswer}
게임 상황: ${gameContext || "일반 문제 풀이"}

먼저 학생의 답이 정답과 일치하는지 정확히 판단해주세요.

만약 정답이면:
- "정답이에요!" 또는 "맞았어요!"로 시작
- 게임적 요소 포함: "훌륭해요!", "대단해요!" 같은 격려
- 다음 단계 또는 다음 문제에 대한 기대감 조성

만약 틀렸다면:  
- "다시 한번 생각해볼까요?" 또는 "거의 다 왔어요!"로 시작
- 게임에 맞는 힌트 제공 (너무 직접적이지 않게)
- 포기하지 않도록 격려하는 메시지

게임 환경에 맞게 친근하고 재미있는 톤으로 2-3문장 작성해주세요.
`;

    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "당신은 게임 속 친근한 수학 선생님입니다. 학생들이 재미있게 학습할 수 있도록 게임적 요소를 포함한 피드백을 제공합니다. '~네요', '~해보세요' 같은 친근한 표현을 사용하며, 게임 환경에 적합한 격려와 힌트를 줍니다.",
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
      feedback: feedback,
      isCorrect:
        studentAnswer.toString().trim() === correctAnswer.toString().trim(),
    });
  } catch (error) {
    console.error("Unity AI 피드백 오류:", error);
    res.status(500).json({
      success: false,
      error: "AI 피드백을 생성하는 중 오류가 발생했습니다.",
    });
  }
});

// 웹용 AI 피드백 엔드포인트 (기존)
app.post("/chat", rateLimit("ai-chat", 30, 60 * 1000), async (req, res) => {
  try {
    const question = normalizeAiInput(req.body.question);
    const correctAnswer = normalizeAiInput(req.body.correctAnswer, 200);
    const studentAnswer = normalizeAiInput(req.body.studentAnswer, 200);

    if (hasPromptInjectionAttempt(question, correctAnswer, studentAnswer)) {
      console.warn("Blocked prompt injection attempt", { ip: req.ip });
      return res.status(400).json({ success: false, error: "Invalid request." });
    }

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

// Railway V2 호환 서버 시작 (즉시 바인딩)
const server = app.listen(port, () => {
  const address = server.address();
  console.log(
    `✅ 서버가 ${address.address}:${address.port}에서 실행 중입니다.`
  );
  console.log(`🌍 Railway 환경: ${process.env.RAILWAY_ENVIRONMENT || "local"}`);
  console.log(
    `🔗 Public URL: ${process.env.RAILWAY_STATIC_URL || "localhost"}`
  );
  console.log(`🏥 Health endpoints: /healthz, /health, /ping`);

  // Railway에 즉시 준비 완료 신호
  if (process.send) {
    process.send("ready");
  }
});

// Railway의 graceful shutdown 지원
process.on("SIGTERM", () => {
  console.log("🛑 SIGTERM 수신, graceful shutdown 시작...");
  server.close(() => {
    console.log("✅ 서버 종료 완료");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("🛑 SIGINT 수신, graceful shutdown 시작...");
  server.close(() => {
    console.log("✅ 서버 종료 완료");
    process.exit(0);
  });
});
