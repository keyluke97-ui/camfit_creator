# CLAUDE.md — Camfit 크리에이터 포털 (influencer-portal)

> 이 파일은 AI가 이 프로젝트를 올바르게 다루기 위한 설정 문서다.
> 변경 시 `// CHANGED: 사유` 주석을 코드에 남기는 것을 잊지 마라.

---

## 1. Tech Stack & Architecture

| 영역 | 기술 | 버전 |
|------|------|------|
| 프레임워크 | Next.js (App Router) | 16.1.6 |
| UI | React (함수형 컴포넌트만 사용) | 19.2.3 |
| 언어 | TypeScript (strict 모드) | 5.x |
| 스타일 | Tailwind CSS | 4.x |
| 백엔드/DB | Airtable REST API (npm airtable) | 0.12.2 |
| 인증 | JWT (jose), httpOnly 쿠키 `auth-token` | 6.1.3 |
| 패키지 매니저 | npm (package-lock.json 사용) | — |
| 배포 | Vercel (main 브랜치 push → 자동 배포) | — |

**아키텍처 특징:** 별도 백엔드 서버 없음. `app/api/` Route Handler가 유일한 서버 레이어. DB 로직은 `lib/airtable.ts` 한 파일에 집중.

---

## 2. Folder Structure

```
influencer-portal/
├── app/
│   ├── api/                         # API Route Handler만 위치
│   │   ├── auth/login/route.ts      # POST — 로그인, JWT 발급 (channelTypes 포함)
│   │   ├── auth/logout/route.ts     # POST — 쿠키 삭제
│   │   ├── auth/me/route.ts         # GET  — 현재 유저 조회 (channelTypes 포함)
│   │   ├── campaigns/route.ts       # GET  — 프리미엄 등급별 캠페인 목록
│   │   ├── campaigns/apply/route.ts # POST — 프리미엄 캠페인 신청
│   │   ├── applications/my/route.ts     # GET  — 프리미엄 신청 목록
│   │   ├── applications/checkin/route.ts # PATCH — 프리미엄 체크인 수정
│   │   ├── applications/status/route.ts  # PATCH — 프리미엄 예약 상태 변경
│   │   ├── channels/route.ts        # GET  — 채널명 목록 (로그인 드롭다운용)
│   │   └── partner/                 # 🆕 파트너 협찬 API
│   │       ├── campaigns/route.ts       # GET  — 파트너 캠페인 목록 (블로거 403)
│   │       ├── campaigns/apply/route.ts # POST — 파트너 캠페인 신청
│   │       ├── applications/my/route.ts     # GET  — 파트너 신청 목록
│   │       ├── applications/checkin/route.ts # PATCH — 파트너 체크인 수정
│   │       └── applications/status/route.ts  # PATCH — 파트너 예약 변경/취소
│   ├── dashboard/page.tsx           # 메인 대시보드 (프리미엄+파트너 탭 통합)
│   ├── login/page.tsx               # 로그인 페이지
│   ├── layout.tsx                   # 루트 레이아웃 (다크 테마)
│   └── page.tsx                     # / → /dashboard 리다이렉트
├── components/                      # PascalCase 파일명, 컴포넌트 1개 = 파일 1개
│   ├── ApplicationModal.tsx         # 프리미엄 신청 모달
│   ├── CampaignCard.tsx             # 프리미엄 캠페인 카드
│   ├── CheckinModal.tsx             # 프리미엄 체크인 모달
│   ├── HighlightsModal.tsx          # 숙소 특장점 상세 모달
│   ├── SearchableSelect.tsx         # 검색 가능 드롭다운 (로그인용)
│   ├── DashboardTabs.tsx            # 🆕 프리미엄/파트너 탭 스위처
│   ├── PartnerCampaignCard.tsx      # 🆕 파트너 캠페인 카드
│   ├── PartnerApplicationModal.tsx  # 🆕 파트너 신청 모달 (4단계 정책 확인)
│   ├── PartnerCheckinModal.tsx      # 🆕 파트너 체크인 모달
│   └── PartnerCouponDisplay.tsx     # 🆕 쿠폰 코드 표시 + 복사
├── lib/
│   └── airtable.ts                  # ⚠️ Airtable 호출은 반드시 이 파일에서만
├── types/
│   └── index.ts                     # 공유 TypeScript 타입 (Airtable raw + domain)
├── middleware.ts                    # JWT 인증 미들웨어 (루트에 위치)
└── .env.local                       # 환경변수 (커밋 금지)
```

