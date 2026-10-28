// 안심취소 리워드(트랙 A 파일럿) 참여 섹션 — 콘텐츠 전달 모달 안에서 토글로 펼침
// 문구·금액·횟수는 lib/safeCancelReward.ts 설정값만 사용 (크리에이터 가이드 v93 문구와 동일)
// CHANGED: 가이드 정렬 — 참여 유형 2개(기본형/클립형)를 먼저 고르고, 고른 유형의 홍보 문구 · 조건 · 체크만 보여준다. 2차 활용 동의 제거
'use client';

import { useState } from 'react';
import {
    SAFE_CANCEL_80_LIST_URL,
    SAFE_CANCEL_CAPTION_RULES,
    SAFE_CANCEL_CLIP_RULES,
    SAFE_CANCEL_GUIDE_URL,
    SAFE_CANCEL_SELECTION_NOTICES,
    SAFE_CANCEL_PARTICIPATION_TYPES,
    SAFE_CANCEL_PAYOUT_DAY_OF_NEXT_MONTH,
    formatSafeCancelRewardSummary,
    getApplicableSafeCancelChecklist,
    getSafeCancelParticipationType,
} from '@/lib/safeCancelReward';
import type { SafeCancelChecklistKey, SafeCancelParticipationType } from '@/lib/safeCancelReward';

