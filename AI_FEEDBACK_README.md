# AI 피드백 기능 설정 가이드

## 🚀 설치 및 설정

### 1. Node.js 의존성 설치

```bash
npm install
```

### 2. OpenAI API 키 설정

1. `.env` 파일을 생성합니다:

```bash
touch .env
```

2. `.env` 파일에 API 키를 추가합니다:

```
OPENAI_API_KEY=your_actual_openai_api_key_here
```

**중요**: `your_actual_openai_api_key_here` 부분을 실제 OpenAI API 키로 교체하세요.

### 3. 서버 실행

```bash
npm start
```

또는 개발용 (자동 재시작):

```bash
npm run dev
```

서버가 `http://localhost:3000`에서 실행됩니다.

## 🌐 클라이언트 실행

HTML 파일들을 웹 서버에서 실행해야 합니다. (file:// 프로토콜로는 CORS 때문에 작동하지 않습니다)

### 간단한 HTTP 서버 시작:

```bash
# Python 3가 설치된 경우
python -m http.server 8080

# 또는 Node.js http-server 사용
npx http-server -p 8080
```

브라우저에서 `http://localhost:8080`으로 접속합니다.

## 🤖 AI 피드백 작동 방식

1. 학생이 모든 7단계 학습을 완료한 후 증명서 페이지에 접근
2. 이름을 입력하고 "증명서 생성하기" 버튼 클릭
3. 시스템이 홈페이지의 연습 문제 (9996, 9997, ?, ?, 10000)를 기준으로 GPT-4o에게 피드백 요청
4. AI가 학습 완료를 축하하는 따뜻한 피드백 생성
5. 증명서 하단에 "🤖 AI 피드백" 섹션에 피드백 표시

## 🔧 트러블슈팅

### CORS 오류 발생 시:

- HTML 파일을 HTTP 서버에서 실행하고 있는지 확인
- 서버가 localhost:3000에서 실행되고 있는지 확인

### AI 피드백이 표시되지 않을 때:

1. OpenAI API 키가 올바르게 설정되었는지 확인
2. 인터넷 연결 상태 확인
3. 브라우저 개발자 도구의 Console 탭에서 오류 메시지 확인

### 백업 메시지:

서버 연결이 실패해도 기본 축하 메시지가 표시되어 사용자 경험에 지장이 없습니다.

## 📁 파일 구조

```
Math/
├── server.js              # Node.js 백엔드 서버
├── package.json           # 의존성 정의
├── .env                   # API 키 설정 (직접 생성 필요)
├── certificate.html       # AI 피드백 기능이 추가된 증명서 페이지
├── style.css             # AI 피드백 스타일 포함
└── AI_FEEDBACK_README.md # 이 파일
```

## 🎯 주요 기능

- **학습 완료 축하**: 모든 단계를 완료한 학생에게 개인화된 피드백
- **오류 처리**: 서버 연결 실패 시에도 기본 축하 메시지 표시
- **반응형 디자인**: 모바일에서도 깔끔하게 표시되는 피드백 섹션
- **보안**: API 키는 서버에서만 사용, 클라이언트에 노출되지 않음

## 💡 사용 팁

1. 개발 중에는 `npm run dev`를 사용하여 코드 변경 시 자동으로 서버가 재시작됩니다.
2. API 사용량을 확인하려면 OpenAI 대시보드를 정기적으로 확인하세요.
3. 프로덕션 환경에서는 환경 변수를 더 안전하게 관리하세요.

## 📋 설치 후 확인 방법:

설치가 완료되면 새 터미널을 열고 다음 명령어로 확인:

```bash
node --version
npm --version
```

## ⚡ 설치 완료 후 AI 서버 실행:

```bash
# 1. 의존성 설치
npm install

# 2. 서버 시작
npm start
```

그러면 `http://localhost:3000`에서 AI 백엔드가 실행되어 완전한 AI 피드백 기능을 사용할 수 있습니다!

## 🎯 현재 상황:

- ✅ **프론트엔드**: 실행 중 (`http://localhost:8080`)
- ⏳ **Node.js**: 설치 진행 중
- 🎯 **목표**: AI 피드백 완전 작동

브라우저에서 Node.js를 다운로드하고 설치해주세요! 설치가 완료되면 알려주시면 AI 서버를 실행해드리겠습니다.
