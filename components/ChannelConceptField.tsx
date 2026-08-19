// ChannelConceptField.tsx - 채널콘셉트 자기신고 (2026-08-12 스펙 E6)
// ⚠️ 운영자 관리 필드 `채널콘셉트`(353명 중 170명 보유)는 건드리지 않는다.
//    크리에이터가 고른 값은 별도 `채널콘셉트(자기신고)`에만 저장된다.
'use client';

import { CHANNEL_CONCEPTS } from '@/lib/constants';

interface ChannelConceptFieldProps {
    concepts: string[];          // 자기신고 — 크리에이터가 고른 것
    fallbackConcepts: string[];  // 운영자 값. 자기신고가 비었을 때만 쓰인다
    onChange: (concepts: string[]) => void;
}

export default function ChannelConceptField({ concepts, fallbackConcepts, onChange }: ChannelConceptFieldProps) {
    // 자기신고가 하나라도 있으면 그게 곧 표시값이다. 없을 때만 운영자 값이 보인다.
    const usingFallback = concepts.length === 0 && fallbackConcepts.length > 0;

    function toggleConcept(concept: string) {
        const next = concepts.includes(concept)
            ? concepts.filter((c) => c !== concept)
            : [...concepts, concept];
        onChange(next);
    }

    return (
        <div className="flex flex-col gap-2">
            <label className="block text-sm font-medium text-ink">채널 콘셉트</label>
            <p className="text-xs text-ink3">
                캠지기가 우리 캠핑장에 맞는 분인지 볼 때 씁니다. 여러 개 고르셔도 돼요.
            </p>

            {usingFallback && (
                <div className="bg-subtle border border-line rounded-lg p-3">
                    <p className="text-xs text-ink2 leading-relaxed">
                        지금은 캠핏 운영팀이 분류한 <strong className="text-ink">{fallbackConcepts.join(' · ')}</strong>로
                        보이고 있어요. 직접 고르시면 그 값으로 바뀝니다.
                    </p>
                </div>
            )}

            <div className="flex flex-wrap gap-2">
                {CHANNEL_CONCEPTS.map((concept) => {
                    const selected = concepts.includes(concept);
                    return (
                        <button
                            key={concept}
                            type="button"
                            onClick={() => toggleConcept(concept)}
                            aria-pressed={selected}
                            className={`px-4 h-10 rounded-full border text-sm transition-colors ${
                                selected
                                    ? 'bg-brand-bg text-brand-strong border-brand/30 font-medium'
                                    : 'bg-card text-ink2 border-line hover:border-strong'
                            }`}
                        >
                            {concept}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