interface SafeCancelRewardSectionProps {
    enabled: boolean;
    onToggle: (next: boolean) => void;
    checklist: Record<SafeCancelChecklistKey, boolean>;
    onChecklistChange: (key: SafeCancelChecklistKey, checked: boolean) => void;
    participationType: SafeCancelParticipationType | null;
    onParticipationTypeChange: (value: SafeCancelParticipationType) => void;
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
}: SafeCancelRewardSectionProps) {
    const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');

    // CHANGED: 인스타 앱 내 브라우저 등 Clipboard API가 막힌 환경 대비 — ApplicationModal과 같은 textarea 폴백, 둘 다 실패하면 직접 복사 안내
    const selectedType = participationType ? getSafeCancelParticipationType(participationType) : null;

    const handleCopyCaption = async (captionText: string) => {
        let isCopied = false;
        try {
            await navigator.clipboard.writeText(captionText);
            isCopied = true;
        } catch (error) {
            console.error('Caption copy via Clipboard API failed, trying fallback:', error);
            const textarea = document.createElement('textarea');
            textarea.value = captionText;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            isCopied = document.execCommand('copy');
            document.body.removeChild(textarea);
        }
        setCopyState(isCopied ? 'copied' : 'failed');
        if (isCopied) setTimeout(() => setCopyState('idle'), 2000);
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
                {/* CHANGED: 채널 무관 — 인스타 · 블로그 · 유튜브 모두 참여 가능 */}
                <span className="text-[10px] text-brand-strong bg-brand-bg px-2 py-0.5 rounded-full font-medium">
                    모든 채널
                </span>
            </button>

            {enabled && (
                <div className="mt-2 bg-page border border-line rounded-lg p-4 space-y-4">
                    {/* 안내 */}
                    <div className="space-y-1 text-xs text-ink2 leading-relaxed">
                        <p className="font-bold text-ink">{formatSafeCancelRewardSummary()}</p>
                        <p>
                            · <strong className="text-ink">안심취소 80 캠핑장 협찬만</strong> 참여할 수 있어요 (안심취소+ 캠핑장 제외){' '}
                            <a
                                href={SAFE_CANCEL_80_LIST_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-brand-strong underline underline-offset-2"
                            >
                                목록 보기
                            </a>
                        </p>
                        {SAFE_CANCEL_SELECTION_NOTICES.map((notice) => (
                            <p key={notice}>· {notice}</p>
                        ))}
                        <p>· 전달일 기준 <strong className="text-ink">익월 {SAFE_CANCEL_PAYOUT_DAY_OF_NEXT_MONTH}일</strong>에 포털 가입 연락처의 캠핏 앱 계정으로 지급돼요 (유효기간 1년)</p>
                        {SAFE_CANCEL_GUIDE_URL && (
                            <a
                                href={SAFE_CANCEL_GUIDE_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block pt-1 font-medium text-brand-strong underline underline-offset-2"
                            >
                                상세 가이드 바로가기
                            </a>
                        )}
                    </div>

                    {/* 참여 유형 — 자기 신고값, 확정 등급은 검수에서 운영이 정함. 유형에 따라 아래 문구 · 체크가 바뀌어 맨 위에 둔다 */}
                    <div>
                        <p className="text-xs font-bold text-ink mb-2">
                            참여 유형 <span className="text-red-500">*</span>
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                            {SAFE_CANCEL_PARTICIPATION_TYPES.map((type) => (
                                <button
                                    key={type.value}
                                    type="button"
                                    onClick={() => onParticipationTypeChange(type.value)}
                                    className={`text-left px-3 py-2.5 rounded-lg border transition-colors ${
                                        participationType === type.value
                                            ? 'bg-brand-bg border-brand/40'
                                            : 'bg-card border-line hover:border-strong'
                                    }`}
                                >
                                    <span className={`block text-xs font-semibold ${participationType === type.value ? 'text-brand-strong' : 'text-ink'}`}>
                                        {type.label}
                                        {type.points !== null && ` · ${(type.points / 10000).toLocaleString('ko-KR')}만P`}
                                    </span>
                                    <span className="block text-[11px] text-ink3 leading-snug mt-0.5">{type.hint}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {selectedType && (
                        <>
                            {/* 캡션 필수 조건 + 유형별 홍보 문구 복사 */}
                            <div className="bg-card border border-line rounded-lg p-3">
                                <p className="text-[11px] font-semibold text-ink mb-1.5">캡션 필수 조건 (인스타 캡션 · 블로그 본문 · 유튜브 설명란)</p>
                                <ol className="list-decimal pl-4 space-y-0.5 text-xs text-ink2 mb-2.5">
                                    {SAFE_CANCEL_CAPTION_RULES.map((rule) => (
                                        <li key={rule}>{rule}</li>
                                    ))}
                                </ol>
                                <p className="text-[11px] text-ink3 mb-1">{selectedType.label} 안심취소 홍보 문구</p>
                                <p className="text-xs text-ink font-medium leading-relaxed mb-2">{selectedType.captionText}</p>
                                <button
                                    type="button"
                                    onClick={() => handleCopyCaption(selectedType.captionText)}
                                    className="w-full h-9 text-xs font-semibold bg-subtle text-ink rounded-lg hover:bg-subtle transition-colors"
                                >
                                    {copyState === 'copied' ? '복사됐어요' : '문구 복사하기'}
                                </button>
                                {copyState === 'failed' && (
                                    <p className="mt-1.5 text-[11px] text-red-500 text-center">
                                        복사가 안 됐어요. 위 문구를 길게 눌러 직접 복사해 주세요.
                                    </p>
                                )}
                            </div>

                            {/* 클립형 조건 */}
                            {selectedType.isClip && (
                                <div className="bg-brand-bg rounded-lg p-3">
                                    <p className="text-[11px] font-semibold text-brand-strong mb-1.5">클립형 조건</p>
                                    <ol className="list-decimal pl-4 space-y-0.5 text-xs text-ink2">
                                        {SAFE_CANCEL_CLIP_RULES.map((rule) => (
                                            <li key={rule}>{rule}</li>
                                        ))}
                                    </ol>
                                </div>
                            )}

                            {/* 필수 체크 — 체크리스트 + 참여 동의, 전부 체크해야 전달 가능 */}
                            {([
                                { kind: 'check', title: '체크리스트' },
                                { kind: 'consent', title: '참여 동의' },
                            ] as const).map((group) => (
                                <div key={group.kind}>
                                    <p className="text-xs font-bold text-ink mb-2">
                                        {group.title} <span className="text-red-500">*</span>
                                    </p>
                                    <div className="space-y-2.5">
                                        {getApplicableSafeCancelChecklist(participationType).filter((item) => item.kind === group.kind).map((item) => (
                                            <button
                                                key={item.key}
                                                type="button"
                                                onClick={() => onChecklistChange(item.key, !checklist[item.key])}
                                                className="w-full flex items-start gap-2.5 text-left"
                                            >
                                                <CheckBox checked={checklist[item.key] === true} />
                                                <span className="text-xs leading-relaxed">
                                                    <span className={checklist[item.key] ? 'text-brand-strong font-medium' : 'text-ink'}>{item.label}</span>
                                                    {item.hint && <span className="block text-[11px] text-ink3">{item.hint}</span>}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
