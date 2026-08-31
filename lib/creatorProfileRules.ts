// creatorProfileRules.ts - 지명형 1a-v2 크리에이터 프로필 순수 판정 로직
// 서버(lib/airtable.ts)와 편집 폼(components/PortfolioEditForm.tsx)이 같은 규칙을 쓰도록 한 곳에 모은다.
// 두 벌로 나뉘면 반드시 어긋난다 — 클라가 막은 걸 서버가 안 막거나, 그 반대가 된다.
// ⚠️ Airtable SDK·React에 의존하지 않는다 (node/tsx로 직접 돌려 검증할 수 있어야 한다).
// 스펙: specs/2026-08-11-지명형협찬-1a-v2-포트폴리오-재설계.md §6

import {
    CHANNEL_TYPES,
    REPRESENTATIVE_CHANNELS,
    CONTENT_FORMATS,
    CONTENT_FORMAT_CHANNEL,
    UPLOAD_DEADLINE_DEFAULT_DAYS,
    UPLOAD_DEADLINE_OPTIONS,
    COMPANION_MIN,
    COMPANION_MAX,
    CHANNEL_CONCEPTS,
    getWonjeongCandidates,
} from './constants';
import type { ChannelDetail, CreatorProfileUpdate } from '@/types';

/** 채널 검증 위반 코드 — API가 400 응답의 detail로 실어 보낸다 */
export type ChannelViolation =
    | 'CHANNEL_REQUIRED'
    | 'CHANNEL_UNKNOWN'
    | 'REPRESENTATIVE_UNKNOWN'
    | 'REPRESENTATIVE_NOT_OWNED'
    | 'FORMAT_UNKNOWN'
    | 'FORMAT_CHANNEL_MISMATCH'
    | 'EMAIL_INVALID'
    | 'METRIC_INVALID'
    // CHANGED: 2026-08-12 협찬 조건 표준화
    | 'UPLOAD_DEADLINE_INVALID'
    | 'COMPANION_INVALID'
    | 'CONCEPT_UNKNOWN';

/**
 * 위반 코드 → 크리에이터가 읽을 문장 (2026-08-25 캠지기측 협의 (c)).
 * 전에는 어느 항목이 문제인지 알려주지 않고 "입력 조건을 확인해주세요."만 띄웠다.
 * 어느 항목이 문제인지 알려주지 않으면, 사용자는 자기가 건드린 적도 없는 항목 때문에
 * 막힌 채 이유를 알 수 없다.
 */
export const VIOLATION_MESSAGES: Record<ChannelViolation, string> = {
    CHANNEL_REQUIRED: '운영 중인 채널을 최소 한 개 선택해주세요.',
    CHANNEL_UNKNOWN: '선택하신 채널 종류를 알 수 없어요. 새로고침 후 다시 시도해주세요.',
    REPRESENTATIVE_UNKNOWN: '대표 채널로 고르신 값을 알 수 없어요. 새로고침 후 다시 시도해주세요.',
    REPRESENTATIVE_NOT_OWNED: '대표 채널은 운영 중인 채널 중에서 골라주세요.',
    FORMAT_UNKNOWN: '선택하신 콘텐츠 형식을 알 수 없어요. 새로고침 후 다시 시도해주세요.',
    FORMAT_CHANNEL_MISMATCH: '운영하지 않는 채널의 콘텐츠 형식이 선택돼 있어요. 채널을 추가하시거나 형식을 빼주세요.',
    EMAIL_INVALID: '이메일 주소를 다시 확인해주세요.',
    METRIC_INVALID: '채널 지표는 0 이상의 정수로 입력해주세요.',
    UPLOAD_DEADLINE_INVALID: `업로드 기한은 ${UPLOAD_DEADLINE_DEFAULT_DAYS}일(표준) 또는 ${UPLOAD_DEADLINE_OPTIONS.join('·')}일 중에서 골라주세요.`,
    COMPANION_INVALID: `동반 인원은 ${COMPANION_MIN}~${COMPANION_MAX}명 사이의 정수로 입력해주세요.`,
    CONCEPT_UNKNOWN: '선택하신 채널 콘셉트를 알 수 없어요. 새로고침 후 다시 시도해주세요.',
};

