// 안심취소 리워드 (트랙 A 파일럿) 설정값 — 금액·횟수·문구는 여기서만 바꾼다.
// 클라이언트(전달 모달)와 서버(제출 API 검증)가 함께 쓰므로 서버 전용 모듈을 import하지 않는다.

// 리워드 확정 여부 — false면 금액·횟수 대신 「추후 안내」로 노출
export const SAFE_CANCEL_REWARD_CONFIRMED = false;

// 캠핏 포인트 지급액 (가안 3만P)
export const SAFE_CANCEL_REWARD_POINTS = 30000;

// 크리에이터 1인당 월 참여 횟수 (가안 1회)
export const SAFE_CANCEL_MONTHLY_LIMIT_PER_CREATOR = 1;

// 월 전체 참여 상한 (가안 20명, 선착순)
export const SAFE_CANCEL_MONTHLY_TOTAL_CAP = 20;

// 인사이트 캡처 기준일 / 제출 기한 (업로드일 기준)
export const SAFE_CANCEL_INSIGHT_DAY = 7;
export const SAFE_CANCEL_SUBMIT_DEADLINE_DAYS = 14;

// 캡션 고정 문구 (크리에이터 가이드 「올리기 전 체크」와 동일)
export const SAFE_CANCEL_CAPTION_TEXT =
    '안심취소 캠핑장 예약 시 취소수수료 최대 100% 캠핏 포인트 지급 (적용 조건 · 지급 시점은 캠핏 앱 확인) #안심취소 #광고';

// 크리에이터 가이드 링크 — 공개 전이면 null (모달에서 숨김)
export const SAFE_CANCEL_GUIDE_URL: string | null = null;

// 참여 조건 체크리스트 — 가이드 5개 항목 중 「리워드 참여 체크」는 토글이 대신하므로 4개
export const SAFE_CANCEL_CHECKLIST = [
    { key: 'isSafeCancelCampsite', label: '안심취소 캠핑장 협찬이다', hint: '모르면 담당자 확인' },
    { key: 'usedRequiredPhrases', label: '"최대", "안심취소 캠핑장이면"을 넣었다', hint: '"무조건 · 다 돌려받아요 · 현금 환불"은 금지' },
    { key: 'addedCaptionAndTags', label: '캡션 문구와 #안심취소 #광고를 붙였다', hint: '' },
    { key: 'willSubmitInsight', label: `${SAFE_CANCEL_INSIGHT_DAY}일 뒤 인사이트 캡처를 낸다`, hint: `업로드 후 ${SAFE_CANCEL_SUBMIT_DEADLINE_DAYS}일 안 · 월말 지급` },
] as const;

export type SafeCancelChecklistKey = (typeof SAFE_CANCEL_CHECKLIST)[number]['key'];

// 인스타그램 릴스 URL 형식 (instagram.com/reel/… 또는 /reels/…)
const INSTAGRAM_REEL_URL_PATTERN = /^https?:\/\/(www\.)?instagram\.com\/reels?\/[A-Za-z0-9_-]+/;

export function isInstagramReelUrl(url: string): boolean {
    return INSTAGRAM_REEL_URL_PATTERN.test(url.trim());
}

// 리워드 안내 문구 — 미확정이면 「추후 안내」
export function formatSafeCancelRewardSummary(): string {
    if (!SAFE_CANCEL_REWARD_CONFIRMED) return '리워드 금액 · 참여 횟수는 추후 안내';
    return `캠핏 포인트 ${SAFE_CANCEL_REWARD_POINTS.toLocaleString('ko-KR')}P · 1인 월 ${SAFE_CANCEL_MONTHLY_LIMIT_PER_CREATOR}회 · 월 선착순 ${SAFE_CANCEL_MONTHLY_TOTAL_CAP}명`;
}
