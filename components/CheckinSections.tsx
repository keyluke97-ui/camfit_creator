'use client';

// CHANGED: 통합 — CheckinModal의 쿠폰 코드 박스 + 완료 캠페인 목록 추출 (파일 크기 컨벤션 준수, 동작 동일)
import { useState } from 'react';
import type { Application } from '@/types';
// CHANGED: 내 예약 쿠폰도 딥링크로 — 난수 코드를 복사·붙여넣기 시키던 동선을 '누르면 자동 입력'으로.
import { COUPON_APPLY_DAYS_CONFIG, formatDiscount, buildCouponDeepLink } from '@/lib/constants';
// CHANGED: 팔로워에게 보낼 깨끗한 메시지 빌더
import { buildFollowerShareMessage } from '@/lib/couponText';
// CHANGED: 이모지 → 오브젝트 아이콘
import BrandIcon from './BrandIcon';

// CHANGED: 쿠폰 혼동 해소 — 예약 변경 완료 화면의 '내 예약 쿠폰' 박스 + 등록 CTA 추출
//          (CheckinModal 600줄 컨벤션 준수 + ApplicationModal과 동일 패턴: 자동복사 + 새 탭)
export function ReservationCouponDone({ code }: { code: string }) {
    return (
        <>
            <div className="bg-subtle border border-brand p-6 rounded-xl space-y-4">
                <p className="text-ink2 text-sm">내 예약 쿠폰 코드</p>
                <p className="text-2xl font-mono font-bold text-brand-strong tracking-wider break-all">{code}</p>
                <button
                    onClick={() => { navigator.clipboard?.writeText(code).catch(() => {}); }}
                    className="px-6 py-2 bg-page border border-line rounded-full text-ink text-sm font-medium hover:bg-subtle transition-colors"
                >
                    코드 복사하기
                </button>
            </div>
            {/* CHANGED: 딥링크 — 누르면 코드가 입력된 등록 페이지로. 클립보드 복사는 링크 실패 시 폴백으로 유지. */}
            <a
                href={buildCouponDeepLink(code)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => { navigator.clipboard?.writeText(code).catch((err) => console.error('Failed to copy my coupon', err)); }}
                className="block w-full h-14 flex items-center justify-center gap-2 bg-brand text-black font-bold text-lg rounded-xl hover:bg-brand-hover transition-colors"
            >
                <BrandIcon name="clipboard" size={20} />내 예약 쿠폰 등록하러 가기
            </a>
        </>
    );
}

