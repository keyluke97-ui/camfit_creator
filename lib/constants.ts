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

// ─────────────────────────────────────────────────────────────────────────
// 지명형 1a-v2 — 채널 포트폴리오 (Airtable 크리에이터 명단 옵션값과 정확히 일치)
// ⚠️ 아래 문자열은 Airtable 실제 옵션값(2026-08-11 describe_table 실측). 손상 금지.
//    camfit-premium/netlify/functions/shared-constants.js와 동일값 유지.
// ─────────────────────────────────────────────────────────────────────────

/** 운영 채널 3종 — `채널 종류`(fldDrvExL8699ZDgC) multipleSelects 옵션값 */
export const CHANNEL_TYPES: string[] = ['인스타', '블로그', '유튜브'];

/** 대표 채널 — `대표 채널`(fldP4wdhm0OuU2wyG) singleSelect 옵션값 */
export const REPRESENTATIVE_CHANNELS: string[] = ['유튜브', '인스타', '블로그'];

/** 제작 콘텐츠 형식 6종 — `제작 콘텐츠 형식`(fldoLgT6uGuHZftfb) multipleSelects 옵션값 */
export const CONTENT_FORMATS: string[] = [
    '유튜브 롱폼', '유튜브 쇼츠',
    '인스타 릴스', '인스타 피드', '인스타 스토리',
    '블로그 포스팅',
];

/**
 * 블로그 지수 7종 — `블로그 지수(자기신고)`(fldEUuwbmY80IL5pH) singleSelect 옵션값.
 * ⚠️ 캠지기 요청서 §2의 "최적1~4"는 축약 표기다. 실제 옵션은 아래 7개 개별 문자열.
 */
export const BLOG_INDEX_LEVELS: string[] = [
    '최적1', '최적2', '최적3', '최적4', '준최5', '준최6', '저품질',
];

/** 콘텐츠 형식 → 그 형식을 만들려면 보유해야 하는 채널 (서버 검증: 미보유 채널 형식 선택 차단) */
export const CONTENT_FORMAT_CHANNEL: Record<string, string> = {
    '유튜브 롱폼': '유튜브',
    '유튜브 쇼츠': '유튜브',
    '인스타 릴스': '인스타',
    '인스타 피드': '인스타',
    '인스타 스토리': '인스타',
    '블로그 포스팅': '블로그',
};

/**
 * 채널별 Airtable 필드명 매핑 — 읽기/쓰기 공통 단일 출처.
 * ⚠️ 블로그의 두 번째 지표는 숫자가 아니라 singleSelect(`블로그 지수(자기신고)`)다.
 *    그래서 engagement(number)와 blogIndex(select)를 분리하고, 없는 쪽은 null로 둔다.
 */
export const CHANNEL_FIELD_MAP: Record<string, {
    url: string;
    follower: string;
    engagement: string | null;
    blogIndex: string | null;
    strength: string;
}> = {
    '유튜브': {
        url: '유튜브 채널 URL',
        follower: '유튜브 구독자(자기신고)',
        engagement: '유튜브 평균 조회수(자기신고)',
        blogIndex: null,
        strength: '유튜브 채널 강점',
    },
    '인스타': {
        url: '인스타 채널 URL',
        follower: '인스타 팔로워(자기신고)',
        engagement: '인스타 평균 좋아요(자기신고)',
        blogIndex: null,
        strength: '인스타 채널 강점',
    },
    '블로그': {
        url: '블로그 채널 URL',
        follower: '블로그 일 평균 방문자(자기신고)',
        engagement: null,
        blogIndex: '블로그 지수(자기신고)',
        strength: '블로그 채널 강점',
    },
};

/** 채널별 지표 입력란 라벨 (UI 표시용) */
export const CHANNEL_METRIC_LABELS: Record<string, { follower: string; secondary: string }> = {
    '유튜브': { follower: '구독자 수', secondary: '평균 조회수' },
    '인스타': { follower: '팔로워 수', secondary: '평균 좋아요' },
    '블로그': { follower: '일 평균 방문자', secondary: '블로그 지수' },
};

// ─────────────────────────────────────────────────────────────────────────
// 협찬 조건 표준 (2026-08-12) — 스펙 §3
// ⚠️ 표준값은 Airtable에 저장하지 않는다. 빈 값이 곧 "표준 적용 중"이다.
// ─────────────────────────────────────────────────────────────────────────

/**
 * 업로드 기한 표준 — 퇴실(입실 + 1박) 후 14일.
 * ⚠️ tools/content-followup/overdue.cjs의 GRACE_DAYS와 반드시 같은 값이어야 한다.
 *    두 곳이 어긋나면 독촉 도구가 뽑는 대상과 화면 안내가 달라진다.
 */
export const UPLOAD_DEADLINE_DEFAULT_DAYS = 14;

/** 예외로 고를 수 있는 기한. "더 길게"만 둔다 — 짧게 걸었다 못 지키면 그게 곧 분쟁(스펙 E4) */
export const UPLOAD_DEADLINE_OPTIONS: number[] = [21, 30];

/**
 * 동반 인원 허용 범위. **참고값이다** — 필수가 아니고 방문마다 달라진다(2026-08-25).
 * 상한 10은 오타(999)가 캠지기 카드에 뜨는 것만 막는 용도.
 */
export const COMPANION_MIN = 1;
export const COMPANION_MAX = 10;

/**
 * 채널콘셉트 12종 — 기존 `채널콘셉트`(운영자 관리) 필드 옵션과 문자열이 동일해야 한다.
 * 자기신고 값과 운영자 값을 같은 자리에 렌더하므로 어긋나면 안 된다.
 */
export const CHANNEL_CONCEPTS: string[] = [
    '캠핑', '등산', '여행', '가족', '커플', '솔로',
    '반려동물', '차박', '백패킹', '장비리뷰', '캠핑요리', '낚시',
];

// ─────────────────────────────────────────────────────────────────────────
// 지명 제안 (제안 수신함) — 2026-08-25
// 상태 문자열은 Airtable `지명 제안`.`상태` singleSelect 옵션과 정확히 같아야 한다.
// ⚠️ 쓰기 화이트리스트: 상태 · 응답 일시 · 거절 사유 · 거절 상세 사유 만.
//    금액 4종 · 제안서 전문 · 조건 스냅샷 · 멱등키 · 버전은 **금지** — 분쟁 시 증거라
//    쓰기 권한이 두 곳으로 갈리면 "누가 바꿨나"를 못 가린다(캠지기 계약 v2 §9 개정).
// ─────────────────────────────────────────────────────────────────────────

/** 포털이 수신함에 띄우는 유일한 상태. 이것 말고는 응답할 수 없다 */
export const OFFER_STATUS_PENDING = '크리에이터확인중';

/** 수락 → 확정 (07-31 스펙 상태머신. 중간 상태 없음) */
export const OFFER_STATUS_ACCEPTED = '확정';

/**
 * 거절 → `거절`. **`예외거부`가 아니다.**
 * `예외거부`는 *확정된 건*을 되무르는 횟수 제한 카드고, 확인 창 거절은 *확정 전* 정상 응답이다.
 * 확인 창 거절이 그 횟수를 소모하면 확인 창을 만든 이유가 사라진다.
 */
export const OFFER_STATUS_REJECTED = '거절';

/** 거절 사유 3택 — Airtable `거절 사유` singleSelect와 동일 */
export const OFFER_REJECT_REASONS: string[] = ['일정', '금액', '기타'];
