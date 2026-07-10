# 🧭 TripSync (가칭)

> 링크 하나로 접속해 팀원들과 실시간으로 원형 시간표에 여행 일정을 채우고, 지도와 채팅으로 협업하는 웹 플래너

회원가입 없이 참여 가능한 **When2meet 스타일**의 협업형 여행 일정 플래너입니다. 원형 시간표 + 지도 연동 + 실시간 채팅을 하나의 화면에서 제공합니다.

---

## ✨ 핵심 기능

- **비회원 참여**: 이름 + 비밀번호만으로 플래너 참여 (비로그인 시 조회 전용)
- **원형 시간표**: 24시간을 원형으로 표현, 시간 눈금선 추가/삭제
- **일정 입력**: 시간표 클릭 → 시작~종료 시간/장소/내용 입력 모달
- **실시간 채팅**: 로그인 참여자만 가능, 위치 이동/최소화 가능한 플로팅 창
- **지도 연동**: 시간표 ↔ 지도 양방향 반영 (장소 선택 시 자동으로 시간표에 반영)
- **일차(Day) 추가**: 1일차, 2일차... 시간표 블록 동적 추가
- **플래너 삭제**: owner만 삭제 가능, 소프트 삭제 정책 적용

---

## 🛠 기술 스택

| 영역 | 기술 |
|---|---|
| 프론트엔드 | React (Vite) + TypeScript |
| 상태관리 | Zustand / Redux Toolkit |
| 백엔드 | Node.js (Express or NestJS) |
| 실시간 통신 | Socket.io (WebSocket) |
| DB | MySQL (or PostgreSQL) |
| 지도 API | Kakao Map API |
| 인증 | JWT (플래너별 임시 계정) |
| 배포 | Frontend: Vercel / Backend: Render / DB: Railway |

---

## 📁 프로젝트 구조

```
frontend/
├── public/
├── src/
│   ├── api/            # axios 인스턴스 및 API 요청 함수
│   ├── components/
│   │   ├── common/      # 버튼, 모달, 인풋 등 공통 컴포넌트
│   │   ├── Timetable/   # 원형 시간표 (CircularTimetable, TimeSlotModal ...)
│   │   ├── Map/         # 지도 연동 (KakaoMap.tsx)
│   │   ├── Chat/        # 채팅 (ChatWindow, ChatMessage)
│   │   └── Auth/        # LoginForm.tsx
│   ├── pages/           # MainPage.tsx, PlannerPage.tsx
│   ├── hooks/           # useSocket, useSchedule 등
│   ├── store/           # Zustand 상태 저장소
│   ├── types/
│   ├── utils/
│   └── styles/
└── package.json

backend/
├── src/
│   ├── config/          # db.ts, env.ts
│   ├── controllers/     # planner, auth, schedule, message
│   ├── routes/
│   ├── models/          # Sequelize or Prisma 엔티티
│   ├── services/        # 비즈니스 로직
│   ├── sockets/         # socketGateway.ts
│   ├── middlewares/     # authMiddleware, errorHandler
│   └── app.ts / server.ts
├── prisma/schema.prisma # (Prisma 사용 시)
└── package.json
```

---

## 🗄 DB 스키마 요약 (ERD)

**Planner** 1 : N **Day** 1 : N **Schedule**
**Planner** 1 : N **Participant**
**Planner** 1 : N **Message**

| 테이블 | 주요 필드 |
|---|---|
| Planner | id, title, share_code, is_deleted, deleted_at, created_at |
| Participant | id, planner_id, name, password_hash, role(`owner`/`member`), joined_at |
| Day | id, planner_id, day_number, label |
| Schedule | id, day_id, start_time, end_time, place_name, place_lat, place_lng, content, created_by |
| Message | id, planner_id, participant_id, content, created_at |

> 상세 스키마는 기획서 9장 참고. 플래너 삭제는 **소프트 삭제**(`is_deleted`, `deleted_at`)를 기본으로 하고, 일정 기간 후 배치 작업으로 하위 데이터를 hard delete 하는 정책을 권장합니다.

---

## 🚀 시작하기

