// ProfileSection.tsx - 포트폴리오 폼의 섹션 하나 (2026-08-25)
// 최초 등록과 이후 수정은 필요한 게 다르다.
//   최초  — 무엇을 채워야 하는지 다 보여야 한다 → 펼친 상태
//   수정  — 고칠 것 하나만 찾으면 된다 → 접힌 상태 + 현재 값 요약
// 폼 전체가 5,000px가 넘어서, 한 항목 고치려고 전부를 스크롤하게 두면 안 된다.
'use client';

import { useState } from 'react';

interface ProfileSectionProps {
    title: string;
    desc?: string;
    /** 접혀 있을 때 보이는 현재 값 한 줄. 비어 있으면 "아직 안 채우셨어요" */
    summary?: string;
    /** 이 섹션에 빠진 필수 항목 수. 0보다 크면 접혀 있어도 뱃지로 알린다 */
    missingCount?: number;
    defaultOpen: boolean;
    children: React.ReactNode;
}

export default function ProfileSection({
    title, desc, summary, missingCount = 0, defaultOpen, children,
}: ProfileSectionProps) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div className="border border-line rounded-xl bg-card overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-subtle transition-colors"
            >
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-ink">{title}</h3>
                        {missingCount > 0 && (
                            <span className="shrink-0 px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 text-xs font-medium">
                                {missingCount}개 필요
                            </span>
                        )}
                    </div>
                    {/* 접혀 있을 땐 현재 값을, 펼쳐 있을 땐 섹션 설명을 보여준다 */}
                    {!open && (
                        <p className="text-xs text-ink3 mt-0.5 truncate">
                            {summary || '아직 안 채우셨어요'}
                        </p>
                    )}
                    {open && desc && <p className="text-xs text-ink3 mt-0.5">{desc}</p>}
                </div>
                <span className={`shrink-0 text-ink3 text-xs transition-transform ${open ? 'rotate-180' : ''}`}>
                    ▼
                </span>
            </button>

            {open && <div className="px-4 pb-4 pt-1 flex flex-col gap-4">{children}</div>}
        </div>
    );
}
