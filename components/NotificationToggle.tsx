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
        setToast(next ? '새 캠페인 알림이 켜졌습니다' : '새 캠페인 알림이 꺼졌습니다');
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
                {enabled ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
                    </svg>
                ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" opacity="0.4" />
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
