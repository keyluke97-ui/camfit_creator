// PortfolioEditForm.tsx - 지명형 크리에이터 포트폴리오 편집(6섹션)
// CHANGED: 1a-v2 — 채널 포트폴리오·콘텐츠 형식 섹션 추가, 완성도 바 도입,
//          공개는 2단 토글(PublishToggle) 대신 제안 흐름 고지 카드(PublishRequestCard)로 교체.
//          자동수락 토글 폐지(D1) — 무응답 자동확정이 이미 전원 기본값이라 토글이 사실과 반대로 읽힌다.
'use client';

import { useState, useEffect } from 'react';
import type { CreatorProfile, SettlementSummary, CreatorProfileUpdate } from '@/types';
import { collectMissingForPublish, computeCompletion, pruneContentFormats } from '@/lib/creatorProfileRules';
import ProfileImageUploader from './ProfileImageUploader';
import ChannelSelector from './ChannelSelector';
import ChannelDetailTabs from './ChannelDetailTabs';
import ChannelConceptField from './ChannelConceptField';
import ContentFormatFields from './ContentFormatFields';
import AcceptanceConditionFields from './AcceptanceConditionFields';
import SettlementConfirmCard from './SettlementConfirmCard';
import ProfileCompletionBar from './ProfileCompletionBar';
import PublishRequestCard from './PublishRequestCard';

function SectionTitle({ title, desc }: { title: string; desc?: string }) {
    return (
        <div className="pt-2">
            <h3 className="text-base font-bold text-ink">{title}</h3>
            {desc && <p className="text-xs text-ink3 mt-1">{desc}</p>}
            <div className="mt-2 h-px bg-subtle" />
        </div>
    );
}