/** 위반 코드에 맞는 문장. 모르는 코드면 일반 문구로 떨어진다(문자열은 서버 경계에서 온다). */
export function violationMessage(code: string | undefined): string {
    if (code && code in VIOLATION_MESSAGES) return VIOLATION_MESSAGES[code as ChannelViolation];
    return '입력 조건을 확인해주세요.';
}

/**
 * 로그인 2차 확인 — 이메일 앞 3자리.
 *
 * ⚠️ **등록된 이메일이 없으면 통과시킨다.** 크리에이터 명단 163명 중 이메일이 있는 사람은
 *    80명(49%)뿐이라(실측 2026-08-27), 전원에게 요구하면 83명이 그날로 로그인이 막힌다.
 *    프리미엄 협찬 신청·프로필 등록 때 이메일이 쌓이면 자연히 전원 3요소가 된다.
 *
 * 대소문자와 앞뒤 공백은 무시한다 — 사람이 자기 이메일을 대문자로 치는 건 흔하다.
 * 로컬파트(@ 앞)만 본다.
 */
export function matchesEmailPrefix(registeredEmail: string, input: string): boolean {
    const local = (registeredEmail || '').trim().split('@')[0].toLowerCase();
    if (!local) return true;                       // 등록된 이메일이 없으면 이 관문을 적용하지 않는다
    return local.slice(0, 3) === (input || '').trim().toLowerCase().slice(0, 3);
}

/** 등록 이메일이 있어 앞 3자리를 요구해야 하는 계정인가 */
export function requiresEmailPrefix(registeredEmail: string): boolean {
    return Boolean((registeredEmail || '').trim().split('@')[0]);
}

/**
 * 정산 주소(자유 텍스트) → 기준 지역(시/도). 못 뽑으면 ''.
 *
 * ⚠️ 이 값이 **원정(원거리 추가금) 후보 집합 전체를 결정하는 앵커**다.
 *    전에는 크리에이터가 select로 직접 고른 `기준 지역`을 앵커로 썼는데,
 *    WONJEONG_MAP이 좌우 대칭이라 자기 거주지가 후보로 들어오는 기준 지역이 반드시 존재했다
 *    (경기 거주자가 기준을 '전라남도'로 두면 WONJEONG_MAP['전라남도']에 경기도가 있다).
 *    즉 자기 집 앞 캠핑장에 할증을 붙일 수 있었다. 앵커를 정산 주소로 옮겨 그 문을 닫는다.
 *    정산 주소는 돈을 받는 주소라 거짓말 유인이 반대 방향인 유일한 지역 신호다.
 *
 * 한국 주소는 시/도로 시작하므로 **선두 토큰(startsWith)**으로 판정한다.
 * (부분일치 금지 — 상세주소에 섞인 '세종아파트'·'대구리' 같은 토큰이 실제 도를 오분류하는 것 방지.)
 * 선두 우편번호는 걷어낸다 — 실측 349명 중 파싱 실패 7건의 과반이 `(07448)`·`34423`·`(우편번호18025)`
 * 같은 우편번호 접두였다(2026-08-31).
 */
export function parseBaseRegionFromAddress(address: string): string {
    if (!address) return '';
    // 공백 제거 후 선두 우편번호(신5자리/구6자리) + 감싼 괄호를 걷어낸다.
    // 한국 주소는 숫자로 시작하지 않으므로 정상 주소를 깎을 위험이 없다.
    const a = address.replace(/\s/g, '').replace(/^[(（]?(?:우편번호)?\d{3}-?\d{2,3}[)）]?/, '');
    // 각 지역의 가능한 선두 접두어 목록. 접두어 disjoint라 순서 무관.
    const rules: Array<[string[], string]> = [
        [['서울', '인천', '경기'], '경기도(서울, 인천 포함)'],
        [['강원'], '강원도'],
        [['충청북도', '충북'], '충청북도'],
        [['충청남도', '충남', '대전', '세종'], '충청남도'],
        [['전라북도', '전북'], '전라북도'],
        [['전라남도', '전남', '광주'], '전라남도'],
        [['경상북도', '경북', '대구'], '경상북도'],
        [['경상남도', '경남', '부산', '울산'], '경상남도'],
        [['제주'], '제주도'],
    ];
    for (const [prefixes, region] of rules) {
        if (prefixes.some((p) => a.startsWith(p))) return region;
    }
    return '';
}

