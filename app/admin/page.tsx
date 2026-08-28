'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AdminOverview, AdminCampaignHealth } from '@/types';

// 내부 관리자 어드민 (조회 전용 MVP)
// 연장·재발급 같은 쓰기 액션은 SOP(docs/SOP-프리미엄협찬-죽은캠페인-소생.md) 절차로만 수행한다.
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

export default function AdminPage() {
    const router = useRouter();
    const [overview, setOverview] = useState<AdminOverview | null>(null);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(true);

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
                            조회 전용 · 연장/재발급은 SOP 절차로 진행
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
                        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <SummaryCard label="노출 중 캠페인" value={overview.summary.exposed} sub={`마감 ${overview.summary.closed} · 모집중 ${overview.summary.open}`} />
                            <SummaryCard
                                label="기한 문제"
                                value={overview.summary.dead + overview.summary.dying}
                                sub={`지남 ${overview.summary.dead} · 임박 ${overview.summary.dying}`}
                                tone={overview.summary.dead + overview.summary.dying > 0 ? 'danger' : 'ok'}
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
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {(overview.summary.dead > 0 || overview.summary.dying > 0) && (
                                <p className="px-4 py-3 text-xs text-ink3 border-t border-line">
                                    연장이 필요하면: <code className="bg-subtle px-1 rounded">node tools/campaign-revival/extend.cjs</code> 드라이런 → SOP-죽은캠페인-소생 절차. 쿠폰이벤트 건은 실물 쿠폰 재발급까지 한 세트.
                                </p>
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
