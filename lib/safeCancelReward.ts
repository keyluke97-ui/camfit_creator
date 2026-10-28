// 안심취소 리워드 (트랙 A 파일럿) 설정값 — 금액·횟수·문구는 여기서만 바꾼다.
// 클라이언트(전달 모달)와 서버(제출 API 검증)가 함께 쓰므로 서버 전용 모듈을 import하지 않는다.
// CHANGED: 크리에이터 가이드 v93(정본)에 맞춰 용어·조건 전면 정렬 — 문구는 가이드와 글자까지 동일하게 유지
// 가이드: SAFE_CANCEL_GUIDE_URL

import type { SafeCancelRewardSubmission } from '@/types';

// 크리에이터 가이드 (링크가 있는 모든 사용자 공개, 수정 즉시 반영)
export const SAFE_CANCEL_GUIDE_URL: string | null = 'https://claude.ai/artifact/WaZaYcfA4AQNjqP1sW7wuU';

// 안심취소 80 캠핑장 목록 — 대상 확인용 (안심취소+ 캠핑장은 대상 아님)
export const SAFE_CANCEL_80_LIST_URL =
    'https://camfit.co.kr/search/result?adultCnt=2&events=%EC%95%88%EC%8B%AC%EC%B7%A8%EC%86%8C80';

// 리워드 확정 여부 — false면 금액 대신 「금액은 추후 안내」로 노출
export const SAFE_CANCEL_REWARD_CONFIRMED = true;

// CHANGED: 유형별 캠핏 포인트 (슬랙 확정안) — 정성상은 운영이 매달 1명 추가 선정(포털 선택지 없음)
export const SAFE_CANCEL_GRADE_POINTS: { basic: number | null; source: number | null; merit: number | null } = {
    basic: 10000,
    source: 30000,
    merit: 100000,
};

// 크리에이터 1인당 월 리워드 대상 콘텐츠 수 — 전달은 여러 건 가능, 그달 가장 높은 리워드 1개만 지급
// 월은 콘텐츠 전달일(KST) 기준. 월 전체 인원 상한은 없음
export const SAFE_CANCEL_MONTHLY_REWARDED_PER_CREATOR = 1;

// 지급일 — 콘텐츠 전달일 기준 익월 N일
export const SAFE_CANCEL_PAYOUT_DAY_OF_NEXT_MONTH = 10;

// 업로드 후 전달 기한 · 공개 유지 기간
export const SAFE_CANCEL_SUBMIT_DEADLINE_DAYS = 14;
export const SAFE_CANCEL_KEEP_PUBLIC_MONTHS = 3;

// 대시보드 상단 리워드 배너 노출 여부 — 파일럿 종료 시 false로 내림 (채널 무관 전원 노출)
export const SAFE_CANCEL_BANNER_ENABLED = true;

// CHANGED: 참여 유형 2개 — 「기본형」(1만P) · 「클립형」(3만P). 채널 무관(블로그도 클립형 인정)
// CHANGED: 유형 명칭을 「기본형」 · 「클립형」으로 통일 (사용자 결정) — value는 Airtable 단일 선택 값과 글자까지 같아야 함
// CHANGED: 가이드 v96 — 캠핑장의 안심취소 적용 종료 가능성 고지 문구 추가
// captionText = 가이드의 「안심취소 홍보 문구」 (수정 없이 그대로 사용), isClip = 영상 클립 삽입 유형 여부
// CHANGED: 채널 제한 없음 — 인스타 · 블로그 · 유튜브 모두 참여 가능 (링크 형식 검사 제거, 채널 적합성은 검수에서)
export const SAFE_CANCEL_PARTICIPATION_TYPES = [
    {
        value: '기본형',
        label: '기본형',
        points: SAFE_CANCEL_GRADE_POINTS.basic,
        hint: '본문에 [광고] · 안심취소 홍보 문구 · #캠핏 #안심취소',
        captionText: '안심취소 캠핑장이면 취소수수료를 최대 100% 캠핏 포인트로 돌려받아요 (적용 조건 · 지급 시점은 캠핏 앱 확인, 캠핑장 운영 사정에 따라 안심취소 서비스 적용이 종료될 수 있음)',
        isClip: false,
    },
    {
        value: '클립형',
        label: '클립형',
        points: SAFE_CANCEL_GRADE_POINTS.source,
        hint: '기본형 조건 + 제공 영상 클립 삽입 (Step 2 필수)',
        captionText:
            '안심취소 캠핑장이면 예약할 때 광고 하나만 보면, 취소해도 수수료를 최대 100% 캠핏 포인트로 돌려받아요 (적용 조건 · 지급 시점은 캠핏 앱 확인, 캠핑장 운영 사정에 따라 안심취소 서비스 적용이 종료될 수 있음)',
        isClip: true,
    },
] as const;

