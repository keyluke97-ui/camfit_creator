# 크리에이터 쿠폰 주간 리포트 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 크리에이터 쿠폰 협찬의 콘텐츠 이행·취소·활성도를 매주 금요일 11시에 자동 점검하는 camfit-brand HTML 리포트 파이프라인(런북 + 스케줄)을 구축한다.

**Architecture:** 코드 앱이 아니라 **에이전트 실행형 런북**. `tools/creator-coupon-report/RUNBOOK.md`에 정확한 MongoDB 쿼리(probe MCP) + Airtable 콘텐츠 유사매칭 규칙 + HTML 구조를 박아두고, 스케줄된 클라우드 에이전트가 매주 이 런북을 실행해 HTML 1부를 생성·전달한다.

**Tech Stack:** cpf `probe_query_run`(MongoDB camping DB), Airtable MCP(base `appEGM6qarNr9M7HN`), camfit-brand 디자인 스킬, `/schedule` 클라우드 에이전트.

**참조 스펙:** [docs/superpowers/specs/2026-06-15-creator-coupon-weekly-report-design.md](../specs/2026-06-15-creator-coupon-weekly-report-design.md)

---

## File Structure

| 경로 | 책임 |
|------|------|
| `tools/creator-coupon-report/RUNBOOK.md` | 주간 실행 절차 전체 — 쿼리·매칭·HTML 스펙 (단일 진실원) |
| `tools/creator-coupon-report/report-template.html` | camfit-brand HTML 골격 (생성 시 채워넣는 틀) |
| `tools/creator-coupon-report/out/` | 생성된 주간 HTML (gitignore) |
| `tools/creator-coupon-report/.gitignore` | `out/` 제외 |

상수(스펙 §8): `GRACE_DAYS=14`, `CHECK_LOOKBACK_WEEKS=8`, `CONTENT_LOOKBACK_WEEKS=10`, `CAMP_SIMILARITY_THRESHOLD=0.6`, 실행=매주 금 11:00 KST.

---

## Task 1: 스캐폴드

**Files:**
- Create: `tools/creator-coupon-report/.gitignore`
- Create: `tools/creator-coupon-report/RUNBOOK.md` (헤더만)

- [ ] **Step 1: .gitignore 생성**

```
out/
*.local.html
```

- [ ] **Step 2: RUNBOOK 헤더 생성**

`tools/creator-coupon-report/RUNBOOK.md`:

```markdown
# 크리에이터 쿠폰 주간 리포트 — RUNBOOK

매주 금요일 11:00 KST 실행. 이 문서의 절차를 순서대로 따라 HTML 1부를 생성·전달한다.

## 상수
- GRACE_DAYS = 14 (퇴실 후 콘텐츠 유예)
- CHECK_LOOKBACK_WEEKS = 8 (미제출 점검창 하한)
- CONTENT_LOOKBACK_WEEKS = 10 (콘텐츠 후보 사전필터)
- CAMP_SIMILARITY_THRESHOLD = 0.6
- ADMIN_BOOKING_URL = (미정 — 받으면 채움. 그 전엔 예약코드 텍스트만)

## 실행 시점 변수 (매 실행 계산)
- NOW_MS = 현재 epoch ms (KST 기준)
- WEEK_START_MS = NOW_MS − 7일
- GRACE_CUTOFF_MS = NOW_MS − 14일
- CHECK_LOOKBACK_MS = NOW_MS − 8주
- CONTENT_LOOKBACK_DATE = (NOW − 10주)의 YYYY-MM-DD
```

- [ ] **Step 3: 커밋**

```bash
git add tools/creator-coupon-report/.gitignore tools/creator-coupon-report/RUNBOOK.md
git commit -m "feat(report): 크리에이터 쿠폰 리포트 런북 스캐폴드"
```

---

## Task 2: 데이터 수집 절차 (probe 쿼리)

**Files:**
- Modify: `tools/creator-coupon-report/RUNBOOK.md` (§A 추가)

> ⚠️ MongoDB `bookings.status` 취소값은 **`cancelled`**(L 2개). 검증 데이터에서 확인됨.

- [ ] **Step 1: RUNBOOK에 §A 데이터 수집 추가**

아래 블록을 RUNBOOK.md에 append:

````markdown
## §A. 데이터 수집

도구: `mcp__plugin_camfit-cpf-plugin_cpf__probe_query_run` (database=`camping`, collection=`coupons`, op=`aggregate`).

