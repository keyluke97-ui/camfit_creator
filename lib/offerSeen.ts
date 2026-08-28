// offerSeen.ts - 제안 "열어봤는지"를 기기 로컬에 남긴다 (지명형 1b — NEW 표시)
//
// ⚠️ **Airtable에 쓰지 않는다.** `지명 제안` 쓰기 화이트리스트는 4필드로 잠겨 있고
//    (계약 v2 §9 개정 · 사장님 승인 범위), 읽음 표시 하나 때문에 그 범위를 넓히는 건
//    분쟁 증거 테이블에 쓰기 주체를 하나 더 만드는 일이다. 이 정보는 그럴 값어치가 없다.
//
// 기기가 바뀌면 다시 NEW로 보인다. 그 방향의 오차는 **안전한 쪽**이다 —
// 안 본 걸 봤다고 표시하는 것보다 본 걸 새 것으로 표시하는 편이 낫다.

const STORAGE_KEY = 'camfit.offers.seen';

/** 아직 열어보지 않은 제안 id. 순수 함수라 verify-rules가 직접 돌린다 */
export function unseenIds(offerIds: string[], seen: string[]): string[] {
    const seenSet = new Set(seen);
    return offerIds.filter((id) => id && !seenSet.has(id));
}

/** 로컬에 남은 "열어본 제안" 목록. 브라우저 밖(SSR)에서는 빈 배열 */
export function readSeen(): string[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
    } catch {
        // 로컬 저장소가 막혀 있거나(프라이빗 모드) 값이 깨진 경우 — 전부 NEW로 보이면 그만이다
        return [];
    }
}

/** 열어본 제안 기록. 저장에 실패해도 화면 동작을 막지 않는다 */
export function markSeen(offerId: string): string[] {
    const next = unseenIds([offerId], readSeen()).length === 0 ? readSeen() : [...readSeen(), offerId];
    if (typeof window === 'undefined') return next;
    try {
        // 무한정 쌓이지 않게 최근 200건만 남긴다
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next.slice(-200)));
    } catch {
        // 무시 — NEW가 계속 보일 뿐이다
    }
    return next;
}