/** 이메일 형식 — RFC 완전 준수가 아니라 오타 차단 목적 */
export function isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * 업로드 기한을 저장 가능한 형태로 정규화한다.
 * 표준과 같은 값(14)이나 0/null은 전부 null로 눕힌다 — 빈 값이 곧 "표준 적용 중"이라는
 * 불변식을 지켜야, 나중에 표준을 15로 바꿔도 14가 박힌 사람만 남는 일이 안 생긴다(스펙 §9).
 * 허용 밖 값(예: 7)은 고치지 않고 그대로 돌려준다 — 판정은 validateChannelPayload가 한다.
 * ⚠️ 호출 순서: 정규화 → 검증. 뒤집으면 표준값 14가 UPLOAD_DEADLINE_INVALID로 막힌다.
 */
/**
 * 저장돼 있는 업로드 기한이 이 시스템이 인정하는 값인지.
 * 읽기 경계에서 쓴다 — 운영자가 Airtable에 손으로 넣은 허용 밖 값(7 등)을 폼에 그대로 실으면
 * 배너는 표준(14)을 말하는데 칩은 아무것도 안 눌리고, 손대지 않고 저장하면 400이 나는
 * 막다른 길이 된다. 읽을 때 눕혀두면 화면·저장·캠지기 표시가 전부 한 값으로 모인다.
 */
export function isAllowedUploadDeadline(value: number | null): boolean {
    return value === null || UPLOAD_DEADLINE_OPTIONS.includes(value);
}

export function normalizeUploadDeadline(value: number | null): number | null {
    if (!value || value === UPLOAD_DEADLINE_DEFAULT_DAYS) return null;
    return value;
}

/**
 * 채널·콘텐츠 형식 화이트리스트 + 상호 정합 검증 (스펙 §6 규칙 1·2·4·5·6·7).
 * 위반 코드를 반환하고, 통과하면 null.
 */
export function validateChannelPayload(payload: CreatorProfileUpdate): ChannelViolation | null {
    const channelTypes = payload.channelTypes || [];

    // 규칙 1 — 채널 최소 1개
    if (channelTypes.length === 0) return 'CHANNEL_REQUIRED';

    // 규칙 6 — 화이트리스트. 잘못된 값이 Airtable 422 → 불투명한 500으로 새는 것을 클린 400으로 차단
    if (channelTypes.some((channel) => !CHANNEL_TYPES.includes(channel))) return 'CHANNEL_UNKNOWN';
    if (payload.representativeChannel && !REPRESENTATIVE_CHANNELS.includes(payload.representativeChannel)) {
        return 'REPRESENTATIVE_UNKNOWN';
    }
    if ((payload.contentFormats || []).some((format) => !CONTENT_FORMATS.includes(format))) {
        return 'FORMAT_UNKNOWN';
    }

    // 규칙 2 — 대표 채널 ∈ 채널 종류
    if (payload.representativeChannel && !channelTypes.includes(payload.representativeChannel)) {
        return 'REPRESENTATIVE_NOT_OWNED';
    }

    // 규칙 4 — 콘텐츠 형식은 보유 채널의 것만 (유튜브를 안 하는데 '유튜브 롱폼' 불가)
    const badFormat = (payload.contentFormats || []).find(
        (format) => !channelTypes.includes(CONTENT_FORMAT_CHANNEL[format])
    );
    if (badFormat) return 'FORMAT_CHANNEL_MISMATCH';

    // 규칙 5 — 이메일 형식 (입력됐을 때만. 필수 여부는 공개 게이트가 본다)
    if (payload.creatorEmail && !isValidEmail(payload.creatorEmail)) return 'EMAIL_INVALID';

    // 규칙 7 — 자기신고 지표는 0 이상 정수
    for (const detail of Object.values(payload.channels || {})) {
        if (!Number.isInteger(detail.follower) || detail.follower < 0) return 'METRIC_INVALID';
        if (!Number.isInteger(detail.engagement) || detail.engagement < 0) return 'METRIC_INVALID';
    }

    // 규칙 8 — 업로드 기한은 표준(null) 또는 허용 예외뿐 (스펙 E4)
    const deadline = payload.uploadDeadlineDays;
    if (deadline !== null && !UPLOAD_DEADLINE_OPTIONS.includes(deadline)) {
        return 'UPLOAD_DEADLINE_INVALID';
    }

    // 규칙 9 — 동반 인원. 참고값이라 미입력(0)이 정상이다. 범위 검증만 남긴다(오타 999 차단)
    const companions = payload.companions;
    if (!Number.isInteger(companions) || companions < 0) return 'COMPANION_INVALID';
    if (companions > 0 && (companions < COMPANION_MIN || companions > COMPANION_MAX)) {
        return 'COMPANION_INVALID';
    }

    // 규칙 10 — 채널콘셉트 화이트리스트
    if ((payload.channelConcepts || []).some((concept) => !CHANNEL_CONCEPTS.includes(concept))) {
        return 'CONCEPT_UNKNOWN';
    }

    return null;
}

