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

### 파트너 협찬 — v3(2026-04-22~) 등급 체계 실질 도입

파트너 협찬은 프리미엄과 **독립된** 3등급 시스템(⭐️ 아이콘 / ✔️ 파트너 / 🔥 라이징)을 사용한다.

- **Airtable 필드명 세트**: `⭐️/✔️/🔥 쿠폰 수량`, `⭐️/✔️/🔥 모집 희망 인원`, `⭐️/✔️/🔥 신청 가능 인원`
- **헬퍼**: `getPartnerTierFields(tier)` (파트너 전용 — 프리미엄의 `getTierFields`와 혼용 금지. 프리미엄은 `협찬 제안 금액` 필드 셋, 파트너는 `쿠폰 수량` 필드 셋이라 이름 다름)
- **등급 비율 1:1:1 강제**: 캠지기 퍼널에서 `등급별 모집 인원 단가`(1 or 2)가 3등급에 동일 적용됨. 비대칭 모집 불가.
- **할인은 단일** `할인 금액` 필드 (평일/주말 분리 없음, v2의 `평일할인금액`/`주말할인금액` 삭제됨)
- **쿠폰 적용 요일**은 별도 `쿠폰 적용 요일` 필드 (v2 `숙박유형`을 리네이밍. 3번째 옵션 "평일+주말+공휴일"이 공휴일 포함 의미 — 별도 `공휴일쿠폰여부` 체크 필드 없음)
- **쿠폰 1장 = 예약 1건**. 박수와 무관하게 예약 건당 할인 1회 적용.
- **JWT tier 전달**: 파트너 API 2곳(`/api/partner/campaigns`, `/api/partner/campaigns/apply`)이 JWT payload의 `tier`를 필수로 읽음. UI는 `myTier`로 내 등급 기준 잔여만 표시.
- **자동 마감 조건**: 3등급 `신청 가능 인원` 합계 = 0일 때만 `모집상태: 마감` 전환.
- **기타 필드**: `방문기간시작`, `방문기간종료` — 방문 가능 기간 / `총 팔로워 쿠폰 수` (Formula) / `인당 팔로워 쿠폰` (스페이스 있음)

파트너 필드 수정 시 `getPartnerTierFields()` + `mapPartnerCampaignRecord()` 함수와 `AirtablePartnerCampaignRecord` 인터페이스를 **반드시 동시에** 업데이트하라.

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
- **Vercel 배포**: main 브랜치 push 시 자동 배포. 환경변수는 Vercel 대시보드에서 관리
- **카카오톡 채널 CTA URL**: `http://pf.kakao.com/_fBxaQG` (문의/변경 유도용)
- **GitHub 레포**: `https://github.com/keyluke97-ui/camfit_creator`
- **로컬 문서**: `handover.premium_creator.md` (인수인계 문서, git 미추적 — 로컬에서 참고)

---

## 10. Common Pitfalls (오답노트)

<!-- 프로젝트 진행 중 반복적으로 발생하는 실수를 아래에 누적 기록한다.
     새 항목은 위에 추가한다 (최신 순). -->

### [2026-04] 파트너 협찬 개발 기반 함정

**⚠️ 파트너에 프리미엄 Tier 헬퍼 혼용 금지 (v3 변경)**
파트너 협찬은 v3(2026-04-22~)부터 프리미엄과 **독립된** 3등급 시스템을 사용한다. 단, 프리미엄의 `getTierFields()`를 파트너 코드에 사용하면 안 된다 — 파트너 전용 `getPartnerTierFields(tier)`를 사용하라. 두 헬퍼는 필드 셋이 다르다(프리미엄: `협찬 제안 금액`, 파트너: `쿠폰 수량`). 파트너 Airtable 필드는 `⭐️/✔️/🔥 쿠폰 수량`, `⭐️/✔️/🔥 모집 희망 인원`, `⭐️/✔️/🔥 신청 가능 인원` 세트를 사용한다.

**⚠️ 파트너 할인 금액 하드코딩 금지 (v3 스키마 변경)**
v3에서 할인 금액은 단일 `할인 금액` 필드로 통합되었다 (v2의 `평일할인금액`/`주말할인금액` 분리 삭제). 반드시 Airtable `할인 금액` 필드에서 가져와야 한다. 쿠폰 적용 요일은 `쿠폰 적용 요일` 필드(v2 `숙박유형` 리네이밍)로 관리하며, 공휴일 포함 여부는 해당 필드의 3번째 옵션으로 표현됨(별도 `공휴일쿠폰여부` 필드 없음).

**⚠️ 블로거 접근 제어 이중 방어 유지**
파트너 탭 접근 제어는 프론트(`DashboardTabs`에서 탭 숨김) + 백엔드(`/api/partner/**`에서 403)를 동시에 유지해야 한다. 한쪽만 있으면 URL 직접 접근으로 우회 가능.

**⚠️ `applyPartnerCampaign`의 Race Condition 방어 제거 금지**
프리미엄과 동일하게 2단계 검증(사전 체크 + 사후 검증 + 롤백) + 자동 마감(`모집상태` → `마감`) 로직이 구현되어 있다. 이 패턴을 절대 제거하지 마라.

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
