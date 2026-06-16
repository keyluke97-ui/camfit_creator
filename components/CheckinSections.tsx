'use client';

// CHANGED: 통합 — CheckinModal의 쿠폰 코드 박스 + 완료 캠페인 목록 추출 (파일 크기 컨벤션 준수, 동작 동일)
import { useState } from 'react';
import type { Application } from '@/types';
import { COUPON_APPLY_DAYS_CONFIG, formatDiscount, COUPON_REGISTER_URL } from '@/lib/constants';

// CHANGED: 쿠폰 혼동 해소 — 예약 변경 완료 화면의 '내 예약 쿠폰' 박스 + 등록 CTA 추출
//          (CheckinModal 600줄 컨벤션 준수 + ApplicationModal과 동일 패턴: 자동복사 + 새 탭)
export function ReservationCouponDone({ code }: { code: string }) {
    return (
        <>
            <div className="bg-[#2A2A2A] border border-[#01DF82] p-6 rounded-xl space-y-4">
                <p className="text-[#B0B0B0] text-sm">내 예약 쿠폰 코드</p>
                <p className="text-2xl font-mono font-bold text-[#01DF82] tracking-wider break-all">{code}</p>
                <button
                    onClick={() => { navigator.clipboard?.writeText(code).catch(() => {}); }}
                    className="px-6 py-2 bg-[#111] border border-[#333] rounded-full text-white text-sm font-medium hover:bg-[#333] transition-colors"
                >
                    코드 복사하기
                </button>
            </div>
            <a
                href={COUPON_REGISTER_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => { navigator.clipboard?.writeText(code).catch((err) => console.error('Failed to copy my coupon', err)); }}
                className="block w-full h-14 flex items-center justify-center bg-[#01DF82] text-black font-bold text-lg rounded-xl hover:bg-[#00C972] transition-colors"
            >
                📋 내 예약 쿠폰 복사하고 캠핏으로 이동
            </a>
        </>
    );
}

// 신청 카드 내 "내 팔로워 쿠폰 코드" 박스 (followerCouponCode 있을 때만 부모가 렌더)
export function CheckinCouponBox({ app }: { app: Application }) {
    const [copied, setCopied] = useState(false);
    return (
        // CHANGED: 쿠폰 혼동 해소 — 팔로워 쿠폰은 weak 회색 톤 + "내 예약용 아니에요" 안내 (내 예약 쿠폰과 분리)
        <div className="bg-[#202020] border border-[#3a3a3a] rounded-lg p-3 space-y-2">
            <p className="text-xs text-[#9CA3AF]">팔로워 쿠폰 코드 <span className="text-[#777]">· 내 예약용 아니에요</span></p>
            <div className="flex items-center justify-between gap-2">
                <p className="font-mono font-bold text-[#CFCFCF] text-base break-all">{app.followerCouponCode}</p>
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
            <p className="text-xs text-[#888888] leading-relaxed">팔로워에게 공유하는 쿠폰이에요. 내 예약엔 &lsquo;내 예약 쿠폰&rsquo;을 사용해주세요.</p>
            {/* CHANGED: 조건 라인은 couponEvent 있을 때만 표시 */}
            {app.couponEvent && (
                <div className="text-xs text-[#B0B0B0] space-y-0.5 pt-1 border-t border-[#333]">
                    <p>• {formatDiscount(app.couponEvent.discount)} 할인 ({COUPON_APPLY_DAYS_CONFIG[app.couponEvent.couponApplyDays]?.label || app.couponEvent.couponApplyDays})</p>
                    <p>• 팔로워 쿠폰 {app.couponEvent.couponPerCreator}장 · 팔로워 사용: {app.couponEvent.couponStartDate} ~ {app.couponEvent.couponEndDate}</p>
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