### 사전 요구사항
- Node.js 18+
- MySQL (또는 PostgreSQL) 8.0+
- Kakao Developers API Key ([발급 링크](https://developers.kakao.com))

### 설치

```bash
# 저장소 클론
git clone https://github.com/{org}/{repo}.git
cd {repo}

# 프론트엔드
cd frontend
npm install
npm run dev

# 백엔드
cd backend
npm install
npm run dev
```

### 환경변수

`.env.example`을 참고하여 `.env` 파일을 생성하세요. (DB 접속정보, API 키 등 민감 정보는 절대 커밋 금지)

```env
# backend/.env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=tripsync
DB_USER=
DB_PASSWORD=
JWT_SECRET=
KAKAO_MAP_API_KEY=
```

```env
# frontend/.env
VITE_API_BASE_URL=http://localhost:4000
VITE_KAKAO_MAP_APP_KEY=
```

---

## 📐 공통 개발 규칙

| 항목 | 규칙 |
|---|---|
| 변수/함수 | camelCase (`getScheduleList`) |
| 컴포넌트/클래스 | PascalCase (`CircularTimetable`) |
| DB 컬럼 | snake_case (`place_name`, `created_at`) |
| 파일명 | 컴포넌트: `PascalCase.tsx` / 그 외: `camelCase.ts` |
| API 응답 포맷 | `{ success: boolean, data: any, message: string }` |
| API 라우팅 | RESTful, 예: `GET /planners/:id`, `POST /planners/:id/schedules` |
| 브랜치 전략 | `main`(배포) / `develop`(통합) / `feature/기능명` |
| curmit 컨벤션 | `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`, `test:` |
| 에러 핸들링 | 컨트롤러 throw → 공통 `errorHandler` 미들웨어 처리 |
| 코드 포맷터 | ESLint + Prettier, PR 전 `npm run lint` 필수 |
| PR 규칙 | 최소 1인 리뷰 승인 후 머지, 제목에 이슈 번호 명시 |

---

## 👥 팀 구성 및 역할 분담

| 파트 | 역할 | 주요 작업 |
|---|---|---|
| 강재구 A - 프론트엔드 (UI 코어) | 메인화면 + 원형 시간표 | 원형 시간표 SVG/Canvas, 시간 눈금 추가/삭제, 일정 입력 모달 UI |
| 이윤수 B - 프론트엔드 (연동/실시간) | 지도 + 채팅 UI | Kakao Map SDK 연동, 지도-시간표 양방향 로직, 채팅 UI, Socket.io-client |
| 문차민 C - 백엔드 (서버/DB) | API 설계 + DB | 서버 구축, ERD 기반 테이블 설계, CRUD API, 삭제 API(owner 검증) |
| 박민재 D - 백엔드 (인증/실시간) | 로그인 + WebSocket | 참여자 로그인, JWT/세션, Socket.io 서버(브로드캐스트) |

> A·B, C·D는 서로 코드 리뷰 + API 명세(Swagger 등) 선(先) 합의 후 병렬 개발 권장

---

## 🗓 개발 일정 (8주)

| 주차 | 목표 |
|---|---|
| 1주차 | 기획 확정 + API 명세 (와이어프레임, ERD 설계) |
| 2주차 | 기본 화면 퍼블리싱 (메인화면, 채팅 UI, DB 테이블, 로그인 API) |
| 3~4주차 | 핵심기능 1차 (원형시간표 기본기능, 지도 SDK 연동, Schedule CRUD, Socket.io 세팅) |
| 5주차 | 연동 작업 (일정 입력 모달, 지도↔시간표 연동, Day 추가 API, 실시간 브로드캐스트) |
| 6주차 | 통합 테스트 (프론트/API/소켓 통합) |
| 7주차 | QA / 버그 수정 (전원) |
| 8주차 | 배포 + 발표 준비 (전원) |

### 진행상황 관리
- Notion 칸반보드: `To do` / `In Progress` / `Done` + 담당자 태그
- GitHub Projects + Issue → PR 연결 → 코드리뷰 후 머지
- 주 1회 스크럼: 이번 주 한 일 / 막힌 점 / 다음 주 계획 공유
- API 명세는 Swagger 또는 Notion 표로 통일

---

## 🔭 확장 고려사항

- 참여자별 일정 색상 구분
- 시간표 겹침(중복 시간) 경고 표시
- 플래너 공유 QR코드 발급
- 지도 경로(이동시간) 표시 기능

---

## 📄 License

TBD