---

## 3. Coding Conventions

### 3.1 파일/네이밍

- 컴포넌트 파일명: **PascalCase** (`CampaignCard.tsx`)
- API route 파일명: 항상 `route.ts`
- lib/util 파일명: **camelCase** (`airtable.ts`)
- 타입 파일: `types/index.ts`에 공유 타입만, 컴포넌트 전용 Props는 해당 파일 내에
- 변수/함수명: **camelCase**, 상수: **UPPER_SNAKE_CASE**. 축약 금지 (`btn` → `button`)

### 3.2 컴포넌트 패턴

관찰(CampaignCard.tsx, ApplicationModal.tsx 등):
- Props 인터페이스를 **파일 상단에 `interface XxxProps`로 정의**한 뒤 바로 컴포넌트에서 사용
- **`export default function`** 으로 컴포넌트 내보내기 (named export 사용하지 않음)
- 클라이언트 hooks(`useState`, `useEffect` 등) 사용 시 **파일 최상단에 `'use client'` 디렉티브 필수**
- 함수형 컴포넌트만 사용. 클래스 컴포넌트 금지

### 3.3 Import 순서

관찰(CampaignCard.tsx, route.ts 등):
```ts
// 1. Next.js / React 코어
import { useState } from 'react';
import { NextResponse } from 'next/server';
// 2. 외부 라이브러리
import { jwtVerify } from 'jose';
// 3. 내부 모듈 (@/ 경로 별칭 사용)
import { getCampaigns } from '@/lib/airtable';
import type { TierLevel } from '@/types';
// 4. 같은 컴포넌트 디렉토리
import ApplicationModal from './ApplicationModal';
```

### 3.4 에러 처리

관찰(모든 API route, lib/airtable.ts):
- API route: 반드시 **try-catch** 감싸고, 에러 시 `NextResponse.json({ error: '...' }, { status: 5xx })`로 반환
- lib 함수: try-catch 내에서 `console.error()` 로깅 후 — 조회 함수는 null/빈 배열 반환, 쓰기 함수는 throw
- **catch 블록에서 에러를 삼키지 않는다.** 최소한 `console.error()`는 반드시 호출

### 3.5 변경 이력 주석

기존 코드 수정 시 반드시:
```ts
// CHANGED: 변경 이유를 한 줄로 기술
```

### 3.6 타입 패턴

관찰(types/index.ts):
- Airtable raw 레코드 타입: `Airtable` 접두사 (`AirtableUserRecord`, `AirtableCampaignRecord`)
- 도메인 타입: 접두사 없이 (`Campaign`, `Application`, `Influencer`)
- `as any` 최소화. 불가피한 경우 주석으로 사유 명시
- Airtable SDK `FieldSet` 타입 한계로 null 설정 시: `as unknown as Partial<FieldSet>` 더블 어설션 사용

### 3.7 보안 규칙

- 외부 링크: 반드시 `target="_blank" rel="noopener noreferrer"`
- API 키, 시크릿: `.env.local`에만 (코드에 직접 넣기 금지)
- 디버그용 API route(`/api/debug` 등): 절대 추가하지 않음
- `filterByFormula`에 사용자 입력: 반드시 `escapeAirtableValue()` 통과

---

## 4. Airtable Architecture

### 테이블 ID

