// 안심취소 리워드 (트랙 A 파일럿) 설정값 — 금액·횟수·문구는 여기서만 바꾼다.
// 클라이언트(전달 모달)와 서버(제출 API 검증)가 함께 쓰므로 서버 전용 모듈을 import하지 않는다.

// 리워드 확정 여부 — false면 등급별 포인트 대신 「금액은 추후 안내」로 노출
export const SAFE_CANCEL_REWARD_CONFIRMED = false;

// 등급별 캠핏 포인트 — 검토 중이라 플레이스홀더(null). 정성상은 운영이 월말 별도 선정(포털 선택지 없음)
export const SAFE_CANCEL_GRADE_POINTS: { basic: number | null; source: number | null; merit: number | null } = {
    basic: null,
    source: null,
    merit: null,
};

// 크리에이터 1인당 월 리워드 대상 콘텐츠 수 — 전달은 여러 건 가능, 검수에서 그달 반응이 가장 높은 1건만 확인
// 월은 콘텐츠 전달일(KST) 기준. 월 전체 인원 상한은 없음
export const SAFE_CANCEL_MONTHLY_REWARDED_PER_CREATOR = 1;

// 지급일 — 콘텐츠 저장일 기준 익월 N일
export const SAFE_CANCEL_PAYOUT_DAY_OF_NEXT_MONTH = 10;

// 캡션 고정 문구 (크리에이터 가이드 「올리기 전 체크」와 동일) — 표시광고 지침상 광고 표시는 맨 앞
export const SAFE_CANCEL_CAPTION_TEXT =
    '[광고] 캠핑장 협찬 · 캠핏 포인트 제공\n안심취소 캠핑장 예약 시 취소수수료 최대 100% 캠핏 포인트 지급 (적용 조건 · 지급 시점은 캠핏 앱 확인) #안심취소';

// 리워드 선정 · 부정참여 안내 — 선정은 반응 + 퀄리티 정성 판단이라 수치 기준은 공개하지 않음
export const SAFE_CANCEL_SELECTION_NOTICES = [
    '여러 개 전달할 수 있어요. 리워드는 그달 전달한 콘텐츠 중 공감되고 재밌는 1개를 골라 지급해요.',
    '매달 가장 공감되고 재밌는 콘텐츠는 정성상으로 선정해요. 숨김 처리한 콘텐츠는 정성상 대상에서 제외돼요.',
    '부정한 방법으로 참여한 콘텐츠는 리워드 대상에서 제외되고, 지급된 포인트는 회수될 수 있어요.',
] as const;

// 2차 활용 동의(선택) 안내
export const SAFE_CANCEL_REPOST_CONSENT_HINT =
    '캠핏 공식 채널 · 광고 소재로 활용할 수 있어요. 영상에 나오는 다른 사람의 동의는 크리에이터가 확인해요. 인스타그램 기본 음원은 광고에 쓸 수 없어 음원을 바꿔 활용할 수 있어요.';

// 크리에이터 가이드 링크 — 공개 전이면 null (모달에서 숨김)
export const SAFE_CANCEL_GUIDE_URL: string | null = null;

// 참여 유형 — 크리에이터 자기 신고값. 확정 등급은 검수에서 운영이 따로 기록
export const SAFE_CANCEL_PARTICIPATION_TYPES = [
    { value: '기본', label: '기본', hint: '캡션 문구 · 해시태그만' },
    { value: '소스 활용 - 제공 클립', label: '소스 활용 - 제공 클립', hint: '캠핏 제공 클립으로 안심취소 장면 포함' },
    { value: '소스 활용 - 직접 촬영', label: '소스 활용 - 직접 촬영', hint: '직접 촬영한 안심취소 장면 포함' },
] as const;

export type SafeCancelParticipationType = (typeof SAFE_CANCEL_PARTICIPATION_TYPES)[number]['value'];

export function isSafeCancelParticipationType(value: unknown): value is SafeCancelParticipationType {
    return SAFE_CANCEL_PARTICIPATION_TYPES.some((type) => type.value === value);
}

// 필수 체크 — kind 'check' = 올리기 전 체크(가이드와 동일 3개), 'consent' = 참여 동의. 전부 체크해야 전달 가능
// 가이드 항목 중 「리워드 참여 체크」는 토글이 대신함
export const SAFE_CANCEL_CHECKLIST = [
    { key: 'isSafeCancelCampsite', kind: 'check', label: '안심취소 캠핑장 협찬이다', hint: '모르면 담당자 확인' },
    { key: 'usedRequiredPhrases', kind: 'check', label: '"최대", "안심취소 캠핑장이면"을 넣었다', hint: '"무조건 · 다 돌려받아요 · 현금 환불"은 금지' },
    { key: 'addedCaptionAndTags', kind: 'check', label: '캡션 맨 앞에 [광고] 문구와 #안심취소를 붙였다', hint: '' },
    { key: 'agreedRevisionRequest', kind: 'consent', label: '안심취소 표현이 사실과 다르거나 안심취소 정책이 바뀌면 캠핏이 수정 · 삭제를 요청할 수 있고, 요청에 협조해요.', hint: '' },
] as const;

export type SafeCancelChecklistKey = (typeof SAFE_CANCEL_CHECKLIST)[number]['key'];

// 인스타그램 릴스 URL 형식 (instagram.com/reel/… 또는 /reels/…)
const INSTAGRAM_REEL_URL_PATTERN = /^https?:\/\/(www\.)?instagram\.com\/reels?\/[A-Za-z0-9_-]+/;

export function isInstagramReelUrl(url: string): boolean {
    return INSTAGRAM_REEL_URL_PATTERN.test(url.trim());
}

// 리워드 안내 문구 — 미확정이면 「금액은 추후 안내」
export function formatSafeCancelRewardSummary(): string {
    const { basic, source } = SAFE_CANCEL_GRADE_POINTS;
    if (!SAFE_CANCEL_REWARD_CONFIRMED || basic === null || source === null) return '금액은 추후 안내';
    return `기본 ${basic.toLocaleString('ko-KR')}P · 소스 활용 ${source.toLocaleString('ko-KR')}P`;
}