/**
 * 공개 신청에 빠진 필수 항목 목록 (스펙 §6 공개 게이트).
 * hasImage·hasPremium은 payload에 없으므로 호출자가 레코드에서 읽어 넘긴다.
 */
export function collectMissingForPublish(
    payload: CreatorProfileUpdate,
    hasImage: boolean,
    hasPremium: boolean
): string[] {
    const missing: string[] = [];

    // 기존 7종 (1a에서 그대로 유지)
    // CHANGED: 2026-08-31 카피 정리 — 라벨을 **화면에 적힌 말**로 통일한다.
    //   같은 화면에서 완성도 바는 '인스타 채널 주소', 공개 칩은 '인스타 채널 URL'이라 불렀고
    //   금액은 화면이 '협찬 금액', 칩이 '최소 협찬 단가'였다. 한 사람이 한 화면에서 보는 것들이다.
    //   특히 '최소 협찬 단가'는 D5(캠지기가 이 금액으로 제안 — '이상' 폐기)를 못 따라온 잔재였다.
    if (!hasImage) missing.push('프로필 이미지');
    if (!payload.representativeLink) missing.push('대표 콘텐츠 링크');
    if ((payload.visitRegions || []).length === 0) missing.push('방문 가능 지역');
    if ((payload.visitDays || []).length === 0) missing.push('방문 가능 요일');
    if ((payload.acceptSiteTypes || []).length === 0) missing.push('방문 가능한 사이트 종류');
    if (!(payload.minSponsorAmount > 0)) missing.push('협찬 금액');
    if (!hasPremium) missing.push('정산 정보');

    // 1a-v2 신규 3종
    if (!payload.representativeChannel) missing.push('대표 채널');
    if ((payload.contentFormats || []).length === 0) missing.push('제작 콘텐츠 형식');
    if (!payload.creatorEmail) missing.push('이메일');

    // CHANGED: 2026-08-25 — `동반 인원`을 공개 게이트에서 뺀다. 스펙 E3 폐기.
    // E3는 "캠지기가 사이트를 그 인원에 맞춰 잡아둔다"를 전제로 했는데 사실이 아니다.
    // 실제 구조는 크리에이터가 쿠폰을 받아 직접 예약한다(프리미엄 협찬과 동일).
    // 인원은 예약 시점에 크리에이터가 정하고, 방문마다 다르다(가족 동반 / 혼자).
    // 못박아 받으면 틀린 숫자를 받게 되고, 그 숫자가 캠지기 카드에 사실처럼 뜬다.

    // 조건부 — 선택한 채널마다 URL (규칙 3)
    for (const channel of payload.channelTypes || []) {
        if (!payload.channels?.[channel]?.url) missing.push(`${channel} 채널 주소`);
    }

    // 자기신고 지표는 필수가 아니다 (D7 — 등록 마찰보다 리스트 밀도가 우선)
    return missing;
}

/**
 * 이 콘텐츠 형식을 만들 수 있는 채널을 보유했는지 (규칙 4의 단건 판정).
 * 폼의 형식 목록 필터와 서버 검증이 같은 술어를 쓰도록 여기에 둔다.
 */
export function isFormatAvailable(format: string, channelTypes: string[]): boolean {
    return channelTypes.includes(CONTENT_FORMAT_CHANNEL[format]);
}

/**
 * 보유하지 않게 된 채널의 콘텐츠 형식을 걷어낸다.
 * 채널을 해제할 때 폼이 호출한다 — 안 걷어내면 유튜브를 끈 채 '유튜브 롱폼'이 payload에 남아
 * 서버가 400(FORMAT_CHANNEL_MISMATCH)을 던지고, 사용자는 자기가 건드린 적 없는 항목 때문에 막힌다.
 */
export function pruneContentFormats(channelTypes: string[], contentFormats: string[]): string[] {
    return contentFormats.filter((format) => isFormatAvailable(format, channelTypes));
}

