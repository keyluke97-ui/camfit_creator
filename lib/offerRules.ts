// offerRules.ts - 제안 수신함 순수 판정 로직 (2026-08-25)
// 서버(lib/airtable.ts)와 화면이 같은 규칙을 쓰도록 한 곳에 모은다.
// ⚠️ Airtable SDK·React에 의존하지 않는다 (tsx로 직접 돌려 검증할 수 있어야 한다).
// 계획: specs/2026-08-25-지명형협찬-제안수신함-구현계획.md

import { OFFER_STATUS_PENDING } from './constants';

/**
 * 마감까지 남은 밀리초.
 * ⚠️ 기준은 항상 레코드의 `만료 예정 일시`다. 72h를 코드에 박지 않는다 —
 *    캠지기가 제안마다 다르게 잡을 수 있고, 박아두면 화면과 실제가 갈린다.
 * `만료 예정 일시`가 비어 있으면 Infinity(마감 없음)를 돌려준다. 아래 canRespond 주석 참고.
 */
export function remainingMs(expiresAt: string, now: number): number {
    if (!expiresAt) return Infinity;
    const expires = Date.parse(expiresAt);
    if (Number.isNaN(expires)) return Infinity;
    return expires - now;
}

/**
 * 지금 이 제안에 응답할 수 있는가.
 *
 * 세 가지를 모두 만족해야 한다.
 *  1. 상태가 `크리에이터확인중` — 그 외 상태는 이미 흘러갔거나 아직 도착 전이다
 *  2. `응답 일시`가 비어 있음 — **중복 응답 가드.** 캠지기측 「제안서 발송」 자동화가
 *     `크리에이터 발송 일시`로 중복 발송을 막는 것과 같은 패턴이다.
 *     (버전 기반 낙관적 잠금은 여기서 쓸 수 없다 — 운영자가 Airtable UI로 직접 상태를
 *      고치는 경로가 정상 경로인데 UI는 버전을 올리지 않는다. 허용해줘도 안전해지지 않고
 *      안전하다는 착각만 생긴다.)
 *  3. 마감 전
 *
 * ⚠️ `만료 예정 일시`가 비어 있으면 **응답 가능**으로 본다.
 *    운영자가 필드를 안 채웠다는 이유로 크리에이터를 잠그면, 캠지기 돈은 이미 들어와 있는데
 *    제안이 아무 데도 못 간다. 마감이 없는 편이 갇히는 것보다 낫다.
 */
export function canRespond(
    status: string,
    expiresAt: string,
    respondedAt: string,
    now: number
): boolean {
    if (status !== OFFER_STATUS_PENDING) return false;
    if (respondedAt) return false;
    return remainingMs(expiresAt, now) > 0;
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
