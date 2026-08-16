# TripSync API Integration Handoff

## 1. 상태와 범위

- 기준 명세: `docs/API_SPEC.md` v0.2
- REST API 9개와 Socket 이벤트 7개 구현 완료
- 기존 Prisma 모델 유지
- REST·Socket 기반 화면 연결 코드 적용 완료
- 플래너 mock localStorage 제거, 정산 계산기의 localStorage만 유지

백엔드와 화면의 구현 범위는 완료됐다. 실제 MySQL을 사용한 통합 검증은 아직
완료되지 않았다.

## 2. 실행 설정

```env
# frontend/.env
VITE_API_BASE_URL=http://localhost:4000
VITE_KAKAO_MAP_APP_KEY=

# backend/.env
DATABASE_URL=mysql://...
JWT_SECRET=32자 이상의 실제 secret
JWT_EXPIRES_IN=7d
CLIENT_ORIGIN=http://localhost:5173
PORT=4000
```

- REST base URL: `${VITE_API_BASE_URL}/api/v1`
- Socket URL: `VITE_API_BASE_URL`
- REST 응답: `{ success, data, message }`
- Socket 이벤트: envelope 없이 payload 직접 전달

## 3. REST 계약

| Method | Path | 인증 |
|---|---|---|
| `POST` | `/api/v1/planners` | 없음 |
| `GET` | `/api/v1/planners/by-code/:shareCode` | 없음 |
| `POST` | `/api/v1/auth/session` | 없음 |
| `GET` | `/api/v1/auth/me` | Bearer JWT |
| `POST` | `/api/v1/planners/:plannerId/days` | member/owner |
| `POST` | `/api/v1/planners/:plannerId/days/:dayId/schedules` | member/owner |
| `PATCH` | `/api/v1/planners/:plannerId/schedules/:scheduleId` | member/owner |
| `DELETE` | `/api/v1/planners/:plannerId/schedules/:scheduleId` | member/owner |
| `DELETE` | `/api/v1/planners/:plannerId` | owner |

참여 요청은 `shareCode`, `name`, `password`만 전송한다. `role`은 서버가 정한다.

Schedule PATCH에는 `startTime`, `endTime`, `placeName`, `placeLat`, `placeLng`,
`content`의 부분 집합만 전송한다. ID, 관계 필드, timestamp는 보내지 않는다.

## 4. Socket 계약

```ts
io(serverUrl, {
  auth: { shareCode, token: token || undefined },
});
```

| 방향 | Event | Payload |
|---|---|---|
| Client → Server | `message:send` | `{ content }`, ACK 사용 |
| Server → Client | `participant:joined` | `ParticipantDto` |
| Server → Client | `day:created` | `DayDto` |
| Server → Client | `schedule:created` | `ScheduleDto` |
| Server → Client | `schedule:updated` | `ScheduleDto` |
| Server → Client | `schedule:deleted` | `{ scheduleId }` |
| Server → Client | `message:created` | `MessageDto` |
| Server → Client | `planner:deleted` | `{ plannerId, deletedAt }` |

Participant, Day, Schedule, Message는 ID 기준 upsert한다. REST 응답과 Socket
이벤트가 모두 도착하므로 단순 append하면 중복된다.

`message:send`는 로컬 메시지를 먼저 추가하지 않는다. ACK 성공 후 입력창만
비우고 `message:created`에서 메시지를 반영한다.

재연결 성공 시 snapshot을 다시 조회한다. 로그인·로그아웃 시 기존 Socket을
끊고 각각 인증·익명 Socket으로 재연결한다. effect cleanup에서 listener와
Socket을 정리한다.

## 5. 데이터와 인증 규칙

- `Planner.deletedAt`: `string | null`
- `Schedule.placeName`, `content`: `string | null`
- `Schedule.placeLat`, `placeLng`: `number | null`
- Participant의 `color`는 API 필드가 아니며 ID hash로 계산
- welcome 메시지와 참여 안내는 화면에서만 생성하고 서버에 저장하지 않음
- token 저장 키: `tripsync_token_${shareCode}`

로그인 복구 순서:

1. snapshot 조회
2. 저장된 token 확인
3. token이 있으면 `GET /auth/me` 호출
4. 실패한 token 제거 후 조회 모드 유지
5. 복구 결과에 따라 Socket 연결

서버 로그아웃 endpoint는 없다. token 제거로 처리한다.

스토어 action은 다음처럼 비동기로 변경한다.

