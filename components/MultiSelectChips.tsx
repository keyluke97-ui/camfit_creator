// MultiSelectChips.tsx - 다중선택 칩(지역/요일/사이트유형 공용)
'use client';

interface MultiSelectChipsProps {
    options: string[];
    selected: string[];
    onChange: (next: string[]) => void;
}

export default function MultiSelectChips({ options, selected, onChange }: MultiSelectChipsProps) {
    function toggle(option: string) {
        if (selected.includes(option)) {
            onChange(selected.filter((value) => value !== option));
        } else {
            onChange([...selected, option]);
        }
    }

    return (
        <div className="flex flex-wrap gap-2">
            {options.map((option) => {
                const active = selected.includes(option);
                return (
                    <button
                        key={option}
                        type="button"
                        onClick={() => toggle(option)}
                        aria-pressed={active}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                            active
                                ? 'bg-brand-bg text-brand-strong border-brand/30 font-medium'
                                : 'bg-card text-ink3 border-line hover:border-brand'
                        }`}
                    >
                        {option}
                    </button>
                );
            })}
        </div>
    );
}