export type SafeCancelParticipationType = (typeof SAFE_CANCEL_PARTICIPATION_TYPES)[number]['value'];

export function isSafeCancelParticipationType(value: unknown): value is SafeCancelParticipationType {
    return SAFE_CANCEL_PARTICIPATION_TYPES.some((type) => type.value === value);
}

export function getSafeCancelParticipationType(value: SafeCancelParticipationType) {
    return SAFE_CANCEL_PARTICIPATION_TYPES.find((type) => type.value === value)!;
}

// 캡션 필수 조건 3개 (가이드 「캡션 필수 조건」과 동일)
export const SAFE_CANCEL_CAPTION_RULES = [
    '캡션(본문 · 설명란) 맨 앞에 [광고] 표시',
    '해시태그 #캠핏 #안심취소',
    '안심취소 홍보 문구를 그대로 사용 (문구 수정 없이)',
] as const;

// 클립형 조건 (가이드 「클립형 조건」과 동일)
export const SAFE_CANCEL_CLIP_RULES = [
    'Step 2 클립(광고 보고 100%)은 꼭 넣어 주세요. Step 1 · 3은 선택이에요',
    '앱 화면 속 내용을 알아볼 수 있게 넣어 주세요. 너무 빠르게 넘기거나 작게 넣으면 클립형으로 인정되지 않을 수 있어요',
    '앱 화면 속 금액이나 문구는 가리거나 바꾸지 말아 주세요',
    '속도 조절 · 자막 · 음악은 자유예요',
] as const;

// 리워드 선정 · 지급 · 유의사항 (가이드 「포인트 지급 안내」 · 「유의사항」 요약)
export const SAFE_CANCEL_SELECTION_NOTICES = [
    `콘텐츠 업로드 후 ${SAFE_CANCEL_SUBMIT_DEADLINE_DAYS}일 안에 전달해 주세요.`,
    '한 달에 여러 개를 전달해도 가장 높은 리워드 1개만 지급돼요 (기본형 · 클립형 합산 없음).',
    '정성상(+10만P)은 매달 우수 콘텐츠 1명을 내부 검토로 골라 추가로 드려요. 대상자가 없는 달은 지급하지 않아요.',
    `게시물은 업로드 후 ${SAFE_CANCEL_KEEP_PUBLIC_MONTHS}개월 공개 유지해 주세요. [광고] 표시 · 홍보 문구 · 해시태그(클립형은 영상 클립)도 함께 유지해야 해요. 그 전에 삭제 · 숨김 · 보관 처리하면 리워드에서 제외되고, 지급된 포인트는 회수될 수 있어요.`,
    // CHANGED: 가이드 v102 유의사항 — 지급 계정 · 검수 보완
    '크리에이터 가입 연락처와 캠핏 앱 가입 연락처가 같은지 확인해 주세요. 다르면 지급되지 않을 수 있어요.',
    '전달 후 검수해서 지급해요. 보완이 필요하면 등록된 연락처로 안내드리고, 기한 안에 보완되지 않으면 지급이 보류되거나 제외될 수 있어요.',
    '부정한 방법으로 참여한 콘텐츠는 리워드 대상에서 제외되고, 지급된 포인트는 회수될 수 있어요.',
] as const;

