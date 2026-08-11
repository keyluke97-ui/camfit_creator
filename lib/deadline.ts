// deadline.ts - 콘텐츠 제작 기한 D-day 계산 (단일 소스)
// CHANGED: 크리에이터가 제작 기한을 날짜 한 줄로만 보고 남은 기간을 체감하지 못해
//          "기한을 몰랐다 / 확인 못 했다"는 연장 요청이 반복됐다. 남은 일수를 직접 보여준다.
//
// ⚠️ 기준 필드는 Airtable `콘텐츠 제작 기한 (날짜)`(date)다.
//    기존 `⏰ 콘텐츠 제작 기한`은 'YYYY년 MM월 DD일' 문자열이라 계산에 쓸 수 없다.
//    (두 필드는 같은 수식을 공유하며 전 캠페인 값 일치 검증 완료 2026-08-11)

export type DeadlineTone = 'normal' | 'soon' | 'urgent' | 'passed';

export interface DeadlineStatus {
    /** 남은 일수. 오늘 마감이면 0, 지났으면 음수 */
    daysLeft: number;
    /** 'D-13' / 'D-DAY' / 'D+5' */
    label: string;
    tone: DeadlineTone;
}

/**
 * KST 자정 기준 epoch ms.
 * — 서버·브라우저 타임존이 달라도 같은 '날짜'로 계산되게 고정한다.
 *   UTC로 계산하면 한국 시간 자정 근처에서 하루가 밀린다.
 */
function kstMidnight(input: Date | string): number {
    if (typeof input === 'string') {
        return new Date(`${input.slice(0, 10)}T00:00:00+09:00`).getTime();
    }
    // Date → KST 기준 연월일 추출 후 자정으로 절삭
    const ymd = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(input);
    return new Date(`${ymd}T00:00:00+09:00`).getTime();
}

/**
 * 제작 기한까지 남은 일수와 표시 라벨.
 * @param deadlineDate ISO 날짜 문자열(`2026-09-08` 또는 ISO datetime). 없으면 null.
 * @param now 기준 시각 (테스트용 주입, 기본 현재)
 */
export function getDeadlineStatus(deadlineDate?: string, now: Date = new Date()): DeadlineStatus | null {
    if (!deadlineDate) return null;
    const due = kstMidnight(deadlineDate);
    if (Number.isNaN(due)) return null;

    const daysLeft = Math.round((due - kstMidnight(now)) / 86400000);

    // CHANGED: 임계값 — 14일은 콘텐츠 제작에 실제로 필요한 최소 기간(쿠폰 유효기간 산식에도
    //          '콘텐츠 제작 14일'로 들어가 있다). 그 안에 들어오면 주의를 준다.
    let tone: DeadlineTone;
    if (daysLeft < 0) tone = 'passed';
    else if (daysLeft <= 3) tone = 'urgent';
    else if (daysLeft <= 14) tone = 'soon';
    else tone = 'normal';

    const label = daysLeft === 0 ? 'D-DAY' : daysLeft > 0 ? `D-${daysLeft}` : `D+${-daysLeft}`;
    return { daysLeft, label, tone };
}

/** 톤별 뱃지 클래스 (디자인 토큰 유틸만 사용) */
export const DEADLINE_TONE_CLASS: Record<DeadlineTone, string> = {
    normal: 'bg-subtle text-ink2 border-line',
    soon: 'bg-amber-50 text-amber-700 border-amber-300',
    urgent: 'bg-red-50 text-red-600 border-red-300',
    passed: 'bg-subtle text-ink3 border-line',
};