| 테이블 | 환경변수 | ID |
|--------|---------|-----|
| 크리에이터 명단 (로그인 소스) | `AIRTABLE_CREATOR_TABLE_ID` | `tblkuPln7nquA3dLA` |
| 유저 (프리미엄 협찬 크리에이터) | `AIRTABLE_USER_TABLE_ID` | `tblDOC7jcmeuQzNJY` |
| 캠페인 (캠지기 모집 폼) | `AIRTABLE_CAMPAIGN_TABLE_ID` | `tblt5o7BJFOXjfT3c` |
| 신청 (Application) | `AIRTABLE_APPLICATION_TABLE_ID` | `tblIV8Wk4SLx2Hh91` |
| 파트너 캠페인 (🆕) | `AIRTABLE_PARTNER_CAMPAIGN_TABLE_ID` | `tbl5X4YNIow179dTQ` |
| 파트너 신청 (🆕) | `AIRTABLE_PARTNER_APPLICATION_TABLE_ID` | `tblAc3fbe3oA67Ppo` |

### 등급(Tier) 시스템

크리에이터 3개 등급, 각 등급마다 Airtable 필드명의 이모지 접두사가 다름:

| 등급 | TierLevel | 이모지 | 협찬 금액 필드 | 모집 인원 필드 | 신청 가능 인원 필드 |
|------|-----------|--------|--------------|--------------|----------------|
| Icon | `'3'` | `⭐️` | `⭐️ 협찬 제안 금액` | `⭐️ 모집 희망 인원` | `⭐️ 신청 가능 인원` |
| Partner | `'2'` | `✔️` | `✔️ 협찬 제안 금액` | `✔️ 모집 인원` | `✔️ 신청 가능 인원` |
| Rising | `'1'` | `🔥` | `🔥 협찬 제안 금액` | `🔥 모집 인원` | `🔥 신청 가능 인원` |

캠페인 관련 필드 추가·수정 시 `getTierFields()` 함수와 `AirtableCampaignRecord` 인터페이스를 **반드시 동시에** 업데이트하라.

### ⚠️ 통합(2026-05~) — 파트너 협찬은 레거시, 신규 유입 없음

2026-05 프리미엄·파트너 통합으로 **별도 "파트너 협찬" 프레임은 폐기**되었다. 이제 쿠폰 이벤트는 프리미엄 캠페인(`캠지기 모집 폼` = `AIRTABLE_CAMPAIGN_TABLE_ID`)의 `쿠폰이벤트희망` 플래그로 표현되며, 포털은 해당 캠페인에 "팔로워 쿠폰 협찬" 뱃지 + 조건을 노출한다([Campaign.couponEvent](types/index.ts), [getCampaigns](lib/airtable.ts), [CampaignCard](components/CampaignCard.tsx)).

- **신규 캠페인은 파트너 테이블(`tbl5X4YNIow179dTQ`/`tblAc3fbe3oA67Ppo`)로 들어오지 않는다.** 해당 테이블은 레거시 데이터만 존속(실측: 테스트 2건/오픈전, 신청 0건).
- 아래 v3/v3.1 파트너 함수(`getPartnerCampaigns`/`applyPartnerCampaign` 등)와 `/api/partner/**`, 파트너 전용 컴포넌트는 **레거시 — 통합 후 활성 경로가 아니다.** UI는 `PARTNER_COMING_SOON=true`로 가려져 있고, `getPartnerCampaigns`도 오픈전 필터로 빈 배열을 반환한다.
- **삭제는 보류**: 어드민 자동 발행 파이프라인이 아직 파트너 테이블에 바인딩돼 있고(프리미엄 테이블 이전 미완), v3.1 쿠폰 풀 분배 로직은 향후 쿠폰 코드 노출을 프리미엄 테이블에 재구현할 때의 레퍼런스다. 자동발행 이전이 끝나면 정리.

### 파트너 협찬 — v3(2026-04-22~) 등급 체계 실질 도입 [레거시]

파트너 협찬은 프리미엄과 **독립된** 3등급 시스템(⭐️ 아이콘 / ✔️ 파트너 / 🔥 라이징)을 사용한다.

