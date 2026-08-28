'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AdminOverview, AdminCampaignHealth, AdminExtendResult } from '@/types';

// 내부 관리자 어드민
// 조회 + 기한 연장 액션(미리보기 → 적용 → 검증). 실물 쿠폰 재발급은 웹에서 하지 않는다(SOP Step 5).
// 관리자용 데스크톱 화면이라 모바일 max-w-md 규칙 대신 max-w-5xl을 쓴다.

const STATUS_META: Record<AdminCampaignHealth['status'], { label: string; badge: string }> = {
    dead: { label: '기한 지남', badge: 'bg-red-500 text-white' },
    dying: { label: '임박', badge: 'bg-amber-400 text-black' },
    healthy: { label: '정상', badge: 'bg-brand-bg text-brand-strong border border-brand/30' },
};

function formatDaysLeft(daysLeft: number): string {
    if (daysLeft < 0) return `D+${-daysLeft}`;
    if (daysLeft === 0) return 'D-day';
    return `D-${daysLeft}`;
}

/** 기본 목표일 제안: 오늘 + 60일 (크리에이터 일정 선점 1달 + 모집 여유 1달) */
function defaultTargetDate(): string {
    return new Date(Date.now() + 9 * 3600000 + 60 * 86400000).toISOString().slice(0, 10);
}

