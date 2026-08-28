// sponsorshipTerms.ts - 협찬 조건 표준을 사람이 읽는 한 줄로 만든다 (2026-08-12 스펙 §6.2)
// 포털 화면·캠지기 카드·제안서가 같은 문장을 써야 한다. 두 벌이면 "듣던 것과 다르다"가 그대로 분쟁이 된다.
// ⚠️ Airtable·React에 의존하지 않는다 (tsx로 직접 돌려 검증할 수 있어야 한다).

import { UPLOAD_DEADLINE_DEFAULT_DAYS, UPLOAD_DEADLINE_OPTIONS } from './constants';

/**
 * 산출물 + 업로드 기한을 한 줄로.
 * @param contentFormats 선택한 콘텐츠 형식. 비어 있으면 기한만 반환한다
 * @param uploadDeadlineDays null이거나 표준과 같으면 표준 일수를 쓴다
 */
export function buildDeliverableSummary(
    contentFormats: string[],
    uploadDeadlineDays: number | null
): string {
    // CHANGED: 2026-08-25 — "표준이 아닌 값"이 아니라 "허용된 예외"만 그대로 쓴다(캠지기측 지적).
    // 이전 조건(!== 14)은 허용 밖 값 7·999를 그대로 렌더해, 같은 레코드를 포털은 7일 캠지기는 14일로
    // 읽었다. 두 화면이 다른 기한을 말하는 것이 바로 이번 작업이 막으려는 분쟁이다.
    // 덤으로 렌더러가 검증기보다 관대하던 비대칭(검증기는 7을 거부, 렌더러는 표시)도 닫힌다.
    const days = uploadDeadlineDays && UPLOAD_DEADLINE_OPTIONS.includes(uploadDeadlineDays)
        ? uploadDeadlineDays
        : UPLOAD_DEADLINE_DEFAULT_DAYS;
    const deadline = `퇴실 후 ${days}일 안에 업로드`;

    if (contentFormats.length === 0) return deadline;

    // 표준은 "형식마다 1편"이다 (스펙 E5 — 편수 예외 필드를 만들지 않는다)
    const items = contentFormats.map((format) => `${format} 1편`).join(' · ');
    return `${items} — ${deadline}`;
}

/**
 * 현장 조건 한 줄. 표준과 같은 항목(반려동물 없음·드론 없음)은 생략한다.
 * 동반 인원이 0(미입력)이어도 예외 항목은 표시한다 — 현장에서 알면 늦는 정보라 빠뜨리면 안 된다.
 */
export function buildVisitConditionSummary(
    companions: number,
    petAllowed: boolean,
    droneUsed: boolean
): string {
    const parts: string[] = [];
    if (companions > 0) parts.push(`${companions}인 방문`);
    if (petAllowed) parts.push('반려동물 동반');
    if (droneUsed) parts.push('드론 촬영');
    return parts.join(' · ');
}

/**
 * 앞말의 받침에 맞는 조사 `로`/`으로`를 붙인다.
 * 한글 받침(종성)이 없거나 ㄹ이면 `로`, 그 밖에는 `으로`.
 * ⚠️ 콘셉트 12종 중 6종(캠핑·등산·여행·가족·차박·백패킹)이 받침이 있어,
 *    `로`를 하드코딩하면 절반이 "여행로"처럼 틀린 문장이 된다.
 */
export function withRo(word: string): string {
    const last = word.charCodeAt(word.length - 1) - 0xac00;
    const hasJongseong = last >= 0 && last <= 11171 && last % 28 !== 0;
    const isRieul = last >= 0 && last <= 11171 && last % 28 === 8;
    return `${word}${hasJongseong && !isRieul ? '으로' : '로'}`;
}