### A-1. 활동창 — 지난 7일 사용 (활성도/취소/협찬비)

`WEEK_START_MS`를 채워 실행:

```json
{"pipeline":[
 {"$match":{"name":{"$regex":"크리에이터"}}},
 {"$lookup":{"from":"user_coupons","localField":"_id","foreignField":"coupon","as":"uses"}},
 {"$unwind":"$uses"},
 {"$match":{"uses.isUsed":true,"uses.usedTimestamp":{"$gte": WEEK_START_MS }}},
 {"$lookup":{"from":"bookings","localField":"uses.booking","foreignField":"_id","as":"bk"}},
 {"$unwind":{"path":"$bk","preserveNullAndEmptyArrays":true}},
 {"$project":{"_id":0,"couponName":"$name","masterCode":1,"usedTimestamp":"$uses.usedTimestamp","discountedAmount":"$uses.discountedAmount","campName":"$bk.campName","zoneName":"$bk.zoneName","bookingCode":"$bk.code","bookingId":"$bk._id","bookingStatus":"$bk.status","checkInTimestamp":"$bk.checkInTimestamp","checkoutTimestamp":"$bk.checkoutTimestamp","totalCharge":"$bk.totalCharge","couponDiscount":"$bk.couponDiscount"}},
 {"$sort":{"usedTimestamp":-1}}
]}
```

### A-2. 점검창 — 퇴실+14 경과 (미제출 후보)

`CHECK_LOOKBACK_MS`(하한), `GRACE_CUTOFF_MS`(상한)를 채워 실행:

```json
{"pipeline":[
 {"$match":{"name":{"$regex":"크리에이터"}}},
 {"$lookup":{"from":"user_coupons","localField":"_id","foreignField":"coupon","as":"uses"}},
 {"$unwind":"$uses"},
 {"$match":{"uses.isUsed":true}},
 {"$lookup":{"from":"bookings","localField":"uses.booking","foreignField":"_id","as":"bk"}},
 {"$unwind":"$bk"},
 {"$match":{"bk.checkoutTimestamp":{"$gte": CHECK_LOOKBACK_MS, "$lte": GRACE_CUTOFF_MS },"bk.status":{"$nin":["cancelled"]}}},
 {"$project":{"_id":0,"couponName":"$name","masterCode":1,"campName":"$bk.campName","zoneName":"$bk.zoneName","bookingCode":"$bk.code","bookingId":"$bk._id","bookingStatus":"$bk.status","checkInTimestamp":"$bk.checkInTimestamp","checkoutTimestamp":"$bk.checkoutTimestamp","couponDiscount":"$bk.couponDiscount","usedTimestamp":"$uses.usedTimestamp"}},
 {"$sort":{"bk.checkoutTimestamp":-1}}
]}
```

### A-3. 핸들 추출
`couponName`에서 괄호 속 문자열 = 크리에이터 핸들. 정규식 `\(([^)]+)\)`. 따옴표(`'`)·공백 trim.
예: `크리에이터' (요미캠핑)` → `요미캠핑`, `크리에이터(ssundan_camp` → `ssundan_camp`(괄호 안 닫힘 허용).
````

- [ ] **Step 2: 검증 — 활동창 쿼리 실행**

`WEEK_START_MS = (2026-06-15 - 7일)`로 A-1 실행.
Expected: 0건 이상, 각 행에 `couponName/campName/checkInTimestamp/checkoutTimestamp/couponDiscount` 존재. `bookingStatus`에 `paid`/`cancelled` 등장.

- [ ] **Step 3: 검증 — 점검창 쿼리 실행**

A-2 실행. Expected: `checkoutTimestamp`가 모두 [now−8주, now−14일] 범위, `cancelled` 없음.

- [ ] **Step 4: 커밋**

```bash
git add tools/creator-coupon-report/RUNBOOK.md
git commit -m "feat(report): 데이터 수집 쿼리(활동창/점검창) 절차"
```

---

## Task 3: 콘텐츠 유사매칭 절차 (Airtable)

**Files:**
- Modify: `tools/creator-coupon-report/RUNBOOK.md` (§B 추가)

- [ ] **Step 1: RUNBOOK에 §B 추가**

````markdown
## §B. 콘텐츠 유사매칭

목표: 각 쿠폰 예약(핸들 H, 캠핑장 C, 퇴실일 D)이 콘텐츠를 남겼는지 판정. **예약번호 정확매칭은 쓰지 않는다.**

