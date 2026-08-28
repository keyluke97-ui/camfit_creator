// offerRules.ts - 제안 수신함 순수 판정 로직 (2026-08-25)
// 서버(lib/airtable.ts)와 화면이 같은 규칙을 쓰도록 한 곳에 모은다.
// ⚠️ Airtable SDK·React에 의존하지 않는다 (tsx로 직접 돌려 검증할 수 있어야 한다).
// 계획: specs/2026-08-25-지명형협찬-제안수신함-구현계획.md

import {
    OFFER_STATUS_PENDING, OFFER_RESPONSE_WINDOW_BUSINESS_DAYS,
    KR_HOLIDAYS, KR_HOLIDAYS_COVERED_THROUGH,
} from './constants';

// CHANGED: 절대시간(48h) → 2영업일 (2026-08-26 사장님 확답).
//          영업일 계산은 반드시 **KST 달력**으로 한다. 서버는 UTC(Vercel)라
//          `new Date().getDay()` 같은 로컬 타임존 의존 코드를 쓰면 자정 근처에서 하루가 밀린다.
const KST_OFFSET_MS = 9 * 3_600_000;
const DAY_MS = 86_400_000;

/** UTC ms → 그 시점이 속한 **KST 날짜의 00:00**에 해당하는 UTC ms */
function kstDayStart(ms: number): number {
    return Math.floor((ms + KST_OFFSET_MS) / DAY_MS) * DAY_MS - KST_OFFSET_MS;
}

/** KST 날짜 문자열 'YYYY-MM-DD' */
function kstDateKey(dayStartMs: number): string {
    return new Date(dayStartMs + KST_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * 그날이 영업일인가 (KST 기준).
 * 공휴일 테이블 커버리지를 넘어가면 **주말만** 본다 — 모르는 공휴일을 추측하지 않는다.
 */
function isBusinessDay(dayStartMs: number): boolean {
    const dow = new Date(dayStartMs + KST_OFFSET_MS).getUTCDay(); // 0=일, 6=토
    if (dow === 0 || dow === 6) return false;
    const key = kstDateKey(dayStartMs);
    if (key > KR_HOLIDAYS_COVERED_THROUGH) return true;
    return !KR_HOLIDAYS.includes(key);
}

/**
 * 확인 창 마감 시각(UTC ms).
 *
 * **발송 다음 날부터 세어 2영업일째 되는 날의 23:59:59.999 (KST).**
 * 예) 화 10:00 발송 → 수(1) · 목(2) → **목 자정 직전**
 *     금 18:00 발송 → 월(1) · 화(2) → **화 자정 직전**  (48h였다면 일요일 저녁에 잠겼다)
 *
 * "N영업일 내"의 통상 해석대로 **그날 끝**까지 준다. 시각을 맞춰 자르면
 * (금 18:00 → 화 18:00) 마감이 근무시간 밖에 걸려 사람이 못 본 채로 지난다.
 */
export function deadlineMs(sentAt: string): number {
    if (!sentAt) return Infinity;
    const sent = Date.parse(sentAt);
    if (Number.isNaN(sent)) return Infinity;

    let day = kstDayStart(sent);
    let counted = 0;
    // 가드: 연휴가 아무리 길어도 60일을 넘지 않는다. 테이블 오입력으로 무한루프가 되는 것을 막는다.
    for (let i = 0; counted < OFFER_RESPONSE_WINDOW_BUSINESS_DAYS && i < 60; i++) {
        day += DAY_MS;
        if (isBusinessDay(day)) counted++;
    }
    return day + DAY_MS - 1;
}

/**
 * 확인 창 마감까지 남은 밀리초.
 *
 * ⚠️ 기산점은 **`크리에이터 발송 일시`**다. `만료 예정 일시`를 쓰면 안 된다 —
 *    그건 캠지기의 선입금 기한이고, 입금 대사가 수기라 크리에이터가 제안서를 받을 때쯤
 *    이미 지나 있는 게 정상이다. 그걸 응답 기한으로 쓰면 거의 모든 제안이 즉시 잠긴다.
 *    「제안서 발송」 자동화가 쓰는 필드도 `크리에이터 발송 일시`와 `상태` 둘뿐이다(실측).
 *
 * `크리에이터 발송 일시`가 비어 있으면 Infinity(마감 없음)를 돌려준다 — canRespond 주석 참고.
 */
export function remainingMs(sentAt: string, now: number): number {
    const deadline = deadlineMs(sentAt);
    return Number.isFinite(deadline) ? deadline - now : Infinity;
}

/**
 * 지금 이 제안에 응답할 수 있는가. 셋을 모두 만족해야 한다.
 *
 *  1. 상태가 `크리에이터확인중` — 그 외는 제안서를 못 봤거나 이미 끝난 건이다
 *  2. `응답 일시`가 비어 있음 — **중복 응답 가드.**
 *     캠지기측 「제안서 발송」이 `크리에이터 발송 일시`로 중복 발송을 막는 것과 같은 패턴이다.
 *     (버전 낙관적 잠금은 여기서 쓸 수 없다 — 운영자가 Airtable UI로 상태를 직접 고치는
 *      경로가 정상 경로인데 UI는 버전을 올리지 않는다. 안전해지지 않고 착각만 생긴다.)
 *  3. 확인 창 안
 *
 * ⚠️ `크리에이터 발송 일시`가 비었는데 상태가 `크리에이터확인중`이면 **응답 가능 + 마감 없음**.
 *    자동화를 거치지 않고 운영자가 Airtable에서 상태만 수기로 옮긴 경우다
 *    (자동화가 아직 undeployed라 지금은 이게 유일한 경로이기도 하다).
 *    캠지기 돈이 이미 들어와 있는데 필드 하나 때문에 크리에이터를 잠그면 제안이 갇힌다.
 */
export function canRespond(
    status: string,
    sentAt: string,
    respondedAt: string,
    now: number
): boolean {
    if (status !== OFFER_STATUS_PENDING) return false;
    if (respondedAt) return false;
    return remainingMs(sentAt, now) > 0;
}

/** 남은 시간을 사람이 읽는 한 줄로. 마감 없음(Infinity)이면 빈 문자열 — 카운트다운을 숨긴다 */
export function formatRemaining(ms: number): string {
    if (!Number.isFinite(ms)) return '';
    if (ms <= 0) return '마감됨';
    const hours = Math.floor(ms / 3_600_000);
    if (hours >= 24) return `${Math.floor(hours / 24)}일 ${hours % 24}시간 남음`;
    if (hours >= 1) return `${hours}시간 남음`;
    return `${Math.max(1, Math.floor(ms / 60_000))}분 남음`;
}
