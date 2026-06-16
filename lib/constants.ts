// constants.ts - 프로젝트 공통 상수 정의
import type { ChannelType } from '@/types';

/**
 * 파트너 협찬 접근 가능 채널 목록 (인스타/유튜브만 허용, 블로거 제외)
 * — 이 상수를 수정하면 프론트(DashboardTabs) + 백엔드(API 403) 모두 반영됨
 */
export const PARTNER_ELIGIBLE_CHANNELS: ChannelType[] = ['인스타', '유튜브'];

/**
 * 채널 종류에 파트너 협찬 접근 가능 채널이 포함되어 있는지 확인
 */
export function hasPartnerEligibleChannel(channelTypes: string[]): boolean {
    return channelTypes.some(
        (channel) => PARTNER_ELIGIBLE_CHANNELS.includes(channel as ChannelType)
    );
}

/**
 * 카카오톡 채널 문의 URL
 */
export const KAKAO_CHANNEL_URL = 'http://pf.kakao.com/_fBxaQG';

/**
 * 캠핏 쿠폰 등록 페이지 URL (고정)
 * — 팔로워가 쿠폰 코드를 등록하는 페이지. 크리에이터 본인의 예약 쿠폰 등록에도 동일 사용.
 */
export const COUPON_REGISTER_URL = 'https://camfit.co.kr/mypage/coupon/register';

/**
 * 크리에이터가 콘텐츠/팔로워에게 안내할 링크 목록
 * — 쿠폰이벤트면 [쿠폰 등록 페이지]만(숙소 상세 링크는 혼동 유발 → 제외), 아니면 [숙소 상세]만.
 *   ApplicationModal(Step3 표시), ContentRequirements 공용. 복붙 텍스트는 couponText.ts 빌더가 담당.
 */
// CHANGED: 쿠폰이벤트 시 숙소 상세 링크 제거 — 팔로워가 '등록 페이지'에 집중하도록(상세 링크는 헷갈림)
export function getFollowerLinks(
    detailUrl: string | undefined,
    isCouponEvent: boolean
): { label: string; url: string }[] {
    if (isCouponEvent) return [{ label: '팔로워 쿠폰 등록 페이지', url: COUPON_REGISTER_URL }];
    return detailUrl ? [{ label: '숙소 상세 페이지', url: detailUrl }] : [];
}

/**
 * 쿠폰 적용 요일 → 표시 라벨 + 색상 (CampaignCard / ApplicationModal 공용)
 */
export const COUPON_APPLY_DAYS_CONFIG: Record<string, { label: string; color: string }> = {
    '평일전용': { label: '평일전용', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
    '평일+주말(금토)': { label: '평일+주말', color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' },
    '평일+주말+공휴일': { label: '전체 기간', color: 'bg-teal-500/15 text-teal-400 border-teal-500/30' },
};

/**
 * 금액 포맷 (10000 → 1만원, 그 외 → 12,000원)
 */
export function formatDiscount(amount: number): string {
    if (amount >= 10000 && amount % 10000 === 0) {
        return `${amount / 10000}만원`;
    }
    return `${amount.toLocaleString()}원`;
}
