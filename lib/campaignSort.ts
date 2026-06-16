// campaignSort.ts - 캠페인 목록 정렬 옵션 + 정렬 함수
// CHANGED: 캠페인 증가에 따른 노출 순서 정렬 기능 신규 추가
import type { Campaign, CampaignSortKey } from '@/types';

// 정렬 메뉴에 노출되는 옵션 (대시보드 + 바텀시트 공유)
export const SORT_OPTIONS: { key: CampaignSortKey; label: string }[] = [
    { key: 'recent', label: '최신 등록순' },
    { key: 'priceDesc', label: '협찬금액 높은순' },
    { key: 'availableDesc', label: '잔여 신청가능순' },
    { key: 'deadlineAsc', label: '마감임박순' },
];

export const DEFAULT_SORT_KEY: CampaignSortKey = 'recent';

export function sortLabel(sortKey: CampaignSortKey): string {
    return SORT_OPTIONS.find((option) => option.key === sortKey)?.label ?? '';
}

// "2026년 06월 11일" 형태의 한국어 날짜 → 타임스탬프(ms). 파싱 불가 시 null
function parseKoreanDate(value: string): number | null {
    const match = value?.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
    if (!match) return null;
    const [, year, month, day] = match;
    return new Date(Number(year), Number(month) - 1, Number(day)).getTime();
}

/**
 * 캠페인 배열을 정렬 키에 따라 정렬한 새 배열을 반환한다.
 * - recent: Created(ISO) 내림차순 = 최신 먼저 (기본값)
 * - priceDesc: 내 등급 협찬금액 내림차순
 * - availableDesc: 내 등급 잔여 신청가능 인원 내림차순
 * - deadlineAsc: 콘텐츠 제작 기한 오름차순(가까운 날짜 먼저), 날짜 없으면 맨 뒤
 */
export function sortCampaigns(campaigns: Campaign[], sortKey: CampaignSortKey): Campaign[] {
    const sorted = [...campaigns];
    switch (sortKey) {
        case 'priceDesc':
            sorted.sort((a, b) => b.tierData.price - a.tierData.price);
            break;
        case 'availableDesc':
            sorted.sort((a, b) => b.tierData.availableCount - a.tierData.availableCount);
            break;
        case 'deadlineAsc':
            sorted.sort((a, b) => {
                const dateA = parseKoreanDate(a.deadline);
                const dateB = parseKoreanDate(b.deadline);
                // 날짜 없는 캠페인은 항상 뒤로
                if (dateA === null && dateB === null) return 0;
                if (dateA === null) return 1;
                if (dateB === null) return -1;
                return dateA - dateB;
            });
            break;
        case 'recent':
        default:
            // ISO 문자열은 사전식 비교가 곧 시간순. 내림차순 = 최신 먼저
            sorted.sort((a, b) => (b.createdTime || '').localeCompare(a.createdTime || ''));
            break;
    }
    return sorted;
}