/** CreatorProfile → 서버로 보낼 payload. save()와 완성도·누락 계산이 같은 값을 쓰도록 한 곳에 모은다 */
function buildPayload(profile: CreatorProfile, isPublicOverride?: boolean): CreatorProfileUpdate {
    return {
        representativeLink: profile.representativeLink,
        minSponsorAmount: profile.minSponsorAmount,
        visitRegions: profile.visitRegions,
        visitDays: profile.visitDays,
        acceptSiteTypes: profile.acceptSiteTypes,
        baseRegion: profile.baseRegion,
        wonjeongRegions: profile.wonjeongRegions,
        isPublic: isPublicOverride ?? profile.isPublic,
        // CHANGED: 1a-v2 — 채널 포트폴리오·콘텐츠
        channelTypes: profile.channelTypes,
        representativeChannel: profile.representativeChannel,
        channels: profile.channels,
        representativeLink2: profile.representativeLink2,
        representativeLink3: profile.representativeLink3,
        contentFormats: profile.contentFormats,
        contentStandard: profile.contentStandard,
        creatorEmail: profile.creatorEmail,
        // CHANGED: 2026-08-12 협찬 조건 표준화 — 입력 UI는 Task 10~13에서 붙인다
        uploadDeadlineDays: profile.uploadDeadlineDays,
        companions: profile.companions,
        petAllowed: profile.petAllowed,
        droneUsed: profile.droneUsed,
        channelConcepts: profile.channelConcepts,
    };
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

    /** 채널 선택 변경. 해제된 채널의 콘텐츠 형식을 함께 걷어낸다(규칙은 creatorProfileRules 공유). */
    function handleChannelChange(patch: { channelTypes?: string[]; representativeChannel?: string }) {
        if (!patch.channelTypes) {
            patchProfile(patch);
            return;
        }
        const nextTypes = patch.channelTypes;
        setProfile((prev) =>
            prev
                ? { ...prev, ...patch, contentFormats: pruneContentFormats(nextTypes, prev.contentFormats) }
                : prev
        );
        setMessage('');
    }

    // CHANGED: 1a-v2 — 자동수락 폐지(D1). overrides는 공개 여부만 받는다.
    async function save(overrides?: { isPublic?: boolean }) {
        if (!profile) return;
        const nextIsPublic = overrides?.isPublic ?? profile.isPublic;

        setSaving(true);
        setError('');
        setMessage('');
        try {
            const response = await fetch('/api/creator/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(buildPayload(profile, nextIsPublic))
            });
            const data = await response.json();
            if (!response.ok) {
                setError(data.error || '저장에 실패했습니다.');
                return;
            }
            patchProfile({ isPublic: nextIsPublic });
            if (overrides?.isPublic === true) setMessage('공개를 신청했습니다. 캠핏 확인 후 캠지기에게 보입니다.');
            else if (overrides?.isPublic === false) setMessage('공개를 중지했습니다.');
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

    // CHANGED: 1a-v2 — 로컬 computeMissing 삭제. 서버(updateCreatorProfile)와 같은 함수를 쓴다.
    const payloadForCheck = buildPayload(profile);
    const hasPremium = !!settlement?.registered;
    const missing = collectMissingForPublish(payloadForCheck, profile.hasProfileImage, hasPremium);
    // CHANGED: 2026-08-12 — 운영자 `채널콘셉트`가 있으면 캠지기 카드가 이미 채워지므로 완성으로 센다
    const { percent, nextHint } = computeCompletion(
        payloadForCheck,
        profile.hasProfileImage,
        hasPremium,
        profile.channelConceptsFallback.length > 0
    );

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

            <ProfileCompletionBar percent={percent} nextHint={nextHint} />

            {/* ① 기본 */}
            <SectionTitle title="포트폴리오" desc="캠지기가 보는 내 소개" />
            <ProfileImageUploader
                imageUrl={profile.profileImageUrl}
                onUploaded={(url) => {
                    patchProfile({ profileImageUrl: url, hasProfileImage: !!url });
                    // 이미지는 업로드 API가 이미 첨부로 저장했다. 여기서 save()를 태우는 건
                    // 이미지를 올리다 만 나머지 입력이 유실되지 않게 함께 커밋하려는 것.
                    // ⚠️ 이미지 교체는 현재 재검토(needsReReview) 판정 대상이 아니다 — 스펙 §4.2 참고.
                    void save();
                }}
            />
            <div className="text-center">
                <p className="text-sm font-bold text-ink">{profile.channelName}</p>
                <p className="text-xs text-ink3 mt-0.5">
                    {'⭐'.repeat(Number(profile.tier) || 0)} · {profile.followerRange || '구독자 미기재'}
                </p>
            </div>
            <div>
                <label className="block text-sm font-medium text-ink mb-2">
                    이메일 <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-ink3 mb-2">제안서를 이 주소로 보내드려요.</p>
                <input
                    type="email"
                    value={profile.creatorEmail}
                    onChange={(event) => patchProfile({ creatorEmail: event.target.value })}
                    placeholder="name@example.com"
                    className="w-full h-12 px-4 bg-card border border-line rounded-lg text-ink text-sm focus:border-brand focus:outline-none transition-colors placeholder:text-ink3"
                />
            </div>
            <div className="flex flex-col gap-3">
                <div>
                    <label className="block text-sm font-medium text-ink mb-2">
                        대표 콘텐츠 링크 <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="url"
                        value={profile.representativeLink}
                        onChange={(event) => patchProfile({ representativeLink: event.target.value })}
                        placeholder="https://..."
                        className="w-full h-12 px-4 bg-card border border-line rounded-lg text-ink text-sm focus:border-brand focus:outline-none transition-colors placeholder:text-ink3"
                    />
                </div>
                <input
                    type="url"
                    value={profile.representativeLink2}
                    onChange={(event) => patchProfile({ representativeLink2: event.target.value })}
                    placeholder="대표 콘텐츠 링크 2 (선택)"
                    className="w-full h-12 px-4 bg-card border border-line rounded-lg text-ink text-sm focus:border-brand focus:outline-none transition-colors placeholder:text-ink3"
                />
                <input
                    type="url"
                    value={profile.representativeLink3}
                    onChange={(event) => patchProfile({ representativeLink3: event.target.value })}
                    placeholder="대표 콘텐츠 링크 3 (선택)"
                    className="w-full h-12 px-4 bg-card border border-line rounded-lg text-ink text-sm focus:border-brand focus:outline-none transition-colors placeholder:text-ink3"
                />
                <p className="text-xs text-ink3">
                    링크를 더 걸어두시면 캠지기가 판단하기 쉬워 제안을 더 받으실 수 있어요.
                </p>
            </div>

            {/* ② 내 채널 */}
            <SectionTitle title="내 채널" desc="운영 중인 채널과 규모" />
            <ChannelSelector
                channelTypes={profile.channelTypes}
                representativeChannel={profile.representativeChannel}
                onChange={handleChannelChange}
            />
            <ChannelDetailTabs
                channelTypes={profile.channelTypes}
                channels={profile.channels}
                onChange={(channels) => patchProfile({ channels })}
            />

            <ChannelConceptField
                concepts={profile.channelConcepts}
                fallbackConcepts={profile.channelConceptsFallback}
                onChange={(channelConcepts) => patchProfile({ channelConcepts })}
            />

            {/* ③ 만들어 드리는 콘텐츠 */}
            <SectionTitle title="만들어 드리는 콘텐츠" desc="캠지기가 받게 되는 것" />
            <ContentFormatFields
                channelTypes={profile.channelTypes}
                contentFormats={profile.contentFormats}
                contentStandard={profile.contentStandard}
                uploadDeadlineDays={profile.uploadDeadlineDays}
                onChange={patchProfile}
            />

            {/* ④ 협찬 수락 조건 (지역 2단 + 원정) */}
            <SectionTitle title="협찬 수락 조건" desc="이 조건에 맞는 제안만 받아요" />
            <AcceptanceConditionFields
                baseRegion={profile.baseRegion}
                baseRegionPrefill={settlement?.baseRegionPrefill || ''}
                visitRegions={profile.visitRegions}
                wonjeongRegions={profile.wonjeongRegions}
                visitDays={profile.visitDays}
                acceptSiteTypes={profile.acceptSiteTypes}
                minSponsorAmount={profile.minSponsorAmount}
                companions={profile.companions}
                petAllowed={profile.petAllowed}
                droneUsed={profile.droneUsed}
                onChange={patchProfile}
            />

            {/* ⑤ 정산 정보 */}
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

            {/* ⑥ 공개 */}
            <SectionTitle title="공개" />
            <PublishRequestCard
                isPublic={profile.isPublic}
                reviewStatus={profile.reviewStatus}
                reviewRejectReason={profile.reviewRejectReason}
                missing={missing}
                saving={saving}
                onChangePublic={(next) => save({ isPublic: next })}
            />
        </div>
    );
}
