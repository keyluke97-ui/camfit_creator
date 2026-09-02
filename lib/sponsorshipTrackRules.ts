// sponsorshipTrackRules.ts - 협찬 2분기(신청하기 / 제안받기) 진입 카드의 상태 판정
// ⚠️ **크리에이터에게 나가는 문구는 전부 이 파일에 있다.** 카피 수정은 여기서만 한다.
//    컴포넌트에 문구를 두면 상태별 문구가 JSX 분기에 흩어져 무엇이 언제 나가는지 읽을 수 없게 된다.
// ⚠️ React·Airtable SDK에 의존하지 않는다 (tools/jimyeong/verify-rules.ts가 tsx로 직접 돌린다).
// 스펙: docs/superpowers/specs/2026-09-02-협찬-2분기-진입-IA-design.md §3.2

import type { ReviewStatus } from '@/types';

// ── 신청하기 (프리미엄 협찬) ──

export type ApplyTrackState = 'NEEDS_SETTLEMENT' | 'OPEN';
export type ApplyTrackDestination = 'campaigns' | 'settlement';

export interface ApplyTrackView {
    state: ApplyTrackState;
    message: string;
    destination: ApplyTrackDestination;
}

/**
 * 정산 정보(premiumId)가 없으면 캠페인 목록 자체를 못 보므로 개수 대신 등록 안내를 낸다.
 * fetchCampaigns가 premiumId 있을 때만 돌기 때문에 미등록자의 openCampaignCount는 항상 0인데,
 * 그 0을 화면에 내보내면 "열린 캠페인이 없다"는 거짓말이 된다.
 */
export function resolveApplyTrack(input: {
    hasPremiumId: boolean;
    openCampaignCount: number;
}): ApplyTrackView {
    if (!input.hasPremiumId) {
        return { state: 'NEEDS_SETTLEMENT', message: '정산 정보 등록 필요', destination: 'settlement' };
    }
    return {
        state: 'OPEN',
        message: `열린 캠페인에 지원 · 신청 가능 ${input.openCampaignCount}개`,
        destination: 'campaigns',
    };
}

// ── 제안받기 (내부 용어: 지명형 협찬) ──

export type OfferTrackState =
    | 'UNREGISTERED'
    | 'UNDER_REVIEW'
    | 'REJECTED'
    | 'HIDDEN'
    | 'HIDDEN_WITH_OFFERS'
    | 'HAS_OFFERS'
    | 'WAITING';

export type OfferTrackDestination = 'profile' | 'offers';
export type OfferTrackTone = 'brand' | 'danger';

export interface OfferTrackView {
    state: OfferTrackState;
    badge: string;                        // '' 이면 뱃지 없음
    message: string;
    destination: OfferTrackDestination;
    tone: OfferTrackTone;
}

/**
 * 제안이 있을 때의 카드(§3.2 표 2번).
 *
 * ⚠️ **회신 촉구는 pendingCount에만 건다.** offerCount에는 이미 수락한 `확정`도 섞여 있다
 *    (getCreatorOffers가 `크리에이터확인중`+`확정`을 함께 읽는다 — 수락한 제안의
 *    쿠폰 코드를 보여줘야 해서 의도적). 거기에 촉구를 걸면 할 일이 없는 사람에게
 *    "기한 안에 회신해주세요"가 나간다.
 */
function offersView(
    input: { offerCount: number; pendingCount: number; newOfferCount: number },
    opts: { hidden: boolean },
): OfferTrackView {
    return {
        state: opts.hidden ? 'HIDDEN_WITH_OFFERS' : 'HAS_OFFERS',
        badge: opts.hidden ? '비공개' : (input.newOfferCount > 0 ? `새 제안 ${input.newOfferCount}` : ''),
        message: input.pendingCount > 0
            ? `받은 제안 ${input.pendingCount}건 · 기한 안에 회신해주세요`
            : `확정된 제안 ${input.offerCount}건 확인하기`,
        destination: 'offers',
        tone: 'brand',
    };
}