- **Airtable 필드명 세트 (v3.1)**: `⭐️/✔️/🔥 모집 희망 인원`, `⭐️/✔️/🔥 신청 가능 인원` (v3.1: 어드민 자동 발행 도입으로 `쿠폰 수량` 3개 필드 삭제됨)
- **헬퍼**: `getPartnerTierFields(tier)` (파트너 전용 — 프리미엄의 `getTierFields`와 혼용 금지. `total`/`available` 2키만 반환)
- **등급 비율 1:1:1 강제**: 캠지기 퍼널에서 `등급별 모집 인원 단가`(1 or 2)가 3등급에 동일 적용됨. 비대칭 모집 불가.
- **할인은 단일** `할인 금액` 필드 (평일/주말 분리 없음, v2의 `평일할인금액`/`주말할인금액` 삭제됨)
- **쿠폰 적용 요일**은 별도 `쿠폰 적용 요일` 필드 (v2 `숙박유형`을 리네이밍. 3번째 옵션 "평일+주말+공휴일"이 공휴일 포함 의미 — 별도 `공휴일쿠폰여부` 체크 필드 없음)
- **쿠폰 1장 = 예약 1건**. 박수와 무관하게 예약 건당 할인 1회 적용.
- **JWT tier 전달**: 파트너 API 2곳(`/api/partner/campaigns`, `/api/partner/campaigns/apply`)이 JWT payload의 `tier`를 필수로 읽음. UI는 `myTier`로 내 등급 기준 잔여만 표시.
- **자동 마감 조건**: 3등급 `신청 가능 인원` 합계 = 0일 때만 `모집상태: 마감` 전환.
- **기타 필드**: `방문기간시작`, `방문기간종료` — 방문 가능 기간 / `총 팔로워 쿠폰 수` (Formula: `등급별 모집 희망 인원 × 인당 팔로워 쿠폰`) / `인당 팔로워 쿠폰` (스페이스 있음)

### 파트너 협찬 v3.1 — 어드민 자동 발행 + 포털 동기 분배 (2026-04-28~) [레거시]

> 통합 후 비활성 경로. 아래는 자동발행 프리미엄 이전 시 재구현 레퍼런스로 보존한다. 실제로는 신규 유입이 없어 동작하지 않는다.

**자동 발행 (어드민 영역 — 포털 코드 외부)**:
- 운영자가 캠페인의 `🎟️ 쿠폰 자동 발행` 체크박스 ON → 어드민 자동화 10초 내외로 캠페인 `팔로워 쿠폰 코드` 필드에 N개 코드를 줄바꿈으로 채움
- 운영자가 풀 채워진 걸 확인하고 `모집 상태`를 `모집중`으로 전환 → 그 시점부터 신청 받음

**신청별 분배 (포털 동기 처리, [applyPartnerCampaign](lib/airtable.ts) 본체)**:
1. 캠페인 `팔로워 쿠폰 코드` 풀의 첫 줄(myCode) 추출
2. 신청 레코드 생성 시 `팔로워 쿠폰 코드` 필드에 myCode 저장
3. 캠페인 `팔로워 쿠폰 코드` = myCode 제거한 나머지 / `배포 완료된 쿠폰` += myCode (이력)
4. 사후 검증: 캠페인 다시 find → `배포 완료된 쿠폰`에 myCode 들어가 있는지 확인. 미포함이면 race로 판단 → 신청 레코드 destroy 롤백 + `CAMPAIGN_RACE` 에러
5. 새 에러 코드: `COUPON_POOL_EMPTY` (운영 실수로 풀 비어있는데 모집중 전환된 경우), `CAMPAIGN_RACE` (사후 검증 실패)

**보안**: `mapPartnerCampaignRecord()`의 `followerCouponCode`는 항상 빈 string 반환. 캠페인 풀 전체를 도메인 객체에 담으면 `/api/partner/campaigns` 응답으로 신청 안 한 사람한테도 N개 코드가 노출되므로 차단함.

**관련 Airtable 필드 (v3.1)**:
- 파트너 캠페인 테이블: `팔로워 쿠폰 코드` (Long text, 풀), `배포 완료된 쿠폰` (Long text, 이력)
- 파트너 신청 테이블: `팔로워 쿠폰 코드` (Single line text, 분배된 본인 코드 — 캠페인 lookup이 아닌 자체 필드)