### B-1. 콘텐츠 후보 로드
도구: `mcp__Airtable_MCP_Server__list_records`
- baseId: `appEGM6qarNr9M7HN`
- tableId: `tblta2cow9ymKr68J` (인플루언서 컨텐츠 업로드)
- view: `viw4Nqbe2E1l0pEfH` (크리에이터 예약) — 캠핑장 예약 콘텐츠 모음
- filterByFormula: `IS_AFTER({Created}, 'CONTENT_LOOKBACK_DATE')`
- maxRecords: 500

각 후보에서 사용할 필드: `채널명`, `크리에이터 채널명 (from 크리에이터 명단)`, `캠핑장명 (from 캠핑장 이름 OR 캠핑 용품 이름)`, `업로드 날짜`, `Created`, `콘텐츠 링크`, `콘텐츠2`, `콘텐츠3`, `콘텐츠4`, `예약번호`.

"콘텐츠 있음" = `콘텐츠 링크/콘텐츠2/콘텐츠3/콘텐츠4` 중 1개 이상 비어있지 않음.

### B-2. 정규화 규칙
- **핸들 정규화** `normHandle(s)`: 소문자화 → 공백·따옴표·`.`·`_` 제거.
- **캠핑장 정규화** `normCamp(s)`:
  1. 공백 전부 제거, 소문자화
  2. 일반 접미어 제거: `캠핑장`,`오토캠핑장`,`야영장`,`글램핑`,`펜션`,`캠프`,`관광농원`,`풀빌라`
  3. 선두 지역명 토큰 제거: 광역시/도/시/군/구 명(`여수`,`가평`,`영월`,`평창`,`산청` 등 흔한 지역어) — 단, 제거 후 빈 문자열이면 제거 취소
- **bigram Jaccard** `sim(a,b)`: 문자 2-gram 집합의 교집합/합집합.

### B-3. 매칭 판정 (예약 1건당)
1. 후보 중 `normHandle(H)` == `normHandle(채널명 또는 크리에이터 채널명)` 또는 한쪽이 다른 쪽 포함 → **핸들 후보군**.
2. 핸들 후보군에서 캠핑장 비교:
   - `normCamp(C)`와 `normCamp(콘텐츠 캠핑장명)`가 한쪽 포함 **또는** `sim ≥ 0.6` → 캠핑장 ✓
3. 날짜: 콘텐츠 `업로드 날짜`(없으면 `Created`) ≥ `D − 2일` → 날짜 ✓
4. **그리고 "콘텐츠 있음"**.

| 결과 | 상태 |
|------|------|
| 핸들✓ + 캠핑장✓ + 날짜✓ + 콘텐츠있음 | ✅ 제출 완료 |
| 핸들✓ + 캠핑장 모호(포함 아님 & 0.4≤sim<0.6) | ⚠️ 확인 필요 |
| 핸들 후보 0 또는 캠핑장 sim<0.4 | ❌ 미제출 |

판정은 LLM이 행별로 적용하되, 위 규칙을 일관 기준으로 삼는다. 애매하면 ❌로 단정하지 말고 ⚠️.
````

- [ ] **Step 2: 검증 — 알려진 케이스 대조**

Task 2 점검창 결과의 상위 5건에 대해 §B를 적용. 최소 1건은 ✅(콘텐츠 존재), 캠핑장명이 어드민과 다른 케이스(예: `여수 작금캠핑장` vs `작금 캠핑장`)가 올바르게 ✓ 매칭되는지 수기 확인.

- [ ] **Step 3: 커밋**

```bash
git add tools/creator-coupon-report/RUNBOOK.md
git commit -m "feat(report): 콘텐츠 유사매칭 절차(핸들+캠핑장 fuzzy+날짜)"
```

---

## Task 4: HTML 리포트 골격 (camfit-brand)

**Files:**
- Create: `tools/creator-coupon-report/report-template.html`
- Modify: `tools/creator-coupon-report/RUNBOOK.md` (§C 추가)

- [ ] **Step 1: HTML 골격 생성**

`tools/creator-coupon-report/report-template.html` — 생성 시 `{{...}}`를 채운다. camfit 그린 `#01DF82` 액센트.

