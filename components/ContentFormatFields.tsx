// ContentFormatFields.tsx - 제작 콘텐츠 형식(보유 채널로 필터) + 제작 기준 (지명형 1a-v2 §3.3)
'use client';

import { CONTENT_FORMATS, CONTENT_FORMAT_CHANNEL } from '@/lib/constants';

interface ContentFormatFieldsProps {
    channelTypes: string[];
    contentFormats: string[];
    contentStandard: string;
    onChange: (patch: { contentFormats?: string[]; contentStandard?: string }) => void;
}

export default function ContentFormatFields({
    channelTypes, contentFormats, contentStandard, onChange,
}: ContentFormatFieldsProps) {
    // 보유 채널의 형식만 노출 — 유튜브를 안 하면 유튜브 항목이 뜨지 않는다
    const available = CONTENT_FORMATS.filter((format) => channelTypes.includes(CONTENT_FORMAT_CHANNEL[format]));

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
