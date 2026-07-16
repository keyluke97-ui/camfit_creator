// PublishToggle.tsx - 프로필 공개 주 토글(게이팅) + 자동수락 하위 토글(동의 모달)
// D2: 옵트인 2단 플래그(Airbnb식). 자동수락은 공개의 하위 — 공개 off면 disabled + 강제 off.
'use client';

import { useState } from 'react';

interface PublishToggleProps {
    isPublic: boolean;
    autoAcceptActive: boolean;
    missing: string[];                          // 빈 배열이면 공개 가능
    onChangePublic: (next: boolean) => void;    // 공개/비공개 확정
    onChangeAutoAccept: (next: boolean) => void; // 자동수락 on/off 확정
}

// 온오프 스위치 (공용) — 어두운 스크림 위 아님, 손잡이는 흰색 유지
function Switch({ on, disabled, onClick, label }: {
    on: boolean;
    disabled: boolean;
    onClick: () => void;
    label: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-pressed={on}
            aria-label={label}
            className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 ${
                on ? 'bg-brand' : 'bg-subtle'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
            <span
                className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
                    on ? 'translate-x-6' : 'translate-x-1'
                }`}
            />
        </button>
    );
}

export default function PublishToggle({
    isPublic,
    autoAcceptActive,
    missing,
    onChangePublic,
    onChangeAutoAccept,
}: PublishToggleProps) {
    const [showConsent, setShowConsent] = useState(false);
    const canPublish = missing.length === 0;

    function handlePublicClick() {
        if (isPublic) {
            onChangePublic(false); // 끄기는 자유 (부모가 자동수락도 false 동기화)
            return;
        }
        if (!canPublish) return; // 미완이면 무시(아래 안내 노출)
        onChangePublic(true);
    }

    function handleAutoClick() {
        if (!isPublic) return; // 공개 꺼져 있으면 비활성
        if (autoAcceptActive) {
            onChangeAutoAccept(false); // 끄기는 자유
            return;
        }
        setShowConsent(true); // 켤 땐 동의 모달
    }

    return (
        <div className="space-y-3">
            {/* 주 토글 — 프로필 공개 (가시성) */}
            <div className="flex items-center justify-between bg-card border border-line rounded-xl p-4">
                <div>
                    <p className="text-sm font-bold text-ink">프로필 공개</p>
                    <p className="text-xs text-ink3 mt-0.5">
                        공개하면 캠지기가 내 프로필을 보고 제안할 수 있어요.
                    </p>
                </div>
                <Switch
                    on={isPublic}
                    disabled={!isPublic && !canPublish}
                    onClick={handlePublicClick}
                    label="프로필 공개"
                />
            </div>

            {!isPublic && !canPublish && (
                <div className="bg-subtle border border-line rounded-xl p-4">
                    <p className="text-xs text-ink2 mb-2 font-medium">공개하려면 아래를 먼저 완성해주세요</p>
                    <ul className="flex flex-wrap gap-1.5">
                        {missing.map((item) => (
                            <li
                                key={item}
                                className="px-2 py-1 text-xs bg-card border border-line rounded-full text-ink3"
                            >
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* 하위 토글 — 자동수락 활성 (인스턴트북) */}
            <div
                className={`flex items-center justify-between bg-card border border-line rounded-xl p-4 ${
                    !isPublic ? 'opacity-60' : ''
                }`}
            >
                <div>
                    <p className="text-sm font-bold text-ink">자동수락</p>
                    <p className="text-xs text-ink3 mt-0.5">
                        {isPublic
                            ? '조건에 맞는 캠지기가 선입금하면 개별 승인 없이 자동 확정돼요.'
                            : '프로필을 공개하면 켤 수 있어요.'}
                    </p>
                </div>
                <Switch
                    on={autoAcceptActive}
                    disabled={!isPublic}
                    onClick={handleAutoClick}
                    label="자동수락 활성"
                />
            </div>

            {showConsent && (
                <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
                    <div className="absolute inset-0 bg-black/60" onClick={() => setShowConsent(false)} />
                    <div className="relative w-full max-w-md bg-card rounded-t-2xl sm:rounded-2xl p-6 flex flex-col gap-4">
                        <h2 className="text-base font-bold text-ink">자동수락 켜기 전 확인</h2>
                        <p className="text-sm text-ink2 leading-relaxed">
                            자동수락을 켜면 조건(지역·요일·사이트유형·최소단가)에 맞는 캠지기가{' '}
                            <b className="text-ink">선입금할 때 개별 승인 없이 자동 확정</b>됩니다.
                            원치 않으면 조건을 좁히거나 자동수락을 끄면 됩니다.
                        </p>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setShowConsent(false)}
                                className="flex-1 h-12 bg-subtle text-ink rounded-lg hover:border-strong border border-line transition-colors"
                            >
                                취소
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowConsent(false);
                                    onChangeAutoAccept(true);
                                }}
                                className="flex-1 h-12 bg-brand text-black font-bold rounded-lg hover:bg-brand-hover transition-colors"
                            >
                                동의하고 켜기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