// CHANGED: 신청 카드 내 "내 예약 쿠폰" 박스 — 신청완료 모달을 닫으면 이 코드를 다시 볼 곳이
//          '협찬 조건 복사' 텍스트뿐이라 크리에이터가 놓치는 사례가 발생했다. 카드에 상시 노출한다.
//          ReservationCouponDone(예약 변경 완료 화면 주인공)과 같은 정보지만, 카드 안에서는
//          팔로워 쿠폰 박스와 나란히 놓이므로 크기를 줄이고 위계만 유지한다(brand 강조 vs 팔로워 weak 회색).
export function MyCouponBox({ app }: { app: Application }) {
    const [copied, setCopied] = useState(false);
    const code = app.couponCode || '';
    if (!code) return null;
    return (
        <div className="bg-brand-bg border border-brand rounded-lg p-3 space-y-2">
            <p className="text-xs text-brand-strong font-bold">내 예약 쿠폰 코드 <span className="text-ink2 font-normal">· 캠핏에 등록하고 예약하세요</span></p>
            <div className="flex items-center justify-between gap-2">
                <p className="font-mono font-bold text-ink text-base break-all">{code}</p>
                <button
                    onClick={async () => {
                        try {
                            await navigator.clipboard.writeText(code);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                        } catch {
                            /* noop */
                        }
                    }}
                    className="flex-shrink-0 text-xs px-3 py-1 bg-card border border-strong text-ink rounded-full hover:bg-subtle"
                >
                    {copied ? '복사 완료!' : '코드 복사'}
                </button>
            </div>
            <a
                href={buildCouponDeepLink(code)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 bg-brand text-black text-xs font-bold rounded-lg hover:bg-brand-hover transition-colors inline-flex items-center justify-center gap-1.5"
            >
                <BrandIcon name="clipboard" size={14} />쿠폰 등록하러 가기
            </a>
        </div>
    );
}

// 신청 카드 내 "내 팔로워 쿠폰 코드" 박스 (followerCouponCode 있을 때만 부모가 렌더)
export function CheckinCouponBox({ app }: { app: Application }) {
    const [copied, setCopied] = useState(false);
    const [shareCopied, setShareCopied] = useState(false); // CHANGED: 팔로워 메시지 복사 피드백
    const copyShareMessage = async () => {
        const msg = buildFollowerShareMessage({
            accommodationName: app.accommodationName,
            couponEvent: app.couponEvent,
            followerCouponCode: app.followerCouponCode,
        });
        if (!msg) return;
        try {
            await navigator.clipboard.writeText(msg);
            setShareCopied(true);
            setTimeout(() => setShareCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy follower share message', err);
        }
    };
    return (
        // CHANGED: 쿠폰 혼동 해소 — 팔로워 쿠폰은 weak 회색 톤 + "내 예약용 아니에요" 안내 (내 예약 쿠폰과 분리)
        <div className="bg-subtle border border-strong rounded-lg p-3 space-y-2">
            <p className="text-xs text-ink2">팔로워 쿠폰 코드 <span className="text-ink3">· 내 예약용 아니에요</span></p>
            <div className="flex items-center justify-between gap-2">
                <p className="font-mono font-bold text-ink2 text-base break-all">{app.followerCouponCode}</p>
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
                    className="flex-shrink-0 text-xs px-3 py-1 bg-subtle border border-strong text-ink rounded-full hover:bg-subtle-hover"
                >
                    {copied ? '복사 완료!' : '코드 복사'}
                </button>
            </div>
            <p className="text-xs text-ink3 leading-relaxed">팔로워에게 공유하는 쿠폰이에요. 내 예약엔 &lsquo;내 예약 쿠폰&rsquo;을 사용해주세요.</p>
            {/* CHANGED: 조건 라인은 couponEvent 있을 때만 표시 */}
            {app.couponEvent && (
                <div className="text-xs text-ink2 space-y-0.5 pt-1 border-t border-line">
                    <p>• {formatDiscount(app.couponEvent.discount)} 할인 ({COUPON_APPLY_DAYS_CONFIG[app.couponEvent.couponApplyDays]?.label || app.couponEvent.couponApplyDays})</p>
                    <p>• 팔로워 쿠폰 {app.couponEvent.couponPerCreator}장 · 팔로워 사용: {app.couponEvent.couponStartDate} ~ {app.couponEvent.couponEndDate}</p>
                    <p>• 내 방문 가능: {app.couponEvent.visitStartDate} ~ {app.couponEvent.visitEndDate}</p>
                </div>
            )}
            {/* CHANGED: 팔로워에게 그대로 전달할 메시지(코드+등록링크+사용법) 원탭 복사 */}
            {app.couponEvent && app.followerCouponCode && (
                <button
                    onClick={copyShareMessage}
                    className="w-full py-2 bg-subtle border border-brand/50 text-brand-strong text-xs font-bold rounded-lg hover:bg-brand-bg transition-colors inline-flex items-center justify-center gap-1.5"
                >
                    {shareCopied ? '복사 완료! 팔로워에게 붙여넣으세요' : <><BrandIcon name="message" size={14} />팔로워에게 보낼 메시지 복사</>}
                </button>
            )}
        </div>
    );
}

// CHANGED: 특장점 인라인 표시 (접기/더보기) — 완료 캠페인 카드에서 콘텐츠 제작용으로 바로 읽게.
//          HighlightsModal(바텀시트, 캠페인 탐색 전용)과 달리 화면 인라인.
function HighlightsInline({ text }: { text: string }) {
    const [expanded, setExpanded] = useState(false);
    return (
        <div className="bg-subtle border border-line rounded-lg p-3 space-y-1.5">
            <p className="text-xs text-ink2 font-medium">캠지기 포인트 (특장점)</p>
            <p className={`text-xs text-ink2 whitespace-pre-line leading-relaxed ${expanded ? '' : 'line-clamp-3'}`}>
                {text}
            </p>
            <button
                onClick={() => setExpanded(v => !v)}
                className="text-xs text-brand-strong font-medium hover:underline"
            >
                {expanded ? '접기' : '더보기'}
            </button>
        </div>
    );
}

// 입실일 지난 완료 캠페인 목록 (없으면 렌더 안 함)
// CHANGED: 입실일이 지나도 (1) 유효한 팔로워 쿠폰(couponEndDate까지)과 (2) 특장점을 계속 노출.
//          노출 기준을 입실일(checkInDate) → 쿠폰 수명(couponEndDate)으로 정정. 콘텐츠는 방문 후 제작하므로 특장점도 유지.
export function CompletedAppsList({ apps, today, copiedAppId, onCopyConditions }: {
    apps: Application[];
    today: string;                              // KST 기준 YYYY-MM-DD (부모에서 계산)
    copiedAppId: string | null;                 // '협찬 조건 복사' 피드백 (활성 카드와 공용)
    onCopyConditions: (app: Application) => void;
}) {
    if (apps.length === 0) return null;
    return (
        <div className="space-y-3 pt-4 border-t border-line">
            <p className="text-xs text-ink3 font-medium">완료된 캠페인</p>
            {apps.map(app => {
                // CHANGED: 쿠폰은 크리에이터 입실일과 무관하게 couponEndDate까지 유효 → 그동안 팔로워 쿠폰 박스 유지
                const couponActive = !!(
                    app.couponEvent &&
                    app.followerCouponCode &&
                    app.couponEvent.couponEndDate >= today
                );
                return (
                    <div
                        key={app.id}
                        className="bg-page border border-line rounded-xl p-4 space-y-3"
                    >
                        <div className="flex items-center justify-between">
                            <h3 className="text-ink font-bold">{app.accommodationName}</h3>
                            <span className="text-xs text-ink3 bg-subtle px-2 py-0.5 rounded-full">완료</span>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <span className="text-xs text-ink3">입실일</span>
                                <p className="text-ink2 text-sm">{app.checkInDate}</p>
                            </div>
                            <div className="flex-1">
                                <span className="text-xs text-ink3">입실 사이트</span>
                                <p className="text-ink2 text-sm">{app.checkInSite}</p>
                            </div>
                        </div>

                        {/* CHANGED: 쿠폰 유효기간 내이면 팔로워 쿠폰 박스 유지 (입실 후에도 팔로워에게 계속 공유) */}
                        {couponActive && (
                            <div className="space-y-1.5">
                                <p className="text-xs text-brand-strong font-medium flex items-center gap-1">
                                    <BrandIcon name="coupon" size={13} />팔로워 쿠폰 아직 사용 가능 · ~{app.couponEvent!.couponEndDate}
                                </p>
                                <CheckinCouponBox app={app} />
                            </div>
                        )}

                        {/* CHANGED: 특장점 인라인 노출 (콘텐츠 제작 지원) */}
                        {app.highlights && <HighlightsInline text={app.highlights} />}

                        {/* CHANGED: '협찬 조건 복사' 복원 — 활성 카드와 동일(특장점 포함 텍스트). 단일 핸들러 재사용 */}
                        <button
                            onClick={() => onCopyConditions(app)}
                            className="w-full h-9 bg-subtle border border-strong text-ink rounded-lg text-xs hover:bg-subtle transition-colors flex items-center justify-center gap-1.5"
                        >
                            {copiedAppId === app.id ? (
                                <><svg className="w-3.5 h-3.5 text-brand-strong" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>복사 완료!</>
                            ) : (
                                <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>협찬 조건 복사</>
                            )}
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
