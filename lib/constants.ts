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