```html
<!DOCTYPE html>
<html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>크리에이터 쿠폰 주간 리포트 — {{REPORT_DATE}}</title>
<style>
  :root{--bg:#0F1115;--card:#1A1D23;--line:#2A2E37;--txt:#F5F6F7;--sub:#9AA1AC;--accent:#01DF82;--red:#FF5A5A;--amber:#FFB020;}
  *{box-sizing:border-box} body{margin:0;background:var(--bg);color:var(--txt);font-family:-apple-system,'Pretendard',sans-serif;padding:24px;max-width:1100px;margin:0 auto}
  h1{font-size:20px;margin:0 0 4px} .meta{color:var(--sub);font-size:13px;margin-bottom:20px}
  .kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:28px}
  .kpi{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px}
  .kpi .label{color:var(--sub);font-size:12px} .kpi .val{font-size:24px;font-weight:700;margin-top:6px}
  .kpi.cost .val{color:var(--accent)} .kpi.miss .val{color:var(--red)}
  section{margin-bottom:28px} h2{font-size:15px;border-left:3px solid var(--accent);padding-left:10px}
  table{width:100%;border-collapse:collapse;font-size:13px} th,td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--line)}
  th{color:var(--sub);font-weight:600} .ok{color:var(--accent)} .miss{color:var(--red)} .warn{color:var(--amber)}
  a{color:var(--accent)}
</style></head><body>
<h1>🏕️ 크리에이터 쿠폰 주간 리포트</h1>
<div class="meta">{{PERIOD_START}} ~ {{PERIOD_END}} · 생성 {{REPORT_DATE}}</div>

<div class="kpis">
  <div class="kpi"><div class="label">주간 사용</div><div class="val">{{KPI_USED}}건</div></div>
  <div class="kpi cost"><div class="label">총 협찬비</div><div class="val">{{KPI_COST}}</div></div>
  <div class="kpi miss"><div class="label">미제출</div><div class="val">{{KPI_MISSING}}건</div></div>
  <div class="kpi"><div class="label">취소</div><div class="val">{{KPI_CANCEL}}건</div></div>
  <div class="kpi"><div class="label">활성 크리에이터</div><div class="val">{{KPI_CREATORS}}명</div></div>
</div>

<section><h2>🔴 미제출 액션 리스트 (퇴실+14 경과)</h2>
<table><thead><tr><th>크리에이터</th><th>캠핑장</th><th>입실~퇴실</th><th>D+경과</th><th>상태</th><th>어드민</th></tr></thead>
<tbody>{{ROWS_MISSING}}</tbody></table></section>

<section><h2>⚠️ 취소 모니터</h2>
<table><thead><tr><th>크리에이터</th><th>캠핑장</th><th>입실~퇴실</th><th>할인액</th><th>어드민</th></tr></thead>
<tbody>{{ROWS_CANCEL}}</tbody></table></section>

<section><h2>📋 이번 주 전체 사용</h2>
<table><thead><tr><th>사용일</th><th>크리에이터</th><th>캠핑장</th><th>입실~퇴실</th><th>쿠폰명</th><th>할인액</th><th>콘텐츠</th><th>어드민</th></tr></thead>
<tbody>{{ROWS_ALL}}</tbody></table></section>

<section><h2>🔁 재사용 크리에이터 (점검 lookback)</h2>
<table><thead><tr><th>크리에이터</th><th>사용건수</th><th>누적 할인액</th><th>미제출</th></tr></thead>
<tbody>{{ROWS_REUSE}}</tbody></table></section>

<section><h2>🏕️ 캠핑장별 분포</h2>
<table><thead><tr><th>캠핑장</th><th>건수</th><th>누적 할인액</th></tr></thead>
<tbody>{{ROWS_CAMP}}</tbody></table></section>
</body></html>
```

- [ ] **Step 2: RUNBOOK에 §C 추가**

````markdown
## §C. HTML 리포트 생성

`report-template.html`을 복제해 `{{...}}`를 채운다. 날짜 포맷 `YYYY-MM-DD(요일)` KST. 금액 `1,250,000원` 천단위.

치환 매핑:
- `KPI_USED` = 활동창 행수, `KPI_COST` = 활동창 `couponDiscount` 합(원), `KPI_CANCEL` = 활동창 `status=cancelled` 수, `KPI_CREATORS` = 활동창 고유 핸들 수
- `KPI_MISSING` = 점검창에서 §B 판정 ❌ 수 (⚠️는 별도 각주)
- `ROWS_MISSING` = 점검창 ❌/⚠️ 행. 상태 셀: ❌`<span class=miss>미제출</span>` / ⚠️`<span class=warn>확인필요</span>`. D+경과 = (NOW − checkout) 일수.
- `ROWS_CANCEL` = 활동창 `status=cancelled` 행.
- `ROWS_ALL` = 활동창 전 행. 콘텐츠 셀: ✅`<span class=ok>완료</span>` / ⚠️ / ❌ / 유예중(퇴실+14 미경과).
- `ROWS_REUSE` = 점검 lookback 핸들별 집계 desc.
- `ROWS_CAMP` = campName별 집계 desc.
- 어드민 셀: `ADMIN_BOOKING_URL` 있으면 `<a href=...>열기</a>`, 없으면 예약코드 텍스트.

