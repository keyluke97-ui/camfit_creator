// page.tsx - 프리미엄 협찬 크리에이터 등록 페이지
'use client';

import { useRouter } from 'next/navigation';
import PremiumRegisterForm from '@/components/PremiumRegisterForm';

export default function PremiumRegisterPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-[#111111] pb-20">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-[#111111]/95 backdrop-blur-sm border-b border-[#333333]">
                <div className="max-w-md mx-auto px-5 py-4 flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="p-1 text-[#888888] hover:text-white transition-colors"
                        aria-label="뒤로가기"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h1 className="text-lg font-bold text-white">프리미엄 협찬 등록</h1>
                </div>
            </header>

            {/* Form */}
            <main className="max-w-md mx-auto px-5 py-6">
                <PremiumRegisterForm />
            </main>
        </div>
    );
}
