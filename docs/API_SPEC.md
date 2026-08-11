# TripSync Backend API Specification

> Status: Draft v0.2  
> Base path: `/api/v1`  
> Frontend baseline: `feature/API-UI` (`a747a38`)  
> Database rule: 현재 Prisma 모델을 변경하지 않는다.

## 1. 범위

API v1은 현재 Prisma 모델인 `Planner`, `Participant`, `Day`, `Schedule`, `Message`만 사용한다.

포함 기능:

- 플래너 생성, 공유 코드 조회, 소프트 삭제
- 이름·비밀번호 기반 참여 또는 재로그인
- JWT 로그인 유지
- Day 추가
- Schedule 생성·수정·삭제
- Message 초기 조회와 실시간 채팅
- 참여자, Day, Schedule, Message 변경의 실시간 동기화

제외 기능:

- 정산 계산기: 현재처럼 프런트 `localStorage`에 저장
- 카카오 장소 검색·지도 렌더링: Kakao JavaScript SDK를 프런트에서 직접 사용
- 활성 Day, 패널 위치, 시간표 눈금, 채팅창 위치: 프런트 UI 상태
- Day 수정·삭제, 메시지 수정·삭제, refresh token, 접속자 presence

정산 데이터를 `Message.content` 등 의미가 다른 기존 컬럼에 저장하지 않는다.

## 2. 프런트 검사 결과와 반영 사항

### 2.1 실제 백엔드 데이터

현재 `plannerStore`에서 서버 데이터로 전환할 상태는 다음 다섯 가지다.

- `planner`
- `participants`
- `days`
- `schedules`
- `messages`

`activeDayId`, `showGridLines`, 지도 상태, 패널 위치는 API 대상이 아니다.

### 2.2 로그인 폼

현재 로그인 폼은 신규 참여와 기존 참여자 로그인을 하나의 버튼으로 처리한다. 이를 그대로 지원하기 위해 등록·로그인 API를 나누지 않고 `POST /auth/session` 하나로 처리한다.

- 같은 이름이 없으면 Participant 생성
- 같은 이름이 있으면 비밀번호 검증 후 로그인
- 해당 플래너의 첫 Participant는 owner, 이후는 member
- role은 서버가 결정하고 클라이언트 입력은 받지 않음

첫 참여자 owner 지정은 동시 요청에서도 한 명만 생성되도록 `Serializable` transaction으로 처리한다. 별도 owner token이나 DB 컬럼은 사용하지 않는다.

이 단순화의 전제는 플래너 생성 직후 creator가 owner 참여를 먼저 완료하는 것이다. Participant가 0명인 새 플래너에서는 프런트가 조회 모드로 닫기와 공유 버튼을 막고 로그인 폼을 완료하게 한다.

### 2.3 system 메시지

현재 프런트는 플래너 생성·참여 알림에 `participantId: "system"`을 사용한다. 현재 Message 모델은 실제 Participant FK가 필수이므로 이 메시지는 DB에 저장하지 않는다.

- 플래너 생성 안내: snapshot의 Planner 정보로 프런트에서 표시
- 참여 안내: `participant:joined` 이벤트를 프런트가 system 문구로 표시
- 실제 사용자가 작성한 채팅만 Message 테이블에 저장

### 2.4 참여자 색상

`color`는 화면 표현용 값이므로 API와 DB에서 제외한다. 프런트가 Participant ID를 현재 색상 팔레트에 매핑해 항상 같은 색을 계산한다.

### 2.5 시간표 드래그

현재 `CircularTimetable`은 resize 중 `updateSchedule()`을 mousemove마다 호출한다. API 연동 시 이 동작으로 PATCH 요청을 반복해서 보내면 안 된다.

- 드래그 중에는 컴포넌트 로컬 상태만 변경
- mouseup 시 최종 시간으로 PATCH 한 번 전송
- 일정 생성도 mouseup 시 POST 한 번 전송

### 2.6 정산과 지도

