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
        <div className="bg-subtle border border-strong rounded-lg p-3">
            <p className="text-xs text-ink2 mb-1.5">{label}</p>
            {hasCouponCode ? (
                <div className="flex items-center justify-between gap-2">
                    <code className="text-sm font-mono text-brand-strong break-all">
                        {couponCode}
                    </code>
                    <button
                        onClick={handleCopy}
                        className="shrink-0 px-3 py-1.5 text-xs font-medium bg-brand text-black rounded-md hover:bg-brand-hover transition-colors"
                    >
                        {copied ? '복사됨' : '복사'}
                    </button>
                </div>
            ) : (
                <p className="text-sm text-ink3">쿠폰 코드 준비 중</p>
            )}
        </div>
    );
}
