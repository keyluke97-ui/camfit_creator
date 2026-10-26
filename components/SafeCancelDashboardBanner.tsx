// 안심취소 리워드 대시보드 상단 배너 — 인스타 채널 보유 크리에이터에게만, 파일럿 기간에만 노출
// 누르면 「촬영 전에 꼭 지켜주세요」 펼침. 상세 가이드는 SAFE_CANCEL_GUIDE_URL이 생기면 박스 안 링크로 연결
'use client';

import { useState } from 'react';
import SafeCancelShootingRules from './SafeCancelShootingRules';

export default function SafeCancelDashboardBanner() {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="bg-brand-bg border border-brand rounded-[14px] overflow-hidden">
            <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                aria-expanded={isExpanded}
                className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left"
            >
                <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[10px] font-bold tracking-wider text-brand-strong">NEW · 안심취소 리워드</span>
                    <span className="text-sm font-bold text-ink">릴스에 안심취소를 소개하고 캠핏 포인트 받기</span>
                </div>
                <span className="text-brand-strong text-xs font-semibold flex-shrink-0">
                    {isExpanded ? '접기' : '촬영 전 확인'}
                </span>
            </button>
            {isExpanded && (
                <div className="px-3 pb-3">
                    <SafeCancelShootingRules />
                </div>
            )}
        </div>
    );
}