- 정산 계산기는 독립 `localStorage` 기능이므로 API endpoint와 Socket 이벤트를 만들지 않는다.
- 장소 검색 결과는 `placeName`, `placeLat`, `placeLng`로 Schedule API에만 전달한다.
- 장소명을 직접 수정하면 프런트가 기존 좌표를 비워 이름과 좌표가 불일치하지 않게 한다.

## 3. 구현 원칙

1. REST가 DB 변경의 기준이다.
2. REST 저장 성공 후 같은 플래너 Socket room에 결과를 전파한다.
3. 채팅만 Socket.IO 요청으로 받아 DB 저장 후 전파한다.
4. 비로그인 사용자는 조회와 실시간 이벤트 수신만 가능하다.
5. 로그인 참여자는 Day와 Schedule을 공동 편집한다.
6. 플래너 삭제는 owner만 가능하다.
7. `participantId`, `createdBy`, `role`, Socket room은 클라이언트 값을 신뢰하지 않는다.
8. Controller는 HTTP 변환만, Service는 검증과 Prisma transaction을 담당한다.
9. Prisma를 다시 감싸는 범용 Repository 계층은 만들지 않는다.
10. DB snake_case는 응답 단계에서 camelCase DTO로 변환한다.

## 4. 공통 규칙

### 4.1 인증

```http
Authorization: Bearer <accessToken>
```

- access token: JWT
- payload: `sub`, `plannerId`, `role`, `type: "access"`
- 만료: 환경변수 `JWT_EXPIRES_IN`, 기본값 `7d`
- 로그인 유지: 토큰 저장 후 `GET /auth/me`로 Participant 복구
- 로그아웃: 프런트에서 토큰 제거
- API v1에서는 refresh token과 서버 로그아웃 endpoint를 두지 않음

JWT 예시:

```json
{
  "sub": "participant-id",
  "plannerId": "planner-id",
  "role": "owner",
  "type": "access"
}
```

### 4.2 성공 응답

```json
{
  "success": true,
  "data": {},
  "message": "처리 결과"
}
```

### 4.3 실패 응답

```json
{
  "success": false,
  "data": null,
  "message": "요청을 처리할 수 없습니다.",
  "code": "VALIDATION_ERROR"
}
```

상태 코드:

| 상태 | 용도 |
|---|---|
| `200` | 조회·수정·삭제 성공 |
| `201` | 생성 성공 |
| `400` | 입력값 또는 비즈니스 규칙 오류 |
| `401` | 로그인 실패, 인증 없음, 잘못된 토큰 |
| `403` | 다른 플래너 접근, owner 권한 부족 |
| `404` | 리소스 없음 또는 삭제된 플래너 |
| `500` | 예상하지 못한 서버 오류 |

### 4.4 시간·문자열

- 시간: `HH:mm`
- 날짜: ISO 8601 UTC 문자열
- `startTime === endTime`: 거절
- `endTime < startTime`: 자정을 넘는 일정으로 허용
- 일정 겹침: API v1에서 허용
- 입력 문자열: trim 후 검증
- 빈 optional 문자열: `null`로 저장하고 API 응답에서도 `null` 반환

Prisma의 `DateTime @db.Time`은 서버 timezone에 따라 값이 달라지지 않도록 UTC 기준으로만 변환한다.

```ts
// HH:mm -> Prisma TIME
new Date(Date.UTC(1970, 0, 1, hours, minutes, 0));

// Prisma TIME -> HH:mm
`${date.getUTCHours().toString().padStart(2, '0')}:${date.getUTCMinutes().toString().padStart(2, '0')}`;
```

`Decimal` 좌표는 DTO에서 `Number(value)`로 변환한다.

### 4.5 필수 환경변수와 의존성

환경변수:

- `DATABASE_URL`
- `JWT_SECRET`: 예제 기본값을 사용하지 않고 시작 시 누락·취약값 검사
- `JWT_EXPIRES_IN`: 기본 `7d`
- `CLIENT_ORIGIN`
- `PORT`: 기본 `4000`

