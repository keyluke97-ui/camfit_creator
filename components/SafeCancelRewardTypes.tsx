// 안심취소 리워드 종류 카드 2장 — 크리에이터 가이드 맨 위 「리워드 종류」와 같은 내용 (대시보드 배너 펼침 영역)
// 금액·조건 문구는 lib/safeCancelReward.ts 설정값만 사용
import {
    SAFE_CANCEL_80_LIST_URL,
    SAFE_CANCEL_GRADE_POINTS,
    SAFE_CANCEL_GUIDE_URL,
    SAFE_CANCEL_REWARD_BASE_STEPS,
} from '@/lib/safeCancelReward';

function formatPoints(points: number | null): string {
    return points === null ? '추후 안내' : `${(points / 10000).toLocaleString('ko-KR')}만P`;
}

export default function SafeCancelRewardTypes() {
    return (
        <div className="bg-card border border-line rounded-xl p-3 text-left">
            <p className="text-sm font-bold text-ink mb-2.5">리워드 종류</p>
            <div className="grid grid-cols-2 gap-2">
                {/* 기본형 */}
                <div className="border border-line rounded-lg p-3 flex flex-col gap-1.5">
                    <p className="text-[11px] text-brand-strong font-semibold">
                        캠핏 포인트 <span className="text-lg font-bold">{formatPoints(SAFE_CANCEL_GRADE_POINTS.basic)}</span>
                    </p>
                    <p className="text-sm font-bold text-ink">기본형</p>
                    <ol className="list-decimal pl-4 space-y-1 text-xs text-ink2 leading-snug">
                        {SAFE_CANCEL_REWARD_BASE_STEPS.map((step) => (
                            <li key={step}>{step}</li>
                        ))}
                    </ol>
                </div>

                {/* 클립형 */}
                <div className="relative border-2 border-brand rounded-lg p-3 flex flex-col gap-1.5">
                    <span className="absolute -top-2.5 right-2 bg-brand text-black text-[10px] font-bold rounded-full px-2 py-0.5 whitespace-nowrap">
                        + 정성상 {formatPoints(SAFE_CANCEL_GRADE_POINTS.merit)} 기회
                    </span>
                    <p className="text-[11px] text-brand-strong font-semibold">
                        캠핏 포인트 <span className="text-lg font-bold">{formatPoints(SAFE_CANCEL_GRADE_POINTS.source)}</span>
                    </p>
                    <p className="text-sm font-bold text-ink">클립형</p>
                    <p className="text-xs text-ink2 bg-subtle rounded-md px-2 py-1.5">기본형 조건 3가지 포함</p>
                    <p className="text-xs font-semibold text-ink">
                        <span className="text-[10px] font-bold bg-brand text-black rounded-full px-1.5 py-0.5 mr-1">+ 추가</span>
                        영상 클립 삽입
                    </p>
                </div>
            </div>

            <p className="mt-3 text-xs text-ink2 leading-relaxed">
                <strong className="text-ink">인스타그램 · 블로그 · 유튜브</strong> 등 어떤 채널이든 참여할 수 있어요.
                <br />
                기존 캠핏 협찬건에 <strong className="text-ink">보너스로 포인트</strong>까지 받을 수 있어요!
            </p>
            <p className="mt-1 text-[11px] text-ink3">안심취소 80 캠핑장 협찬만 참여할 수 있어요 (안심취소+ 캠핑장 제외)</p>

            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                {SAFE_CANCEL_GUIDE_URL && (
                    <a
                        href={SAFE_CANCEL_GUIDE_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-brand-strong underline underline-offset-2"
                    >
                        상세 가이드 바로가기
                    </a>
                )}
                <a
                    href={SAFE_CANCEL_80_LIST_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-brand-strong underline underline-offset-2"
                >
                    안심취소 80 캠핑장 보기
                </a>
            </div>
        </div>
    );
}