레거시 파트너 코드를 (정리 전까지) 손볼 일이 생기면 `getPartnerTierFields()` + `mapPartnerCampaignRecord()` + `applyPartnerCampaign()` + `getPartnerApplications()` + `AirtablePartnerCampaignRecord` + `AirtablePartnerApplicationRecord` 인터페이스를 함께 업데이트하라. (단, 신규 쿠폰 이벤트는 위 통합 경로 — 프리미엄 `Campaign.couponEvent` — 로 작업한다.)

### 핵심 규칙

1. **Airtable 호출은 `lib/airtable.ts`에서만** — API route에서 직접 `airtable.base()` 호출 금지
2. **`filterByFormula` 사용자 입력 → `escapeAirtableValue()` 필수**
3. `cellFormat: 'string'` 사용 시 `sort` 옵션과 함께 쓰지 마라. JS에서 정렬하라
4. Link to Another Record 필드는 배열(`string[]`)로 반환됨. `Array.isArray()` 분기 처리 필요

---

## 5. Authentication & Middleware

### 인증 흐름

1. 크리에이터: 채널명 드롭다운 선택 + 생년월일(YYMMDD 6자리) + 연락처 뒤 4자리 입력
2. `POST /api/auth/login` → Airtable 유저 테이블 조회 → 검증
3. 성공 시 JWT 발급 → httpOnly 쿠키 `auth-token`에 저장 (7일 만료)
4. JWT payload: `id`, `channelName`, `tier`, `channelTypes` (🆕 파트너 접근 제어용)
5. 로그인 실패 3회 이상: 경고 배너 표시 (failCount 기반 점진적 에러 UX)

### middleware.ts 보호 경로

```ts
matcher: ['/dashboard/:path*', '/login']
```

- `/dashboard/**`: JWT 검증 실패 시 `/login` 리다이렉트
- **API routes(`/api/**`)는 미들웨어 보호 범위 밖** → 각 API route에서 직접 JWT 검증 필요

### JWT_SECRET 패턴

모든 API route 파일 최상단에 동일한 가드 패턴을 사용한다:

```ts
if (!process.env.NEXTAUTH_SECRET) {
    throw new Error('NEXTAUTH_SECRET 환경변수가 설정되지 않았습니다.');
}
const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
```

---

## 6. Design System

### 색상 팔레트

| 역할 | 값 |
|------|-----|
| 페이지 배경 | `#111111` |
| 카드/컨테이너 배경 | `#1E1E1E` |
| 테두리 (기본) | `#333333` |
| 테두리 (hover) | `#01DF82` |
| 텍스트 (기본) | `white` |
| 텍스트 (보조) | `#B0B0B0` 또는 `#9CA3AF (gray-400)` |
| 주요 액센트 (녹색) | `#01DF82` |
| 액센트 배경 (연한) | `#01DF82/10` |
| 카카오톡 버튼 배경 | `#FEE500` |
| 카카오톡 버튼 텍스트 | `#3C1E1E` |

### 컴포넌트 클래스 패턴

```tsx
// 카드
<div className="bg-[#1E1E1E] border border-[#333333] rounded-lg hover:border-[#01DF82] transition-colors">

// 주요 버튼 (CTA)
<button className="bg-[#01DF82] text-black font-bold rounded-lg hover:bg-[#00C972] transition-colors">

// 보조 버튼
<button className="bg-[#2A2A2A] text-white rounded-lg hover:bg-[#333333] transition-colors">

// 태그/뱃지
<span className="bg-[#01DF82]/15 text-[#01DF82] border border-[#01DF82]/30 rounded-full">
```

### 디자인 원칙

- **다크 테마 고정** (라이트 모드 없음)
- **모바일 퍼스트** — 사용자 90%가 모바일. 최대 너비: `max-w-md`
- `rounded-lg` (카드), `rounded-xl`/`rounded-2xl` (모달), `rounded-full` (태그)
- 모든 사용자 대면 텍스트는 **한국어**

---

## 7. Environment Variables

