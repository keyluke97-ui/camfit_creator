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

## §B. 콘텐츠 유사매칭

목표: 각 쿠폰 예약(핸들 H, 캠핑장 C, 퇴실일 D)이 콘텐츠를 남겼는지 판정. **예약번호 정확매칭은 쓰지 않는다.**

> 구현: `match.py`가 이 §B 매칭(정규화·KST 캘린더 날짜 비교·판정 임계값)을 수행한다. 런북이 진실원, 스크립트는 그 구현체다.

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
3. 날짜: 콘텐츠 `업로드 날짜`(없으면 `Created`)와 퇴실일 `D`를 **KST 캘린더 날짜(자정 절삭) 단위**로 변환해 비교 — `업로드일(KST) ≥ (D − 2일)(KST)` → 날짜 ✓. ⚠️ raw epoch 직접 비교 금지: 콘텐츠 `업로드 날짜`는 date-only(자정)이고 `checkoutTimestamp`는 KST 시각이 붙어 있어, epoch로 비교하면 ~15h 오차로 경계건이 오판된다(드라이런서 실제 발생).
4. **그리고 "콘텐츠 있음"**.

| 결과 | 상태 |
|------|------|
| 핸들✓ + 캠핑장✓ + 날짜✓ + 콘텐츠있음 | ✅ 제출 완료 |
| 핸들✓ + 캠핑장 모호(포함 아님 & 0.4≤sim<0.6) | ⚠️ 확인 필요 |
| 핸들 후보 0 또는 캠핑장 sim<0.4 | ❌ 미제출 |

판정은 LLM이 행별로 적용하되, 위 규칙을 일관 기준으로 삼는다. 애매하면 ❌로 단정하지 말고 ⚠️.

> ⚠️ **미제출은 "워크리스트"다.** 핸들 매칭이 정확/포함 매칭이라, 크리에이터가 콘텐츠표에 다른 채널명 표기로 올린 경우 false ❌(미제출)가 날 수 있다(한 핸들에 미제출이 몰려 있으면 채널명 불일치 의심). 미제출 리스트는 자동 확정이 아니라 **사람이 최종 검증할 대상 목록**으로 다룬다. (정밀도 개선이 필요해지면 핸들 → `크리에이터 명단` 레코드 연계로 채널명 변형까지 대조하는 방식으로 하드닝.)

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

> 구현: `gen_html.py`가 이 §C 치환 매핑을 수행한다. 브랜드 토큰·Pretendard 폰트스택·KPI 단위는 `report-template.html`에 직접 반영돼 있어 사후 치환이 없다. 어드민 셀은 `--admin-url-template`(기본 빈값=예약코드 텍스트) 옵션으로 제어한다.

## §D. 수동 실행 절차

매주 금요일 11:00 KST, 기준일 `YYYY-MM-DD`(= 실행일)로 아래 5단계를 순서대로 수행한다.
모든 입출력 파일은 `tools/creator-coupon-report/out/`(gitignore) 하위다. 스크립트는 `tools/creator-coupon-report/`에 커밋돼 있다.

1. **§A 데이터 수집 (probe MCP)** — `mcp__plugin_camfit-cpf-plugin_cpf__probe_query_run`로 §A-1·§A-2 두 쿼리를 실행한다. 실행 전 §A 상단 변수(`WEEK_START_MS`=기준−7일, `CHECK_LOOKBACK_MS`=기준−8주, `GRACE_CUTOFF_MS`=기준−14일, 모두 KST 자정 epoch ms)를 채운다.
   - §A-1 결과 → `out/activity.json` (활동창)
   - §A-2 결과 → `out/checkwin.json` (점검창)

2. **§B-1 콘텐츠 후보 (Airtable)** — `mcp__Airtable_MCP_Server__list_records`.
   - baseId `appEGM6qarNr9M7HN` / tableId `tblta2cow9ymKr68J`
   - 뷰 미지정. `filterByFormula`: `AND({협찬의 종류를 골라주세요}='캠핑장 예약', IS_AFTER({Created}, '<기준−10주의 YYYY-MM-DD>'))`
   - maxRecords 500
   - 결과 → `out/content.json`

3. **매칭** — `python3 match.py --date YYYY-MM-DD`
   - 입력: `out/activity.json`, `out/checkwin.json`, `out/content.json`
   - 출력: `out/match_results.json` + 상태 카운트 요약 1~2줄

4. **HTML 생성** — `python3 gen_html.py --date YYYY-MM-DD`
   - 입력: `out/match_results.json`, `report-template.html`
   - 출력: `out/creator-coupon-report-YYYY-MM-DD.html`
   - (어드민 URL이 정해지면 `--admin-url-template 'https://.../{code}'` 추가)

5. **전달** — 생성된 `out/creator-coupon-report-YYYY-MM-DD.html` 1부를 전달한다. `out/`은 gitignore이므로 산출물은 커밋하지 않는다.
