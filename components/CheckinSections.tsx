'use client';

// CHANGED: 통합 — CheckinModal의 쿠폰 코드 박스 + 완료 캠페인 목록 추출 (파일 크기 컨벤션 준수, 동작 동일)
import { useState } from 'react';
import type { Application } from '@/types';
import { COUPON_APPLY_DAYS_CONFIG, formatDiscount } from '@/lib/constants';

// 신청 카드 내 "내 팔로워 쿠폰 코드" 박스 (followerCouponCode 있을 때만 부모가 렌더)
export function CheckinCouponBox({ app }: { app: Application }) {
    const [copied, setCopied] = useState(false);
    return (
        <div className="bg-[#1E1E1E] border border-[#01DF82]/30 rounded-lg p-3 space-y-2">
            <p className="text-xs text-[#9CA3AF]">내 팔로워 쿠폰 코드</p>
            <div className="flex items-center justify-between gap-2">
                <p className="font-mono font-bold text-[#01DF82] text-base break-all">{app.followerCouponCode}</p>
                <button
                    onClick={async () => {
                        try {
                            await navigator.clipboard.writeText(app.followerCouponCode || '');
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                        } catch {
                            /* noop */
                        }
                    }}
                    className="flex-shrink-0 text-xs px-3 py-1 bg-[#2A2A2A] border border-[#444] text-[#D0D0D0] rounded-full hover:bg-[#333]"
                >
                    {copied ? '복사 완료!' : '코드 복사'}
                </button>
            </div>
            {/* CHANGED: 조건 라인은 couponEvent 있을 때만 표시 */}
            {app.couponEvent && (
                <div className="text-xs text-[#B0B0B0] space-y-0.5 pt-1 border-t border-[#333]">
                    <p>• {formatDiscount(app.couponEvent.discount)} 할인 ({COUPON_APPLY_DAYS_CONFIG[app.couponEvent.couponApplyDays]?.label || app.couponEvent.couponApplyDays})</p>
                    <p>• 인당 {app.couponEvent.couponPerCreator}장 · 팔로워 사용: {app.couponEvent.couponStartDate} ~ {app.couponEvent.couponEndDate}</p>
                    <p>• 내 방문 가능: {app.couponEvent.visitStartDate} ~ {app.couponEvent.visitEndDate}</p>
                </div>
            )}
        </div>
    );
}

// 입실일 지난 완료 캠페인 목록 (없으면 렌더 안 함)
export function CompletedAppsList({ apps }: { apps: Application[] }) {
    if (apps.length === 0) return null;
    return (
        <div className="space-y-3 pt-4 border-t border-[#333333]">
            <p className="text-xs text-[#888888] font-medium">완료된 캠페인</p>
            {apps.map(app => (
                <div
                    key={app.id}
                    className="bg-[#111111] border border-[#333333] rounded-xl p-4 opacity-60"
                >
                    <div className="flex items-center justify-between">
                        <h3 className="text-white font-bold">{app.accommodationName}</h3>
                        <span className="text-xs text-[#888888] bg-[#2A2A2A] px-2 py-0.5 rounded-full">완료</span>
                    </div>
                    <div className="flex gap-4 mt-2">
                        <div className="flex-1">
                            <span className="text-xs text-[#888888]">입실일</span>
                            <p className="text-[#B0B0B0] text-sm">{app.checkInDate}</p>
                        </div>
                        <div className="flex-1">
                            <span className="text-xs text-[#888888]">입실 사이트</span>
                            <p className="text-[#B0B0B0] text-sm">{app.checkInSite}</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
