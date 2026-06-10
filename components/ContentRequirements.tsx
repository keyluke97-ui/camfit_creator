'use client';

// CHANGED: 콘텐츠 제작 필수사항 + 팔로워 안내 링크 블록 추출 (ApplicationModal Step 3, 파일 크기 컨벤션 준수)
import type { ChannelType } from '@/types';
import { getFollowerLinks } from '@/lib/constants';

interface ContentRequirementsProps {
    channelTypes?: ChannelType[];
    hostInstagram?: string;
    detailUrl?: string;
    isCouponEvent: boolean;
}

export default function ContentRequirements({ channelTypes, hostInstagram, detailUrl, isCouponEvent }: ContentRequirementsProps) {
    // CHANGED: 쿠폰이벤트면 [쿠폰 등록 페이지, 숙소 상세], 아니면 [숙소 상세]만
    const followerLinks = getFollowerLinks(detailUrl, isCouponEvent);

    return (
        <div className="bg-[#2A2A2A] p-4 rounded-lg space-y-3">
            <p className="text-sm font-bold text-[#01DF82]">📌 콘텐츠 제작 시 필수 사항</p>
            {channelTypes?.includes('인스타') && (
                <div className="flex items-start gap-2 text-sm text-[#D0D0D0]">
                    <span className="text-[#01DF82] mt-0.5 shrink-0">•</span>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs bg-[#E4405F]/15 text-[#E4405F] border border-[#E4405F]/30 rounded-full px-2 py-0.5 font-medium">인스타그램 운영 시</span>
                        <p>콘텐츠에 <strong className="text-white">@camfit_official</strong> 태그 필수</p>
                    </div>
                </div>
            )}
            {channelTypes?.includes('인스타') && hostInstagram && (
                <div className="flex items-start gap-2 text-sm text-[#D0D0D0]">
                    <span className="text-[#01DF82] mt-0.5 shrink-0">•</span>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs bg-[#E4405F]/15 text-[#E4405F] border border-[#E4405F]/30 rounded-full px-2 py-0.5 font-medium">캠핑장 태그</span>
                        <p>캠핑장 인스타 <strong className="text-white">@{hostInstagram}</strong> 태그</p>
                    </div>
                </div>
            )}
            {/* CHANGED: 쿠폰이벤트면 등록 페이지 + 상세, 아니면 상세만. 긴 URL 대신 하이퍼링크 앵커. */}
            <div className="flex items-start gap-2 text-sm text-[#D0D0D0]">
                <span className="text-[#01DF82] mt-0.5 shrink-0">•</span>
                <div className="w-full">
                    <p>
                        {isCouponEvent
                            ? '팔로워가 쿠폰을 등록할 수 있도록 아래 링크를 함께 안내해주세요'
                            : '콘텐츠 캡션/더보기란에 아래 숙소 링크를 반드시 포함해주세요'}
                    </p>
                    {followerLinks.map((link) => (
                        <a
                            key={link.url}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#01DF82] underline text-xs mt-1.5 block font-semibold"
                        >
                            🔗 {link.label} 바로가기 →
                        </a>
                    ))}
                </div>
            </div>
            <p className="text-xs text-[#888888]">
                ※ 영상 콘텐츠의 경우 영상 내부가 아닌 캡션/더보기란에 링크를 넣어주세요.
            </p>
        </div>
    );
}
