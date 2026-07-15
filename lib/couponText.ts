// couponText.ts - 협찬 조건/팔로워 공유 메시지 빌더 (단일 소스)
// CHANGED: 신청완료(handleCopyAll) + 입실등록(handleCopyConditions)의 복붙 텍스트를 통합.
//          두 화면이 같은 빌더를 공유해 드리프트(한쪽만 수정되어 내용 어긋남) 제거.
import type { CouponEvent, ChannelType } from '@/types';
import { COUPON_APPLY_DAYS_CONFIG, formatDiscount, COUPON_REGISTER_URL } from '@/lib/constants';

// CHANGED: 박수 조건 라벨 — 발행 쿠폰 minBookingDays/maxBookingDays 기준. 1박 예약엔 할인 미적용 문의 방지.
//          min만 → 'N박 이상', min===max → 'N박', 둘 다·상이 → 'N박~M박', 없으면 '' (미노출).
export function formatBookingNights(min?: number, max?: number): string {
    if (!min && !max) return '';
    if (min && max) return min === max ? `${min}박` : `${min}박~${max}박`;
    if (min) return `${min}박 이상`;
    return `${max}박 이하`;
}

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
        const dayConfig = COUPON_APPLY_DAYS_CONFIG[couponEvent.couponApplyDays];
        const dayLabel = dayConfig?.label || couponEvent.couponApplyDays;
        lines.push('');
        lines.push('[팔로워 쿠폰] (팔로워 공유용 · 내 예약엔 사용 X)');
        lines.push(`• 팔로워 쿠폰 코드: ${followerCouponCode}`);
        lines.push(`• 할인: ${formatDiscount(couponEvent.discount)} (${dayLabel})`);
        // CHANGED: 박수 조건 — 1박 예약엔 할인 미적용 문의 방지 (미설정 시 미노출)
        const summaryNights = formatBookingNights(couponEvent.minBookingNights, couponEvent.maxBookingNights);
        if (summaryNights) lines.push(`• 예약 조건: ${summaryNights} 예약에만 사용 가능`);
        // CHANGED: 옵션별 제외 안내 — 공휴일 전일·당일 미사용 문의 다발 대응 (제외 없는 옵션은 미노출)
        if (dayConfig?.exclusionNote) lines.push(`• ⚠️ ${dayConfig.exclusionNote}`);
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
// CHANGED: SNS 감성 톤으로 개편 — 선물 헤드라인 + 선착순 수량(couponPerCreator) + 예약 1건당 1회 안내 추가
export function buildFollowerShareMessage(input: SponsorshipTextInput): string {
    const { accommodationName, couponEvent, followerCouponCode } = input;
    if (!couponEvent || !followerCouponCode) return '';
    const dayConfig = COUPON_APPLY_DAYS_CONFIG[couponEvent.couponApplyDays];
    const dayLabel = dayConfig?.label || couponEvent.couponApplyDays;
    const lines: string[] = [];
    lines.push('🏕️ 팔로워분들께 드리는 캠핑 선물!');
    lines.push(`${accommodationName} 예약할 때 쓸 수 있는 ${formatDiscount(couponEvent.discount)} 할인 쿠폰이에요 🎁`);
    lines.push('');
    lines.push(`🎟️ 쿠폰 코드: ${followerCouponCode}`);
    lines.push('');
    lines.push('[사용 방법]');
    lines.push('① 위 쿠폰 코드 복사');
    lines.push(`② 캠핏 쿠폰 등록 페이지에서 등록 → ${COUPON_REGISTER_URL}`);
    lines.push("③ 쿠폰함에서 '사용하기' 누르기");
    lines.push(`④ ${accommodationName} 예약하면 자동 적용, 끝!`);
    lines.push('');
    lines.push(`📅 ${couponEvent.couponStartDate} ~ ${couponEvent.couponEndDate} · ${dayLabel} 사용 가능`);
    // CHANGED: 박수 조건 노출 — 1박 예약엔 할인 미적용 문의 방지 (미설정 시 미노출)
    const nightsLabel = formatBookingNights(couponEvent.minBookingNights, couponEvent.maxBookingNights);
    if (nightsLabel) lines.push(`🛏️ ${nightsLabel} 예약에 사용 가능`);
    lines.push(`👥 선착순 ${couponEvent.couponPerCreator}장 한정! 소진되면 자동 만료돼요`);
    // CHANGED: 옵션별 제외 안내 — 공휴일 전일·당일 미사용 문의 다발 대응 (제외 없는 옵션은 미노출)
    if (dayConfig?.exclusionNote) lines.push(`⚠️ ${dayConfig.exclusionNote}`);
    lines.push('※ 쿠폰 1장당 예약 1건 적용 (숙박 일수 무관)');
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
