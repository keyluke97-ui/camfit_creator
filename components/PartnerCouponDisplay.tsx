// PartnerCouponDisplay.tsx - 쿠폰 코드 표시 + 복사 버튼 컴포넌트
'use client';

import { useState } from 'react';

interface PartnerCouponDisplayProps {
    label: string;
    couponCode: string;
}

export default function PartnerCouponDisplay({
    label,
    couponCode
}: PartnerCouponDisplayProps) {
    const [copied, setCopied] = useState(false);
    const hasCouponCode = couponCode.length > 0;

    const handleCopy = async () => {
        if (!hasCouponCode) return;
        try {
            await navigator.clipboard.writeText(couponCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Copy failed:', error);
        }
    };

    return (
        <div className="bg-[#252525] border border-[#3A3A3A] rounded-lg p-3">
            <p className="text-xs text-[#9CA3AF] mb-1.5">{label}</p>
            {hasCouponCode ? (
                <div className="flex items-center justify-between gap-2">
                    <code className="text-sm font-mono text-[#01DF82] break-all">
                        {couponCode}
                    </code>
                    <button
                        onClick={handleCopy}
                        className="shrink-0 px-3 py-1.5 text-xs font-medium bg-[#01DF82] text-black rounded-md hover:bg-[#00C972] transition-colors"
                    >
                        {copied ? '복사됨' : '복사'}
                    </button>
                </div>
            ) : (
                <p className="text-sm text-[#666666]">쿠폰 코드 준비 중</p>
            )}
        </div>
    );
}
