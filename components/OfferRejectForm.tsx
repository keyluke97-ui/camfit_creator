// OfferRejectForm.tsx - 제안 거절 사유 입력 (지명형 1b — Phase C3)
'use client';

import { useState } from 'react';
import { OFFER_REJECT_REASONS } from '@/lib/constants';

interface OfferRejectFormProps {
    saving: boolean;
    onCancel: () => void;
    onSubmit: (reason: string, detail: string) => void;
}

/**
 * 거절 사유는 화이트리스트 3종(일정/금액/기타)이고 서버가 다시 검증한다.
 *
 * ⚠️ 패널티 문구에 **숫자를 쓰지 않는다.** "3회"라고 쓰면 3회째에 집행해야 하는데
 *    집행 로직이 없다. 자동 확정과 같은 종류의 거짓말이 된다(계획서 Q4).
 */
export default function OfferRejectForm({ saving, onCancel, onSubmit }: OfferRejectFormProps) {
    const [reason, setReason] = useState('');
    const [detail, setDetail] = useState('');

    return (
        <div className="flex flex-col gap-4">
            <div>
                <p className="text-sm font-bold text-ink mb-1">거절 사유를 알려주세요</p>
                <p className="text-xs text-ink2">캠지기에게 전달돼요. 다음 제안을 맞추는 데 쓰입니다.</p>
            </div>

            <div className="flex gap-2">
                {OFFER_REJECT_REASONS.map((option) => (
                    <button
                        key={option}
                        type="button"
                        onClick={() => setReason(option)}
                        className={`flex-1 h-11 rounded-lg border text-sm font-medium transition-colors ${
                            reason === option
                                ? 'bg-brand-bg border-brand text-brand-strong'
                                : 'bg-card border-line text-ink2 hover:border-strong'
                        }`}
                    >
                        {option}
                    </button>
                ))}
            </div>

            <div>
                <label htmlFor="reject-detail" className="block text-xs text-ink2 mb-1.5">
                    자세한 사유 (선택)
                </label>
                <textarea
                    id="reject-detail"
                    value={detail}
                    onChange={(event) => setDetail(event.target.value)}
                    rows={3}
                    placeholder="예: 해당 기간에 촬영 일정이 있어요."
                    className="w-full bg-subtle border border-line rounded-lg px-3 py-2.5 text-sm text-ink placeholder:text-ink3 focus:border-brand outline-none resize-none"
                />
            </div>

            <p className="text-xs text-ink3 leading-relaxed">
                거절이 반복되면 서비스 이용이 제한될 수 있어요.
            </p>

            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={saving}
                    className="flex-1 h-12 bg-subtle text-ink font-bold rounded-lg border border-line hover:border-strong transition-colors disabled:opacity-60"
                >
                    돌아가기
                </button>
                <button
                    type="button"
                    onClick={() => onSubmit(reason, detail)}
                    disabled={!reason || saving}
                    className="flex-1 h-12 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition-colors disabled:opacity-40"
                >
                    {saving ? '처리 중...' : '거절하기'}
                </button>
            </div>
        </div>
    );
}
