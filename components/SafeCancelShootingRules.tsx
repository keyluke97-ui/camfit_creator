// 안심취소 리워드 「촬영 전에 꼭 지켜주세요」 박스 — 대시보드 배너 · 협찬 확정 화면 공용
// 문구는 lib/safeCancelReward.ts 설정값만 사용 (크리에이터 가이드 v93 기준)
import {
    SAFE_CANCEL_80_LIST_URL,
    SAFE_CANCEL_GUIDE_URL,
    SAFE_CANCEL_SHOOTING_RULES,
    SAFE_CANCEL_SHOOTING_RULES_FOOTNOTE,
    SAFE_CANCEL_SHOOTING_RULES_TITLE,
} from '@/lib/safeCancelReward';

interface SafeCancelShootingRulesProps {
    // 캠핑장의 안심취소 적용 여부를 포털 데이터로 알 수 없는 화면에서는 조건 문구를 앞에 붙인다
    isConditional?: boolean;
}

export default function SafeCancelShootingRules({ isConditional = false }: SafeCancelShootingRulesProps) {
    return (
        <div className="bg-card border-2 border-brand rounded-xl p-4 text-left">
            {isConditional && (
                <p className="text-[11px] font-semibold text-brand-strong mb-1">안심취소 80 캠핑장 협찬이라면</p>
            )}
            <p className="text-sm font-bold text-ink mb-3">{SAFE_CANCEL_SHOOTING_RULES_TITLE}</p>
            <ol className="space-y-2.5">
                {SAFE_CANCEL_SHOOTING_RULES.map((item, index) => (
                    <li key={item.rule} className="flex gap-2 text-xs leading-relaxed">
                        <span className="text-brand-strong font-bold shrink-0">{index + 1}.</span>
                        <span>
                            <span className="block font-semibold text-ink">{item.rule}</span>
                            <span className="block text-ink2">{item.detail}</span>
                        </span>
                    </li>
                ))}
            </ol>
            <p className="mt-3 pt-3 border-t border-line text-[11px] text-ink3 leading-relaxed">
                {SAFE_CANCEL_SHOOTING_RULES_FOOTNOTE}
            </p>
            {/* CHANGED: 가이드 정렬 — 대상 확인용 안심취소 80 목록 링크 추가 */}
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                <a
                    href={SAFE_CANCEL_80_LIST_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-brand-strong underline underline-offset-2"
                >
                    안심취소 80 캠핑장 보기
                </a>
                {SAFE_CANCEL_GUIDE_URL && (
                    <a
                        href={SAFE_CANCEL_GUIDE_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-brand-strong underline underline-offset-2"
                    >
                        상세 가이드 바로가기
                    </a>
                )}
            </div>
        </div>
    );
}