Prisma는 `DATABASE_URL`만 사용하므로 현재 `.env.example`의 개별 `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`는 API 구현 시 제거한다. Kakao JavaScript SDK는 프런트에서 사용하므로 백엔드 `KAKAO_MAP_API_KEY`도 제거한다.

현재 package에 추가할 최소 의존성:

- `bcryptjs`: 비밀번호 hash·compare
- `zod`: body, params, query 검증

Express와 Socket.IO는 동일한 `CLIENT_ORIGIN` CORS 정책을 사용한다. `server.ts`는 `app.listen()` 대신 `http.createServer(app)`을 생성하고 그 서버에 Socket.IO를 연결한다.

환경변수는 app·Prisma import 전에 `env.ts`에서 먼저 로드·검증한다. 종료 시에는 `SIGINT`·`SIGTERM`에서 HTTP server, Socket.IO, Prisma를 순서대로 닫는다.

## 5. 권한

| 기능 | 비로그인 | member | owner |
|---|:---:|:---:|:---:|
| snapshot·채팅 내역 조회 | O | O | O |
| 참여·재로그인 | O | O | O |
| Day 추가 | X | O | O |
| Schedule 생성·수정·삭제 | X | O | O |
| 채팅 전송 | X | O | O |
| 플래너 삭제 | X | X | O |
| 실시간 이벤트 수신 | O | O | O |

## 6. DTO

### 6.1 PlannerDto

```json
{
  "id": "uuid",
  "title": "제주도 여행",
  "shareCode": "A1B2C3",
  "isDeleted": false,
  "deletedAt": null,
  "createdAt": "2026-08-06T00:00:00.000Z"
}
```

### 6.2 ParticipantDto

```json
{
  "id": "uuid",
  "plannerId": "uuid",
  "name": "홍길동",
  "role": "member",
  "joinedAt": "2026-08-06T00:00:00.000Z"
}
```

`passwordHash`와 UI 색상은 응답하지 않는다.

### 6.3 DayDto

```json
{
  "id": "uuid",
  "plannerId": "uuid",
  "dayNumber": 1,
  "label": "1일차"
}
```

### 6.4 ScheduleDto

```json
{
  "id": "uuid",
  "dayId": "uuid",
  "startTime": "09:00",
  "endTime": "11:30",
  "placeName": "성산일출봉",
  "placeLat": 33.4586,
  "placeLng": 126.9426,
  "content": "일출 감상",
  "createdBy": "participant-id",
  "createdAt": "2026-08-06T00:00:00.000Z",
  "updatedAt": "2026-08-06T00:00:00.000Z"
}
```

### 6.5 MessageDto

```json
{
  "id": "uuid",
  "plannerId": "uuid",
  "participantId": "uuid",
  "participantName": "홍길동",
  "content": "내일 9시에 만날까요?",
  "createdAt": "2026-08-06T00:00:00.000Z"
}
```

`participantName`은 Participant relation 조회 결과로 만든다.

### 6.6 PlannerSnapshotDto

```json
{
  "planner": {},
  "participants": [],
  "days": [],
  "schedules": [],
  "messages": []
}
```

- days: `dayNumber ASC`
- schedules: `startTime ASC`, `createdAt ASC`
- messages: 최근 50개를 오래된 순서로 반환
- 별도 Day·Schedule·Message GET endpoint는 만들지 않음

## 7. REST API

API v1 REST endpoint는 9개다.

### 7.1 플래너 생성

```http
POST /api/v1/planners
```

인증: 불필요

요청:

```json
{
  "title": "제주도 여행"
}
```

검증·처리:

- title: 1~50자
- 서버가 6자리 영문 대문자·숫자 shareCode 생성
- shareCode 충돌 시 재생성
- Planner와 Day 1을 transaction으로 생성

응답 `201`:

```json
{
  "success": true,
  "data": {
    "planner": {},
    "day": {}
  },
  "message": "플래너가 생성되었습니다."
}
```

### 7.2 플래너 snapshot 조회

