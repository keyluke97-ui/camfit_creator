// offerRules.ts - 제안 수신함 순수 판정 로직 (2026-08-25)
// 서버(lib/airtable.ts)와 화면이 같은 규칙을 쓰도록 한 곳에 모은다.
// ⚠️ Airtable SDK·React에 의존하지 않는다 (tsx로 직접 돌려 검증할 수 있어야 한다).
// 계획: specs/2026-08-25-지명형협찬-제안수신함-구현계획.md

import { OFFER_STATUS_PENDING, OFFER_RESPONSE_WINDOW_HOURS } from './constants';

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
    if (!sentAt) return Infinity;
    const sent = Date.parse(sentAt);
    if (Number.isNaN(sent)) return Infinity;
    return sent + OFFER_RESPONSE_WINDOW_HOURS * 3_600_000 - now;
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
