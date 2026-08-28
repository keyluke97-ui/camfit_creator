// page.tsx - 지명형 크리에이터 포트폴리오 편집 페이지
'use client';

import { useRouter } from 'next/navigation';
import PortfolioEditForm from '@/components/PortfolioEditForm';

export default function PortfolioPage() {
    const router = useRouter();
    return (
        <div className="min-h-screen bg-page pb-20">
            <header className="sticky top-0 z-10 bg-page/95 backdrop-blur-sm border-b border-line">
                <div className="max-w-md mx-auto px-5 py-4 flex items-center gap-3">
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="p-2 -ml-2 text-ink3 hover:text-ink transition-colors"
                        aria-label="대시보드로 돌아가기"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h1 className="text-lg font-bold text-ink">내 협찬 프로필</h1>
                </div>
            </header>
            <main className="max-w-md mx-auto px-5 py-6">
                <PortfolioEditForm />
            </main>
        </div>
    );
}