```http
GET /api/v1/planners/by-code/:shareCode
```

인증: 불필요

응답: `PlannerSnapshotDto`

존재하지 않거나 소프트 삭제된 플래너는 동일하게 `404 PLANNER_NOT_FOUND`를 반환한다.

### 7.3 참여 또는 재로그인

```http
POST /api/v1/auth/session
```

인증: 불필요

요청:

```json
{
  "shareCode": "A1B2C3",
  "name": "홍길동",
  "password": "1234"
}
```

검증:

- name: 1~20자
- password: 4~20자
- password는 bcrypt hash로만 저장

처리:

1. shareCode로 활성 Planner 조회
2. 같은 이름의 Participant가 있으면 비밀번호 검증
3. 없으면 Participant 생성
4. 첫 Participant면 owner, 아니면 member
5. access token 발급
6. 신규 생성일 때만 `participant:joined` 전송

응답 `200` 또는 `201`:

```json
{
  "success": true,
  "data": {
    "participant": {},
    "accessToken": "jwt",
    "created": true
  },
  "message": "플래너에 참여했습니다."
}
```

- 기존 참여자 로그인: `200`, `created: false`
- 신규 참여자 생성: `201`, `created: true`
- 이름은 있지만 비밀번호가 다르면 `401 INVALID_CREDENTIALS`
- 신규 생성 경쟁으로 unique 충돌이 나면 Participant를 다시 조회해 같은 로그인 규칙을 적용
- 첫 owner 결정 transaction이 deadlock·serialization conflict로 실패하면 제한된 횟수만 재시도

### 7.4 현재 사용자 조회

```http
GET /api/v1/auth/me
```

인증: 필요

응답:

```json
{
  "success": true,
  "data": {
    "participant": {}
  },
  "message": "현재 사용자입니다."
}
```

### 7.5 Day 추가

```http
POST /api/v1/planners/:plannerId/days
```

인증: member 또는 owner

요청 body: 없음

처리:

- JWT의 plannerId와 URL plannerId 일치 확인
- 현재 최대 dayNumber + 1
- label은 `${dayNumber}일차`
- transaction과 unique 제약으로 중복 방지
- 동시 추가 충돌 시 transaction을 제한된 횟수만 재시도
- 저장 후 `day:created` 전송

응답 `201`: 생성된 `DayDto`

### 7.6 일정 생성

```http
POST /api/v1/planners/:plannerId/days/:dayId/schedules
```

인증: member 또는 owner

요청:

```json
{
  "startTime": "09:00",
  "endTime": "11:30",
  "placeName": "성산일출봉",
  "placeLat": 33.4586,
  "placeLng": 126.9426,
  "content": "일출 감상"
}
```

검증·처리:

- Day가 JWT planner에 속하는지 확인
- createdBy는 JWT participant ID
- placeName: 최대 100자
- content: 최대 1000자
- 좌표는 둘 다 있거나 둘 다 없어야 함
- latitude: -90~90, longitude: -180~180
- 저장 후 `schedule:created` 전송

응답 `201`: 생성된 `ScheduleDto`

### 7.7 일정 수정

```http
PATCH /api/v1/planners/:plannerId/schedules/:scheduleId
```

인증: member 또는 owner

- 생성 요청 필드의 부분 집합만 허용
- `id`, `dayId`, `createdBy`, `createdAt`, `updatedAt` 변경 금지
- Schedule의 Day가 JWT planner에 속하는지 확인
- 동시 수정은 last-write-wins
- 저장 후 `schedule:updated` 전송

응답 `200`: 수정된 `ScheduleDto`

### 7.8 일정 삭제

```http
DELETE /api/v1/planners/:plannerId/schedules/:scheduleId
```

인증: member 또는 owner

응답:

```json
{
  "success": true,
  "data": {
    "scheduleId": "uuid"
  },
  "message": "일정이 삭제되었습니다."
}
```

저장 후 `schedule:deleted`를 전송한다.

### 7.9 플래너 소프트 삭제

