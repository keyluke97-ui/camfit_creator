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
