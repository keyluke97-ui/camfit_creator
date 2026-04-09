// LocationFilter.tsx - 위치 기반 가로 스크롤 필터 칩 컴포넌트
// CHANGED: 캠페인 위치 필터 컴포넌트 신규 생성
'use client';

interface LocationFilterProps {
    locations: string[];
    selectedLocation: string;
    onLocationChange: (location: string) => void;
}

export default function LocationFilter({ locations, selectedLocation, onLocationChange }: LocationFilterProps) {
    return (
        // CHANGED: 스크롤바 완전 숨김 — style로 직접 적용
        <div className="overflow-x-auto flex gap-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
            {/* 전체 버튼 */}
            <button
                onClick={() => onLocationChange('전체')}
                className={`px-3 py-1.5 text-xs rounded-full whitespace-nowrap cursor-pointer transition-colors ${
                    selectedLocation === '전체'
                        ? 'bg-[#01DF82] text-black font-medium'
                        : 'bg-[#2A2A2A] text-[#888888] border border-[#333333]'
                }`}
            >
                전체
            </button>
            {/* 위치 칩 */}
            {locations.map((location) => (
                <button
                    key={location}
                    onClick={() => onLocationChange(location)}
                    className={`px-3 py-1.5 text-xs rounded-full whitespace-nowrap cursor-pointer transition-colors ${
                        selectedLocation === location
                            ? 'bg-[#01DF82] text-black font-medium'
                            : 'bg-[#2A2A2A] text-[#888888] border border-[#333333]'
                    }`}
                >
                    {location}
                </button>
            ))}
        </div>
    );
}