```http
DELETE /api/v1/planners/:plannerId
```

인증: owner

- JWT planner와 URL planner 일치 확인
- `is_deleted = true`, `deleted_at = now()`
- 하위 데이터를 hard delete하지 않음
- 저장 후 `planner:deleted` 전송

## 8. Socket.IO

### 8.1 연결

handshake auth:

```json
{
  "shareCode": "A1B2C3",
  "token": "optional-access-token"
}
```

- shareCode 필수
- token이 없으면 read-only socket
- token이 있으면 JWT planner와 shareCode 일치 확인
- token이 전달됐는데 검증에 실패하면 익명으로 강등하지 않고 연결 거절
- 서버가 `planner:{plannerId}` room에 연결
- 클라이언트가 임의 room 이름이나 plannerId를 지정하지 않음
- 삭제된 플래너는 연결 거절

별도 namespace와 공통 event envelope는 사용하지 않는다. 각 이벤트는 필요한 DTO를 직접 payload로 전달한다.

### 8.2 클라이언트 → 서버

#### `message:send`

로그인 socket만 가능하다.

payload:

```json
{
  "content": "내일 9시에 만날까요?"
}
```

- trim 후 1~200자
- participantId와 plannerId는 socket 인증 정보 사용
- DB 저장 성공 후 `message:created` 전송

ACK는 전송 성공 여부만 알린다. 보낸 사용자도 `message:created` 이벤트로 상태를 갱신해 메시지를 두 번 추가하지 않게 한다.

ACK:

```json
{
  "success": true
}
```

실패 ACK:

```json
{
  "success": false,
  "message": "메시지를 전송할 수 없습니다.",
  "code": "VALIDATION_ERROR"
}
```

### 8.3 서버 → 클라이언트

| 이벤트 | payload |
|---|---|
| `participant:joined` | `ParticipantDto` |
| `day:created` | `DayDto` |
| `schedule:created` | `ScheduleDto` |
| `schedule:updated` | `ScheduleDto` |
| `schedule:deleted` | `{ scheduleId }` |
| `message:created` | `MessageDto` |
| `planner:deleted` | `{ plannerId, deletedAt }` |

비로그인 socket도 이벤트를 수신하지만 `message:send`는 거절한다.

## 9. 오류 코드

오류 코드는 실제 프런트 분기에 필요한 최소 집합만 사용한다.

| 코드 | 상태 | 의미 |
|---|---:|---|
| `VALIDATION_ERROR` | 400 | 입력값 검증 실패 |
| `INVALID_CREDENTIALS` | 401 | 이름 또는 비밀번호 불일치 |
| `AUTH_REQUIRED` | 401 | 인증 필요 |
| `INVALID_TOKEN` | 401 | 만료·변조된 JWT |
| `PLANNER_SCOPE_MISMATCH` | 403 | 다른 플래너 토큰 사용 |
| `OWNER_REQUIRED` | 403 | owner 권한 필요 |
| `PLANNER_NOT_FOUND` | 404 | 플래너 없음 또는 삭제됨 |
| `RESOURCE_NOT_FOUND` | 404 | Day, Schedule, Participant 없음 |

## 10. 프런트 API 전환

| 현재 동작 | 전환 방식 |
|---|---|
| `createPlanner(title)` | `POST /planners`; 비동기 함수로 변경 |
| `loadPlanner(shareCode)` | snapshot GET; 비동기 함수로 변경 |
| `joinPlanner(name, role)` | `POST /auth/session`; role 인자 제거, password 전달 |
| participant ID 로그인 유지 | access token 저장 + `GET /auth/me` |
| `addDay()` | Day POST |
| `addSchedule()` | Schedule POST |
| `updateSchedule()` | Schedule PATCH; drag mouseup에서 한 번만 호출 |
| `deleteSchedule()` | Schedule DELETE |
| `deletePlanner()` | owner 전용 Planner DELETE |
| `sendMessage()` | Socket `message:send` |
| participant `color` | 프런트에서 ID 기반 계산 |
| system 메시지 | Planner 정보와 socket 이벤트로 프런트에서 생성 |
| 정산 계산기 | 기존 localStorage 유지 |

