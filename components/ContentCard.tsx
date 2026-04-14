// CHANGED: 콘텐츠 카드 리뉴얼 — 포트폴리오 스타일로 재디자인
'use client';

import type { ContentUpload } from '@/types';

interface ContentCardProps {
    content: ContentUpload;
}

export default function ContentCard({ content }: ContentCardProps) {
    const displayName = content.sponsorshipType === '프리미엄 협찬'
        ? content.premiumCampaignName
        : content.accommodationName;

    const isPremium = content.sponsorshipType === '프리미엄 협찬';

    // CHANGED: 업로드 날짜 포맷 (YYYY-MM-DD → YYYY.MM.DD)
    const formattedDate = content.uploadDate
        ? content.uploadDate.replace(/-/g, '.')
        : '';

    return (
        <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl overflow-hidden hover:border-[#01DF82]/50 transition-all duration-200">
            {/* 카드 본문 */}
            <div className="p-5">
                {/* 상단: 캠핑장명 + 뱃지 */}
                <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                        {displayName ? (
                            <h3 className="text-[15px] font-bold text-white leading-snug">
                                {displayName}
                            </h3>
                        ) : (
                            <h3 className="text-[15px] font-bold text-[#666666] leading-snug">
                                이름 없음
                            </h3>
                        )}
                    </div>
                    <span className={`flex-shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                        isPremium
                            ? 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20'
                            : 'bg-[#01DF82]/10 text-[#01DF82] border border-[#01DF82]/20'
                    }`}>
                        {isPremium ? '프리미엄' : '캠핑장 예약'}
                    </span>
                </div>

                {/* 날짜 */}
                {formattedDate && (
                    <p className="text-xs text-[#666666] mb-4">
                        {formattedDate} 업로드
                    </p>
                )}

                {/* 링크 영역 */}
                <div className="flex flex-col gap-2">
                    {/* 콘텐츠 링크 */}
                    <a
                        href={content.contentLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2.5 px-3.5 py-2.5 bg-[#252525] rounded-lg hover:bg-[#2A2A2A] transition-colors group"
                    >
                        <div className="w-8 h-8 bg-[#01DF82]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4 text-[#01DF82]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-[#888888] mb-0.5">콘텐츠 보기</p>
                            <p className="text-xs text-[#01DF82] truncate group-hover:underline">
                                {content.contentLink}
                            </p>
                        </div>
                        <svg className="w-4 h-4 text-[#555555] group-hover:text-[#01DF82] transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </a>

                    {/* 캠핏 라운지 링크 */}
                    {content.camfitLoungeUrl && (
                        <a
                            href={content.camfitLoungeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2.5 px-3.5 py-2.5 bg-[#252525] rounded-lg hover:bg-[#2A2A2A] transition-colors group"
                        >
                            <div className="w-8 h-8 bg-[#333333] rounded-lg flex items-center justify-center flex-shrink-0">
                                <svg className="w-4 h-4 text-[#888888]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.172 13.828a4 4 0 015.656 0l4-4a4 4 0 00-5.656-5.656l-1.102 1.101" />
                                </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-[#888888]">캠핏 라운지</p>
                            </div>
                            <svg className="w-4 h-4 text-[#555555] group-hover:text-white transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </a>
                    )}
                </div>

                {/* 공동작업 요청 뱃지 */}
                {content.officialCollabRequest && (
                    <div className="mt-3 pt-3 border-t border-[#2A2A2A]">
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/15">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            공동작업 요청됨
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