/**
 * 스펙 §3.2 표를 위에서부터 평가해 처음 참이 되는 하나만 적용한다.
 *
 * ⚠️ **제안이 있으면 수신함 링크를 잃지 않는다.** 받은 제안 배너를 없앤 뒤로
 *    /dashboard/offers로 가는 링크는 이 카드 하나뿐이고, 회신 기한은 2영업일이라
 *    링크가 사라지면 그대로 만료된다. 그래서 제안 보유가 심사 상태·공개 여부보다 앞선다.
 *
 * ⚠️ **`반려`만 제안보다 위다.** 확정 제안은 목록에서 사라지지 않으므로
 *    (getCreatorOffers가 `확정`도 읽는다) 제안을 앞세우면 "수정 필요"가 영구히 가려진다.
 *    `심사대기`는 반대다 — `심사 중`은 비행동성 안내라 잠시 가려도 손실이 작고,
 *    이 조합은 크리에이터가 직접 만든다(제안을 받은 미등록자가 공개 신청을 하면
 *    lib/airtable.ts의 `'' | '반려' → '심사대기'` 전이가 일어난다).
 *
 * ⚠️ **`비공개` 뱃지는 `승인`일 때만 붙인다.** 폴백은 isPublic을 아예 모르고(기본값 false),
 *    `심사대기`의 isPublic도 믿을 신호가 아니다 — PublishRequestCard의 "공개 중지하기"는
 *    심사 상태와 무관하게 뜨고, 눌러도 심사대기는 유지된다(lib/airtable.ts의 심사 전이가
 *    `심사대기`를 다루지 않는다). 확실한 건 `승인 && !isPublic` 하나뿐이다.
 */
export function resolveOfferTrack(input: {
    reviewStatus: ReviewStatus;
    isPublic: boolean;
    offerCount: number;
    pendingCount: number;
    newOfferCount: number;
}): OfferTrackView {
    // 1번 — 반려. 제안보다 위다.
    if (input.reviewStatus === '반려') {
        return {
            state: 'REJECTED',
            badge: '수정 필요',
            message: '반려 사유를 확인하고 다시 공개해주세요',
            destination: 'profile',
            tone: 'danger',
        };
    }
    // 2번 — 제안 있음. 심사 상태·공개 여부보다 위다.
    if (input.offerCount > 0 || input.pendingCount > 0) {
        return offersView(input, { hidden: input.reviewStatus === '승인' && !input.isPublic });
    }
    // 3번 — 심사대기
    if (input.reviewStatus === '심사대기') {
        return {
            state: 'UNDER_REVIEW',
            badge: '심사 중',
            message: '공개 신청 확인 중이에요',
            destination: 'profile',
            tone: 'brand',
        };
    }
    // 4·5번 — 승인 (여기 오면 제안이 없다)
    if (input.reviewStatus === '승인') {
        if (!input.isPublic) {
            return {
                state: 'HIDDEN',
                badge: '비공개',
                message: '공개로 바꾸면 제안을 받을 수 있어요',
                destination: 'profile',
                tone: 'brand',
            };
        }
        return {
            state: 'WAITING',
            badge: '',
            message: '캠지기가 볼 수 있어요 · 제안을 기다리는 중',
            destination: 'profile',
            tone: 'brand',
        };
    }
    // '' (아직 공개 신청 전) + 알 수 없는 값. 프로필 조회 실패 폴백도 여기로 떨어진다.
    // NEW 뱃지가 붙는 유일한 상태 — 한 번 등록하면 사라지므로 뱃지가 소진되지 않는다.
    return {
        state: 'UNREGISTERED',
        badge: 'NEW',
        message: '내가 정한 금액부터 제안이 시작됩니다',
        destination: 'profile',
        tone: 'brand',
    };
}