추가 프런트 수정:

- LoginForm의 password를 필수로 만들고 API 요청에 포함
- 새 플래너의 Participant가 0명이면 첫 owner 참여 전까지 조회 모드와 공유 버튼 비활성화
- `joinPlanner`의 role 인자 제거
- store action 반환값을 Promise로 변경하고 loading/error 상태 처리
- 화면과 모달은 요청 성공 후에만 이동하거나 닫고, 실패하면 입력값을 유지
- `loadPlanner` effect는 비동기 응답이 이전 shareCode 상태를 덮지 않게 cleanup 처리
- snapshot 적용 후 Socket을 연결하고, 재연결 시 snapshot을 다시 조회해 연결 중 놓친 변경 복구
- 로그인 성공 시 token으로 Socket 재연결, 로그아웃 시 기존 인증 Socket을 끊고 read-only로 재연결
- 채팅 입력은 Socket ACK 성공 후 비우고, 메시지 목록은 `message:created`에서만 갱신
- Socket 생성·수정 이벤트는 리소스 ID 기준 upsert로 반영해 중복 항목 방지
- Schedule optional 값의 `undefined`, 빈 문자열, `null` 처리 통일
- 장소명 직접 수정 시 기존 좌표 제거
- 삭제 확인 문구를 hard delete가 아닌 소프트 삭제 동작에 맞게 수정

## 11. 권장 백엔드 구조

```text
src/
├── config/
│   ├── db.ts
│   └── env.ts
├── controllers/
│   ├── plannerController.ts
│   ├── authController.ts
│   ├── dayController.ts
│   └── scheduleController.ts
├── services/
│   ├── plannerService.ts
│   ├── authService.ts
│   ├── dayService.ts
│   ├── scheduleService.ts
│   └── messageService.ts
├── routes/
├── middlewares/
│   ├── authMiddleware.ts
│   ├── errorHandler.ts
│   └── validate.ts
├── sockets/
│   └── socketGateway.ts
├── utils/
│   ├── jwt.ts
│   ├── password.ts
│   └── time.ts
├── app.ts
└── server.ts
```

범용 BaseController, BaseService, Repository, EventBus 같은 추상화는 API v1에서 만들지 않는다.

## 12. 구현 순서

1. env, 오류 형식, JWT/password/time 유틸리티
2. `POST /planners`, snapshot GET
3. `POST /auth/session`, `GET /auth/me`, 인증 미들웨어
4. Day POST
5. Schedule POST/PATCH/DELETE
6. HTTP server에 Socket.IO 연결
7. 실제 Message 저장과 `message:send`
8. REST 성공 후 room 이벤트 전송
9. 통합 테스트와 프런트 연결

구현 시작 전 seed의 잘린 bcrypt 문자열은 실제 hash로, 36자리 소문자 shareCode 샘플은 API 규칙에 맞는 6자리 대문자 코드로 정리한다. 이는 모델 변경이 아니다.

## 13. 필수 테스트

- 플래너 생성 시 Day 1도 생성
- 동시 첫 참여 요청에서도 owner는 한 명만 생성
- 새 이름은 Participant 생성, 기존 이름은 비밀번호 로그인
- 비밀번호가 다르면 `INVALID_CREDENTIALS`
- 새로고침 후 token으로 Participant 복구
- 익명 사용자는 snapshot과 이벤트를 조회하지만 쓰기는 거절
- 다른 플래너 JWT로 Day·Schedule 접근 불가
- member는 Schedule 공동 편집 가능, Planner 삭제 불가
- mouseup 한 번에 Schedule PATCH 한 번만 발생
- REST 저장 성공 후에만 socket 이벤트 전송
- 실제 Participant 채팅만 Message에 저장
- 서로 다른 플래너 room에 이벤트가 섞이지 않음
- 삭제된 플래너는 snapshot, 로그인, socket 연결 모두 거절
