'use client';

// CHANGED: 통합 — ApplicationModal의 쿠폰 이벤트 UI 블록 추출 (파일 크기 컨벤션 준수, 동작 동일)
import { useState } from 'react';
import type { CouponEvent } from '@/types';
import { COUPON_APPLY_DAYS_CONFIG, formatDiscount } from '@/lib/constants';

// Step 3: 팔로워 쿠폰 협찬 안내 요약 (할인/요일/배포 + 날짜 2개)
export function CouponEventSummary({ couponEvent }: { couponEvent: CouponEvent }) {
    const dayConfig = COUPON_APPLY_DAYS_CONFIG[couponEvent.couponApplyDays] || COUPON_APPLY_DAYS_CONFIG['평일전용'];
    return (
        <div className="bg-[#2A2A2A] border border-[#01DF82]/40 p-4 rounded-lg space-y-3">
            <p className="text-sm font-bold text-[#01DF82]">🎟️ 팔로워 쿠폰 협찬 안내</p>
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-[#9CA3AF]">팔로워 할인</span>
                    <span className="text-sm font-bold text-white">{formatDiscount(couponEvent.discount)} 할인</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-[#9CA3AF]">적용 요일</span>
                    <span className={`px-2.5 py-0.5 text-xs font-medium border rounded-full ${dayConfig.color}`}>
                        {dayConfig.label}
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-[#9CA3AF]">내가 배포할 쿠폰</span>
                    <span className="text-sm font-semibold text-white">{couponEvent.couponPerCreator}장</span>
                </div>
            </div>
            {(couponEvent.couponStartDate || couponEvent.visitStartDate) && (
                <div className="border-t border-[#3A3A3A] pt-3 space-y-2">
                    {couponEvent.couponStartDate && couponEvent.couponEndDate && (
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-[#9CA3AF]">팔로워 쿠폰 사용 가능</span>
                            <span className="text-xs text-[#D0D0D0]">{couponEvent.couponStartDate} ~ {couponEvent.couponEndDate}</span>
                        </div>
                    )}
                    {couponEvent.visitStartDate && couponEvent.visitEndDate && (
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-[#9CA3AF]">내 캠핑 방문 가능</span>
                            <span className="text-xs text-[#D0D0D0]">{couponEvent.visitStartDate} ~ {couponEvent.visitEndDate}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// Step 4: 신청 완료 후 팔로워에게 배포할 본인 쿠폰 코드 callout
export function FollowerCouponCallout({ couponEvent, followerCouponCode }: { couponEvent: CouponEvent; followerCouponCode: string }) {
    const [isFollowerCodeCopied, setIsFollowerCodeCopied] = useState(false);
    return (
        <div className="bg-[#2A2A2A] border border-[#01DF82]/40 p-5 rounded-xl space-y-4 text-left">
            <div className="flex items-center gap-2">
                <span className="text-xl">🎟️</span>
                <p className="text-sm font-bold text-[#01DF82]">팔로워에게 배포할 쿠폰 코드</p>
            </div>
            <p className="text-xs text-[#B0B0B0] leading-relaxed">
                이 협찬은 <strong className="text-white">팔로워 쿠폰 배포</strong>가 포함된 캠페인이에요.
                아래 코드는 <strong className="text-white">나에게만 배정된 코드</strong>로,
                팔로워가 캠핏 예약 시 사용하면 <strong className="text-[#01DF82]">{couponEvent.discount.toLocaleString()}원 할인</strong>을 받아요.
            </p>
            <div className="bg-[#111] border border-[#333] p-4 rounded-lg text-center space-y-3">
                <p className="text-2xl font-mono font-bold text-[#01DF82] tracking-wider break-all">
                    {followerCouponCode}
                </p>
                <button
                    onClick={async () => {
                        try {
                            await navigator.clipboard.writeText(followerCouponCode);
                            setIsFollowerCodeCopied(true);
                            setTimeout(() => setIsFollowerCodeCopied(false), 2000);
                        } catch (err) {
                            console.error('Failed to copy follower coupon', err);
                        }
                    }}
                    className="px-6 py-2 bg-[#1E1E1E] border border-[#333] rounded-full text-white text-sm font-medium hover:bg-[#333] transition-colors flex items-center justify-center mx-auto gap-2"
                >
                    {isFollowerCodeCopied ? (
                        <>
                            <svg className="w-4 h-4 text-[#01DF82]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            복사 완료!
                        </>
                    ) : (
                        <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                            </svg>
                            팔로워 코드 복사
                        </>
                    )}
                </button>
            </div>
            <div className="bg-[#111] border border-[#333] p-3 rounded-lg space-y-1 text-xs text-[#D0D0D0]">
                <p><span className="text-[#9CA3AF]">할인:</span> <strong className="text-white">{formatDiscount(couponEvent.discount)}</strong> ({COUPON_APPLY_DAYS_CONFIG[couponEvent.couponApplyDays]?.label || couponEvent.couponApplyDays})</p>
                <p><span className="text-[#9CA3AF]">인당 배포 가능:</span> <strong className="text-white">{couponEvent.couponPerCreator}장</strong></p>
                <p><span className="text-[#9CA3AF]">팔로워 사용 가능:</span> {couponEvent.couponStartDate} ~ {couponEvent.couponEndDate}</p>
                <p><span className="text-[#9CA3AF]">내 방문 가능:</span> {couponEvent.visitStartDate} ~ {couponEvent.visitEndDate}</p>
            </div>
            <p className="text-xs text-[#888888] leading-relaxed">
                ⚠️ 외부 유출 금지. 본인 채널 팔로워에게만 공유해주세요.
            </p>
        </div>
    );
}
