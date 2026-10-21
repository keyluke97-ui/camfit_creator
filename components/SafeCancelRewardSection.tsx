// 안심취소 리워드(트랙 A 파일럿) 참여 섹션 — 콘텐츠 전달 모달 안에서 토글로 펼침
// 문구·금액·횟수는 lib/safeCancelReward.ts 설정값만 사용 (크리에이터 가이드 「올리기 전 체크」와 동일 문구)
'use client';

import { useState } from 'react';
import {
    SAFE_CANCEL_CHECKLIST,
    SAFE_CANCEL_CAPTION_TEXT,
    SAFE_CANCEL_GUIDE_URL,
    SAFE_CANCEL_MONTHLY_REWARDED_PER_CREATOR,
    SAFE_CANCEL_PARTICIPATION_TYPES,
    SAFE_CANCEL_PAYOUT_DAY_OF_NEXT_MONTH,
    formatSafeCancelRewardSummary,
} from '@/lib/safeCancelReward';
import type { SafeCancelChecklistKey, SafeCancelParticipationType } from '@/lib/safeCancelReward';

interface SafeCancelRewardSectionProps {
    enabled: boolean;
    onToggle: (next: boolean) => void;
    checklist: Record<SafeCancelChecklistKey, boolean>;
    onChecklistChange: (key: SafeCancelChecklistKey, checked: boolean) => void;
    participationType: SafeCancelParticipationType | null;
    onParticipationTypeChange: (value: SafeCancelParticipationType) => void;
    repostConsent: boolean;
    onRepostConsentChange: (value: boolean) => void;
}

