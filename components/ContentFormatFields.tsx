// ContentFormatFields.tsx - 제작 콘텐츠 형식(보유 채널로 필터) + 제작 기준 (지명형 1a-v2 §3.3)
// CHANGED: 2026-08-12 — 산출물·업로드 기한 표준 배너 + 기한 예외 선택
'use client';

import { CONTENT_FORMATS, UPLOAD_DEADLINE_DEFAULT_DAYS, UPLOAD_DEADLINE_OPTIONS } from '@/lib/constants';
import { isFormatAvailable } from '@/lib/creatorProfileRules';
import { buildDeliverableSummary } from '@/lib/sponsorshipTerms';

interface ContentFormatFieldsProps {
    channelTypes: string[];
    contentFormats: string[];
    contentStandard: string;
    uploadDeadlineDays: number | null;
    onChange: (patch: {
        contentFormats?: string[];
        contentStandard?: string;
        uploadDeadlineDays?: number | null;
    }) => void;
}

export default function ContentFormatFields({
    channelTypes, contentFormats, contentStandard, uploadDeadlineDays, onChange,
}: ContentFormatFieldsProps) {
    // 보유 채널의 형식만 노출 — 유튜브를 안 하면 유튜브 항목이 뜨지 않는다.
    // 서버 검증(규칙 4)과 같은 술어를 쓴다 — 두 벌이면 클라가 고르게 둔 걸 서버가 400으로 막는다.
    const available = CONTENT_FORMATS.filter((format) => isFormatAvailable(format, channelTypes));

    function toggleFormat(format: string) {
        const next = contentFormats.includes(format)
            ? contentFormats.filter((f) => f !== format)
            : [...contentFormats, format];
        onChange({ contentFormats: next });
    }

    return (
        <div className="flex flex-col gap-4">
            <div>
                <label className="block text-sm font-medium text-ink mb-1">
                    제작하시는 콘텐츠 형식 <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-ink3 mb-2">캠지기가 무엇을 받게 되는지 정하는 항목이에요.</p>
                {available.length === 0 ? (
                    <p className="text-sm text-ink3">운영 중인 채널을 먼저 선택해주세요.</p>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {available.map((format) => {
                            const selected = contentFormats.includes(format);
                            return (
                                <button
                                    key={format}
                                    type="button"
                                    onClick={() => toggleFormat(format)}
                                    aria-pressed={selected}
                                    className={`px-4 h-10 rounded-full border text-sm transition-colors ${
                                        selected
                                            ? 'bg-brand-bg text-brand-strong border-brand/30 font-medium'
                                            : 'bg-card text-ink2 border-line hover:border-strong'
                                    }`}
                                >
                                    {format}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* CHANGED: 2026-08-12 — 캠지기가 무엇을 언제 받는지 이 자리에서 확정된다.
                문구는 buildDeliverableSummary 한 곳에서만 만든다(캠지기 카드·제안서와 동일 문장). */}
            <div className="bg-brand-bg border border-brand/30 rounded-lg p-4">
                <p className="text-xs text-ink2 mb-1">캠지기가 받게 되는 것</p>
                <p className="text-sm font-bold text-ink leading-relaxed">
                    {buildDeliverableSummary(contentFormats, uploadDeadlineDays)}
                </p>
            </div>

            <div>
                <label className="block text-sm font-medium text-ink mb-1">업로드 기한</label>
                <p className="text-xs text-ink3 mb-2">
                    더 여유가 필요하시면 늘리실 수 있어요. 늘린 기한은 캠지기에게도 그대로 보입니다.
                </p>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => onChange({ uploadDeadlineDays: null })}
                        aria-pressed={uploadDeadlineDays === null}
                        className={`px-4 h-10 rounded-full border text-sm transition-colors ${
                            uploadDeadlineDays === null
                                ? 'bg-brand text-black border-brand font-bold'
                                : 'bg-card text-ink2 border-line hover:border-strong'
                        }`}
                    >
                        {UPLOAD_DEADLINE_DEFAULT_DAYS}일 (표준)
                    </button>
                    {UPLOAD_DEADLINE_OPTIONS.map((days) => (
                        <button
                            key={days}
                            type="button"
                            onClick={() => onChange({ uploadDeadlineDays: days })}
                            aria-pressed={uploadDeadlineDays === days}
                            className={`px-4 h-10 rounded-full border text-sm transition-colors ${
                                uploadDeadlineDays === days
                                    ? 'bg-brand text-black border-brand font-bold'
                                    : 'bg-card text-ink2 border-line hover:border-strong'
                            }`}
                        >
                            {days}일
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-ink mb-2">콘텐츠 제작 기준</label>
                <textarea
                    value={contentStandard}
                    onChange={(event) => onChange({ contentStandard: event.target.value })}
                    rows={3}
                    placeholder="예: 롱폼 1편 + 쇼츠 2편, 촬영은 1박 2일 기준"
                    className="w-full px-4 py-3 bg-card border border-line rounded-lg text-ink text-sm focus:border-brand focus:outline-none transition-colors placeholder:text-ink3 resize-none"
                />
            </div>
        </div>
    );
}
