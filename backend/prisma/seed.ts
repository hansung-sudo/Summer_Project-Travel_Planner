// 더미 데이터 (UI 생성, API 테스트 목적)
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('더미 데이터 삽입 시작...');

  // 1. 기존 데이터 초기화 (충돌 방지용)
  await prisma.message.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.day.deleteMany();
  await prisma.participant.deleteMany();
  await prisma.planner.deleteMany();

  // 2. Planner 생성
  const planner = await prisma.planner.create({
    data: {
      title: '제주도 여행 계획',
      share_code: 'a1b2c3d4-1234-5678-1234-abcd1234efgh', // 36글자 UUID 샘플
    },
  });

  // 3. Participant 생성
  const owner = await prisma.participant.create({
    data: {
      planner_id: planner.id,
      name: '민수',
      password_hash: '$2b$10$eImiTXuWVxfM37...', // bcrypt 해시값 샘플
      role: Role.owner, // 방장
    },
  });

  const member = await prisma.participant.create({
    data: {
      planner_id: planner.id,
      name: '철수',
      password_hash: '$2b$10$eImiTXuWVxfM37...',
      role: Role.member, // 일반 참여자
    },
  });

  // 4. Day 생성
  const day1 = await prisma.day.create({
    data: {
      planner_id: planner.id,
      day_number: 1,
      label: '1일차',
    },
  });

  const day2 = await prisma.day.create({
    data: {
      planner_id: planner.id,
      day_number: 2,
      label: '2일차',
    },
  });

  // 5. Schedule 생성
  await prisma.schedule.create({
    data: {
      day_id: day1.id,
      start_time: '09:00',
      end_time: '11:30',
      place_name: '성산일출봉',
      place_lat: 33.4586000,
      place_lng: 126.9426000,
      content: '일출 감상 및 등산하기',
      created_by: owner.id, // 민수가 작성
    },
  });

  await prisma.schedule.create({
    data: {
      day_id: day1.id,
      start_time: '23:00',
      end_time: '08:00',
      place_name: null, // 장소 지정 안 한 일정
      place_lat: null,
      place_lng: null,
      content: '취침 및 휴식',
      created_by: member.id, // 철수가 작성
    },
  });

  await prisma.schedule.create({
  data: {
    day_id: day2.id,
    start_time: "13:00",
    end_time: "15:00",
    place_name: "협재 해수욕장",
    place_lat: 33.3945000,
    place_lng: 126.2420000,
    content: "해수욕 및 서핑",
    created_by: member.id, // 철수가 작성
  },
});

  // 6. Message 생성
  await prisma.message.create({
    data: {
      planner_id: planner.id,
      participant_id: owner.id,
      content: '내일 몇 시에 만날까?',
    },
  });

  await prisma.message.create({
    data: {
      planner_id: planner.id,
      participant_id: member.id,
      content: '9시 어때?',
    },
  });

  console.log('✅ 더미 데이터 삽입 완료');
}

main()
  .catch((e) => {
    console.error('❌ 에러 발생:', e);
    throw e;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });