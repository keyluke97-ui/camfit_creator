// PortfolioEditForm.tsx - 지명형 크리에이터 포트폴리오 편집(4섹션)
// D2/D5 반영: payload에 baseRegion·wonjeongRegions·autoAcceptActive 스레딩,
// 자동수락은 공개의 하위(공개 off→강제 false), 조건 입력에 원정 props 전달.
'use client';

import { useState, useEffect } from 'react';
import type { CreatorProfile, SettlementSummary, CreatorProfileUpdate } from '@/types';
import ProfileImageUploader from './ProfileImageUploader';
import AcceptanceConditionFields from './AcceptanceConditionFields';
import SettlementConfirmCard from './SettlementConfirmCard';
import PublishToggle from './PublishToggle';

function SectionTitle({ title, desc }: { title: string; desc?: string }) {
    return (
        <div className="pt-2">
            <h3 className="text-base font-bold text-ink">{title}</h3>
            {desc && <p className="text-xs text-ink3 mt-1">{desc}</p>}
            <div className="mt-2 h-px bg-subtle" />
        </div>
    );
}

export default function PortfolioEditForm() {
    const [profile, setProfile] = useState<CreatorProfile | null>(null);
    const [settlement, setSettlement] = useState<SettlementSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        (async () => {
            try {
                const response = await fetch('/api/creator/profile');
                const data = await response.json();
                if (response.ok) {
                    setProfile(data.profile);
                    setSettlement(data.profile?.settlement ?? data.settlement ?? null);
                } else {
                    setError(data.error || '프로필을 불러오지 못했습니다.');
                }
            } catch {
                setError('네트워크 오류가 발생했습니다. 새로고침해주세요.');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    function patchProfile(patch: Partial<CreatorProfile>) {
        setProfile((prev) => (prev ? { ...prev, ...patch } : prev));
        setMessage('');
    }

    // 공개 필수 게이팅 (클라이언트 표시용 — 서버가 최종 검증)
    function computeMissing(p: CreatorProfile, s: SettlementSummary | null): string[] {
        const missing: string[] = [];
        if (!p.hasProfileImage) missing.push('프로필 이미지');
        if (!p.representativeLink.trim()) missing.push('대표 콘텐츠 링크');
        if (p.visitRegions.length === 0) missing.push('방문 가능 지역');
        if (p.visitDays.length === 0) missing.push('방문 가능 요일');
        if (p.acceptSiteTypes.length === 0) missing.push('수용 사이트 종류');
        if (!(p.minSponsorAmount > 0)) missing.push('최소 협찬 단가');
        if (!s?.registered) missing.push('정산 정보');
        return missing;
    }

    // 저장 — overrides 없으면 현재 플래그 유지. 자동수락은 공개의 하위(공개 off면 강제 false).
    async function save(overrides?: { isPublic?: boolean; autoAcceptActive?: boolean }) {
        if (!profile) return;
        const nextIsPublic = overrides?.isPublic ?? profile.isPublic;
        const nextAutoAccept = nextIsPublic
            ? overrides?.autoAcceptActive ?? profile.autoAcceptActive
            : false;

        setSaving(true);
        setError('');
        setMessage('');
        const payload: CreatorProfileUpdate = {
            representativeLink: profile.representativeLink,
            minSponsorAmount: profile.minSponsorAmount,
            visitRegions: profile.visitRegions,
            visitDays: profile.visitDays,
            acceptSiteTypes: profile.acceptSiteTypes,
            baseRegion: profile.baseRegion,
            wonjeongRegions: profile.wonjeongRegions,
            isPublic: nextIsPublic,
            autoAcceptActive: nextAutoAccept,
        };
        try {
            const response = await fetch('/api/creator/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (!response.ok) {
                setError(data.error || '저장에 실패했습니다.');
                return;
            }
            patchProfile({ isPublic: nextIsPublic, autoAcceptActive: nextAutoAccept });
            if (overrides?.isPublic === true) setMessage('공개되었습니다.');
            else if (overrides?.isPublic === false) setMessage('비공개로 전환되었습니다.');
            else if (overrides?.autoAcceptActive === true) setMessage('자동수락이 켜졌습니다.');
            else if (overrides?.autoAcceptActive === false) setMessage('자동수락이 꺼졌습니다.');
            else setMessage('저장되었습니다.');
        } catch {
            setError('네트워크 오류가 발생했습니다.');
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }
    if (!profile) {
        return <p className="text-center text-ink3 py-20">{error || '프로필을 불러오지 못했습니다.'}</p>;
    }

    const missing = computeMissing(profile, settlement);

    return (
        <div className="space-y-6">
            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                    <p className="text-red-500 text-sm text-center font-medium">{error}</p>
                </div>
            )}
            {message && (
                <div className="bg-brand-bg border border-brand/30 rounded-xl p-3">
                    <p className="text-brand-strong text-sm text-center font-medium">{message}</p>
                </div>
            )}

            {/* 섹션 1 — 포트폴리오 */}
            <SectionTitle title="포트폴리오" desc="캠지기가 보는 내 소개" />
            <ProfileImageUploader
                imageUrl={profile.profileImageUrl}
                onUploaded={(url) => patchProfile({ profileImageUrl: url, hasProfileImage: !!url })}
            />
            <div className="text-center">
                <p className="text-sm font-bold text-ink">{profile.channelName}</p>
                <p className="text-xs text-ink3 mt-0.5">
                    {'⭐'.repeat(Number(profile.tier) || 0)} · {profile.followerRange || '구독자 미기재'}
                </p>
            </div>
            <div>
                <label className="block text-sm font-medium text-ink mb-2">대표 콘텐츠 링크</label>
                <input
                    type="url"
                    value={profile.representativeLink}
                    onChange={(event) => patchProfile({ representativeLink: event.target.value })}
                    placeholder="https://..."
                    className="w-full h-12 px-4 bg-card border border-line rounded-lg text-ink text-sm focus:border-brand focus:outline-none transition-colors placeholder:text-ink3"
                />
            </div>

            {/* 섹션 2 — 협찬 수락 조건 (지역 2단 + 원정) */}
            <SectionTitle title="협찬 수락 조건" desc="이 조건에 맞는 제안만 받아요" />
            <AcceptanceConditionFields
                baseRegion={profile.baseRegion}
                baseRegionPrefill={settlement?.baseRegionPrefill || ''}
                visitRegions={profile.visitRegions}
                wonjeongRegions={profile.wonjeongRegions}
                visitDays={profile.visitDays}
                acceptSiteTypes={profile.acceptSiteTypes}
                minSponsorAmount={profile.minSponsorAmount}
                onChange={patchProfile}
            />

            {/* 섹션 3 — 정산 정보 */}
            <SectionTitle title="정산 정보" desc="협찬비를 받을 계좌" />
            {settlement && <SettlementConfirmCard settlement={settlement} />}

            {/* 저장 (공개 상태 변경 없이 조건만 저장) */}
            <button
                type="button"
                onClick={() => save()}
                disabled={saving}
                className="w-full h-12 bg-subtle text-ink font-bold rounded-lg hover:border-strong border border-line transition-colors disabled:opacity-60"
            >
                {saving ? '저장 중...' : '저장'}
            </button>

            {/* 섹션 4 — 공개 (2단 토글) */}
            <SectionTitle title="공개" />
            <PublishToggle
                isPublic={profile.isPublic}
                autoAcceptActive={profile.autoAcceptActive}
                missing={missing}
                onChangePublic={(next) => save({ isPublic: next })}
                onChangeAutoAccept={(next) => save({ autoAcceptActive: next })}
            />
        </div>
    );
}
