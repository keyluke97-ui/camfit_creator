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
// CHANGED: 도메인을 www로 통일 — 딥링크(buildCouponDeepLink) 정식 형태가 www 기준이라 표기 혼재 방지.
export const COUPON_REGISTER_URL = 'https://www.camfit.co.kr/mypage/coupon/register';

/**
 * 쿠폰 코드 자동입력 딥링크 빌더
 * — 등록 URL 뒤에 `/{코드}`를 붙이면 코드가 미리 입력된 등록 페이지로 열린다.
 *   예: `_YXi6_ee3` → https://www.camfit.co.kr/mypage/coupon/register/_YXi6_ee3
 *   쿠폰 코드가 대소문자·언더바 혼합 난수라 팔로워 수기 입력 실패가 잦아 도입된 캠핏 본앱 기능.
 *   코드에 특수문자가 섞여도 안전하도록 path 세그먼트를 encodeURIComponent 처리.
 */
export function buildCouponDeepLink(code: string): string {
    if (!code) return COUPON_REGISTER_URL;
    return `${COUPON_REGISTER_URL}/${encodeURIComponent(code)}`;
}

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
 * 쿠폰 적용 요일 → 표시 라벨 + 색상 + 제외 안내 (CampaignCard / ApplicationModal 공용)
 * CHANGED: exclusionNote 추가 — 옵션별로 사용 불가한 날을 팔로워/크리에이터에게 안내 (공휴일 전일·당일 미사용 문의 다발).
 *          빈 문자열이면 제외 조건 없음 → 메시지에 미노출.
 */
export const COUPON_APPLY_DAYS_CONFIG: Record<string, { label: string; color: string; exclusionNote: string }> = {
    '평일전용': { label: '평일전용', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30', exclusionNote: '주말(금·토)과 공휴일, 공휴일 전날에는 사용할 수 없어요' },
    '평일+주말(금토)': { label: '평일+주말', color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30', exclusionNote: '공휴일과 공휴일 전날에는 사용할 수 없어요' },
    '평일+주말+공휴일': { label: '전체 기간', color: 'bg-teal-500/15 text-teal-400 border-teal-500/30', exclusionNote: '' },
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

// ─────────────────────────────────────────────────────────────────────────
// 지명형 협찬 1a — 크리에이터 수락 조건 옵션 (Airtable 크리에이터 명단 옵션값과 정확히 일치)
// ⚠️ 아래 문자열은 Airtable 실제 옵션값. 이모지·괄호·공백 손상 금지. camfit-premium과 공유.
// ─────────────────────────────────────────────────────────────────────────

/** 지역 9권역 — `방문 가능 지역`·`기준 지역`·`원정 가능 지역` 공통 옵션 (Airtable multipleSelects 옵션값) */
export const VISIT_REGIONS: string[] = [
    '경기도(서울, 인천 포함)', '강원도', '충청북도', '충청남도',
    '전라북도', '전라남도', '경상북도', '경상남도', '제주도',
];

/** 방문 가능 요일 (7일) — 크리에이터 명단 `방문 가능 요일` multipleSelects */
export const VISIT_DAYS: string[] = ['월', '화', '수', '목', '금', '토', '일'];

/** 수용 사이트 종류 (8종) — 크리에이터 명단 `수용 사이트 종류`(fldWmvzbNngsSoNrZ) = 지명 제안 `협찬 사이트 종류`와 동일 옵션 */
export const SPONSOR_SITE_TYPES: string[] = [
    '글램핑', '두가족존', '방갈로', '오토캠핑', '이지캠핑', '차박', '카라반', '펜션',
];

// ─────────────────────────────────────────────────────────────────────────
// 지명형 협찬 1a — 원정 인센티브 (스펙 §6.4) — camfit-premium과 반드시 동일값 공유
// ─────────────────────────────────────────────────────────────────────────

/**
 * 원정 유류비 (플랫폼 고정 상수, 크리에이터 편집 불가 — 금액 부풀리기 어뷰징 차단).
 * 크리에이터의 `원정 가능 지역`에 속한 지역 제안은 `협찬 희망 금액 + WONJEONG_SURCHARGE` 이상이어야 매칭.
 * ⚠️ 변경 시 camfit-premium 매칭 로직의 동일 상수도 함께 변경.
 */
export const WONJEONG_SURCHARGE = 100000;

/**
 * 원정 후보 맵 — 기준 지역(거주) → 유류비 얹으면 원정 가능한 지역 목록.
 * "먼 거리"는 기준 지역 상대이므로(충남↔전남은 근거리, 경기↔전남은 원정) 기준별로 후보를 제한한다.
 * → `원정 가능 지역`으로 켤 수 있는 후보 = WONJEONG_MAP[기준 지역] 으로만 제한(근거리 프리미엄 어뷰징 차단).
 * 좌우 대칭(A 기준에서 B가 원정이면 B 기준에서도 A가 원정). 제주는 항공이라 전 기준에서 제외.
 * ⚠️ 큐레이션 초안 — 운영 판단으로 조정 가능. camfit-premium과 동일값 유지.
 */
export const WONJEONG_MAP: Record<string, string[]> = {
    '경기도(서울, 인천 포함)': ['전라북도', '전라남도', '경상북도', '경상남도'],
    '강원도': ['충청남도', '전라북도', '전라남도', '경상남도'],
    '충청북도': ['전라남도', '경상남도'],
    '충청남도': ['강원도', '경상남도'],
    '전라북도': ['경기도(서울, 인천 포함)', '강원도'],
    '전라남도': ['경기도(서울, 인천 포함)', '강원도', '충청북도', '경상북도'],
    '경상북도': ['경기도(서울, 인천 포함)', '전라남도'],
    '경상남도': ['경기도(서울, 인천 포함)', '강원도', '충청북도', '충청남도'],
    '제주도': [],
};

/** 기준 지역에서 원정으로 켤 수 있는 후보(WONJEONG_MAP 조회, 없으면 빈 배열) */
export function getWonjeongCandidates(baseRegion: string): string[] {
    return WONJEONG_MAP[baseRegion] ?? [];
}