/**
 * 원거리 추가금 선택 위반 코드 (2026-08-31).
 * 폼이 못 고르게 막는 것과 서버가 400으로 막는 것이 어긋나면, 사용자는 화면에 보이지도 않는
 * 이유로 저장이 실패한다. 그래서 술어를 여기 한 곳에 둔다.
 */
export type WonjeongViolation =
    | 'WONJEONG_NO_ANCHOR'      // 정산 주소로 거주 지역을 못 정함 → 추가금 자체가 불가
    | 'WONJEONG_WITHOUT_VISIT'  // 기본가로 갈 곳을 하나도 안 고르고 먼 곳만 켬
    | 'WONJEONG_OUT_OF_RANGE'   // 거주지 기준 근거리를 추가금 대상으로 켬
    | 'WONJEONG_OVERLAP';       // 같은 지역이 기본가와 추가금 양쪽에

export const WONJEONG_MESSAGES: Record<WonjeongViolation, string> = {
    WONJEONG_NO_ANCHOR: '정산 주소로 사시는 지역을 확인하지 못해 원거리 추가금을 켤 수 없어요. 카카오톡 채널로 문의해주세요.',
    WONJEONG_WITHOUT_VISIT: '기본 협찬가로 가실 지역을 먼저 한 곳 이상 골라주세요. 그다음에 먼 지역을 고르실 수 있어요.',
    WONJEONG_OUT_OF_RANGE: '사시는 곳에서 먼 지역만 추가금을 받으실 수 있어요. 화면을 새로고침한 뒤 다시 골라주세요.',
    WONJEONG_OVERLAP: '같은 지역을 기본 협찬가와 추가금 양쪽에 넣으실 수는 없어요.',
};

export function wonjeongMessage(code: string | undefined): string {
    if (code && code in WONJEONG_MESSAGES) return WONJEONG_MESSAGES[code as WonjeongViolation];
    return WONJEONG_MESSAGES.WONJEONG_OUT_OF_RANGE;
}

/**
 * 원거리 추가금 선택 검증. 통과하면 null.
 *
 * ⚠️ anchorRegion은 **정산 주소에서 파생된 값만** 넘겨라. 자기신고를 넘기면
 *    WONJEONG_MAP 좌우 대칭 때문에 자기 거주지를 추가금 대상으로 켤 수 있다.
 * ⚠️ WONJEONG_WITHOUT_VISIT — 방문 가능 지역이 0개면 추가금도 0개여야 한다.
 *    전에는 폼이 방문 지역을 다 지워도 추가금 값이 payload에 남아 그대로 저장됐다.
 *    "기본가로는 아무 데도 안 가는데 먼 곳은 추가금 받고 간다"는 성립하지 않는 조합이고,
 *    화면에서도 블록이 사라져 사용자가 자기가 뭘 저장했는지 볼 수 없었다.
 */
export function validateWonjeongSelection(
    anchorRegion: string,
    visitRegions: string[],
    wonjeongRegions: string[]
): WonjeongViolation | null {
    if (wonjeongRegions.length === 0) return null;
    if (!anchorRegion) return 'WONJEONG_NO_ANCHOR';
    if (visitRegions.length === 0) return 'WONJEONG_WITHOUT_VISIT';
    if (wonjeongRegions.some((r) => visitRegions.includes(r))) return 'WONJEONG_OVERLAP';
    const candidates = getWonjeongCandidates(anchorRegion);
    if (wonjeongRegions.some((r) => !candidates.includes(r))) return 'WONJEONG_OUT_OF_RANGE';
    return null;
}

/**
 * 방문 가능 지역이 바뀌었을 때 남길 수 있는 원거리 추가금 지역.
 * 폼이 호출한다 — 서버가 400으로 막기 전에 화면에서 먼저 정리해, 사용자가 자기가 건드린 적 없는
 * 항목 때문에 막히지 않게 한다(pruneContentFormats와 같은 역할).
 */
export function pruneWonjeongRegions(visitRegions: string[], wonjeongRegions: string[]): string[] {
    if (visitRegions.length === 0) return [];
    return wonjeongRegions.filter((region) => !visitRegions.includes(region));
}

/** needsReReview가 비교하는 승인 시점 값 */
export interface ReReviewBaseline {
    channelTypes: string[];
    representativeChannel: string;
    channels: Record<string, ChannelDetail>;
    representativeLink: string;
    representativeLink2: string;
    representativeLink3: string;
}

