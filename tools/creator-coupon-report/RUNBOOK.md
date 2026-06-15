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
