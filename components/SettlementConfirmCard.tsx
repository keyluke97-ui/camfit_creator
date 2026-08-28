// SettlementConfirmCard.tsx - 정산정보 마스킹 확인 또는 등록 유도
'use client';

import { useRouter } from 'next/navigation';
import type { SettlementSummary } from '@/types';

interface SettlementConfirmCardProps {
    settlement: SettlementSummary;
}

export default function SettlementConfirmCard({ settlement }: SettlementConfirmCardProps) {
    const router = useRouter();

    if (!settlement.registered) {
        return (
            <div className="bg-card border border-line rounded-xl p-5 flex flex-col gap-3">
                <p className="text-sm text-ink2 leading-relaxed">
                    협찬비를 받으려면 정산 정보가 필요해요. 프리미엄 협찬 등록으로 계좌를 먼저 등록해주세요.
                </p>
                <button
                    type="button"
                    onClick={() => router.push('/premium-register')}
                    className="w-full h-12 bg-brand text-black font-bold rounded-lg hover:bg-brand-hover transition-colors"
                >
                    프리미엄 협찬 등록하기
                </button>
            </div>
        );
    }

    return (
        <div className="bg-card border border-line rounded-xl p-5 flex flex-col gap-2">
            <div className="flex items-center gap-2">
                <span className="w-6 h-6 bg-brand-bg rounded-full flex items-center justify-center text-brand-strong text-xs">✓</span>
                <span className="text-sm font-medium text-ink">정산 정보 등록됨</span>
            </div>
            <p className="text-sm text-ink2">
                {settlement.bank} · {settlement.accountHolder} · ****{settlement.accountLast4}
            </p>
            <p className="text-xs text-ink3">수정하려면 카카오톡 채널로 문의해주세요.</p>
        </div>
    );
}