/**
 * 승인된 프로필에서 재검토가 필요한 변경이 있었는지 판정 (스펙 §4.2).
 * 지표·표시물이 바뀌면 true. 조건(지역·요일·금액·콘텐츠 형식 등)만 바뀌면 false.
 * → 조건은 크리에이터 본인의 선택이라 거짓말할 대상이 아니다. 검증 대상은 "남에게 보이는 숫자·링크"다.
 */
export function needsReReview(before: ReReviewBaseline, after: CreatorProfileUpdate): boolean {
    const sameList = (a: string[], b: string[]) =>
        a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|');

    if (!sameList(before.channelTypes, after.channelTypes || [])) return true;
    if (before.representativeChannel !== after.representativeChannel) return true;
    if (before.representativeLink !== after.representativeLink) return true;
    if (before.representativeLink2 !== after.representativeLink2) return true;
    if (before.representativeLink3 !== after.representativeLink3) return true;

    for (const channel of CHANNEL_TYPES) {
        const previous = before.channels?.[channel];
        const next = after.channels?.[channel];
        if (!previous && !next) continue;
        if (!previous || !next) return true;
        if (previous.url !== next.url) return true;
        if (previous.follower !== next.follower) return true;
        if (previous.engagement !== next.engagement) return true;
        if (previous.blogIndex !== next.blogIndex) return true;
        if (previous.strength !== next.strength) return true;
    }
    return false;
}

/**
 * 완성도 계산 (스펙 §3.0). 필수·선택을 합쳐 채워진 비율과, 다음에 채울 항목 하나를 돌려준다.
 * 선택 항목을 막지 않고 유인으로만 쓴다 (D7).
 */
export function computeCompletion(
    payload: CreatorProfileUpdate,
    hasImage: boolean,
    hasPremium: boolean,
    // CHANGED: 2026-08-12 — 운영자 `채널콘셉트` 보유 여부. 기본값 false는 기존 호출부 호환용(Task 13에서 실값 전달)
    hasConceptFallback: boolean = false
): { percent: number; nextHint: string } {
    const items: Array<{ label: string; filled: boolean }> = [
        { label: '프로필 이미지', filled: hasImage },
        { label: '이메일', filled: !!payload.creatorEmail },
        { label: '대표 콘텐츠 링크', filled: !!payload.representativeLink },
        { label: '대표 채널', filled: !!payload.representativeChannel },
        { label: '제작 콘텐츠 형식', filled: (payload.contentFormats || []).length > 0 },
        { label: '방문 가능 지역', filled: (payload.visitRegions || []).length > 0 },
        { label: '방문 가능 요일', filled: (payload.visitDays || []).length > 0 },
        { label: '방문 가능한 사이트 종류', filled: (payload.acceptSiteTypes || []).length > 0 },
        { label: '협찬 금액', filled: payload.minSponsorAmount > 0 },
        { label: '정산 정보', filled: hasPremium },
        // CHANGED: 2026-08-12 — 업로드 기한·반려동물·드론은 넣지 않는다.
        // 표준을 쓰는 게 정상인데 미입력을 미완성으로 세면 완성도 바가 "표준을 벗어나라"고 압박한다.
        // 자기신고가 없어도 운영자 값이 있으면 캠지기 카드가 채워지므로 채운 것으로 센다.
        { label: '채널콘셉트', filled: (payload.channelConcepts || []).length > 0 || hasConceptFallback },
        { label: '대표 콘텐츠 링크 2', filled: !!payload.representativeLink2 },
        { label: '콘텐츠 제작 기준', filled: !!payload.contentStandard },
    ];

    for (const channel of payload.channelTypes || []) {
        const detail = payload.channels?.[channel];
        items.push({ label: `${channel} 채널 주소`, filled: !!detail?.url });
        items.push({ label: `${channel} 규모`, filled: !!(detail?.follower || detail?.blogIndex) });
        items.push({ label: `${channel} 채널 강점`, filled: !!detail?.strength });
    }

    const filledCount = items.filter((item) => item.filled).length;
    const percent = items.length === 0 ? 0 : Math.round((filledCount / items.length) * 100);
    const next = items.find((item) => !item.filled);
    return { percent, nextHint: next ? next.label : '' };
}