```bash
# Airtable 공통
AIRTABLE_ACCESS_TOKEN=       # Airtable Personal Access Token
AIRTABLE_BASE_ID=            # Airtable Base ID
AIRTABLE_CREATOR_TABLE_ID=   # 크리에이터 명단 테이블 ID (tblkuPln7nquA3dLA) — 로그인 소스

# 프리미엄 협찬
AIRTABLE_USER_TABLE_ID=      # 유저 테이블 ID (tblDOC7jcmeuQzNJY)
AIRTABLE_CAMPAIGN_TABLE_ID=  # 캠페인 테이블 ID (tblt5o7BJFOXjfT3c)
AIRTABLE_APPLICATION_TABLE_ID= # 신청 테이블 ID (tblIV8Wk4SLx2Hh91)

# 파트너 협찬 (🆕)
AIRTABLE_PARTNER_CAMPAIGN_TABLE_ID=  # 파트너 캠페인 테이블 ID (tbl5X4YNIow179dTQ)
AIRTABLE_PARTNER_APPLICATION_TABLE_ID= # 파트너 신청 테이블 ID (tblAc3fbe3oA67Ppo)

# JWT
NEXTAUTH_SECRET=             # JWT 서명용 시크릿 (미설정 시 서버 즉시 에러 — 의도적 설계)
NEXTAUTH_URL=                # 서버 URL (예: https://your-domain.vercel.app)
```

---

## 8. Behavior Guidelines

- **원본 파일을 직접 수정하라.** 부분 코드 조각만 보여주지 마라
- **의존성은 이미 설치되어 있다고 가정하라.** 설치 안내 생략
- 새 API route 추가 시 → `middleware.ts`의 `matcher`에 보호가 필요한지 확인
- 새 컴포넌트 추가 시 → `components/` 폴더에 PascalCase 파일명으로 생성
- Airtable 필드명에 이모지가 포함될 수 있으니 복사 시 이모지가 손상되지 않도록 주의
- `npm run lint`로 ESLint 통과 여부를 항상 확인하라

---

## 9. External References

- **Airtable 필드 구조 변경 시**: `lib/airtable.ts`의 `getTierFields()` + `types/index.ts`의 `AirtableCampaignRecord` 두 곳을 동시에 수정하라
- **Vercel 배포**: main 브랜치 push 시 자동 배포. 환경변수는 Vercel 대시보드에서 관리. **PR은 squash 머지**(커밋이 하나로 합쳐짐 — 아래 §10 배포 점검 규칙 필독)
- **카카오톡 채널 CTA URL**: `http://pf.kakao.com/_fBxaQG` (문의/변경 유도용)
- **GitHub 레포**: `https://github.com/keyluke97-ui/camfit_creator`
- **로컬 문서**: `handover.premium_creator.md` (인수인계 문서, git 미추적 — 로컬에서 참고)

---

## 10. Common Pitfalls (오답노트)

<!-- 프로젝트 진행 중 반복적으로 발생하는 실수를 아래에 누적 기록한다.
     새 항목은 위에 추가한다 (최신 순). -->

### [2026-06] 배포 상태 판단 — 반드시 `origin/main` 기준 + 파일 diff (커밋 목록 신뢰 금지)

**배경:** 로컬 `main`이 낡은 채로 "feature 브랜치가 프로덕션보다 18커밋 앞섰다"고 잘못 판단 → 통째 머지하면 프로덕션 핫픽스(보안 가드 + 검색 버그)가 거꾸로 되돌아갈 뻔함. 이 레포는 **squash 머지**라 feature 브랜치 원본 커밋과 main의 합쳐진 커밋이 SHA가 달라, 커밋 목록 비교(`git log main..HEAD`)는 **실제로 합쳐진 변경도 "안 올라간 것"처럼 보이게 만든다.**