export default function AdminPage() {
    const router = useRouter();
    const [overview, setOverview] = useState<AdminOverview | null>(null);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [extendTarget, setExtendTarget] = useState<AdminCampaignHealth | null>(null);

    const load = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const response = await fetch('/api/admin/overview', { cache: 'no-store' });
            if (response.status === 401 || response.status === 403) {
                router.push('/admin/login');
                return;
            }
            const data = await response.json();
            if (!response.ok) {
                setError(data.error || '현황을 불러오지 못했습니다.');
                return;
            }
            setOverview(data.overview);
        } catch {
            setError('현황을 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        } finally {
            setIsLoading(false);
        }
    }, [router]);

    useEffect(() => {
        load();
    }, [load]);

    return (
        <main className="min-h-screen bg-page px-4 py-8">
            <div className="max-w-5xl mx-auto space-y-6">
                <header className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-ink">프리미엄 협찬 운영 현황</h1>
                        <p className="text-sm text-ink3 mt-1">
                            기한 연장은 버튼으로 · 쿠폰 재발급은 SOP 절차로
                            {overview && ` · 기준 ${new Date(overview.generatedAt).toLocaleString('ko-KR')}`}
                        </p>
                    </div>
                    <button
                        onClick={load}
                        disabled={isLoading}
                        className="bg-subtle text-ink text-sm font-bold rounded-lg px-4 py-2 border border-line hover:border-strong transition-colors disabled:opacity-50"
                    >
                        {isLoading ? '불러오는 중…' : '새로고침'}
                    </button>
                </header>

                {error && (
                    <div className="bg-card border border-red-300 rounded-lg p-4 text-sm text-red-600">{error}</div>
                )}

                {isLoading && !overview && (
                    <div className="bg-card border border-line rounded-lg p-8 text-center text-ink3">불러오는 중…</div>
                )}

                {overview && (
                    <>
                        {/* 요약 */}
                        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                            <SummaryCard label="노출 중 캠페인" value={overview.summary.exposed} sub={`마감 ${overview.summary.closed} · 모집중 ${overview.summary.open}`} />
                            <SummaryCard
                                label="기한 문제"
                                value={overview.summary.dead + overview.summary.dying}
                                sub={`지남 ${overview.summary.dead} · 임박 ${overview.summary.dying}`}
                                tone={overview.summary.dead + overview.summary.dying > 0 ? 'danger' : 'ok'}
                            />
                            <SummaryCard
                                label="신청 유입 (7일)"
                                value={overview.summary.applicationsLast7Days}
                                sub={`최근 30일 ${overview.summary.applicationsLast30Days}건`}
                            />
                            <SummaryCard
                                label="미업로드 독촉 대상"
                                value={overview.summary.overdueUploads}
                                sub={`퇴실 +${overview.graceDays}일 경과`}
                                tone={overview.summary.overdueUploads > 0 ? 'warn' : 'ok'}
                            />
                            <SummaryCard
                                label="쿠폰 정합성 문제"
                                value={overview.summary.couponIssues}
                                sub="풀/대표코드 점검"
                                tone={overview.summary.couponIssues > 0 ? 'danger' : 'ok'}
                            />
                        </section>

                        {/* 캠페인 헬스 */}
                        <section className="bg-card border border-line rounded-lg overflow-hidden">
                            <div className="px-4 py-3 border-b border-line flex items-center justify-between">
                                <h2 className="font-bold text-ink">🏕 캠페인 기한 헬스 (모집중 {overview.campaigns.length}건)</h2>
                                <span className="text-xs text-ink3">임박 기준 D-{overview.leadDays} (크리에이터 일정 선점 가정)</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-ink3 border-b border-line">
                                            <th className="px-4 py-2 font-medium">상태</th>
                                            <th className="px-4 py-2 font-medium">캠핑장</th>
                                            <th className="px-4 py-2 font-medium">제작기한</th>
                                            <th className="px-4 py-2 font-medium">잔여/모집</th>
                                            <th className="px-4 py-2 font-medium">신청</th>
                                            <th className="px-4 py-2 font-medium">개월(기본+연장)</th>
                                            <th className="px-4 py-2 font-medium">비고</th>
                                            <th className="px-4 py-2 font-medium">액션</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {overview.campaigns.map((campaign) => (
                                            <tr key={campaign.id} className="border-b border-line last:border-b-0">
                                                <td className="px-4 py-2 whitespace-nowrap">
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_META[campaign.status].badge}`}>
                                                        {STATUS_META[campaign.status].label} {formatDaysLeft(campaign.daysLeft)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2 text-ink">
                                                    <a href={campaign.airtableUrl} target="_blank" rel="noopener noreferrer" className="hover:text-brand-strong underline decoration-line underline-offset-2">
                                                        {campaign.name}
                                                    </a>
                                                </td>
                                                <td className="px-4 py-2 text-ink2 whitespace-nowrap">{campaign.deadline}</td>
                                                <td className="px-4 py-2 text-ink2 whitespace-nowrap">{campaign.totalAvailable} / {campaign.totalRecruit}</td>
                                                <td className="px-4 py-2 text-ink2">{campaign.applications}</td>
                                                <td className="px-4 py-2 text-ink2 whitespace-nowrap">{campaign.baseMonths}+{campaign.extensionMonths}</td>
                                                <td className="px-4 py-2 text-ink3 text-xs">
                                                    {[
                                                        campaign.couponEvent && '🎟️쿠폰이벤트',
                                                        campaign.visitEndDate && `방문종료 ${campaign.visitEndDate}`,
                                                        campaign.refundRequested && '⚠️환불접수',
                                                        campaign.applications === 0 && campaign.status !== 'healthy' && '신청 0명(연장무익 후보)',
                                                    ].filter(Boolean).join(' · ')}
                                                </td>
                                                <td className="px-4 py-2 whitespace-nowrap">
                                                    <button
                                                        onClick={() => setExtendTarget(campaign)}
                                                        className={`text-xs font-bold rounded-lg px-3 py-1.5 transition-colors ${
                                                            campaign.status === 'healthy'
                                                                ? 'bg-subtle text-ink2 border border-line hover:border-strong'
                                                                : 'bg-brand text-black hover:bg-brand-hover'
                                                        }`}
                                                    >
                                                        기한 연장
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        {/* 최근 신청 유입 */}
                        <section className="bg-card border border-line rounded-lg overflow-hidden">
                            <div className="px-4 py-3 border-b border-line">
                                <h2 className="font-bold text-ink">📥 최근 신청 유입 (30일 {overview.summary.applicationsLast30Days}건 · 최신 20건 표시)</h2>
                            </div>
                            {overview.recentApplications.length === 0 ? (
                                <p className="px-4 py-6 text-center text-ink3 text-sm">최근 30일 신청 없음</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-left text-ink3 border-b border-line">
                                                <th className="px-4 py-2 font-medium">신청일</th>
                                                <th className="px-4 py-2 font-medium">크리에이터</th>
                                                <th className="px-4 py-2 font-medium">캠핑장</th>
                                                <th className="px-4 py-2 font-medium">입실일</th>
                                                <th className="px-4 py-2 font-medium">상태</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {overview.recentApplications.map((application) => (
                                                <tr key={application.id} className="border-b border-line last:border-b-0">
                                                    <td className="px-4 py-2 text-ink2 whitespace-nowrap">{new Date(application.appliedAt).toLocaleDateString('ko-KR')}</td>
                                                    <td className="px-4 py-2 text-ink">{application.channel}</td>
                                                    <td className="px-4 py-2 text-ink2">{application.camp}</td>
                                                    <td className="px-4 py-2 text-ink2 whitespace-nowrap">{application.checkin || '-'}</td>
                                                    <td className="px-4 py-2 whitespace-nowrap">
                                                        {application.status === '취소'
                                                            ? <span className="text-xs font-bold text-red-500">취소</span>
                                                            : <span className="text-xs text-ink2">{application.status || '정상'}</span>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>

                        {/* 미업로드 독촉 */}
                        <section className="bg-card border border-line rounded-lg overflow-hidden">
                            <div className="px-4 py-3 border-b border-line">
                                <h2 className="font-bold text-ink">📝 콘텐츠 미업로드 독촉 대상 ({overview.overdue.length}건)</h2>
                                <p className="text-xs text-ink3 mt-0.5">퇴실(입실+1박 가정) 후 {overview.graceDays}일 경과 · 2박 이상 건은 하루 이상 빨리 잡힐 수 있음</p>
                            </div>
                            {overview.overdue.length === 0 ? (
                                <p className="px-4 py-6 text-center text-ink3 text-sm">대상 없음 ✅</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-left text-ink3 border-b border-line">
                                                <th className="px-4 py-2 font-medium">경과</th>
                                                <th className="px-4 py-2 font-medium">크리에이터</th>
                                                <th className="px-4 py-2 font-medium">캠핑장</th>
                                                <th className="px-4 py-2 font-medium">입실일</th>
                                                <th className="px-4 py-2 font-medium">제작기한</th>
                                                <th className="px-4 py-2 font-medium">연락처</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {overview.overdue.map((item) => (
                                                <tr key={`${item.channel}-${item.camp}-${item.checkin}`} className="border-b border-line last:border-b-0">
                                                    <td className="px-4 py-2 font-bold text-ink whitespace-nowrap">D+{item.daysOver}</td>
                                                    <td className="px-4 py-2 text-ink">
                                                        {item.channel}
                                                        {item.noCreatorLink && <span className="text-xs text-amber-600 ml-1">⚠️링크없음</span>}
                                                    </td>
                                                    <td className="px-4 py-2 text-ink2">{item.camp}</td>
                                                    <td className="px-4 py-2 text-ink2 whitespace-nowrap">{item.checkin}</td>
                                                    <td className="px-4 py-2 text-ink2 whitespace-nowrap">
                                                        {item.deadline || '-'}
                                                        {item.deadlinePassed && <span className="text-xs text-red-500 ml-1">지남</span>}
                                                    </td>
                                                    <td className="px-4 py-2 text-ink2 whitespace-nowrap">{item.phone || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>

                        {/* 쿠폰 정합성 */}
                        <section className="bg-card border border-line rounded-lg overflow-hidden">
                            <div className="px-4 py-3 border-b border-line">
                                <h2 className="font-bold text-ink">🎟 쿠폰 정합성 문제 ({overview.couponIssues.length}건)</h2>
                                <p className="text-xs text-ink3 mt-0.5">쿠폰이벤트 캠페인 중 신청 가능한데 풀/대표코드가 깨진 건 — 방치 시 신청이 에러로 막힘</p>
                            </div>
                            {overview.couponIssues.length === 0 ? (
                                <p className="px-4 py-6 text-center text-ink3 text-sm">문제 없음 ✅</p>
                            ) : (
                                <ul className="divide-y divide-line">
                                    {overview.couponIssues.map((issue) => (
                                        <li key={issue.campaignId} className="px-4 py-3 text-sm">
                                            <a href={issue.airtableUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-ink hover:text-brand-strong underline decoration-line underline-offset-2">
                                                {issue.name}
                                            </a>
                                            <span className="text-red-600 ml-2">{issue.issue}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    </>
                )}
            </div>

            {extendTarget && (
                <ExtendModal
                    campaign={extendTarget}
                    onClose={() => setExtendTarget(null)}
                    onApplied={() => { setExtendTarget(null); load(); }}
                />
            )}
        </main>
    );
}

interface SummaryCardProps {
    label: string;
    value: number;
    sub?: string;
    tone?: 'ok' | 'warn' | 'danger';
}

function SummaryCard({ label, value, sub, tone }: SummaryCardProps) {
    const valueColor =
        tone === 'danger' && value > 0 ? 'text-red-500'
        : tone === 'warn' && value > 0 ? 'text-amber-500'
        : 'text-ink';
    return (
        <div className="bg-card border border-line rounded-lg p-4">
            <p className="text-xs text-ink3">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${valueColor}`}>{value}</p>
            {sub && <p className="text-xs text-ink3 mt-1">{sub}</p>}
        </div>
    );
}

interface ExtendModalProps {
    campaign: AdminCampaignHealth;
    onClose: () => void;
    onApplied: () => void;
}

// 기한 연장 모달 — 목표일 입력 → 미리보기(가드 포함) → 적용 → 검증 결과.
// 개월 단위 수식이라 "목표일 이상이 되는 최소 개월"이 적용됨을 미리보기에서 보여준다.
function ExtendModal({ campaign, onClose, onApplied }: ExtendModalProps) {
    const [targetDate, setTargetDate] = useState(defaultTargetDate());
    const [preview, setPreview] = useState<AdminExtendResult | null>(null);
    const [result, setResult] = useState<AdminExtendResult | null>(null);
    const [error, setError] = useState('');
    const [isBusy, setIsBusy] = useState(false);

    const call = async (apply: boolean) => {
        setIsBusy(true);
        setError('');
        try {
            const response = await fetch('/api/admin/extend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ campaignId: campaign.id, targetDate, apply })
            });
            const data = await response.json();
            if (!response.ok) {
                setError(data.error || '처리에 실패했습니다.');
                return;
            }
            if (apply) setResult(data.result);
            else setPreview(data.result);
        } catch {
            setError('처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        } finally {
            setIsBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div className="w-full max-w-lg bg-card rounded-2xl p-6 space-y-4" onClick={(event) => event.stopPropagation()}>
                <div>
                    <h3 className="text-lg font-bold text-ink">기한 연장 — {campaign.name}</h3>
                    <p className="text-sm text-ink2 mt-1">현재 제작기한 {campaign.deadline} ({formatDaysLeft(campaign.daysLeft)})</p>
                </div>

                {!result && (
                    <>
                        <div className="flex items-center gap-3">
                            <label className="text-sm text-ink2 whitespace-nowrap">목표 기한 (이 날짜 이상)</label>
                            <input
                                type="date"
                                value={targetDate}
                                onChange={(event) => { setTargetDate(event.target.value); setPreview(null); }}
                                className="bg-subtle border border-line rounded-lg px-3 py-2 text-ink text-sm focus:outline-none focus:border-brand"
                            />
                        </div>

                        {preview && (
                            <div className="bg-subtle rounded-lg p-4 text-sm space-y-1.5">
                                <p className="text-ink">
                                    새 기한: <b>{preview.newDeadline}</b>
                                    <span className="text-ink3"> (개월 {preview.baseMonths}+{preview.currentExtension} → {preview.baseMonths}+{preview.newExtension} · 수식이 개월 단위라 목표일 이상 최소치로 계산)</span>
                                </p>
                                {preview.couponDates && (
                                    <p className="text-ink2">
                                        🎟️ 함께 갱신: 방문 {preview.couponDates.visitStart}~{preview.couponDates.visitEnd} · 쿠폰 유효 {preview.couponDates.couponStart}~{preview.couponDates.couponEnd}
                                    </p>
                                )}
                                {preview.couponEvent && (
                                    <p className="text-amber-600 text-xs font-bold">
                                        ⚠️ 실물 캠핏 쿠폰의 만료일은 수정이 불가능합니다 — 적용 후 쿠폰 재발급(SOP Step 5)을 별도로 진행해야 합니다.
                                    </p>
                                )}
                                {preview.guards.length > 0 && (
                                    <ul className="text-red-600 text-xs list-disc pl-4 pt-1">
                                        {preview.guards.map((guard) => <li key={guard}>{guard}</li>)}
                                    </ul>
                                )}
                            </div>
                        )}

                        {error && <p className="text-sm text-red-500">{error}</p>}

                        <div className="flex gap-2 justify-end">
                            <button onClick={onClose} className="bg-subtle text-ink text-sm font-bold rounded-lg px-4 py-2 border border-line">닫기</button>
                            {!preview && (
                                <button onClick={() => call(false)} disabled={isBusy} className="bg-brand text-black text-sm font-bold rounded-lg px-4 py-2 hover:bg-brand-hover disabled:opacity-50">
                                    {isBusy ? '계산 중…' : '미리보기'}
                                </button>
                            )}
                            {preview && preview.guards.length === 0 && (
                                <button onClick={() => call(true)} disabled={isBusy} className="bg-brand text-black text-sm font-bold rounded-lg px-4 py-2 hover:bg-brand-hover disabled:opacity-50">
                                    {isBusy ? '적용 중…' : `적용 (기한 ${preview.newDeadline})`}
                                </button>
                            )}
                        </div>
                    </>
                )}

                {result && (
                    <div className="space-y-4">
                        <div className={`rounded-lg p-4 text-sm ${result.verified ? 'bg-brand-bg text-brand-strong' : 'bg-red-50 text-red-600'}`}>
                            {result.verified ? (
                                <p><b>✅ 연장 완료 · 재조회 검증 통과</b> — 새 기한 {result.newDeadline} (개월 {result.baseMonths}+{result.newExtension})</p>
                            ) : (
                                <p><b>❌ 적용됐지만 검증 실패</b> — Airtable에서 직접 확인이 필요합니다. (기대: {result.newDeadline}, 연장 {result.newExtension})</p>
                            )}
                        </div>
                        {result.couponEvent && (
                            <p className="text-xs text-amber-600 font-bold">
                                ⚠️ 다음 단계: 실물 캠핏 쿠폰 재발급 (SOP Step 5) — Claude 세션에 &quot;{result.name} 쿠폰 재발급해줘&quot;라고 요청하세요.
                            </p>
                        )}
                        <div className="flex justify-end">
                            <button onClick={onApplied} className="bg-brand text-black text-sm font-bold rounded-lg px-4 py-2 hover:bg-brand-hover">확인 (현황 새로고침)</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