camfit-brand 일관성: 생성 직전 `camfit-admin-plugin:camfit-brand` 스킬을 호출해 색/타이포 토큰을 확인하고 위 인라인 스타일에 반영한다.

출력: `tools/creator-coupon-report/out/creator-coupon-report-YYYY-MM-DD.html`
````

- [ ] **Step 3: 커밋**

```bash
git add tools/creator-coupon-report/report-template.html tools/creator-coupon-report/RUNBOOK.md
git commit -m "feat(report): camfit-brand HTML 골격 + 생성 절차"
```

---

## Task 5: 검증 드라이런 (이번 주 리포트 실제 생성)

**Files:**
- Create: `tools/creator-coupon-report/out/creator-coupon-report-2026-06-15.html` (gitignore — 커밋 안 함)

- [ ] **Step 1: 런북 전체 실행**

RUNBOOK §A→§B→§C를 2026-06-15 기준으로 끝까지 실행. `out/creator-coupon-report-2026-06-15.html` 생성.

- [ ] **Step 2: 사용자에게 전달 및 검증**

`SendUserFile`로 HTML 전달. 사용자와 함께 확인:
- 총 협찬비 합이 합리적인가
- 미제출 리스트에 명백한 오판(콘텐츠 있는데 ❌)이 없는가 — 있으면 §B 임계값/지역어 목록 보정
- 취소건이 모두 잡혔는가
- 입실\~퇴실 표기 정확한가

Expected: 사용자 "OK". 오판 발견 시 RUNBOOK 수정 후 재생성.

- [ ] **Step 3: 런북 보정 사항 커밋 (있을 경우)**

```bash
git add tools/creator-coupon-report/RUNBOOK.md
git commit -m "fix(report): 드라이런 피드백 반영(매칭 임계값/지역어 보정)"
```

---

## Task 6: 스케줄 자동화 (매주 금 11:00)

**Files:**
- (스케줄 등록 — 코드 파일 없음)

- [ ] **Step 1: MCP-in-cron 인증 확인**

스케줄 에이전트 환경에서 `probe_query_run`과 Airtable `list_records`가 인증되는지 점검(스펙 §9 리스크). 안 되면 수동 실행 유지하고 사용자에게 보고.

- [ ] **Step 2: 스케줄 등록**

`anthropic-skills:schedule`(또는 `/schedule`)로 클라우드 에이전트 등록:
- 주기: 매주 금요일 11:00 KST
- 작업: "`tools/creator-coupon-report/RUNBOOK.md`를 실행해 이번 주 HTML 리포트를 생성하고 SendUserFile로 전달"

- [ ] **Step 3: 등록 확인 및 보고**

스케줄 목록에서 등록 확인, 다음 실행 시각을 사용자에게 보고. 첫 자동 실행 후 산출물 점검.

---

## Self-Review (작성자 체크)

- **스펙 커버리지**: 목적①=Task3+5(미제출), ②=Task4(취소섹션), ③④⑤⑥=Task4(KPI/전체/재사용/캠핑장), 시간창=Task2, 유사매칭=Task3, HTML/협찬비=Task4, 스케줄=Task6. ✅ 누락 없음.
- **플레이스홀더**: `ADMIN_BOOKING_URL`만 의도적 미정(스펙 §10 오픈) — fallback(코드 텍스트) 명시됨. 그 외 실제 쿼리/HTML 모두 구체화. ✅
- **타입 일관성**: `couponDiscount`/`checkoutTimestamp`/`bookingCode`/`status=cancelled` 명칭 전 Task 일치. 정규화 함수 `normHandle/normCamp/sim` 정의(§B)와 사용(§C) 일치. ✅

---

## 오픈 항목
1. **어드민 예약 상세 URL** — 받으면 RUNBOOK `ADMIN_BOOKING_URL`에 박음.
2. 전달: HTML 파일 직접 전달로 시작, 호스팅 필요 시 추후.
