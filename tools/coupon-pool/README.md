# 쿠폰 풀 정합성 툴 (coupon-pool)

프리미엄 협찬 **쿠폰이벤트 캠페인**(`쿠폰이벤트희망=true`)의 팔로워 쿠폰 풀이 새는 걸 막는 운영 도구.

> 상세 배경·절차: [docs/SOP-프리미엄협찬-쿠폰풀-정합성.md](../../docs/SOP-프리미엄협찬-쿠폰풀-정합성.md)

## 왜 필요한가 (한 줄)

신청 레코드를 그냥 삭제하면 `신청 가능 인원`은 돌아오지만 **팔로워 쿠폰은 풀로 반납되지 않아**, 풀이 자리보다 먼저 바닥나 다음 신청자가 `COUPON_POOL_EMPTY`("팔로워 쿠폰이 일시적으로 부족합니다")를 맞는다.

**불변식: `풀 줄 수` ≥ `열린 자리(총 신청 가능 인원)`** — 이게 깨지면 터진다.

## 도구

### 1. audit.cjs — 주간 감사 (읽기 전용)

```bash
node tools/coupon-pool/audit.cjs
```

모든 쿠폰이벤트 캠페인을 스캔해 `풀 < 열린자리`(풀 부족)와 `배포완료 > 살아있는 신청`(붕 뜬 코드)을 플래그. 아무것도 쓰지 않음. **매주 1회 권장.**

- `🔴 노출中` + `풀부족 ⚠️` = **지금 실제로 터지는 캠페인** → 즉시 조치
- `⚪ 미노출` = 오픈 전이라 당장은 무해(잠재)

### 2. cancel-application.cjs — 취소 = 코드 반납 후 삭제 (안전 툴)

레코드를 그냥 지우지 말고 이걸로 취소하면 코드 반납이 자동으로 된다.

```bash
# dry-run: 계획만 출력, 아무것도 안 씀
node tools/coupon-pool/cancel-application.cjs <신청레코드ID>

# 실제 실행: 코드 반납(+검증) → 레코드 삭제
node tools/coupon-pool/cancel-application.cjs <신청레코드ID> --commit
```

`<신청레코드ID>` = `유료 오퍼 신청 건` 테이블(`tblIV8Wk4SLx2Hh91`)의 `recXXXX`.
동작: 신청 레코드의 본인 쿠폰 코드 → 캠페인 `팔로워 쿠폰 코드` 풀에 추가 + `배포 완료된 쿠폰`에서 제거(재분배 이중카운트 방지) → 검증 통과 시 레코드 삭제(→ 자리 +1 자동 복구).

## 환경

`.env.local`의 `AIRTABLE_ACCESS_TOKEN` / `AIRTABLE_BASE_ID` / `AIRTABLE_CAMPAIGN_TABLE_ID` / `AIRTABLE_APPLICATION_TABLE_ID`를 그대로 읽는다. 별도 설정 불필요.
프로덕션 앱(Next.js 빌드)과 무관 — `tools/`는 빌드에 포함되지 않는 운영 스크립트다.