```ts
createPlanner(title): Promise<string>
loadPlanner(shareCode): Promise<boolean>
joinPlanner(name, password): Promise<Participant>
addDay(): Promise<Day>
addSchedule(input): Promise<Schedule>
updateSchedule(scheduleId, patch): Promise<Schedule>
deleteSchedule(scheduleId): Promise<void>
deletePlanner(): Promise<void>
sendMessage(content): Promise<void>
```

## 6. 파일별 수정

| 파일 | 필수 수정 |
|---|---|
| `src/types/index.ts` | nullable DTO, API 오류·ACK·Schedule 입력 타입 반영 |
| `src/store/plannerStore.ts` | mock CRUD와 임의 ID 제거, REST action·token·Socket·ID upsert 구현 |
| `src/components/Auth/LoginForm.tsx` | password 전달·필수 4~20자, role 제거, 성공 후 닫기 |
| `src/pages/MainPage.tsx` | 생성 await, 성공 후 이동, 중복 요청 방지 |
| `src/pages/PlannerPage.tsx` | snapshot await·stale 요청 정리, Day·삭제 await, 첫 owner 참여 전 공유 제한 |
| `src/components/Timetable/TimeSlotModal.tsx` | 허용 필드만 전송, 성공 후 닫기, 직접 입력 시 좌표 null 처리 |
| `src/components/Timetable/CircularTimetable.tsx` | mousemove는 local preview, mouseup에서 PATCH 한 번 |
| `src/components/Chat/ChatWindow.tsx` | ACK await, `message:created`에서만 메시지 추가 |
| `src/components/Map/KakaoMap.tsx` | nullable 좌표와 `value != null` 판정 적용 |

추가 규칙:

- 장소명 직접 입력 시 기존 위도·경도를 함께 `null`로 전송
- 위도와 경도는 항상 함께 전송
- placeName 최대 100자, content 최대 1000자
- `startTime === endTime`만 거절하고 자정을 넘는 일정 허용
- 드래그 실패 시 이전 값 복구 또는 snapshot 재조회
- 새 플래너의 Participant가 0명이면 첫 owner 참여 전 공유·조회 모드 제한
- 플래너 삭제 안내는 hard delete가 아닌 soft delete 문구 사용
- 화면 이동과 모달 닫기는 요청 성공 후에만 수행

## 7. 오류 처리

| Code | 처리 |
|---|---|
| `VALIDATION_ERROR` | 입력 오류 표시 |
| `INVALID_CREDENTIALS` | 이름 또는 비밀번호 오류 표시 |
| `AUTH_REQUIRED` | 로그인 유도 |
| `INVALID_TOKEN` | token 제거 후 조회 모드 전환 |
| `PLANNER_SCOPE_MISMATCH` | token 제거 후 현재 플래너 재조회 |
| `OWNER_REQUIRED` | owner 전용 안내 |
| `PLANNER_NOT_FOUND` | 홈 이동 또는 삭제 상태 표시 |
| `RESOURCE_NOT_FOUND` | snapshot 재조회 |

## 8. 완료 조건

- [ ] 서버가 발급한 shareCode로 플래너가 열린다.
- [ ] 첫 참여자는 owner, 이후 참여자는 member가 된다.
- [ ] 비밀번호 로그인과 token 복구가 된다.
- [ ] 익명 사용자는 조회와 이벤트 수신만 가능하다.
- [ ] Day·Schedule 변경이 다른 브라우저에 한 번만 반영된다.
- [ ] 드래그 한 번에 PATCH가 한 번만 발생한다.
- [ ] 장소 직접 수정 시 이전 좌표가 제거된다.
- [ ] 자정을 넘는 일정이 저장된다.
- [ ] 채팅이 중복 없이 표시된다.
- [ ] 재연결 후 snapshot으로 상태가 복구된다.
- [ ] member 삭제는 거절되고 owner 삭제는 모든 화면에 반영된다.
- [ ] 정산 localStorage 기능이 유지된다.

## 9. 검증 대기

- 백엔드 build, Prisma schema validation, `/health` 200, 404 smoke test 통과
- 백엔드 production dependency 취약점 0건
- 실제 MySQL이 없어 DB E2E 미수행
- 자동화된 API·Socket 통합 테스트 미작성
- 프론트 lint와 production build 통과
- 프론트 production dependency 취약점 0건
- 현재 Node.js 20.18.0은 Vite 권장 최소 버전 20.19보다 낮으므로 실행 환경 업데이트 필요

개발 seed는 기존 데이터를 모두 삭제하므로 공유·운영 DB에서 실행하지 않는다.
로컬 seed 값은 공유 코드 `A1B2C3`, 사용자 `민수` 또는 `철수`, 비밀번호
`1234`다.
