// NotificationToggle.tsx - 캠페인 이메일 알림 토글 (헤더용 아이콘 형태)
// CHANGED: 텍스트 라벨 제거, 벨 아이콘으로 변경 — 헤더에 배치하기 위해 컴팩트화
'use client';

interface NotificationToggleProps {
    enabled: boolean;
    onToggle: (enabled: boolean) => void;
}

export default function NotificationToggle({ enabled, onToggle }: NotificationToggleProps) {
    return (
        <button
            onClick={() => onToggle(!enabled)}
            className={`p-2 transition-colors ${
                enabled ? 'text-[#01DF82]' : 'text-[#666666]'
            } hover:text-white`}
            aria-label={enabled ? '알림 켜짐' : '알림 꺼짐'}
            title={enabled ? '새 캠페인 알림 켜짐' : '새 캠페인 알림 꺼짐'}
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
    );
}
