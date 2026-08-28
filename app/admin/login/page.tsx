'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (isLoading) return;
        setError('');
        setIsLoading(true);
        try {
            const response = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });
            const data = await response.json();
            if (!response.ok) {
                setError(data.error || '로그인에 실패했습니다.');
                return;
            }
            router.push('/admin');
        } catch {
            setError('로그인 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-page flex items-center justify-center px-4">
            <div className="w-full max-w-md bg-card border border-line rounded-2xl p-8">
                <h1 className="text-xl font-bold text-ink">캠핏 협찬 관리자</h1>
                <p className="text-sm text-ink2 mt-1">내부 운영자 전용 페이지입니다.</p>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    <input
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="관리자 비밀번호"
                        autoFocus
                        className="w-full bg-subtle border border-line rounded-lg px-4 py-3 text-ink placeholder:text-ink3 focus:outline-none focus:border-brand"
                    />
                    {error && <p className="text-sm text-red-500">{error}</p>}
                    <button
                        type="submit"
                        disabled={isLoading || password.length === 0}
                        className="w-full bg-brand text-black font-bold rounded-lg py-3 hover:bg-brand-hover transition-colors disabled:opacity-50"
                    >
                        {isLoading ? '확인 중…' : '들어가기'}
                    </button>
                </form>
            </div>
        </main>
    );
}