// CHANGED: 「촬영 전에 꼭 지켜주세요」 박스 → 가이드 맨 위 「리워드 종류」 카드로 교체 (사용자 결정)
// 기본형 조건 3가지 — 가이드 리워드 종류 카드와 동일 (클립형 = 이 3가지 + 영상 클립 삽입)
export const SAFE_CANCEL_REWARD_BASE_STEPS = [
    '캡션 맨 앞에 [광고] 표시',
    '캡션에 안심취소 홍보 문구 사용',
    '해시태그 #캠핏 #안심취소',
] as const;

// 필수 체크 — kind 'check' = 가이드 체크리스트, 'consent' = 참여 동의. 해당 유형 항목을 전부 체크해야 전달 가능
// onlyFor가 있으면 그 참여 유형을 골랐을 때만 표시·검증. 가이드 체크리스트 3번(포털에서 리워드 참여)은 토글이 대신함
export const SAFE_CANCEL_CHECKLIST: readonly {
    key: string;
    kind: 'check' | 'consent';
    label: string;
    hint: string;
    onlyFor?: SafeCancelParticipationType;
}[] = [
    { key: 'isSafeCancel80Campsite', kind: 'check', label: '안심취소 80 캠핑장 협찬인지 확인했어요', hint: '안심취소+ 캠핑장은 대상이 아니에요' },
    { key: 'addedCaptionRules', kind: 'check', label: '캡션(본문 · 설명란)에 [광고] 표시 · 안심취소 홍보 문구 · #캠핏 #안심취소를 모두 넣었어요', hint: '' },
    { key: 'includedStep2Clip', kind: 'check', label: 'Step 2 클립(광고 보고 100%)을 알아볼 수 있게 넣었어요', hint: '앱 화면 속 금액 · 문구는 가리거나 바꾸지 않았어요', onlyFor: '클립형' },
    { key: 'agreedRevisionRequest', kind: 'consent', label: `업로드 후 ${SAFE_CANCEL_KEEP_PUBLIC_MONTHS}개월 공개를 유지하고, 안심취소 표현이 사실과 다르거나 안심취소 정책이 바뀌면 캠핏의 수정 · 삭제 요청에 협조해요.`, hint: '' },
];

export type SafeCancelChecklistKey = string;

// 선택한 참여 유형에 해당하는 체크 항목만 (유형 미선택이면 공통 항목만)
export function getApplicableSafeCancelChecklist(participationType: SafeCancelParticipationType | null) {
    return SAFE_CANCEL_CHECKLIST.filter((item) => !item.onlyFor || item.onlyFor === participationType);
}

function formatPoints(points: number): string {
    return `${(points / 10000).toLocaleString('ko-KR')}만P`;
}

// 리워드 안내 문구 — 미확정이면 「금액은 추후 안내」
export function formatSafeCancelRewardSummary(): string {
    const { basic, source, merit } = SAFE_CANCEL_GRADE_POINTS;
    if (!SAFE_CANCEL_REWARD_CONFIRMED || basic === null || source === null) return '금액은 추후 안내';
    const meritText = merit === null ? '' : ` · 정성상 +${formatPoints(merit)}`;
    return `기본형 ${formatPoints(basic)} · 클립형 ${formatPoints(source)}${meritText}`;
}

// 제출 API의 안심취소 리워드 페이로드 검증 — 실패 시 에러 메시지, 통과 시 정규화된 값 (순수 함수라 단위 검증 가능)
export function parseSafeCancelReward(raw: unknown): { value?: SafeCancelRewardSubmission; error?: string } {
    if (raw === undefined || raw === null) return {};
    if (typeof raw !== 'object') return { error: '안심취소 리워드 정보가 올바르지 않습니다.' };
    const input = raw as { checklist?: Record<string, unknown>; participationType?: unknown };

    if (!isSafeCancelParticipationType(input.participationType)) {
        return { error: '안심취소 리워드 참여 유형을 선택해주세요.' };
    }
    const checklist = Object.fromEntries(
        getApplicableSafeCancelChecklist(input.participationType).map((item) => [item.key, input.checklist?.[item.key] === true])
    );
    if (Object.values(checklist).some((checked) => !checked)) {
        return { error: '안심취소 리워드 참여 조건을 모두 확인해주세요.' };
    }
    return {
        value: {
            checklist,
            participationType: input.participationType,
        },
    };
}