**배포/브랜치 상태를 언급하기 전 필수 절차:**
1. **먼저 `git fetch origin`** — 로컬 `main`은 신뢰하지 마라(낡았을 수 있음). 프로덕션 기준은 항상 **`origin/main`**.
2. **무엇이 진짜 안 올라갔나는 커밋 목록이 아니라 파일 diff로 판단**: `git diff origin/main..HEAD --stat`. 커밋 목록(`git log origin/main..HEAD`)은 squash 때문에 과장된다.
3. **feature 브랜치를 통째로 main에 머지하지 마라.** 오래된 브랜치는 프로덕션보다 **뒤처진 파일**이 섞여 있어 핫픽스를 되돌린다. 특정 변경만 보낼 땐 **`origin/main`에서 새 브랜치를 떼고 해당 커밋만 cherry-pick** → PR.
4. 비개발자 사용자에게 "배포됐다/안 됐다"를 단정하기 전에 위 1~2를 반드시 수행.

**⚠️ `feature/dashboard-ia-v3` 브랜치는 STALE — 통째 머지 금지**
이 브랜치는 main 분기 후 main에 들어간 핫픽스(콘텐츠 검색 `channelName` trim 정규화 BUG-B, `searchCreatorPremiumCampaigns` 빈 채널명 가드 BUG-A, 14일/용어 톤 수정)를 못 받았다. 통째 머지 시 위 수정들이 되돌아간다. 이 브랜치의 신규 작업이 필요하면 **개별 커밋만 `origin/main` 기반 새 브랜치로 cherry-pick**할 것. (오늘 쿠폰 제외 안내는 그렇게 [#6](https://github.com/keyluke97-ui/camfit_creator/pull/6)으로 분리 배포함.)

### [2026-04] 파트너 협찬 v3.1 — 어드민 자동 발행 + 동기 분배 [레거시]

> 2026-05 통합 후 이 섹션은 **비활성 레거시 경로**다. 신규 쿠폰 이벤트는 프리미엄 `Campaign.couponEvent`로 처리한다(위 통합 배너 참조). 아래 "제거 금지"는 *통합 정리 작업 전까지* 임의로 손대지 말라는 의미이며, 자동발행 프리미엄 이전이 끝나면 일괄 정리 대상이다. 단, 보안 픽스(`followerCouponCode` 풀 노출 차단)는 정리 후에도 유지.

**⚠️ 캠페인 풀 전체를 도메인 객체에 매핑 금지 (보안)**
[mapPartnerCampaignRecord()](lib/airtable.ts:660)의 `followerCouponCode`는 항상 빈 string. 캠페인 `팔로워 쿠폰 코드` 필드는 어드민 자동 발행이 N개 코드를 줄바꿈으로 채운 풀이라, 도메인 객체에 그대로 담으면 `/api/partner/campaigns` 응답으로 신청 안 한 사람한테도 모든 코드가 노출된다. 신청자 본인 코드는 `applyPartnerCampaign` 반환값 또는 신청 레코드 자체 `팔로워 쿠폰 코드` 필드(via `getPartnerApplications`)로 받는다.

**⚠️ `applyPartnerCampaign` 동기 분배 로직 제거 금지**
신청 시 캠페인 풀 첫 줄을 슬라이싱해 신청 레코드의 자체 `팔로워 쿠폰 코드` 필드에 저장하고, 캠페인 풀에서 그 줄을 제거 + `배포 완료된 쿠폰`에 append 한다. 사후 검증으로 `배포 완료된 쿠폰`에 본인 myCode 포함 여부를 확인 → 미포함이면 race로 판단 → 신청 레코드 destroy + `CAMPAIGN_RACE` 에러. (레거시 — 통합 정리 전까지 임의 제거 금지.)

**⚠️ 파트너에 프리미엄 Tier 헬퍼 혼용 금지**
파트너 협찬은 프리미엄과 **독립된** 3등급 시스템을 사용한다. 프리미엄의 `getTierFields()`를 파트너 코드에 사용하면 안 된다 — 파트너 전용 `getPartnerTierFields(tier)`를 사용하라. v3.1 시점 파트너 등급 필드는 `⭐️/✔️/🔥 모집 희망 인원`, `⭐️/✔️/🔥 신청 가능 인원` 2셋. (이전 v3의 `쿠폰 수량` 3개 필드는 어드민 자동 발행 도입으로 삭제됨.)

**⚠️ 파트너 할인 금액 하드코딩 금지 (v3 스키마 변경)**
v3에서 할인 금액은 단일 `할인 금액` 필드로 통합되었다 (v2의 `평일할인금액`/`주말할인금액` 분리 삭제). 반드시 Airtable `할인 금액` 필드에서 가져와야 한다. 쿠폰 적용 요일은 `쿠폰 적용 요일` 필드(v2 `숙박유형` 리네이밍)로 관리하며, 공휴일 포함 여부는 해당 필드의 3번째 옵션으로 표현됨(별도 `공휴일쿠폰여부` 필드 없음).

**⚠️ 블로거 접근 제어 이중 방어 유지**
파트너 탭 접근 제어는 프론트(`DashboardTabs`에서 탭 숨김) + 백엔드(`/api/partner/**`에서 403)를 동시에 유지해야 한다. 한쪽만 있으면 URL 직접 접근으로 우회 가능.

**⚠️ `applyPartnerCampaign`의 Race Condition 방어 제거 금지**
프리미엄과 동일하게 2단계 검증(사전 체크 + 사후 검증 + 롤백) + 자동 마감(`모집상태` → `마감`) 로직이 구현되어 있다. (레거시 — 통합 정리 전까지 임의 제거 금지.)

**⚠️ 파트너 환경변수 2개 Vercel 미등록 시 서버 에러**
`AIRTABLE_PARTNER_CAMPAIGN_TABLE_ID`, `AIRTABLE_PARTNER_APPLICATION_TABLE_ID`가 Vercel에 등록되지 않으면 파트너 API가 전부 실패한다.

### [2026-03] 초기 구조 분석 기반 잠재적 함정

**⚠️ Airtable `FieldSet` null 설정**
SDK의 `FieldSet` 타입은 `null`을 허용하지 않는다. 필드를 초기화(지우기)해야 할 때:
```ts
// ❌ 타입 에러
{ '입실일': null }
// ✅ 올바른 방법
{ '입실일': null } as unknown as Partial<FieldSet>
```

**⚠️ 새 API route 추가 시 JWT 검증 누락**
`middleware.ts`는 `/dashboard/**`만 보호한다. `/api/**` 경로는 미들웨어 대상이 아니므로, 새 API route에서 반드시 직접 JWT 검증 로직을 추가하라. 위 §5의 `JWT_SECRET` 패턴을 그대로 복사하라.

**⚠️ `cellFormat: 'string'` + `sort` 동시 사용 충돌**
Airtable SDK에서 `cellFormat: 'string'`과 `sort` 옵션을 함께 사용하면 오류가 발생한다. `sort`를 제거하고 JS에서 정렬하라:
```ts
// ❌ 충돌
.select({ cellFormat: 'string', sort: [{ field: 'xxx' }] })
// ✅ JS 정렬로 대체
const results = await table.select({ cellFormat: 'string' }).all();
results.sort((a, b) => ...);
```

**⚠️ 등급 이모지 필드명 손상**
Airtable 필드명(`⭐️ 협찬 제안 금액`, `✔️ 모집 인원`, `🔥 협찬 제안 금액`)을 복사·붙여넣기 시 이모지가 깨질 수 있다. 반드시 `getTierFields()`의 기존 문자열을 재사용하라.

**⚠️ `applyCampaign`의 Race Condition**
Airtable에는 트랜잭션이 없다. 동시 신청 시 `availableCount`가 음수가 될 수 있으므로, 이미 구현된 2단계 검증(사전 체크 + 사후 검증 + 롤백)을 절대 제거하지 마라.

**⚠️ Link to Another Record 필드 반환값**
`크리에이터 채널명 (크리에이터 명단)` 같은 Link to Another Record 필드는 `string`이 아닌 `string[]` 배열로 반환된다. 직접 문자열 비교 시 반드시 `Array.isArray()` 분기를 추가하라.

**⚠️ `NEXTAUTH_SECRET` 미설정**
환경변수가 없으면 서버 시작 시 즉시 에러가 발생한다(의도적 설계). 로컬 개발 시 `.env.local`에 반드시 설정하라.
