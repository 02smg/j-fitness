# 💪 J휘트니스 - 회원 관리 시스템

J휘트니스 헬스장 회원 관리 웹 앱 — Next.js + TypeScript + Tailwind CSS, Firebase (Auth/Firestore)

## 주요 기능

### 일반 회원

- 회원가입/로그인 (Firebase Auth)
- 이용권 구매 신청 (관리자 승인 방식)
- 회원권/PT/라커 조회
- 출석 기록 및 달력 뷰
- 정지/환불 신청
- 결제 내역 조회
- 문의사항 등록

### 관리자

- 대시보드 (실시간 현황)
- 회원 등록 및 관리
- 회원 상세 (회원권/결제/출석 탭)
- PT/트레이너 관리 (스케줄, 등록, 수정, 삭제)
- 출석 관리 (입장/퇴장)
- 라커 관리
- 일별/월별 매출 조회
- Excel(CSV) 내보내기, 인쇄
- 통계 리포트 (회원/매출/출석)
- 요청 관리 (구매/정지/환불/문의 승인)
- 센터 설정 (영업시간, 비밀번호 변경 등)

## 빠른 시작

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경변수 설정

`.env.local` 파일에 Firebase 설정:

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 http://localhost:3000 접속

## Firebase 프로젝트 정보

- **Project ID**: `gym-manager-1769324419`
- **Region**: asia-northeast3 (서울)

## 페이지 구조

### 공개

- `/` - 랜딩 페이지
- `/login` - 로그인
- `/signup` - 회원가입 (관리자/회원 선택)

### 관리자 (`/admin/`)

- `/admin/dashboard` - 대시보드
- `/admin/members` - 회원 목록
- `/admin/members/[id]` - 회원 상세
- `/admin/register` - 회원 등록
- `/admin/pt` - PT/트레이너 관리
- `/admin/attendance` - 출석 관리
- `/admin/lockers` - 라커 관리
- `/admin/daily-sales` - 일별 매출
- `/admin/monthly-sales` - 월별 매출
- `/admin/reports` - 통계 리포트
- `/admin/requests` - 요청 관리
- `/admin/settings` - 센터 설정

### 회원 (`/member/`)

- `/member/dashboard` - 대시보드
- `/member/tickets` - 내 회원권
- `/member/purchase` - 이용권 구매
- `/member/attendance` - 출석 기록
- `/member/locker` - 내 라커
- `/member/payments` - 결제 내역
- `/member/requests` - 정지/환불 신청
- `/member/inquiry` - 문의사항

## Firestore 컬렉션

- `users` - 사용자 정보 (role: admin/member)
- `purchases` - 구매/회원권 내역
- `sales` - 매출 기록
- `attendance` - 출석 기록
- `lockers` - 라커 배정
- `trainers` - 트레이너 정보
- `pt_schedules` - PT 스케줄
- `member_requests` - 회원 요청 (구매/정지/환불)
- `inquiries` - 문의사항
- `settings` - 센터 설정

## 기술 스택

- **Frontend**: Next.js 13.5, TypeScript, Tailwind CSS 3.4
- **Backend**: Firebase Auth, Cloud Firestore
- **테마**: 다크 모드 (검정 + 파란색 계열)

## Vercel 배포

```bash
npm install -g vercel
vercel login
vercel
```

환경변수는 Vercel 대시보드에서 설정하세요.

## 관리자 설정

회원가입 시 "관리자" 역할을 선택하거나, Firestore에서 사용자 문서의 `role` 필드를 `"admin"`으로 변경하면 관리자 권한이 부여됩니다.
