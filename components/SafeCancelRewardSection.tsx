// 안심취소 리워드(트랙 A 파일럿) 참여 섹션 — 콘텐츠 전달 모달 안에서 토글로 펼침
// 문구·금액·횟수는 lib/safeCancelReward.ts 설정값만 사용 (크리에이터 가이드 「올리기 전 체크」와 동일 문구)
'use client';

import { useState } from 'react';
import {
    SAFE_CANCEL_CHECKLIST,
    SAFE_CANCEL_CAPTION_TEXT,
    SAFE_CANCEL_GUIDE_URL,
    SAFE_CANCEL_INSIGHT_DAY,
    SAFE_CANCEL_SUBMIT_DEADLINE_DAYS,
    formatSafeCancelRewardSummary,
} from '@/lib/safeCancelReward';
import type { SafeCancelChecklistKey } from '@/lib/safeCancelReward';

interface SafeCancelRewardSectionProps {
    enabled: boolean;
    onToggle: (next: boolean) => void;
    checklist: Record<SafeCancelChecklistKey, boolean>;
    onChecklistChange: (key: SafeCancelChecklistKey, checked: boolean) => void;
    usedOpenSourceClip: boolean | null;
    onOpenSourceChange: (value: boolean) => void;
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
    usedOpenSourceClip,
    onOpenSourceChange,
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
                        <p>· 업로드 {SAFE_CANCEL_INSIGHT_DAY}일 뒤 「내 콘텐츠」에서 인사이트 캡처를 추가로 내주세요 (업로드 후 {SAFE_CANCEL_SUBMIT_DEADLINE_DAYS}일 안)</p>
                        <p>· 검수 완료 후 월말 일괄 지급</p>
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

                    {/* 오픈소스 영상 소스 사용 여부 */}
                    <div>
                        <p className="text-xs font-bold text-ink mb-2">
                            캠핏 오픈소스 영상을 사용했나요? <span className="text-red-500">*</span>
                        </p>
                        <div className="flex gap-2">
                            {([true, false] as const).map((value) => (
                                <button
                                    key={String(value)}
                                    type="button"
                                    onClick={() => onOpenSourceChange(value)}
                                    className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
                                        usedOpenSourceClip === value ? 'bg-brand text-black' : 'bg-subtle text-ink3 hover:text-ink'
                                    }`}
                                >
                                    {value ? '예' : '아니오'}
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
