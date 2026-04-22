# SDD: 파트너 협찬 기능 v3 — 등급 체계 개편 및 할인 통합

> 작성일: 2026-04-22
> 버전: v3
> 상태: 구현 완료
> 이전 버전: `specs/partner-sponsorship-v2.md`
> 설계 원본: `docs/superpowers/plans/2026-04-21-partner-sponsorship-v3.md` (camjigi_claude)
> 관련 PR: camfit-partner PR #1 / premium_dashboard PR #1 / influencer-portal PR #1

---

## Problem Statement

v2에서 구현된 파트너 협찬은 할인 금액이 평일/주말로 분리되어 있고, 등급(⭐️/✔️/🔥) 필드는 Airtable에 존재하지만 실제 저장·조회에 사용되지 않았다. 그 결과:

- 3개 서비스(캠지기 퍼널, 대시보드, 크리에이터 포털)가 서로 다른 스키마 관점으로 동작
- 운영팀의 쿠폰 관리 부담이 요일별로 2배
- 크리에이터 포털이 등급 시스템을 실제로 활용하지 못함

v3에서 이 불일치를 일괄 정리한다.

---

## Goals

1. 할인 금액을 단일 필드로 통합 (평일/주말 분리 폐기)
2. 등급 체계(⭐️/✔️/🔥)를 캠지기 퍼널부터 크리에이터 포털까지 실질 적용
3. Airtable 스키마 표준화 (필드명 스페이스 통일, 레거시 필드 정리)
4. 3등급 합산 0 시 자동 마감으로 운영 수동 개입 제거

---

## Non-Goals

