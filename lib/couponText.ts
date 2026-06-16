// couponText.ts - 협찬 조건/팔로워 공유 메시지 빌더 (단일 소스)
// CHANGED: 신청완료(handleCopyAll) + 입실등록(handleCopyConditions)의 복붙 텍스트를 통합.
//          두 화면이 같은 빌더를 공유해 드리프트(한쪽만 수정되어 내용 어긋남) 제거.
import type { CouponEvent, ChannelType } from '@/types';
import { COUPON_APPLY_DAYS_CONFIG, formatDiscount, COUPON_REGISTER_URL } from '@/lib/constants';

export interface SponsorshipTextInput {
    accommodationName: string;
    myCouponCode?: string;          // 내 예약 쿠폰
    deadline?: string;              // 콘텐츠 제작 기한
    highlights?: string;            // 캠지기 포인트
    channelTypes?: ChannelType[];   // 인스타 태그 안내용 (신청완료만 보유)
    hostInstagram?: string;         // 캠핑장 인스타 (신청완료만 보유)
    detailUrl?: string;             // 숙소 상세 (비쿠폰 캠페인에서만 노출)
    couponEvent?: CouponEvent | null;
    followerCouponCode?: string;    // 분배된 본인 팔로워 쿠폰 코드 (쿠폰이벤트만)
}

// 크리에이터 본인 기록용 — 협찬 조건 전체 (카톡 나에게 보내기/메모장 저장용)
export function buildSponsorshipSummary(input: SponsorshipTextInput): string {
    const { accommodationName, myCouponCode, deadline, highlights, channelTypes, hostInstagram, detailUrl, couponEvent, followerCouponCode } = input;
    const lines: string[] = [];
    lines.push(`📌 협찬 조건 — ${accommodationName}`);

    // [내 예약]
    lines.push('');
    lines.push('[내 예약]');
    if (myCouponCode) lines.push(`• 내 예약 쿠폰(캠핏에 등록): ${myCouponCode}`);
    if (deadline) lines.push(`• 콘텐츠 제작 기한: ${deadline}`);
    if (couponEvent) lines.push(`• 내 입실(방문) 가능 기한: ${couponEvent.visitStartDate} ~ ${couponEvent.visitEndDate}`);

    // [팔로워 쿠폰] + 사용 방법 (쿠폰이벤트 + 분배 코드 있을 때만)
    if (couponEvent && followerCouponCode) {
        const dayLabel = COUPON_APPLY_DAYS_CONFIG[couponEvent.couponApplyDays]?.label || couponEvent.couponApplyDays;
        lines.push('');
        lines.push('[팔로워 쿠폰] (팔로워 공유용 · 내 예약엔 사용 X)');
        lines.push(`• 팔로워 쿠폰 코드: ${followerCouponCode}`);
        lines.push(`• 할인: ${formatDiscount(couponEvent.discount)} (${dayLabel})`);
        lines.push('• 적용 사이트: 해당 캠핑장 내 모든 사이트');
        lines.push(`• 최대 사용 수량: ${couponEvent.couponPerCreator}장 (소진 시 자동 만료)`);
        lines.push(`• 팔로워 쿠폰 사용 가능: ${couponEvent.couponStartDate} ~ ${couponEvent.couponEndDate}`);
        lines.push('');
        lines.push(...followerHowToLines());
    }

    // [캠지기 포인트]
    if (highlights) {
        lines.push('');
        lines.push('[캠지기 포인트]');
        lines.push(highlights);
    }

    // [콘텐츠 제작 필수] — 인스타 태그 + (비쿠폰만) 숙소 상세 링크
    const contentLines: string[] = [];
    if (channelTypes?.includes('인스타')) {
        contentLines.push('• 인스타그램: @camfit_official 태그');
        if (hostInstagram) contentLines.push(`• 캠핑장 인스타: @${hostInstagram} 태그`);
    }
    // CHANGED: 쿠폰이벤트는 등록 링크만 노출(숙소 상세 링크는 혼동 유발 → 제거). 비쿠폰만 숙소 상세.
    if (!couponEvent && detailUrl) contentLines.push(`• 숙소 상세 페이지: ${detailUrl}`);
    if (contentLines.length > 0) {
        lines.push('');
        lines.push('[콘텐츠 제작 필수]');
        lines.push(...contentLines);
    }

    return lines.join('\n');
}

// 팔로워에게 그대로 전달하는 깨끗한 메시지 (본인 정보 배제). 쿠폰이벤트+분배 코드 있을 때만 의미.
export function buildFollowerShareMessage(input: SponsorshipTextInput): string {
    const { accommodationName, couponEvent, followerCouponCode } = input;
    if (!couponEvent || !followerCouponCode) return '';
    const dayLabel = COUPON_APPLY_DAYS_CONFIG[couponEvent.couponApplyDays]?.label || couponEvent.couponApplyDays;
    const lines: string[] = [];
    lines.push(`🎁 ${accommodationName} 팔로워 전용 할인 쿠폰`);
    lines.push('');
    lines.push(`✅ ${formatDiscount(couponEvent.discount)} 할인 (${dayLabel})`);
    lines.push(`📌 쿠폰 코드: ${followerCouponCode}`);
    lines.push('');
    lines.push('[사용 방법]');
    lines.push('① 위 쿠폰 코드 복사');
    lines.push(`② 캠핏 쿠폰 등록 페이지에서 등록 → ${COUPON_REGISTER_URL}`);
    lines.push("③ 쿠폰함에서 '사용하기'");
    lines.push(`④ ${accommodationName} 예약할 때 자동 적용`);
    lines.push('');
    lines.push(`※ ${couponEvent.couponStartDate} ~ ${couponEvent.couponEndDate} 사용 가능 · 수량 소진 시 자동 만료`);
    return lines.join('\n');
}

// 팔로워 쿠폰 사용 방법 4단계 (하드코딩, 쿠폰이벤트일 때만 노출)
function followerHowToLines(): string[] {
    return [
        '[팔로워 쿠폰 사용 방법] (팔로워에게 안내)',
        '① 쿠폰 코드 받기 → ② 캠핏 쿠폰 등록 페이지에서 등록',
        "③ 쿠폰함에서 '사용하기' → ④ 예약할 때 자동 적용",
        `🔗 쿠폰 등록: ${COUPON_REGISTER_URL}`,
    ];
}
