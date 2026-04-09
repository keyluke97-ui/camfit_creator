// page.tsx - 크리에이터 로그인 페이지 (크리에이터 명단 기반, 자동완성 UI)
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const KAKAO_CHANNEL_URL = 'http://pf.kakao.com/_fBxaQG';
const MIN_SEARCH_LENGTH = 2;

export default function LoginPage() {
    const router = useRouter();
    const [allChannelNames, setAllChannelNames] = useState<string[]>([]);
    const [filteredNames, setFilteredNames] = useState<string[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [highlightIndex, setHighlightIndex] = useState(-1);
    const dropdownReference = useRef<HTMLDivElement>(null);

    // CHANGED: 생년월일 제거 — 채널명 + 연락처 뒤4자리만 사용
    const [formData, setFormData] = useState({
        channelName: '',
        phoneLastFour: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [failCount, setFailCount] = useState(0);

    // 채널명 목록 불러오기
    useEffect(() => {
        fetch('/api/channels')
            .then(response => response.json())
            .then(data => {
                if (data.channelNames) {
                    setAllChannelNames(data.channelNames);
                }
            })
            .catch(channelLoadError => console.error('Failed to load channels:', channelLoadError));
    }, []);

    // 채널명 입력 시 자동완성 필터링
    function handleChannelNameChange(value: string) {
        setFormData({ ...formData, channelName: value });
        setHighlightIndex(-1);

        if (value.length >= MIN_SEARCH_LENGTH) {
            const lowerValue = value.toLowerCase();
            const matched = allChannelNames.filter(
                (name) => name.toLowerCase().includes(lowerValue)
            );
            setFilteredNames(matched.slice(0, 10));
            setShowDropdown(matched.length > 0);
        } else {
            setFilteredNames([]);
            setShowDropdown(false);
        }
    }

    // 자동완성 항목 선택
    function selectChannelName(name: string) {
        setFormData({ ...formData, channelName: name });
        setShowDropdown(false);
        setFilteredNames([]);
    }

    // 키보드 네비게이션 (ArrowUp/Down/Enter/Escape)
    function handleKeyDown(event: React.KeyboardEvent) {
        if (!showDropdown || filteredNames.length === 0) return;

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setHighlightIndex((previous) =>
                previous < filteredNames.length - 1 ? previous + 1 : 0
            );
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setHighlightIndex((previous) =>
                previous > 0 ? previous - 1 : filteredNames.length - 1
            );
        } else if (event.key === 'Enter' && highlightIndex >= 0) {
            event.preventDefault();
            selectChannelName(filteredNames[highlightIndex]);
        } else if (event.key === 'Escape') {
            setShowDropdown(false);
        }
    }

    // 드롭다운 외부 클릭 시 닫기
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownReference.current && !dropdownReference.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // CHANGED: 생년월일 제거
                body: JSON.stringify({
                    channelName: formData.channelName,
                    phoneLastFour: formData.phoneLastFour
                })
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || '로그인에 실패했습니다.');
                setFailCount(previous => previous + 1);
                setLoading(false);
                return;
            }

            router.push('/dashboard');
        } catch (submitError) {
            console.error('Login submit error:', submitError);
            setError('로그인 중 오류가 발생했습니다.');
            setFailCount(previous => previous + 1);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 bg-[#111111]">
            <div className="w-full max-w-md">
                {/* 로고/헤더 */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">
                        캠핏 협찬 포털
                    </h1>
                    <p className="text-[#B0B0B0]">
                        크리에이터 전용 협찬 플랫폼
                    </p>
                </div>

                {/* CHANGED: 상단 중복 배너 제거 — 인라인 카카오톡 안내(failCount >= 2)로 통합 */}

                {/* 로그인 폼 */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* CHANGED: 채널명 텍스트 입력 + 자동완성 (기존 SearchableSelect 드롭다운 → autocomplete 전환) */}
                    <div className="relative" ref={dropdownReference}>
                        <label
                            htmlFor="channelName"
                            className="block text-sm font-medium text-white mb-2"
                        >
                            크리에이터 채널명
                        </label>
                        <input
                            id="channelName"
                            type="text"
                            placeholder="채널명을 입력하세요 (2글자 이상)"
                            value={formData.channelName}
                            onChange={(event) => handleChannelNameChange(event.target.value)}
                            onKeyDown={handleKeyDown}
                            onFocus={() => {
                                if (formData.channelName.length >= MIN_SEARCH_LENGTH && filteredNames.length > 0) {
                                    setShowDropdown(true);
                                }
                            }}
                            autoComplete="off"
                            className="w-full h-12 px-4 bg-[#1E1E1E] text-white border border-[#333333] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01DF82] focus:border-transparent"
                            required
                        />
                        {/* 자동완성 드롭다운 */}
                        {showDropdown && filteredNames.length > 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-[#1E1E1E] border border-[#333333] rounded-lg max-h-48 overflow-y-auto shadow-lg">
                                {filteredNames.map((name, index) => (
                                    <button
                                        key={name}
                                        type="button"
                                        onClick={() => selectChannelName(name)}
                                        className={`w-full px-4 py-3 text-left text-sm transition-colors ${
                                            index === highlightIndex
                                                ? 'bg-[#01DF82]/20 text-[#01DF82]'
                                                : 'text-white hover:bg-[#2A2A2A]'
                                        }`}
                                    >
                                        {name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 연락처 뒷자리 입력 */}
                    <div>
                        <label
                            htmlFor="phoneLastFour"
                            className="block text-sm font-medium text-white mb-2"
                        >
                            연락처 뒷자리 (4자리)
                        </label>
                        <input
                            id="phoneLastFour"
                            type="text"
                            inputMode="numeric"
                            maxLength={4}
                            placeholder="1234"
                            value={formData.phoneLastFour}
                            onChange={(event) => {
                                const value = event.target.value.replace(/\D/g, '');
                                setFormData({ ...formData, phoneLastFour: value });
                            }}
                            className="w-full h-12 px-4 bg-[#1E1E1E] text-white border border-[#333333] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01DF82] focus:border-transparent"
                            required
                        />
                    </div>

                    {/* 점진적 에러 메시지 영역 */}
                    {error && (
                        <div className="space-y-3">
                            <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
                                <p className="text-red-400 text-sm">{error}</p>
                                {failCount >= 1 && (
                                    <p className="text-red-400/70 text-xs mt-2">
                                        등록된 채널명과 연락처 뒤 4자리로 로그인해주세요.
                                    </p>
                                )}
                            </div>
                            {failCount >= 2 && (
                                <div className="p-4 bg-[#FEE500]/10 border border-[#FEE500]/50 rounded-lg">
                                    <p className="text-[#FEE500] font-bold text-sm mb-1">
                                        여러 번 로그인에 실패했습니다
                                    </p>
                                    <p className="text-[#B0B0B0] text-xs mb-3">
                                        카카오톡으로 문의하시면 빠르게 확인 도와드립니다.
                                    </p>
                                    <a
                                        href={KAKAO_CHANNEL_URL}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center w-full h-10 bg-[#FEE500] text-[#3C1E1E] font-bold rounded-lg hover:bg-[#F5DC00] transition-colors text-sm"
                                    >
                                        카카오톡 채널로 문의하기
                                    </a>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 로그인 버튼 */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-12 bg-[#01DF82] text-black font-bold rounded-lg hover:bg-[#00C972] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? '로그인 중...' : '로그인'}
                    </button>
                </form>

                {/* 하단 안내 메시지 */}
                <div className="mt-6 p-4 bg-[#1E1E1E] border border-[#333333] rounded-lg">
                    <p className="text-sm text-[#B0B0B0] text-center">
                        채널명과 등록된 연락처 뒤 4자리로 로그인합니다.<br />
                        로그인이 안 되시나요?{' '}
                        <a
                            href={KAKAO_CHANNEL_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#01DF82] hover:underline font-bold"
                        >
                            캠핏 크리에이터 카카오톡 채널
                        </a>로 문의해주세요.
                    </p>
                </div>
            </div>
        </div>
    );
}