1. **결제/정산 시스템 통합** — 기존 수기 정산 프로세스 유지
2. **캠지기 대시보드 신규 기능 추가** — 기존 필드 매핑 업데이트만
3. **등급 비율 자유화** — v3에서는 1:1:1 고정 (B1 방식, 결정사항 #1 참조)

---

## 결정 사항 (9건)

| # | 항목 | 결정값 |
|---|------|-------|
| 1 | 모집 규모 입력 방식 | **B1**: 등급 비율 1:1:1 강제. 모집 규모 2개 카드(3명/6명) 중 선택 + 인당 쿠폰 자유 |
| 2 | 등급 안내 바텀시트 가격 표시 | **A**: 가격 완전 제거 (파트너는 쿠폰 기반이라 가격이 혼동 유발) |
| 3 | 할인 금액 입력 방식 | **Y**: 프리셋 버튼 3개(1만/2만/3만) + 직접 설정(1~5만, 5천원 step) |
| 4 | 공휴일 쿠폰 적용 체크박스 | **제거** (3번째 옵션 "평일+주말+공휴일" 선택이 곧 동의로 간주. 약관에 명문화) |
| 5 | 인당 팔로워 쿠폰 입력 UI | **가**: 3개 버튼 (10/20/30장, 라벨: 테스트/추천/최대 노출) |
| 6 | 할인 금액 범위 | 1~5만원 유지 |
| 7 | 기본값 정책 | **모든 입력에 기본값 없음** (명시적 선택 필수) |
| 8 | 총 쿠폰 상한 | 제약 없음 (최대 6명 × 30장 = 180장). **예상 할인 부담액 실시간 계산 표시** |
| 9 | 마이그레이션 전략 | 현재 Airtable 운영 레코드 **0건** → 레거시 필드 정리. 신규 스키마 클린 리셋 |

---

## Part A: Airtable 스키마 — v3 변경 사항

### A1. 파트너 캠페인 테이블

#### ✅ 유지 (변경 없음)

| 필드명 | 타입 | 비고 |
|------|------|------|
| `캠핑장명` | Text | |
| `대표자명` | Text | |
| `연락처` | Phone | |
| `이메일` | Email | |
| `사업자번호` | Text | |
| `소재 권역` | Single select | 수도권/강원/충청/전라/경상/제주 |
| `숙소 소개` | Long text | |
| `제공 가능한 사이트 종류` | Text | |
| `비고(메시지)` | Long text | |
| `크리에이터 방문 가능 시작일` | Date | |
| `크리에이터 방문 가능 종료일` | Date | |
| `쿠폰 유효 시작일` | Date | |
| `쿠폰 유효 종료일` | Date | |
| `취소/변경 정책 동의` | Checkbox | |
| `모집 상태` | Single select | 오픈전/모집중/마감 |
| `신청일시` | Date | |
| `크리에이터 쿠폰 코드` | Text | 운영팀 수기 입력 |
| `팔로워 쿠폰 코드` | Text | 운영팀 수기 입력 |
| `캠핏링크` | URL | 크리에이터 포털 전용 |
| `숙박박수(크리에이터 사이드)` | Number | 크리에이터 포털 전용 |

#### 🆕 v3 신규 추가

| 필드명 | 타입 | 설명 |
|------|------|------|
| `할인 금액` | Number | 단일 할인 금액. 1~50,000원. 평일/주말 통합 |
| `쿠폰 적용 요일` | Single select | `평일전용` / `평일+주말(금토)` / `평일+주말+공휴일` |
| `등급별 모집 인원 단가` | Number | 1 또는 2. 전 등급 동일 적용 (1:1:1 강제) |
| `인당 팔로워 쿠폰` | Number | 10 / 20 / 30 중 선택. 전 등급 동일 적용 |
| `총 팔로워 쿠폰 수` | Formula | `{⭐️ 쿠폰 수량} + {✔️ 쿠폰 수량} + {🔥 쿠폰 수량}` 자동 합산 |

#### 🟢 v3 활성화 — 등급별 9개 필드 (기존 존재, 이제 실제로 채워짐)

| 필드 | 저장 규칙 |
|------|----------|
| `⭐️ 쿠폰 수량` / `✔️ 쿠폰 수량` / `🔥 쿠폰 수량` | 해당 등급 총 쿠폰 수 = `인당 팔로워 쿠폰` × `등급별 모집 인원 단가` |
| `⭐️ 모집 희망 인원` / `✔️ 모집 희망 인원` / `🔥 모집 희망 인원` | `등급별 모집 인원 단가` 값 (1 또는 2). 3등급 모두 동일 |
| `⭐️ 신청 가능 인원` / `✔️ 신청 가능 인원` / `🔥 신청 가능 인원` | 초기값 = `모집 희망 인원`. 신청 시 감소 |

**계산 예시** — "본격 노출(6명) + 인당 20장" 선택 시:
- `등급별 모집 인원 단가` = 2
- `인당 팔로워 쿠폰` = 20
- `⭐️/✔️/🔥 쿠폰 수량` = 20 × 2 = 40 (각 등급)
- `⭐️/✔️/🔥 모집 희망 인원` = 2 (각 등급)
- `총 팔로워 쿠폰 수` = 40 + 40 + 40 = **120장**
- 예상 할인 부담 = 120장 × 2만원 = **240만원**

#### 🔀 v3 리네이밍

| 기존 | 변경 후 | 사유 |
|------|--------|------|
| `숙박 타입` | `쿠폰 적용 요일` | 의미 명확화 |

#### 🗑️ v3 삭제

| 삭제 필드 | 사유 |
|----------|-----|
| `평일 할인 금액` | 단일 `할인 금액`으로 통합 |
| `주말 할인 금액` | 동일 |
| `공휴일 쿠폰 적용` | `쿠폰 적용 요일` 3번째 옵션 선택이 곧 동의 |
| `총모집인원` | 등급별 `모집 희망 인원` 3개로 대체 |
| `신청가능인원` | 등급별 `신청 가능 인원` 3개로 대체 |
| `인당팔로워쿠폰` | `인당 팔로워 쿠폰` (스페이스 있음)으로 표준화 |
| `팔로워쿠폰수` | `총 팔로워 쿠폰 수` (Formula)로 표준화 |
| `패키지 유형` | 평일/주말 통합으로 의미 퇴색. 할인 금액 숫자로 충분 |

### A2. 파트너 신청 테이블

#### 유지

- `크리에이터` (Link), `캠페인` (Link), `신청 상태`, `입실일`, `입실 사이트`
- `예약 취소/변경`, `정책 확인 동의`, `신청일`
- 기존 Lookup 필드 전체

#### 🆕 v3 신규 Lookup 필드 4개

| 필드명 | 참조 원본 | 비고 |
|------|----------|------|
| `할인 금액` | 캠페인 → `할인 금액` | 평일/주말 분리 Lookup 대체 |
| `쿠폰 적용 요일` | 캠페인 → `쿠폰 적용 요일` | 숙박 타입 Lookup 대체 |
| `인당 팔로워 쿠폰` | 캠페인 → `인당 팔로워 쿠폰` | |
| `총 팔로워 쿠폰 수` | 캠페인 → `총 팔로워 쿠폰 수` | Formula 참조 |

---

## Part B: 캠지기 신청 퍼널 (camfit-partner) — v3 변경

### B1. 퍼널 Step 1 — PackageStep (할인 설정)

v2의 "패키지 유형 + 평일/주말 할인 금액 분리 입력" 방식을 v3에서 전면 교체:

```
💰 팔로워 할인 금액
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│ 1만원 │ │ 2만원 │ │ 3만원 │ │ 직접 │
│ 부담  │ │ ⭐추천 │ │ 최대  │ │ 설정 │
│ 없이  │ │       │ │ 노출  │ │      │
└──────┘ └──────┘ └──────┘ └──────┘
직접 설정: 1~5만원, 5천원 step. 기본값 없음.

📅 쿠폰 적용 입실 요일
○ 평일만 (일~목 입실 시에만 할인 적용)
○ 평일 + 주말 (일~토 입실 시 할인 적용)
○ 평일 + 주말 + 공휴일 (전체 기간 할인 적용)
```

공휴일 체크박스 **제거** — 3번째 라디오 선택이 동의로 간주.

### B2. 퍼널 Step 2 — RecruitmentStep (모집 조건)

v2의 CounterField 기반 직접 숫자 입력 방식을 카드 + 버튼 선택으로 교체:

```
👥 크리에이터 모집 규모          ⭐ 등급이 뭐예요?
┌─────────────────────┐ ┌─────────────────────┐
│ 🌱 소규모 체험        │ │ 🔥 본격 노출         │
│ 총 3명               │ │ 총 6명               │
│ ⭐1 ✔1 🔥1          │ │ ⭐2 ✔2 🔥2          │
│ 등급별 1명씩          │ │ 등급별 2명씩          │
└─────────────────────┘ └─────────────────────┘

💌 인당 팔로워 쿠폰
┌──────┐ ┌──────┐ ┌──────┐
│ 10장 │ │ 20장 │ │ 30장 │
│ 테스트│ │ ⭐추천 │ │ 최대  │
└──────┘ └──────┘ └──────┘

🎫 총 쿠폰 발급 수량: {N}명 × {n}장 = {합계}장
💸 예상 최대 할인 부담: {합계}장 × {할인금액} = 최대 {계산값}
```

"⭐ 등급이 뭐예요?" 링크 → `CreatorGuideSheet` 바텀시트 (가격 표시 없음).

### B3. 프론트 계산 로직

```js
// 신규: buildSubmitPayload() 내 계산
const tierCount = recruitmentPackage; // 1 또는 2
const tierCouponAmount = tierCount * couponPerCreator;

// submit payload
{
  discount,                 // 단일 할인 금액
  couponApplyDays,          // 쿠폰 적용 요일
  tierCount,                // 등급별 모집 인원 단가
  couponPerCreator,         // 인당 팔로워 쿠폰
  // 등급별 9개 필드 자동 계산
  iconCouponAmount: tierCouponAmount,
  partnerCouponAmount: tierCouponAmount,
  risingCouponAmount: tierCouponAmount,
  iconRecruitCount: tierCount,
  partnerRecruitCount: tierCount,
  risingRecruitCount: tierCount,
  iconAvailable: tierCount,
  partnerAvailable: tierCount,
  risingAvailable: tierCount,
}
```

### B4. submit.js — Airtable 필드 저장 (22개)

v2의 `buildAirtableFields()`를 전면 교체. 저장하는 필드:
- 기본 캠핑장 정보 7개 (캠핑장명, 대표자명, 연락처, 이메일, 사업자번호, 소재 권역, 숙소 소개)
- 협찬 조건 4개 (`할인 금액`, `쿠폰 적용 요일`, `등급별 모집 인원 단가`, `인당 팔로워 쿠폰`)
- 등급별 9개 (`⭐️/✔️/🔥 쿠폰 수량`, `⭐️/✔️/🔥 모집 희망 인원`, `⭐️/✔️/🔥 신청 가능 인원`)
- 기간 4개 (방문 시작/종료, 쿠폰 시작/종료)
- 기타 2개 (제공 가능한 사이트 종류, 취소/변경 정책 동의)

---

## Part C: 캠지기 대시보드 (premium_dashboard) — v3 변경

### C1. Netlify Function — dashboard-partner-data.js

| v2 참조 | v3 변경 |
|--------|--------|
| `평일 할인 금액`, `주말 할인 금액` | `할인 금액` 단일 조회 |
| `공휴일 쿠폰 적용` | 제거 |
| `숙박 타입` | `쿠폰 적용 요일` |
| 등급별 `모집 희망 인원` | 유지 (이제 값 존재) |

### C2. PartnerStatusCard.jsx

| 변경 내용 | 비고 |
|---------|------|
| 할인 금액 2줄 → 1줄 | 단일 `할인 금액` 표시 |
| `쿠폰 적용 요일` 뱃지 추가 | |
| 공휴일 체크박스 섹션 제거 | |
| 등급별 모집 현황 표시 | UI 이미 존재, 데이터 채워지면 자동 노출 |
| 예상 누적 할인 부담 표시 | `총 팔로워 쿠폰 수` × `할인 금액` |

---

## Part D: 크리에이터 포털 (influencer-portal) — v3 변경

### D1. 타입 변경 (types/index.ts)

#### PartnerCampaign / AirtablePartnerCampaignRecord

| v2 → 삭제 | v3 → 추가 |
|---------|---------|
| `weekdayDiscount` | `discount` |
| `weekendDiscount` | `couponApplyDays` |
| `packageType` | `tierCount` (등급별 모집 인원 단가) |
| `holidayCouponApplied` | `couponPerCreator` |
| `totalRecruitCount` | `iconRecruitCount`, `partnerRecruitCount`, `risingRecruitCount` |
| `availableCount` | `iconAvailable`, `partnerAvailable`, `risingAvailable` |
| `followerCouponCount` | `totalFollowerCoupon` |

### D2. Airtable 함수 변경 (lib/airtable.ts)

| 함수 | v3 변경 사항 |
|------|------------|
| `mapPartnerCampaignRecord()` | 필드 매핑 전면 교체 (v2 필드 → v3 필드) |
| `getPartnerCampaigns(tier)` | `tier` 파라미터 추가. 해당 등급 `신청 가능 인원 > 0` 캠페인만 필터 |
| `applyPartnerCampaign(campaignId, tier, ...)` | 해당 등급 `신청 가능 인원` 감소. 3등급 합 0이면 `모집 상태` → `마감` 자동 전환 |
| `enrichPartnerApplications()` | Lookup 필드 매핑 v3 스키마 반영 |
| `verifyPartnerApplicationOwnership()` | 변경 없음 (IDOR 방어 유지) |

### D3. API 라우트 변경

| 파일 | 변경 |
|------|------|
| `app/api/partner/campaigns/route.ts` | JWT에서 `tier` 추출 → `getPartnerCampaigns(tier)` 전달 |
| `app/api/partner/campaigns/apply/route.ts` | `tier` 추출 → `applyPartnerCampaign`에 전달 |
| `app/api/partner/applications/my/route.ts` | 응답 타입 반영 (필드는 타입 따라감) |
| `app/api/partner/applications/checkin/route.ts` | 변경 없음 |
| `app/api/partner/applications/status/route.ts` | 변경 없음 |

### D4. UI 컴포넌트 변경

#### PartnerCampaignCard.tsx

| v2 | v3 |
|----|----|
| 평일/주말 할인 2줄 표시 | 단일 `할인 금액` 1줄 |
| `숙박 타입` 뱃지 | `쿠폰 적용 요일` 뱃지 |
| `perPersonCoupon` 계산 | `couponPerCreator` 직접 사용 |
| 전체 잔여 인원 표시 | 로그인 크리에이터 등급 기준 `{tier}Available` / `{tier}RecruitCount` 표시 |

#### PartnerApplicationModal.tsx

- `buildCopyText()`, `buildCouponInfoText()` — v3 필드로 교체
- Policy 날짜·쿠폰 필드 v3 필드명 반영
- 신청 화면에 "당신 등급의 남은 자리 {n}명에 신청합니다" 문구 추가

#### PartnerCheckinModal.tsx

- `buildCheckinCopyText()` — v3 필드로 교체

#### 변경 없는 컴포넌트

- `PartnerCouponDisplay.tsx`
- `DashboardTabs.tsx`

### D5. CreatorGuideSheet (신규 컴포넌트)

- `premium_dashboard`의 등급 안내 바텀시트를 포팅
- **가격 표시 완전 제거** (파트너는 쿠폰 기반, 가격 혼동 방지 — 결정사항 #2)
- 중립 네이밍 (`CreatorGuideSheet`, `Partner` 접두어 없음)

---

## Part E: 구현 Phases

### Phase 1 — Airtable 스키마 변경 (완료 2026-04-22)

1. 삭제 8개 (`평일 할인 금액`, `주말 할인 금액`, `공휴일 쿠폰 적용`, `총모집인원`, `신청가능인원`, `인당팔로워쿠폰`, `팔로워쿠폰수`, `패키지 유형`)
2. 신규 5개 (`할인 금액`, `쿠폰 적용 요일`, `등급별 모집 인원 단가`, `인당 팔로워 쿠폰`, `총 팔로워 쿠폰 수`)
3. 리네이밍 1개 (`숙박 타입` → `쿠폰 적용 요일`)
4. Formula 설정 (`총 팔로워 쿠폰 수` = `{⭐️ 쿠폰 수량} + {✔️ 쿠폰 수량} + {🔥 쿠폰 수량}`)
5. 파트너 신청 테이블 Lookup 필드 참조명 업데이트

### Phase 2 — 캠지기 신청 퍼널 (camfit-partner PR #1, open)

- config → packages → CreatorGuideSheet 포팅 → PackageStep → RecruitmentStep → App.jsx → submit.js → agreements.js
- QA: curl 제출 테스트 + 모바일 E2E

### Phase 3 — 캠지기 대시보드 (premium_dashboard PR #1, open)

- dashboard-partner-data.js → PartnerStatusCard.jsx
- QA: 파트너 캠페인 레코드 1건 생성 후 대시보드 로그인 테스트

### Phase 4 — 크리에이터 포털 (influencer-portal PR #1, open)

- types → lib/airtable.ts → API routes → 컴포넌트 (Card, ApplicationModal, CheckinModal)
- QA: 등급 다른 크리에이터 3명 로그인 → 캠페인 목록 → 신청 → 체크인 → 쿠폰 코드 확인

### Phase 5 — 문서 정비 (현재)

- `specs/partner-sponsorship-v3.md` 작성 (본 문서)
- 핸드오버 문서 갱신

---

## 수정 대상 파일 목록

### camfit-partner

| 파일 | 수정 내용 |
|------|---------|
| `src/constants/config.js` | `RECRUITMENT_PACKAGES`, `DISCOUNT_PRESETS` 신규. `CREATOR_COUNT` 삭제 |
| `src/data/packages.js` | 기존 4개 패키지 → 할인 프리셋 데이터로 교체 |
| `src/components/steps/PackageStep.jsx` | 4개 패키지 카드 → 할인 프리셋 + 쿠폰 적용 요일 라디오 |
| `src/components/steps/RecruitmentStep.jsx` | CounterField 제거 → 모집 규모 카드 2개 + 인당 쿠폰 버튼 3개 |
| `src/components/CreatorGuideSheet.jsx` | 신규. 등급 안내 바텀시트 (가격 제거) |
| `src/App.jsx` | state 교체, `buildSubmitPayload()` 재작성 |
| `netlify/functions/submit.js` | `buildAirtableFields()` 전면 교체, 등급별 9개 필드 저장 |
| `src/data/agreements.js` | 제3조 문구: 쿠폰 적용 요일 통합 할인 명시 |

### premium_dashboard

| 파일 | 수정 내용 |
|------|---------|
| `netlify/functions/dashboard-partner-data.js` | v3 필드명 반영, 삭제 필드 제거 |
| `src/pages/dashboard/components/PartnerStatusCard.jsx` | 단일 할인 표시, 쿠폰 적용 요일 뱃지, 등급 현황 |

### influencer-portal

| 파일 | 수정 내용 |
|------|---------|
| `types/index.ts` | `PartnerCampaign`, `AirtablePartnerCampaignRecord` v3 타입 |
| `lib/airtable.ts` | `mapPartnerCampaignRecord()`, `getPartnerCampaigns(tier)`, `applyPartnerCampaign()` |
| `app/api/partner/campaigns/route.ts` | tier 전달 |
| `app/api/partner/campaigns/apply/route.ts` | tier 전달 |
| `components/PartnerCampaignCard.tsx` | 단일 할인, 등급 잔여 표시 |
| `components/PartnerApplicationModal.tsx` | 필드 교체, 등급 문구 추가 |
| `components/PartnerCheckinModal.tsx` | v3 필드 반영 |
| `components/CreatorGuideSheet.tsx` | 신규 |

---

## 필드명 표준화 매트릭스

| 기존 (v2) | v3 표준 | 변경 유형 |
|---------|---------|---------|
| `평일 할인 금액` / `주말 할인 금액` | `할인 금액` | 통합 |
| `숙박 타입` | `쿠폰 적용 요일` | 리네이밍 |
| `공휴일 쿠폰 적용` | *(삭제)* | 삭제 |
| `총모집인원` (스페이스 없음) | `⭐️/✔️/🔥 모집 희망 인원` | 등급별 분산 |
| `신청가능인원` (스페이스 없음) | `⭐️/✔️/🔥 신청 가능 인원` | 등급별 분산 |
| `팔로워쿠폰수` (스페이스 없음) | `총 팔로워 쿠폰 수` | Formula 표준화 |
| `인당팔로워쿠폰` (스페이스 없음) | `인당 팔로워 쿠폰` | 스페이스 표준화 |
| `패키지 유형` | *(삭제)* | 삭제 |

**원칙**: 한국어 필드명, 의미 단위 스페이스 유지.

---

## Success Metrics

| 지표 | 목표 | 측정 방법 |
|------|------|---------|
| 파트너 신청 완료율 | 80%+ | API 로그 (시작 수 vs 완료 수) |
| 쿠폰 등록 전환율 | 60%+ | 캠핏 쿠폰 등록 페이지 유입 추적 |
| 등급별 자동 마감 정확도 | 100% | 3등급 합 0 → 자동 마감 전환 로그 |
| 체크인 등록률 | 70%+ | PartnerApplication 입실일 필드 채움률 |

---

## 관련 문서

| 문서 | 위치 |
|------|------|
| v2 SDD | `specs/partner-sponsorship-v2.md` |
| v3 설계 원본 | `docs/superpowers/plans/2026-04-21-partner-sponsorship-v3.md` (camjigi_claude) |
| v1 SDD | `docs/[spec] 캠핏_파트너협찬_SDD_v1_20260326.md` (camjigi_claude) |
| v2 SDD (camjigi) | `docs/[spec] 캠핏_파트너협찬_SDD_v2_20260326.md` (camjigi_claude) |
| v3 설계서 (camjigi) | `docs/[spec] 캠핏_파트너협찬_v3_등급체계개편_20260421.md` (camjigi_claude) |
| 캠지기 퍼널 핸드오버 | `docs/[handover] 캠핏_파트너협찬_캠지기퍼널_핸드오버_20260331.md` |
| 종합 핸드오버 | `docs/[handover] 캠핏_파트너협찬_핸드오버_20260331.md` |
| 파트너 캠페인 테이블 | https://airtable.com/appEGM6qarNr9M7HN/tbl5X4YNIow179dTQ |
| 파트너 신청 테이블 | https://airtable.com/appEGM6qarNr9M7HN/tblAc3fbe3oA67Ppo |

---

## 변경 이력

| 버전 | 날짜 | 변경 |
|------|------|------|
| v1 | 2026-03-26 | 초기 SDD |
| v2 | 2026-03-26 | 등급별 설계, 쿠폰 코드 위치 확정 |
| v3 | 2026-04-21 | 할인 금액 통합, 등급 체계 실질 도입, 필드명 표준화, 레거시 필드 정리 |
| v3 구현 완료 | 2026-04-22 | 3개 앱(캠지기 퍼널, 대시보드, 크리에이터 포털) 코드 + Airtable 스키마 마이그레이션 |
