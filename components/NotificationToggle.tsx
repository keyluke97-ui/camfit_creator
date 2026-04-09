// NotificationToggle.tsx - 캠페인 이메일 알림 토글 (헤더용 아이콘 + 토스트 피드백)
// CHANGED: 토글 시 토스트 메시지로 유저에게 결과 인지 제공
'use client';

import { useState } from 'react';

interface NotificationToggleProps {
    enabled: boolean;
    onToggle: (enabled: boolean) => void;
}

export default function NotificationToggle({ enabled, onToggle }: NotificationToggleProps) {
    const [toast, setToast] = useState<string | null>(null);

    const handleClick = () => {
        const next = !enabled;
        onToggle(next);
        setToast(next ? '새 캠페인 이메일 알림 ON' : '새 캠페인 이메일 알림 OFF');
        setTimeout(() => setToast(null), 2000);
    };

    return (
        <div className="relative">
            <button
                onClick={handleClick}
                className={`p-2 transition-colors ${
                    enabled ? 'text-[#01DF82]' : 'text-[#666666]'
                } hover:text-white`}
                aria-label={enabled ? '알림 켜짐' : '알림 꺼짐'}
            >
                {/* CHANGED: 벨 → 이메일 아이콘으로 변경 — 이메일 알림임을 직관적으로 표현 */}
                {enabled ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0l-9.75 6.5-9.75-6.5" />
                    </svg>
                ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" strokeWidth={2}>
                        <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0l-9.75 6.5-9.75-6.5" opacity="0.4" />
                        <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                )}
            </button>

            {/* 토스트 메시지 */}
            {toast && (
                <div className="absolute top-full right-0 mt-2 px-3 py-1.5 bg-[#1E1E1E] border border-[#333333] rounded-lg shadow-lg whitespace-nowrap z-50 animate-in fade-in duration-200">
                    <p className="text-xs text-white">{toast}</p>
                </div>
            )}
        </div>
    );
}
