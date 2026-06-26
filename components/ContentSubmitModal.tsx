// CHANGED: 콘텐츠 제출 모달 — 에어테이블 폼과 동일한 구조
'use client';

import { useState, useEffect, useRef } from 'react';
import type { SponsorshipType, ChannelType } from '@/types';
// CHANGED: 캠냥이 마스코트 + 오브젝트 아이콘
import Mascot from './Mascot';
import BrandIcon from './BrandIcon';

interface ContentSubmitModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmitSuccess: () => void;
    userInfo: {
        creatorId: string;
        channelName: string;
        premiumId: string | null;
        channelTypes?: ChannelType[]; // CHANGED: 인스타 채널 여부 판단용 (공동작업 섹션 표시)
    };
}

interface SelectOption {
    id: string;
    name: string;
}

type Step = 'form' | 'success';

export default function ContentSubmitModal({
    isOpen,
    onClose,
    onSubmitSuccess,
    userInfo
}: ContentSubmitModalProps) {
    const [step, setStep] = useState<Step>('form');
    const [sponsorshipType, setSponsorshipType] = useState<SponsorshipType | ''>('');
    const [uploadDate, setUploadDate] = useState('');
    const [contentLink, setContentLink] = useState('');
    const [extraLinks, setExtraLinks] = useState<string[]>([]); // CHANGED: 콘텐츠2/3/4 다중 채널 링크 (각 원소 = 입력칸 1개, 최대 3)

    // 숙소 협찬 필드
    const [accommodationSearch, setAccommodationSearch] = useState('');
    const [accommodationOptions, setAccommodationOptions] = useState<SelectOption[]>([]);
    const [selectedAccommodation, setSelectedAccommodation] = useState<SelectOption | null>(null);
    const [isAccommodationDropdownOpen, setIsAccommodationDropdownOpen] = useState(false);
    const [camfitLoungeUrl, setCamfitLoungeUrl] = useState('');
    const [officialCollabRequest, setOfficialCollabRequest] = useState(false);
    const [collabConfirmed, setCollabConfirmed] = useState(false); // CHANGED: 공동작업 주의사항 확인 서브 체크박스

    // 프리미엄 협찬 필드
    const [campaignSearch, setCampaignSearch] = useState('');
    const [campaignOptions, setCampaignOptions] = useState<SelectOption[]>([]);
    const [selectedCampaign, setSelectedCampaign] = useState<SelectOption | null>(null);
    const [isCampaignDropdownOpen, setIsCampaignDropdownOpen] = useState(false);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const isSubmittingRef = useRef(false);
    const accommodationDropdownRef = useRef<HTMLDivElement>(null);
    const campaignDropdownRef = useRef<HTMLDivElement>(null);

    // 모달 리셋
    useEffect(() => {
        if (isOpen) {
            setStep('form');
            setSponsorshipType('');
            setUploadDate(new Date().toISOString().split('T')[0]);
            setContentLink('');
            setExtraLinks([]); // CHANGED: 콘텐츠2/3/4 다중 채널 링크 리셋
            setAccommodationSearch('');
            setAccommodationOptions([]);
            setSelectedAccommodation(null);
            setCamfitLoungeUrl('');
            setOfficialCollabRequest(false);
            setCollabConfirmed(false);
            setCampaignSearch('');
            setCampaignOptions([]);
            setSelectedCampaign(null);
            setError('');
            isSubmittingRef.current = false;
        }
    }, [isOpen]);

    // CHANGED: 숙소 검색 debounce — 최소 1글자 입력 시에만 검색
    useEffect(() => {
        if (sponsorshipType !== '캠핑장 예약') return;
        if (!accommodationSearch.trim()) {
            setAccommodationOptions([]);
            return;
        }
        const timer = setTimeout(async () => {
            try {
                const url = `/api/content/accommodations?q=${encodeURIComponent(accommodationSearch.trim())}`;
                const response = await fetch(url);
                const data = await response.json();
                if (response.ok) {
                    setAccommodationOptions(data.accommodations || []);
                }
            } catch {
                // 검색 실패 시 무시
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [accommodationSearch, sponsorshipType]);

    // CHANGED: 캠페인 검색 — 본인 신청 캠페인만, 포커스 시 전체 로드 (개수가 적으므로)
    useEffect(() => {
        if (sponsorshipType !== '프리미엄 협찬') return;
        const timer = setTimeout(async () => {
            try {
                const url = campaignSearch.trim()
                    ? `/api/content/campaigns?q=${encodeURIComponent(campaignSearch.trim())}`
                    : '/api/content/campaigns';
                const response = await fetch(url);
                const data = await response.json();
                if (response.ok) {
                    setCampaignOptions(data.campaigns || []);
                }
            } catch {
                // 검색 실패 시 무시
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [campaignSearch, sponsorshipType]);

    // 외부 클릭 시 드롭다운 닫기
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent | TouchEvent) => {
            if (accommodationDropdownRef.current && !accommodationDropdownRef.current.contains(event.target as Node)) {
                setIsAccommodationDropdownOpen(false);
            }
            if (campaignDropdownRef.current && !campaignDropdownRef.current.contains(event.target as Node)) {
                setIsCampaignDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, []);

    const handleSubmit = async () => {
        if (isSubmittingRef.current) return;

        // 검증
        if (!sponsorshipType) {
            setError('협찬의 종류를 선택해주세요.');
            return;
        }
        if (!contentLink) {
            setError('콘텐츠 링크를 입력해주세요.');
            return;
        }
        if (!uploadDate) {
            setError('업로드 날짜를 입력해주세요.');
            return;
        }
        if (sponsorshipType === '캠핑장 예약' && !selectedAccommodation) {
            setError('다녀온 숙소를 선택해주세요.');
            return;
        }
        if (sponsorshipType === '프리미엄 협찬' && !selectedCampaign) {
            setError('프리미엄 협찬 캠핑장을 선택해주세요.');
            return;
        }

        isSubmittingRef.current = true;
        setIsLoading(true);
        setError('');

        try {
            const response = await fetch('/api/content/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sponsorshipType,
                    uploadDate,
                    contentLink,
                    additionalContentLinks: extraLinks.map((l) => l.trim()).filter(Boolean), // CHANGED: 콘텐츠2/3/4 다중 채널 링크
                    accommodationRecordId: selectedAccommodation?.id,
                    camfitLoungeUrl: camfitLoungeUrl || undefined,
                    officialCollabRequest: officialCollabRequest && collabConfirmed, // CHANGED: 서브 확인까지 체크해야 true
                    premiumCampaignRecordId: selectedCampaign?.id,
                })
            });

            const data = await response.json();

            if (!response.ok) {
                // CHANGED: 용어 통일 '제출' → '전달'
                setError(data.error || '전달 중 오류가 발생했습니다.');
                isSubmittingRef.current = false;
                return;
            }

            setStep('success');
            onSubmitSuccess();
        } catch {
            setError('네트워크 오류가 발생했습니다.');
            isSubmittingRef.current = false;
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={onClose} />
            <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-card rounded-t-2xl sm:rounded-2xl border border-line p-6">
                {/* 닫기 버튼 */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-ink3 hover:text-ink transition-colors"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {step === 'form' && (
                    <>
                        {/* CHANGED: 용어 통일 '제출' → '전달' (진입 배너와 일치) */}
                        <h2 className="text-lg font-bold text-ink mb-6">콘텐츠 전달</h2>

                        {/* 협찬 종류 선택 */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-ink mb-2">
                                협찬의 종류를 골라주세요 <span className="text-red-500">*</span>
                            </label>
                            <div className="flex gap-2">
                                {(['캠핑장 예약', '프리미엄 협찬'] as SponsorshipType[]).map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => {
                                            setSponsorshipType(type);
                                            setError('');
                                            setSelectedAccommodation(null);
                                            setSelectedCampaign(null);
                                            setAccommodationSearch('');
                                            setCampaignSearch('');
                                        }}
                                        className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
                                            sponsorshipType === type
                                                ? 'bg-brand text-black'
                                                : 'bg-subtle text-ink3 hover:text-ink'
                                        }`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 업로드 날짜 */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-ink mb-2">
                                업로드 날짜 <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={uploadDate}
                                onChange={(e) => setUploadDate(e.target.value)}
                                className="w-full h-12 px-4 bg-page text-ink border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                            />
                        </div>

                        {/* 콘텐츠 링크 */}
                        <div className="mb-4">
                            {/* CHANGED: 톤 통일 — '알려주세요~' 친근체 제거 */}
                            <label className="block text-sm font-medium text-ink mb-2">
                                업로드한 콘텐츠 링크 <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="url"
                                value={contentLink}
                                onChange={(e) => setContentLink(e.target.value)}
                                placeholder="https://"
                                className="w-full h-12 px-4 bg-page text-ink border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent placeholder-[#9da0a5]"
                            />
                        </div>

                        {/* CHANGED: 콘텐츠2/3/4 다중 채널 링크 — 일반/프리미엄 공통, 점진적 추가 (최대 3) */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-ink mb-1">
                                다른 채널에도 올리셨나요?
                            </label>
                            <p className="text-[11px] text-ink3 mb-2 leading-relaxed">
                                같은 콘텐츠를 인스타·블로그·유튜브 등 다른 채널에도 올리셨다면 링크를 추가해주세요. (선택)
                            </p>
                            {extraLinks.map((link, i) => (
                                <div key={i} className="flex items-center gap-2 mb-2">
                                    <input
                                        type="url"
                                        value={link}
                                        onChange={(e) => setExtraLinks((prev) => prev.map((l, idx) => (idx === i ? e.target.value : l)))}
                                        placeholder="https://"
                                        className="flex-1 h-12 px-4 bg-page text-ink border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent placeholder-[#9da0a5]"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setExtraLinks((prev) => prev.filter((_, idx) => idx !== i))}
                                        aria-label="링크 삭제"
                                        className="w-10 h-12 flex items-center justify-center text-ink3 hover:text-red-500 transition-colors shrink-0"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                            {extraLinks.length < 3 && (
                                <button
                                    type="button"
                                    onClick={() => setExtraLinks((prev) => [...prev, ''])}
                                    className="flex items-center gap-1.5 text-sm font-medium text-brand-strong hover:text-brand-strong transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    다른 채널 링크 추가
                                </button>
                            )}
                        </div>

                        {/* ── 숙소 협찬 (캠핑장 예약) 조건부 필드 ── */}
                        {sponsorshipType === '캠핑장 예약' && (
                            <>
                                {/* 숙소 검색 드롭다운 */}
                                <div className="mb-4 relative" ref={accommodationDropdownRef}>
                                    {/* CHANGED: 톤 통일 — 명령형 + 느낌표 제거 */}
                                    <label className="block text-sm font-medium text-ink mb-2">
                                        다녀온 숙소 <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={isAccommodationDropdownOpen ? accommodationSearch : (selectedAccommodation?.name || '')}
                                        onChange={(e) => {
                                            setAccommodationSearch(e.target.value);
                                            if (!isAccommodationDropdownOpen) setIsAccommodationDropdownOpen(true);
                                        }}
                                        onFocus={() => setIsAccommodationDropdownOpen(true)}
                                        placeholder="캠핑장명 검색..."
                                        className="w-full h-12 px-4 bg-page text-ink border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent placeholder-[#9da0a5]"
                                        autoComplete="off"
                                    />
                                    {isAccommodationDropdownOpen && (
                                        <div role="listbox" className="absolute z-[100] w-full mt-1 bg-card border border-line rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.12)] max-h-[200px] overflow-y-auto">
                                            {accommodationOptions.length > 0 ? (
                                                accommodationOptions.map((option) => (
                                                    // CHANGED: div onMouseDown → button (키보드/스크린리더 접근). onMouseDown은 input blur 방지용만 유지, 선택은 onClick(Enter 포함)
                                                    <button
                                                        type="button"
                                                        role="option"
                                                        aria-selected={selectedAccommodation?.id === option.id}
                                                        key={option.id}
                                                        className={`w-full text-left px-4 py-3 text-sm cursor-pointer transition-colors ${
                                                            selectedAccommodation?.id === option.id
                                                                ? 'text-brand-strong bg-subtle'
                                                                : 'text-ink hover:bg-subtle'
                                                        }`}
                                                        onMouseDown={(e) => e.preventDefault()}
                                                        onClick={() => {
                                                            setSelectedAccommodation(option);
                                                            setAccommodationSearch(option.name);
                                                            setIsAccommodationDropdownOpen(false);
                                                        }}
                                                    >
                                                        {option.name}
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="px-4 py-4 text-sm text-ink3 text-center">
                                                    검색 결과가 없습니다.
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* 캠핏 라운지 콘텐츠 업로드 */}
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-ink mb-1">
                                        캠핏 라운지 콘텐츠 업로드
                                    </label>
                                    <p className="text-[11px] text-ink3 mb-2 leading-relaxed">
                                        필수는 아닙니다! 캠핏 라운지 탭에서 같은 콘텐츠 그대로 복붙해주세요.
                                    </p>
                                    <input
                                        type="url"
                                        value={camfitLoungeUrl}
                                        onChange={(e) => setCamfitLoungeUrl(e.target.value)}
                                        placeholder="캠핏 라운지 게시글 링크"
                                        className="w-full h-12 px-4 bg-page text-ink border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent placeholder-[#9da0a5]"
                                    />
                                </div>

                            </>
                        )}

                        {/* ── 프리미엄 협찬 조건부 필드 ── */}
                        {sponsorshipType === '프리미엄 협찬' && (
                            <div className="mb-4 relative" ref={campaignDropdownRef}>
                                {/* CHANGED: 조건절 라벨 → 입력 대상 명확화 */}
                                <label className="block text-sm font-medium text-ink mb-2">
                                    프리미엄 협찬 캠핑장 <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={isCampaignDropdownOpen ? campaignSearch : (selectedCampaign?.name || '')}
                                    onChange={(e) => {
                                        setCampaignSearch(e.target.value);
                                        if (!isCampaignDropdownOpen) setIsCampaignDropdownOpen(true);
                                    }}
                                    onFocus={() => setIsCampaignDropdownOpen(true)}
                                    placeholder="캠핑장명 검색..."
                                    className="w-full h-12 px-4 bg-page text-ink border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent placeholder-[#9da0a5]"
                                    autoComplete="off"
                                />
                                {isCampaignDropdownOpen && (
                                    <div role="listbox" className="absolute z-[100] w-full mt-1 bg-card border border-line rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.12)] max-h-[200px] overflow-y-auto">
                                        {campaignOptions.length > 0 ? (
                                            campaignOptions.map((option) => (
                                                // CHANGED: div onMouseDown → button (키보드/스크린리더 접근). 선택은 onClick(Enter 포함)
                                                <button
                                                    type="button"
                                                    role="option"
                                                    aria-selected={selectedCampaign?.id === option.id}
                                                    key={option.id}
                                                    className={`w-full text-left px-4 py-3 text-sm cursor-pointer transition-colors ${
                                                        selectedCampaign?.id === option.id
                                                            ? 'text-brand-strong bg-subtle'
                                                            : 'text-ink hover:bg-subtle'
                                                    }`}
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    onClick={() => {
                                                        setSelectedCampaign(option);
                                                        setCampaignSearch(option.name);
                                                        setIsCampaignDropdownOpen(false);
                                                    }}
                                                >
                                                    {option.name}
                                                </button>
                                            ))
                                        ) : (
                                            // CHANGED: 빈 결과 시 노출 정책 안내 추가
                                            <div className="px-4 py-4 text-xs text-ink3 text-center leading-relaxed">
                                                검색 결과가 없어요.<br />
                                                <span className="text-ink3">신청한 프리미엄 캠페인만 표시되며,<br />이미 콘텐츠를 전달한 캠페인은 제외돼요.</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {/* CHANGED: '프리미엄 등록 정보가 자동으로 연결됩니다' 안내 삭제 (모호한 정보) */}
                            </div>
                        )}

                        {/* CHANGED: 공동작업 요청 — 인스타 채널 보유 + 타입 선택 시에만 표시 */}
                        {sponsorshipType && userInfo.channelTypes?.includes('인스타') && (
                            <div className="mb-4">
                                {/* 토글 버튼 스타일 */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        const next = !officialCollabRequest;
                                        setOfficialCollabRequest(next);
                                        if (!next) setCollabConfirmed(false);
                                    }}
                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${
                                        officialCollabRequest
                                            ? 'bg-brand-bg border-brand/40'
                                            : 'bg-subtle border-line hover:border-strong'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                            officialCollabRequest
                                                ? 'border-brand bg-brand'
                                                : 'border-strong'
                                        }`}>
                                            {officialCollabRequest && (
                                                <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                </svg>
                                            )}
                                        </div>
                                        <span className={`text-sm font-medium ${officialCollabRequest ? 'text-brand-strong' : 'text-ink'}`}>
                                            캠핏 오피셜 공동작업 요청
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-[#E4405F] bg-[#E4405F]/10 px-2 py-0.5 rounded-full font-medium">
                                        인스타그램 운영 시
                                    </span>
                                </button>

                                {/* 체크 시 안내사항 펼쳐짐 */}
                                {officialCollabRequest && (
                                    <div className="mt-2 bg-page border border-line rounded-lg p-4 space-y-3">
                                        <p className="text-xs font-bold text-ink flex items-center gap-1"><BrandIcon name="bulb" size={15} />공동작업 요청 전 참고해주세요</p>
                                        <div className="space-y-2.5 text-xs text-ink2 leading-relaxed">
                                            <div className="flex gap-2">
                                                <span className="text-brand-strong shrink-0">1.</span>
                                                <p>콘텐츠 업로드 후 <strong className="text-ink">@camfit_official</strong> 계정으로 공동작업을 요청해주시면 됩니다.<br/>
                                                <span className="text-ink3">(제출 → 공동작업 요청 순서로 진행해주시면 담당팀에서 빠르게 확인할 수 있어요)</span></p>
                                            </div>
                                            <div className="flex gap-2">
                                                <span className="text-brand-strong shrink-0">2.</span>
                                                <p>오피셜 계정 특성상 <strong className="text-ink">캠핑장 소개 관련 콘텐츠</strong>에 한해 함께 게시할 수 있어요.</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <span className="text-brand-strong shrink-0">3.</span>
                                                <p>당일 업로드 건이 많을 경우 인스타 그리드 <strong className="text-ink">최상단(최신 순) 노출이 어려울 수 있어요.</strong><br/>
                                                <span className="text-ink3">(희망하시면 진행 가능하지만, 인스타그램 알고리즘 특성상 최신 노출은 어려운 점 양해 부탁드려요)</span></p>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => setCollabConfirmed(prev => !prev)}
                                            className={`w-full flex items-center gap-2.5 pt-3 mt-1 border-t border-line ${
                                                collabConfirmed ? 'text-brand-strong' : 'text-ink3'
                                            }`}
                                        >
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                                                collabConfirmed
                                                    ? 'border-brand bg-brand-bg'
                                                    : 'border-strong bg-transparent'
                                            }`}>
                                                {collabConfirmed && (
                                                    <svg className="w-2.5 h-2.5 text-brand-strong" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                            </div>
                                            <span className="text-xs font-medium">위 내용을 확인했습니다</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 에러 메시지 */}
                        {error && (
                            <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                                <p className="text-red-500 text-sm text-center">{error}</p>
                            </div>
                        )}

                        {/* 제출 버튼 */}
                        <button
                            onClick={handleSubmit}
                            disabled={isLoading || !sponsorshipType}
                            className="w-full h-12 bg-brand text-black font-bold text-base rounded-xl hover:bg-brand-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                            ) : (
                                // CHANGED: 용어 통일 '제출' → '전달'
                                '콘텐츠 전달하기'
                            )}
                        </button>
                    </>
                )}

                {step === 'success' && (
                    <div className="flex flex-col items-center justify-center py-8 gap-4">
                        {/* CHANGED: 체크 SVG → 트로피 든 캠냥이 마스코트 */}
                        <Mascot expression="trophy" size={112} priority />
                        {/* CHANGED: 용어 통일 + 정산 일정 후속 안내 추가 */}
                        <h3 className="text-lg font-bold text-ink">전달 완료!</h3>
                        <p className="text-sm text-ink3 text-center">
                            콘텐츠가 성공적으로 전달되었습니다.
                        </p>
                        <div className="w-full bg-brand-bg border border-brand/20 rounded-lg px-4 py-3">
                            <p className="text-xs text-brand-strong text-center font-medium flex items-center justify-center gap-1">
                                <BrandIcon name="briefcase" size={15} /> 검수 후 익월 10일에 정산이 진행돼요
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-full h-12 bg-brand text-black font-bold rounded-xl hover:bg-brand-hover transition-colors mt-2"
                        >
                            확인
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
