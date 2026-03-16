// app/login/page.tsx - 크리에이터 로그인 페이지 (점진적 에러 안내 UX 포함)
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SearchableSelect from '@/components/SearchableSelect';

const KAKAO_CHANNEL_URL = 'http://pf.kakao.com/_fBxaQG';

export default function LoginPage() {
    const router = useRouter();
    const [channelNames, setChannelNames] = useState<string[]>([]);
    const [formData, setFormData] = useState({
        channelName: '',
        birthDate: '',
        phoneLastFour: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [failCount, setFailCount] = useState(0); // CHANGED: 로그인 실패 횟수 추적 추가

    // 채널명 목록 불러오기
    useEffect(() => {
        fetch('/api/channels')
            .then(response => response.json())
            .then(data => {
                if (data.channelNames) {
                    setChannelNames(data.channelNames);
                }
            })
            .catch(channelLoadError => console.error('Failed to load channels:', channelLoadError));
    }, []);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || '로그인에 실패했습니다.');
                setFailCount(previous => previous + 1); // CHANGED: 실패 시 카운터 증가
                setLoading(false);
                return;
            }

            // 로그인 성공 - 대시보드로 이동
            router.push('/dashboard');
        } catch (submitError) {
            console.error('Login submit error:', submitError);
            setError('로그인 중 오류가 발생했습니다.');
            setFailCount(previous => previous + 1); // CHANGED: 네트워크 에러도 실패 카운트
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
                        인플루언서 전용 프리미엄 협찬 플랫폼
                    </p>
                </div>

                {/* CHANGED: 3회 이상 실패 시 상단 경고 배너 */}
                {failCount >= 3 && (
                    <div className="mb-5 p-5 bg-amber-500/10 border border-amber-500/50 rounded-lg">
                        <p className="text-amber-400 font-bold text-sm mb-2">
                            여러 번 로그인에 실패했습니다
                        </p>
                        <p className="text-amber-300/80 text-sm mb-3">
                            에어테이블 폼으로 재등록하지 마세요!<br />
                            기존 정보가 꼬일 수 있습니다.<br />
                            카카오톡 채널로 문의해주시면 등록 정보를 확인해드립니다.
                        </p>
                        <a
                            href={KAKAO_CHANNEL_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center w-full h-12 bg-[#FEE500] text-[#3C1E1E] font-bold rounded-lg hover:bg-[#F5DC00] transition-colors text-sm"
                        >
                            카카오톡 채널로 문의하기
                        </a>
                    </div>
                )}

                {/* 로그인 폼 */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* 채널명 선택 */}
                    <SearchableSelect
                        label="크리에이터 채널명"
                        options={channelNames}
                        value={formData.channelName}
                        onChange={(value) => setFormData({ ...formData, channelName: value })}
                        placeholder="채널명을 검색하거나 선택하세요"
                    />

                    {/* 생년월일 입력 */}
                    <div>
                        <label
                            htmlFor="birthDate"
                            className="block text-sm font-medium text-white mb-2"
                        >
                            생년월일 (6자리)
                        </label>
                        <input
                            id="birthDate"
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="YYMMDD (예: 240115)"
                            value={formData.birthDate}
                            onChange={(event) => {
                                const value = event.target.value.replace(/\D/g, '');
                                setFormData({ ...formData, birthDate: value });
                            }}
                            className="w-full h-12 px-4 bg-[#1E1E1E] text-white border border-[#333333] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01DF82] focus:border-transparent"
                            required
                        />
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

                    {/* CHANGED: 점진적 에러 메시지 영역 */}
                    {error && (
                        <div className="space-y-3">
                            {/* 기본 에러 메시지 */}
                            <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
                                <p className="text-red-400 text-sm">{error}</p>
                                {/* 1회 이상 실패: 힌트 텍스트 */}
                                {failCount >= 1 && (
                                    <p className="text-red-400/70 text-xs mt-2">
                                        프리미엄 크리에이터 등록 시 입력한 생년월일/연락처로 로그인해주세요.
                                    </p>
                                )}
                            </div>

                            {/* 2회 이상 실패: 카카오톡 안내 박스 */}
                            {failCount >= 2 && (
                                <div className="p-4 bg-[#FEE500]/10 border border-[#FEE500]/50 rounded-lg">
                                    <p className="text-[#FEE500] font-bold text-sm mb-1">
                                        로그인 정보가 기억나지 않으시나요?
                                    </p>
                                    <p className="text-[#B0B0B0] text-xs mb-3">
                                        프리미엄 크리에이터 등록 시 입력한 정보와 다를 수 있습니다.<br />
                                        재등록하시면 안 됩니다! 카카오톡으로 문의하시면 빠르게 확인 도와드립니다.
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

                {/* CHANGED: 하단 안내 메시지 개선 */}
                <div className="mt-6 p-4 bg-[#1E1E1E] border border-[#333333] rounded-lg">
                    <p className="text-sm text-[#B0B0B0] text-center">
                        프리미엄 크리에이터 등록 시 입력한 생년월일과 연락처로 로그인합니다.<br />
                        로그인이 안 되시나요? <span className="text-red-400 font-bold">재등록하지 마시고</span>{' '}
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
