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
 * 원거리 추가금 (플랫폼 고정 상수, 크리에이터 편집 불가 — 금액 부풀리기 어뷰징 차단).
 * 크리에이터의 `원정 가능 지역`에 속한 지역 제안은 `협찬 희망 금액 + WONJEONG_SURCHARGE` 이상이어야 매칭.
 *
 * ⚠️ 화면 용어는 2026-08-31에 "유류비" → "원거리 추가금"으로 바꿨다.
 *    ① "유류비"는 영수증 내고 받는 실비로 읽히는데 실제로는 거리로 정해진 고정액이다.
 *    ② "할증"도 쓰지 않는다 — 내는 사람 쪽 단어라(택시 할증) 받는 쪽인 크리에이터 화면에선
 *       "할증을 받으세요"가 어색하고 자기가 더 내는 것으로 읽힐 수 있다.
 *    ⚠️ 이 라벨을 처음 정한 곳은 **우리 스펙** `specs/2026-07-16-지명형협찬-1a-포트폴리오-조건-정산.md`
 *       §6.4다(캠지기 계약서 v2가 아니다 — 2026-08-31에 잘못 짚었다가 캠지기 세션이 교정).
 *       그 스펙 상단에 개정 노트를 달아뒀다. 캠지기측 코드·문서 반영 완료(2026-08-31).
 * ⚠️ 변경 시 camfit-premium 매칭 로직의 동일 상수도 함께 변경. **상수명은 그대로 둔다**(양쪽 공유).
 */
export const WONJEONG_SURCHARGE = 100000;

/**
 * 원정 후보 맵 — 기준 지역(거주) → 원거리 추가금을 얹으면 방문 가능한 지역 목록.
 * ⚠️ 기준 지역은 **정산 주소에서 서버가 파생시킨 값**만 쓴다(2026-08-31). 자기신고를 앵커로 쓰면
 *    이 맵이 좌우 대칭이라 자기 거주지를 추가금 대상으로 켤 수 있다(경기 거주 → 기준 '전라남도' → 후보에 경기도).
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

/**
 * 확인 창 — 크리에이터가 제안에 응답할 수 있는 시간(시간 단위).
 *
 * ⚠️ 기산점은 **`크리에이터 발송 일시`**다. `만료 예정 일시`가 **아니다.**
 *    `만료 예정 일시`는 캠지기의 **선입금 기한**(제안 생성 +48h)이고,
 *    「선입금 만료 도래」 포뮬러도 `상태 = 선입금대기`일 때만 그 필드를 본다.
 *    입금 대사가 수기라 `크리에이터확인중`에 도달할 때쯤 그 값은 **이미 지나 있는 게 정상**이다.
 *    그걸 응답 기한으로 쓰면 거의 모든 제안이 열리자마자 마감된 것으로 잠긴다.
 *    (07-15 스펙의 "만료 예정 일시 기준 카운트다운"은 후입금 설계의 잔재라 살릴 수 없다.)
 *
 * ⚠️ 캠지기측 `camfit-premium/src/constants/jimyeong.js`의 `CREATOR_REVIEW_WINDOW_HOURS`와
 *    **같은 값을 유지해야 한다.** 이름은 달라도 되지만 한쪽이 바뀌면 반대쪽도 같이 본다.
 *    어긋나면 크리에이터 화면과 캠지기 화면이 서로 다른 마감을 말한다.
 *
 * CHANGED: 절대시간(48h) → **2영업일**로 변경 (2026-08-26 사장님 확답).
 *          이유: 48시간은 받은 요일에 따라 실제 여유가 달라진다 — 금요일 저녁에 받으면
 *          일요일 저녁이 마감이라 손쓸 시간이 없다. 영업일로 세면 누가 언제 받든 같다.
 * 화면에 숫자를 박지 않는다 — 바뀔 때 이 상수 한 곳만 고치면 되게.
 */
export const OFFER_RESPONSE_WINDOW_BUSINESS_DAYS = 2;

/**
 * 확인 창 계산에서 제외할 공휴일 (KST, YYYY-MM-DD).
 *
 * ⚠️ **수동 관리 테이블이다.** 음력 공휴일(설·추석·부처님오신날)과 대체공휴일은 해마다
 *    날짜가 바뀌므로 자동으로 채워지지 않는다. 연말에 다음 해 것을 확인해 넣고
 *    `KR_HOLIDAYS_COVERED_THROUGH`를 함께 늘린다.
 *
 * 🔴 **이 테이블이 캠핏 전체의 단일 소스다** (2026-08-28 캠지기측과 합의).
 *    캠지기측엔 영업일 계산 코드가 없고 확인 창 마감을 계산하는 주체도 포털이다.
 *    공휴일 목록을 두 벌 두면 연휴마다 양쪽 마감이 하루씩 어긋난다.
 *    → 여기를 고치면 캠핏 전체가 따라온다. 커버리지가 만료되면 캠지기측에도 알린다.
 *
 * 커버리지를 넘어간 날짜는 **주말만 제외**로 계산한다(공휴일을 모르는 채로 추측하지 않는다).
 * 누락의 방향은 "마감이 실제보다 빡빡해진다"이지 "제안이 잠긴다"가 아니다 —
 * `크리에이터 발송 일시`가 비면 마감 없음으로 빠지는 경로가 그대로 살아 있다(offerRules 참고).
 */
export const KR_HOLIDAYS: readonly string[] = [
    '2026-09-24', '2026-09-25', '2026-09-26', // 추석 연휴
    '2026-09-28',                             // 추석 대체공휴일 (연휴가 토요일과 겹침)
    '2026-10-03',                             // 개천절 (토)
    '2026-10-05',                             // 개천절 대체공휴일
    '2026-10-09',                             // 한글날
    '2026-12-25',                             // 성탄절
];

/** `KR_HOLIDAYS`가 실제로 커버하는 마지막 날. 이 이후는 주말만 제외로 폴백한다. */
export const KR_HOLIDAYS_COVERED_THROUGH = '2026-12-31';

/**
 * 포털이 `지명 제안`에 쓸 수 있는 필드 — **화이트리스트.**
 * 이 배열에 없는 필드는 쓰지 않는다. 특히 금액 4종 · `제안서 전문` · `조건 스냅샷`은
 * 분쟁 시 증거라, 쓰기 주체가 두 곳으로 갈리면 "누가 바꿨나"를 못 가린다.
 * `버전`·`멱등키`도 금지 — 버전 낙관적 잠금은 여기서 성립하지 않는다(offerRules 주석 참고).
 * 검사는 tools/jimyeong/verify-contract.ts가 한다.
 *
 * CHANGED: 계약 v2 §9(포털은 `지명 제안`에 쓰지 않는다) 개정을 사장님이 승인(2026-08-26).
 *          이 4개를 늘리려면 다시 승인을 받아야 한다 — 조용히 늘어나는 것을 verify-contract가 막는다.
 */
export const OFFER_WRITABLE_FIELDS: string[] = [
    '상태',
    '응답 일시',
    '거절 사유',
    '거절 상세 사유',
];

/** 거절 사유 3택 — Airtable `거절 사유` singleSelect와 동일 */
export const OFFER_REJECT_REASONS: string[] = ['일정', '금액', '기타'];
