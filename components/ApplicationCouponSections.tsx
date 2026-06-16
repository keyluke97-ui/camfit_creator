'use client';

// CHANGED: 통합 — ApplicationModal의 쿠폰 이벤트 UI 블록 추출 (파일 크기 컨벤션 준수, 동작 동일)
import { useState } from 'react';
import type { CouponEvent } from '@/types';
import { COUPON_APPLY_DAYS_CONFIG, formatDiscount } from '@/lib/constants';
// CHANGED: 팔로워에게 보낼 깨끗한 메시지 빌더
import { buildFollowerShareMessage } from '@/lib/couponText';

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
                {/* CHANGED: 라벨 명확화 — 팔로워에게 줄 쿠폰 수량 */}
                <div className="flex items-center justify-between">
                    <span className="text-xs text-[#9CA3AF]">팔로워 쿠폰 수량</span>
                    <span className="text-sm font-semibold text-white">{couponEvent.couponPerCreator}장</span>
                </div>
                {/* CHANGED: 신규 안내 — 쿠폰 적용 사이트 */}
                <div className="flex items-center justify-between">
                    <span className="text-xs text-[#9CA3AF]">쿠폰 적용 사이트</span>
                    <span className="text-sm font-medium text-white">해당 캠핑장 내 모든 사이트</span>
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
            {/* CHANGED: 999 다운로드 표현 제거 → 최대 사용 수량(인당 쿠폰) 소진 시 자동 만료 */}
            <p className="text-xs text-[#888888] leading-relaxed pt-1">
                팔로워 쿠폰 최대 사용 수량 {couponEvent.couponPerCreator}장이 모두 소진되면 자동 만료됩니다.
            </p>
        </div>
    );
}

// Step 4: 신청 완료 후 팔로워에게 배포할 본인 쿠폰 코드 callout
// CHANGED: 쿠폰 혼동 해소 — 초록 강조(fill) → 차분한 회색(weak)으로 내 예약 쿠폰과 시각 분리.
//          "등록 금지"가 아니라 "내 예약엔 사용 주의" 긍정형 카피(등록해서 확인은 OK).
export function FollowerCouponCallout({ couponEvent, followerCouponCode, accommodationName }: { couponEvent: CouponEvent; followerCouponCode: string; accommodationName: string }) {
    const [isFollowerCodeCopied, setIsFollowerCodeCopied] = useState(false);
    const [isShareCopied, setIsShareCopied] = useState(false); // CHANGED: 팔로워 공유 메시지 복사 피드백
    const copyShareMessage = async () => {
        const msg = buildFollowerShareMessage({ accommodationName, couponEvent, followerCouponCode });
        try {
            await navigator.clipboard.writeText(msg);
            setIsShareCopied(true);
            setTimeout(() => setIsShareCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy follower share message', err);
        }
    };
    return (
        <div className="bg-[#202020] border border-[#3a3a3a] p-5 rounded-xl space-y-4 text-left">
            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base">🎟️</span>
                <p className="text-sm font-bold text-[#E0E0E0]">팔로워 쿠폰</p>
                <span className="text-xs text-[#9CA3AF]">· 내 예약용 아니에요</span>
            </div>
            <p className="text-xs text-[#A9A9A9] leading-relaxed">
                팔로워에게 공유하는 쿠폰이에요. 등록해서 어떤 쿠폰인지 확인하는 건 괜찮지만,
                <strong className="text-white"> 내 캠핑 예약에는 쓰지 말고 위의 &lsquo;내 예약 쿠폰&rsquo;을 사용</strong>해주세요.
            </p>
            <div className="bg-[#161616] border border-[#333] p-4 rounded-lg text-center space-y-3">
                <p className="text-2xl font-mono font-bold text-[#CFCFCF] tracking-wider break-all">
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
                    className="px-6 py-2 bg-[#1E1E1E] border border-[#444] rounded-full text-[#CFCFCF] text-sm font-medium hover:bg-[#333] transition-colors flex items-center justify-center mx-auto gap-2"
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
            <div className="bg-[#161616] border border-[#333] p-3 rounded-lg space-y-1 text-xs text-[#D0D0D0]">
                <p><span className="text-[#9CA3AF]">할인:</span> <strong className="text-white">{formatDiscount(couponEvent.discount)}</strong> ({COUPON_APPLY_DAYS_CONFIG[couponEvent.couponApplyDays]?.label || couponEvent.couponApplyDays})</p>
                <p><span className="text-[#9CA3AF]">팔로워 쿠폰 수량:</span> <strong className="text-white">{couponEvent.couponPerCreator}장</strong></p>
                <p><span className="text-[#9CA3AF]">팔로워 사용 가능:</span> {couponEvent.couponStartDate} ~ {couponEvent.couponEndDate}</p>
                <p><span className="text-[#9CA3AF]">내 방문 가능:</span> {couponEvent.visitStartDate} ~ {couponEvent.visitEndDate}</p>
            </div>
            {/* CHANGED: 팔로워에게 그대로 전달할 깨끗한 메시지(코드+등록링크+사용법) 원탭 복사 */}
            <button
                onClick={copyShareMessage}
                className="w-full py-3 bg-[#01DF82] text-black font-bold text-sm rounded-lg hover:bg-[#00C972] transition-colors flex items-center justify-center gap-2"
            >
                {isShareCopied ? (
                    <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        복사 완료! 팔로워에게 붙여넣으세요
                    </>
                ) : '📨 팔로워에게 보낼 메시지 복사'}
            </button>
            <p className="text-xs text-[#888888] leading-relaxed">
                ⚠️ 외부 유출 금지. 본인 채널 팔로워에게만 공유해주세요.
            </p>
        </div>
    );
}
