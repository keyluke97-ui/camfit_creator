// ProfileCompletionBar.tsx - 프로필 완성도 + 다음에 채울 항목 유도 (지명형 1a-v2 §3.0)
// 선택 항목을 막지 않는다. 유인으로만 쓴다(스펙 D7 — 등록 마찰 최소화).
'use client';

interface ProfileCompletionBarProps {
    percent: number;
    nextHint: string;
}

export default function ProfileCompletionBar({ percent, nextHint }: ProfileCompletionBarProps) {
    return (
        <div className="bg-card border border-line rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-ink">프로필 완성도</span>
                <span className="text-sm font-bold text-brand-strong">{percent}%</span>
            </div>
            <div className="h-2 bg-subtle rounded-full overflow-hidden">
                <div
                    className="h-full bg-brand transition-all duration-300"
                    style={{ width: `${percent}%` }}
                />
            </div>
            {nextHint && (
                <p className="text-xs text-ink2">
                    <strong className="text-ink">{nextHint}</strong>을(를) 채우면 제안을 더 받으실 수 있어요.
                </p>
            )}
        </div>
    );
}
