'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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

    // 채널명 목록 불러오기
    useEffect(() => {
        fetch('/api/channels')
            .then(res => res.json())
            .then(data => {
                if (data.channelNames) {
                    setChannelNames(data.channelNames);
                }
            })
            .catch(err => console.error('Failed to load channels:', err));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
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
                setLoading(false);
                return;
            }

            // 로그인 성공 - 대시보드로 이동
            router.push('/dashboard');
        } catch (err) {
            setError('로그인 중 오류가 발생했습니다.');
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

                {/* 로그인 폼 */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* 채널명 선택 */}
                    <div>
                        <label
                            htmlFor="channelName"
                            className="block text-sm font-medium text-white mb-2"
                        >
                            크리에이터 채널명
                        </label>
                        <select
                            id="channelName"
                            value={formData.channelName}
                            onChange={(e) => setFormData({ ...formData, channelName: e.target.value })}
                            className="w-full h-12 px-4 bg-[#1E1E1E] text-white border border-[#333333] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01DF82] focus:border-transparent"
                            required
                        >
                            <option value="">채널을 선택하세요</option>
                            {channelNames.map((name) => (
                                <option key={name} value={name}>
                                    {name}
                                </option>
                            ))}
                        </select>
                    </div>

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
                            onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '');
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
                            onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '');
                                setFormData({ ...formData, phoneLastFour: value });
                            }}
                            className="w-full h-12 px-4 bg-[#1E1E1E] text-white border border-[#333333] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01DF82] focus:border-transparent"
                            required
                        />
                    </div>

                    {/* 에러 메시지 */}
                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
                            <p className="text-red-400 text-sm">{error}</p>
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

                {/* 안내 메시지 */}
                <div className="mt-6 p-4 bg-[#1E1E1E] border border-[#333333] rounded-lg">
                    <p className="text-sm text-[#B0B0B0] text-center">
                        등록된 인플루언서만 로그인할 수 있습니다.<br />
                        문의사항은 캠핏 운영팀에 연락주세요.
                    </p>
                </div>
            </div>
        </div>
    );
}
