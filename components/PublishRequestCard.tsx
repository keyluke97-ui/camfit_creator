// PublishRequestCard.tsx - 제안 흐름 고지 + '이해' 확인 + 공개 신청 (지명형 1a-v2 §3.6)
// 기존 PublishToggle(2단 토글)을 대체한다. 자동수락 토글은 폐지 — 무응답 자동확정이 이미 기본값(스펙 D1).
'use client';

import { useState } from 'react';
import type { ReviewStatus } from '@/types';

interface PublishRequestCardProps {
    isPublic: boolean;
    reviewStatus: ReviewStatus;
    reviewRejectReason: string;
    missing: string[];
    saving: boolean;
    onChangePublic: (next: boolean) => void;
}

const OFFER_FLOW: string[] = [
    '캠지기가 먼저 입금한 뒤 제안합니다',
    '캠핏이 입금을 확인하고 제안서를 이메일로 보내드려요',
    '24~48시간 안에 확인해주세요',
    '응답이 없으면 수락한 것으로 자동 확정됩니다',
    '거절하실 땐 사유를 적어주셔야 하고, 거절이 반복되면 서비스 이용이 제한될 수 있어요',
    '등록하신 채널 전부에 콘텐츠를 올리는 조건이에요',
];

export default function PublishRequestCard({
    isPublic, reviewStatus, reviewRejectReason, missing, saving, onChangePublic,
}: PublishRequestCardProps) {
    const [confirmText, setConfirmText] = useState('');
    const canSubmit = missing.length === 0 && confirmText.trim() === '이해' && !saving;

    // 이미 공개 중이면 상태 표시 + 끄기만 제공(끄기는 자유 — 타이핑 불필요)
    if (isPublic) {
        return (
            <div className="bg-card border border-line rounded-xl p-5 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                    <span className="w-6 h-6 bg-brand-bg rounded-full flex items-center justify-center text-brand-strong text-xs">✓</span>
                    <span className="text-sm font-medium text-ink">
                        {reviewStatus === '승인' ? '공개 중' : reviewStatus === '반려' ? '공개 반려됨' : '캠핏 확인 중'}
                    </span>
                </div>
                {reviewStatus === '심사대기' && (
                    <p className="text-xs text-ink2">확인이 끝나면 캠지기에게 보입니다. 보통 1영업일 걸려요.</p>
                )}
                {reviewStatus === '반려' && reviewRejectReason && (
                    <p className="text-xs text-red-500 leading-relaxed">사유: {reviewRejectReason}</p>
                )}
                <button
                    type="button"
                    onClick={() => onChangePublic(false)}
                    disabled={saving}
                    className="w-full h-12 bg-subtle text-ink font-bold rounded-lg border border-line hover:border-strong transition-colors disabled:opacity-60"
                >
                    {saving ? '처리 중...' : '공개 중지하기'}
                </button>
            </div>
        );
    }

    return (
        <div className="bg-card border border-line rounded-xl p-5 flex flex-col gap-4">
            <div className="bg-subtle rounded-lg p-4">
                <p className="text-sm font-bold text-ink mb-2">제안은 이렇게 들어와요</p>
                <ol className="flex flex-col gap-1.5">
                    {OFFER_FLOW.map((line, index) => (
                        <li key={line} className="text-xs text-ink2 leading-relaxed flex gap-2">
                            <span className="text-ink3 shrink-0">{index + 1}.</span>
                            <span>{line}</span>
                        </li>
                    ))}
                </ol>
                <p className="text-xs text-ink3 mt-3 leading-relaxed">
                    제안이 들어온 뒤 금액·조건을 바꾸셔도 그 제안에는 적용되지 않아요 — 제안 시점의 조건으로 진행됩니다.
                </p>
            </div>

            {missing.length > 0 ? (
                <div>
                    <p className="text-xs text-ink2 mb-2 font-medium">공개하려면 아래를 먼저 완성해주세요</p>
                    <div className="flex flex-wrap gap-1.5">
                        {missing.map((item) => (
                            <span key={item} className="px-2.5 py-1 bg-subtle text-ink2 border border-line rounded-full text-xs">
                                {item}
                            </span>
                        ))}
                    </div>
                </div>
            ) : (
                <div>
                    <label className="block text-sm font-medium text-ink mb-2">
                        위 내용을 이해하셨다면 &lsquo;이해&rsquo;를 입력해주세요
                    </label>
                    <input
                        type="text"
                        value={confirmText}
                        onChange={(event) => setConfirmText(event.target.value)}
                        placeholder="이해"
                        className="w-full h-12 px-4 bg-card border border-line rounded-lg text-ink text-sm focus:border-brand focus:outline-none transition-colors placeholder:text-ink3"
                    />
                </div>
            )}

            <button
                type="button"
                onClick={() => onChangePublic(true)}
                disabled={!canSubmit}
                className="w-full h-12 bg-brand text-black font-bold rounded-lg hover:bg-brand-hover transition-colors disabled:opacity-40"
            >
                {saving ? '처리 중...' : '공개 신청하기'}
            </button>
            <p className="text-xs text-ink3 text-center">캠핏 확인 후 캠지기에게 보입니다 (보통 1영업일)</p>
        </div>
    );
}
