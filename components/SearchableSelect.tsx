'use client';

import { useState, useEffect, useRef } from 'react';

interface SearchableSelectProps {
    options: string[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    label: string;
}

export default function SearchableSelect({
    options,
    value,
    onChange,
    placeholder = '선택하세요',
    label
}: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    // 필터링된 옵션
    const filteredOptions = options.filter(option =>
        option.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // 외부 클릭 시 닫기
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // 값 변경 시 검색어 초기화
    useEffect(() => {
        if (value) {
            setSearchTerm(value);
        }
    }, [value]);

    return (
        <div className="relative" ref={containerRef}>
            <label className="block text-sm font-medium text-white mb-2">
                {label}
            </label>
            <div className="relative">
                <input
                    type="text"
                    className="w-full h-12 px-4 bg-[#1E1E1E] text-white border border-[#333333] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01DF82] focus:border-transparent placeholder-[#666666]"
                    placeholder={placeholder}
                    value={isOpen ? searchTerm : value || ''}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        if (!isOpen) setIsOpen(true);
                    }}
                    onFocus={() => {
                        setIsOpen(true);
                        setSearchTerm('');
                    }}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg
                        className={`w-5 h-5 text-[#666666] transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-[#1E1E1E] border border-[#333333] rounded-lg shadow-2xl max-h-60 overflow-y-auto overflow-x-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((option) => (
                            <button
                                key={option}
                                type="button"
                                className={`w-full text-left px-4 py-3 text-sm hover:bg-[#2A2A2A] transition-colors ${value === option ? 'text-[#01DF82] bg-[#2A2A2A]' : 'text-white'
                                    }`}
                                onClick={() => {
                                    onChange(option);
                                    setSearchTerm(option);
                                    setIsOpen(false);
                                }}
                            >
                                {option}
                            </button>
                        ))
                    ) : (
                        <div className="px-4 py-3 text-sm text-[#666666] text-center">
                            검색 결과가 없습니다.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
