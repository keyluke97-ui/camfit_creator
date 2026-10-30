// 안심취소 리워드 대시보드 상단 배너 — 채널 무관 전원, 파일럿 기간에만 노출
// 누르면 가이드 맨 위 「리워드 종류」 카드 펼침. 상세 가이드 · 안심취소 80 목록은 카드 안 링크로 연결
'use client';

import { useState } from 'react';
// CHANGED: 「촬영 전에 꼭 지켜주세요」 → 가이드 「리워드 종류」 카드
import SafeCancelRewardTypes from './SafeCancelRewardTypes';

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
                    {/* CHANGED: 가이드 히어로 문구와 맞춤 — 협찬 그대로, 안심취소 소개 시 보너스 */}
                    <span className="text-sm font-bold text-ink">협찬 콘텐츠에 안심취소를 소개하면 포인트 보너스</span>
                    <span className="text-[11px] text-ink2">안심취소 80 캠핑장 협찬이라면 기본형 1만P · 클립형 3만P</span>
                </div>
                <span className="text-brand-strong text-xs font-semibold flex-shrink-0">
                    {isExpanded ? '접기' : '자세히 보기'}
                </span>
            </button>
            {isExpanded && (
                <div className="px-3 pb-3">
                    <SafeCancelRewardTypes />
                </div>
            )}
        </div>
    );
}
