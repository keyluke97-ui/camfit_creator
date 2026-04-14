// CHANGED: 이전 연도 콘텐츠용 콤팩트 row 컴포넌트
'use client';

import type { ContentUpload } from '@/types';

interface ContentCardCompactProps {
    content: ContentUpload;
}

export default function ContentCardCompact({ content }: ContentCardCompactProps) {
    const displayName = content.sponsorshipType === '프리미엄 협찬'
        ? content.premiumCampaignName
        : content.accommodationName;

    const isPremium = content.sponsorshipType === '프리미엄 협찬';

    const formattedDate = content.uploadDate
        ? content.uploadDate.replace(/-/g, '.').slice(5) // MM.DD만 표시
        : '';

    return (
        <a
            href={content.contentLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg hover:border-[#01DF82]/40 transition-colors group"
        >
            {/* 타입 도트 */}
            <span className={`w-2 h-2 rounded-full shrink-0 ${isPremium ? 'bg-yellow-400' : 'bg-[#01DF82]'}`} />

            {/* 캠핑장명 */}
            <span className="flex-1 text-sm text-white truncate group-hover:text-[#01DF82] transition-colors">
                {displayName || '이름 없음'}
            </span>

            {/* 날짜 */}
            {formattedDate && (
                <span className="text-xs text-[#666666] shrink-0">{formattedDate}</span>
            )}

            {/* 화살표 */}
            <svg className="w-3.5 h-3.5 text-[#555555] group-hover:text-[#01DF82] transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
        </a>
    );
}