function CheckBox({ checked }: { checked: boolean }) {
    return (
        <div className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center shrink-0 transition-all ${
            checked ? 'border-brand bg-brand-bg' : 'border-strong bg-transparent'
        }`}>
            {checked && (
                <svg className="w-2.5 h-2.5 text-brand-strong" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
            )}
        </div>
    );
}

export default function SafeCancelRewardSection({
    enabled,
    onToggle,
    checklist,
    onChecklistChange,
    participationType,
    onParticipationTypeChange,
    repostConsent,
    onRepostConsentChange,
}: SafeCancelRewardSectionProps) {
    const [isCaptionCopied, setIsCaptionCopied] = useState(false);

    const handleCopyCaption = async () => {
        try {
            await navigator.clipboard.writeText(SAFE_CANCEL_CAPTION_TEXT);
            setIsCaptionCopied(true);
            setTimeout(() => setIsCaptionCopied(false), 2000);
        } catch (error) {
            console.error('Caption copy failed:', error);
        }
    };

    return (
        <div className="mb-4">
            {/* 참여 토글 — 가이드 「포털에서 리워드 참여를 체크했다」 항목을 대신함 */}
            <button
                type="button"
                onClick={() => onToggle(!enabled)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${
                    enabled ? 'bg-brand-bg border-brand/40' : 'bg-subtle border-line hover:border-strong'
                }`}
            >
                <div className="flex items-center gap-2.5">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        enabled ? 'border-brand bg-brand' : 'border-strong'
                    }`}>
                        {enabled && (
                            <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        )}
                    </div>
                    <span className={`text-sm font-medium ${enabled ? 'text-brand-strong' : 'text-ink'}`}>
                        안심취소 리워드 참여
                    </span>
                </div>
                <span className="text-[10px] text-brand-strong bg-brand-bg px-2 py-0.5 rounded-full font-medium">
                    릴스 전용
                </span>
            </button>

            {enabled && (
                <div className="mt-2 bg-page border border-line rounded-lg p-4 space-y-4">
                    {/* 안내 */}
                    <div className="space-y-1 text-xs text-ink2 leading-relaxed">
                        <p className="font-bold text-ink">{formatSafeCancelRewardSummary()}</p>
                        <p>· 위 콘텐츠 링크에 <strong className="text-ink">인스타그램 릴스 링크</strong>를 넣어주세요</p>
                        <p>· 여러 개 전달할 수 있지만, 리워드는 그달 전달한 콘텐츠 중 <strong className="text-ink">반응이 가장 높은 {SAFE_CANCEL_MONTHLY_REWARDED_PER_CREATOR}개</strong>로 확인해요</p>
                        <p>· 좋아요 · 댓글 · 공유 수로 반응을 확인해요. <strong className="text-ink">숨김 처리하면 정성상 대상에서 제외</strong>돼요</p>
                        <p>· 검수 후 콘텐츠 전달일 기준 <strong className="text-ink">익월 {SAFE_CANCEL_PAYOUT_DAY_OF_NEXT_MONTH}일</strong> 캠핏 포인트로 지급</p>
                        {SAFE_CANCEL_GUIDE_URL && (
                            <a
                                href={SAFE_CANCEL_GUIDE_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block pt-1 font-medium text-brand-strong underline underline-offset-2"
                            >
                                크리에이터 가이드 보기
                            </a>
                        )}
                    </div>

                    {/* 캡션 고정 문구 복사 */}
                    <div className="bg-card border border-line rounded-lg p-3">
                        <p className="text-[11px] text-ink3 mb-1.5">캡션 고정 문구</p>
                        <p className="text-xs text-ink leading-relaxed mb-2">{SAFE_CANCEL_CAPTION_TEXT}</p>
                        <button
                            type="button"
                            onClick={handleCopyCaption}
                            className="w-full h-9 text-xs font-semibold bg-subtle text-ink rounded-lg hover:bg-subtle transition-colors"
                        >
                            {isCaptionCopied ? '복사됐어요' : '문구 복사하기'}
                        </button>
                    </div>

                    {/* 참여 조건 체크리스트 — 전부 체크해야 전달 가능 */}
                    <div>
                        <p className="text-xs font-bold text-ink mb-2">
                            올리기 전 체크 <span className="text-red-500">*</span>
                        </p>
                        <div className="space-y-2.5">
                            {SAFE_CANCEL_CHECKLIST.map((item) => (
                                <button
                                    key={item.key}
                                    type="button"
                                    onClick={() => onChecklistChange(item.key, !checklist[item.key])}
                                    className="w-full flex items-start gap-2.5 text-left"
                                >
                                    <CheckBox checked={checklist[item.key]} />
                                    <span className="text-xs leading-relaxed">
                                        <span className={checklist[item.key] ? 'text-brand-strong font-medium' : 'text-ink'}>{item.label}</span>
                                        {item.hint && <span className="block text-[11px] text-ink3">{item.hint}</span>}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 참여 유형 — 자기 신고값, 확정 등급은 검수에서 운영이 정함 */}
                    <div>
                        <p className="text-xs font-bold text-ink mb-2">
                            참여 유형 <span className="text-red-500">*</span>
                        </p>
                        <div className="space-y-2">
                            {SAFE_CANCEL_PARTICIPATION_TYPES.map((type) => (
                                <button
                                    key={type.value}
                                    type="button"
                                    onClick={() => onParticipationTypeChange(type.value)}
                                    className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
                                        participationType === type.value
                                            ? 'bg-brand-bg border-brand/40'
                                            : 'bg-card border-line hover:border-strong'
                                    }`}
                                >
                                    <span className={`block text-xs font-semibold ${participationType === type.value ? 'text-brand-strong' : 'text-ink'}`}>
                                        {type.label}
                                    </span>
                                    <span className="block text-[11px] text-ink3">{type.hint}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 2차 활용 동의 — 선택 */}
                    <button
                        type="button"
                        onClick={() => onRepostConsentChange(!repostConsent)}
                        className="w-full flex items-start gap-2.5 pt-3 border-t border-line text-left"
                    >
                        <CheckBox checked={repostConsent} />
                        <span className="text-xs leading-relaxed text-ink">
                            캠핏 공식 계정 리포스트(2차 활용)에 동의해요
                            <span className="block text-[11px] text-ink3">선택 항목이에요. 동의하지 않아도 리워드에는 영향 없어요</span>
                        </span>
                    </button>
                </div>
            )}
        </div>
    );
}
