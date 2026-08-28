'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AdminOverview, AdminCampaignHealth, AdminExtendResult } from '@/types';

// 내부 관리자 종합 대시보드
// 쓰기 액션은 기한 연장뿐(SOP 가드 내장). 실물 쿠폰 재발급·환불 실행은 웹에서 하지 않는다(SOP 별도 트랙).
// 관리자용 데스크톱 화면이라 모바일 max-w-md 규칙 대신 max-w-5xl을 쓴다.

const STATUS_META: Record<AdminCampaignHealth['status'], { label: string; badge: string }> = {
    dead: { label: '기한 지남', badge: 'bg-red-500 text-white' },
    dying: { label: '임박', badge: 'bg-amber-400 text-black' },
    healthy: { label: '정상', badge: 'bg-brand-bg text-brand-strong border border-brand/30' },
};

const TABS = [
    { key: 'ops', label: '🏕 운영 헬스' },
    { key: 'inflow', label: '📥 신청 유입' },
    { key: 'content', label: '📝 콘텐츠 독촉' },
    { key: 'settle', label: '💰 월정산' },
    { key: 'offer', label: '📨 지명형 제안' },
    { key: 'refund', label: '↩️ 환불 검토' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

function formatDaysLeft(daysLeft: number): string {
    if (daysLeft < 0) return `D+${-daysLeft}`;
    if (daysLeft === 0) return 'D-day';
    return `D-${daysLeft}`;
}

const won = (n: number) => n.toLocaleString('ko-KR');

/** 기본 목표일 제안: 오늘 + 60일 (크리에이터 일정 선점 1달 + 모집 여유 1달) */
function defaultTargetDate(): string {
    return new Date(Date.now() + 9 * 3600000 + 60 * 86400000).toISOString().slice(0, 10);
}

/** 미업로드 독촉 카톡 문구 */
function nudgeMessage(channel: string, camp: string, checkin: string, deadline: string): string {
    return [
        `안녕하세요 ${channel}님, 캠핏 크리에이터 협찬 담당자입니다 🙂`,
        ``,
        `${camp} 방문(${checkin} 입실) 관련해서 콘텐츠 업로드가 아직 확인되지 않아 안내드려요.`,
        `협찬 콘텐츠는 퇴실일로부터 14일 이내 업로드가 원칙이며,${deadline ? ` 캠페인 제작 기한은 ${deadline}까지입니다.` : ''}`,
        ``,
        `업로드를 완료하셨다면 크리에이터 포털에 콘텐츠 링크 등록만 부탁드릴게요!`,
        `아직이시라면 예상 업로드 일정을 회신해 주시면 감사하겠습니다 🙏`,
    ].join('\n');
}

/** 쿠폰 재발급 준비물 (SOP-죽은캠페인-소생 Step 5 파라미터) */
function couponPrepText(campaign: AdminCampaignHealth): string {
    const p = campaign.couponPrep;
    if (!p) return '';
    const shortName = campaign.name.slice(0, 9);
    return [
        `■ 쿠폰 재발급 준비물 — ${campaign.name}`,
        `- 쿠폰명(18자 제한): 팔로워 쿠폰 (${shortName})`,
        `- 캠핏 캠핑장 ID: ${p.campfitCampId || '(비어있음 — Airtable 확인 필요)'}`,
        `- 할인: ${won(p.discount)}원 (정액)`,
        `- 인당 사용 인원: ${p.couponPerCreator}`,
        `- 적용 요일: ${p.couponApplyDays || '(미설정)'}`,
        `- 사용 가능 박수: ${p.minNights}~${p.maxNights}박`,
        `- 유효/다운로드 기간: ${p.couponStart} ~ ${p.couponEnd}`,
        `- 재발급 수량: 미배포 팔로워 ${campaign.totalAvailable}장 + 대표 쿠폰 1장(~방문종료 ${campaign.visitEndDate || '?'})`,
        ``,
        `※ 실행은 Claude 세션에: "${campaign.name} 쿠폰 재발급해줘" (SOP-죽은캠페인-소생 Step 5)`,
        `※ 배포 완료된 팔로워 쿠폰은 교체 금지 (크리에이터 콘텐츠에 조건 명시됨)`,
    ].join('\n');
}

function CopyButton({ text, label = '복사' }: { text: string; label?: string }) {
    const [copied, setCopied] = useState(false);
    return (
        <button
            onClick={async () => {
                try {
                    await navigator.clipboard.writeText(text);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                } catch {
                    // clipboard 권한 실패 시 무시 (https 필요)
                }
            }}
            className="text-xs font-bold rounded-lg px-3 py-1.5 bg-subtle text-ink border border-line hover:border-strong transition-colors"
        >
            {copied ? '복사됨 ✓' : label}
        </button>
    );
}

export default function AdminPage() {
    const router = useRouter();
    const [overview, setOverview] = useState<AdminOverview | null>(null);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [tab, setTab] = useState<TabKey>('ops');
    const [extendTarget, setExtendTarget] = useState<AdminCampaignHealth | null>(null);
    const [prepTarget, setPrepTarget] = useState<AdminCampaignHealth | null>(null);

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

    const maxWeekly = overview ? Math.max(1, ...overview.weeklyInflow.map((w) => w.count)) : 1;

    return (
        <main className="min-h-screen bg-page px-4 py-8">
            <div className="max-w-5xl mx-auto space-y-5">
                <header className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-ink">프리미엄 협찬 통합 대시보드</h1>
                        <p className="text-sm text-ink3 mt-1">
                            연장은 버튼 · 쿠폰 재발급/환불 실행은 SOP 절차
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

                {error && <div className="bg-card border border-red-300 rounded-lg p-4 text-sm text-red-600">{error}</div>}
                {isLoading && !overview && <div className="bg-card border border-line rounded-lg p-8 text-center text-ink3">불러오는 중…</div>}

                {overview && (
                    <>
                        {/* 요약 카드 */}
                        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                            <SummaryCard label="모집중 캠페인" value={overview.summary.open} sub={`노출 ${overview.summary.exposed} · 마감 ${overview.summary.closed}`} />
                            <SummaryCard label="기한 문제" value={overview.summary.dead + overview.summary.dying} sub={`지남 ${overview.summary.dead} · 임박 ${overview.summary.dying}`} tone={overview.summary.dead + overview.summary.dying > 0 ? 'danger' : 'ok'} />
                            <SummaryCard label="신청 유입 (7일)" value={overview.summary.applicationsLast7Days} sub={`30일 ${overview.summary.applicationsLast30Days}건`} />
                            <SummaryCard label="미업로드 독촉" value={overview.summary.overdueUploads} sub={`퇴실 +${overview.graceDays}일`} tone={overview.summary.overdueUploads > 0 ? 'warn' : 'ok'} />
                            <SummaryCard label="쿠폰 정합성" value={overview.summary.couponIssues} sub="풀/대표코드" tone={overview.summary.couponIssues > 0 ? 'danger' : 'ok'} />
                            <SummaryCard label="지명 제안 대기" value={overview.offers.counts.pending} sub={`확정 ${overview.offers.counts.accepted} · 거절 ${overview.offers.counts.rejected}`} />
                        </section>

                        {/* 탭 */}
                        <nav className="flex flex-wrap gap-1.5">
                            {TABS.map((t) => (
                                <button
                                    key={t.key}
                                    onClick={() => setTab(t.key)}
                                    className={`text-sm font-bold rounded-lg px-3.5 py-2 transition-colors ${
                                        tab === t.key ? 'bg-brand text-black' : 'bg-card text-ink2 border border-line hover:border-strong'
                                    }`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </nav>

                        {/* ── 탭: 운영 헬스 ── */}
                        {tab === 'ops' && (
                            <>
                                <section className="bg-card border border-line rounded-lg overflow-hidden">
                                    <div className="px-4 py-3 border-b border-line flex items-center justify-between">
                                        <h2 className="font-bold text-ink">🏕 캠페인 기한 헬스 (모집중 {overview.campaigns.length}건)</h2>
                                        <span className="text-xs text-ink3">임박 기준 D-{overview.leadDays}</span>
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
                                                    <th className="px-4 py-2 font-medium">개월</th>
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
                                                            <a href={campaign.airtableUrl} target="_blank" rel="noopener noreferrer" className="hover:text-brand-strong underline decoration-line underline-offset-2">{campaign.name}</a>
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
                                                                campaign.applications === 0 && campaign.status !== 'healthy' && '신청 0명',
                                                            ].filter(Boolean).join(' · ')}
                                                        </td>
                                                        <td className="px-4 py-2 whitespace-nowrap space-x-1.5">
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
                                                            {campaign.couponPrep && (
                                                                <button
                                                                    onClick={() => setPrepTarget(campaign)}
                                                                    className="text-xs font-bold rounded-lg px-3 py-1.5 bg-subtle text-ink2 border border-line hover:border-strong transition-colors"
                                                                >
                                                                    🎟 재발급 준비물
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </section>

                                <section className="bg-card border border-line rounded-lg overflow-hidden">
                                    <div className="px-4 py-3 border-b border-line">
                                        <h2 className="font-bold text-ink">🎟 쿠폰 정합성 문제 ({overview.couponIssues.length}건)</h2>
                                        <p className="text-xs text-ink3 mt-0.5">신청 가능한데 풀/대표코드가 깨진 건 — 방치 시 신청이 에러로 막힘</p>
                                    </div>
                                    {overview.couponIssues.length === 0 ? (
                                        <p className="px-4 py-6 text-center text-ink3 text-sm">문제 없음 ✅</p>
                                    ) : (
                                        <ul className="divide-y divide-line">
                                            {overview.couponIssues.map((issue) => (
                                                <li key={issue.campaignId} className="px-4 py-3 text-sm">
                                                    <a href={issue.airtableUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-ink hover:text-brand-strong underline decoration-line underline-offset-2">{issue.name}</a>
                                                    <span className="text-red-600 ml-2">{issue.issue}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </section>
                            </>
                        )}

                        {/* ── 탭: 신청 유입 ── */}
                        {tab === 'inflow' && (
                            <>
                                <section className="bg-card border border-line rounded-lg p-4">
                                    <h2 className="font-bold text-ink mb-4">📈 주간 신청 추이 (최근 8주)</h2>
                                    <div className="flex items-end gap-2 h-36">
                                        {overview.weeklyInflow.map((week) => (
                                            <div key={week.weekStart} className="flex-1 flex flex-col items-center gap-1">
                                                <span className="text-xs font-bold text-ink">{week.count}</span>
                                                <div
                                                    className="w-full bg-brand rounded-t"
                                                    style={{ height: `${Math.max(4, (week.count / maxWeekly) * 100)}px` }}
                                                />
                                                <span className="text-[10px] text-ink3">{week.weekStart.slice(5)}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-xs text-ink3 mt-2">주 시작 = 월요일(KST) · 마지막 막대가 이번 주 (진행 중)</p>
                                </section>

                                <section className="bg-card border border-line rounded-lg overflow-hidden">
                                    <div className="px-4 py-3 border-b border-line">
                                        <h2 className="font-bold text-ink">📥 최근 신청 (30일 {overview.summary.applicationsLast30Days}건 · 최신 20건)</h2>
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
                            </>
                        )}

                        {/* ── 탭: 콘텐츠 독촉 ── */}
                        {tab === 'content' && (
                            <section className="bg-card border border-line rounded-lg overflow-hidden">
                                <div className="px-4 py-3 border-b border-line">
                                    <h2 className="font-bold text-ink">📝 콘텐츠 미업로드 독촉 대상 ({overview.overdue.length}건)</h2>
                                    <p className="text-xs text-ink3 mt-0.5">퇴실(입실+1박 가정) 후 {overview.graceDays}일 경과 · 2박 이상 건은 하루 이상 빨리 잡힐 수 있음 · &quot;문구 복사&quot;로 카톡 독촉 메시지 생성</p>
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
                                                    <th className="px-4 py-2 font-medium">독촉</th>
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
                                                        <td className="px-4 py-2 whitespace-nowrap">
                                                            <CopyButton text={nudgeMessage(item.channel, item.camp, item.checkin, item.deadline)} label="문구 복사" />
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </section>
                        )}

                        {/* ── 탭: 월정산 ── */}
                        {tab === 'settle' && (
                            <>
                                <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <SummaryCard label={`${overview.settlement.payoutMonth} 저장건 (지급 대상)`} value={overview.settlement.prevCount} sub={`지급일 ${overview.settlement.payday} (${formatDaysLeft(overview.settlement.paydayDaysLeft)})`} />
                                    <SummaryCard label="지급 예정액 합계" value={overview.settlement.prevPaySum} sub={`협찬비 합 ${won(overview.settlement.prevFeeSum)}원`} isWon />
                                    <SummaryCard label="협찬비 결손 건" value={overview.settlement.missingFee} sub="lookup 비어 계산 불가 — 수동 확인" tone={overview.settlement.missingFee > 0 ? 'warn' : 'ok'} />
                                    <SummaryCard label={`${overview.settlement.currentMonth} 저장건 (다음 사이클)`} value={overview.settlement.currentCount} sub="익월 10일 지급 예정" />
                                </section>
                                <section className="bg-card border border-line rounded-lg overflow-hidden">
                                    <div className="px-4 py-3 border-b border-line">
                                        <h2 className="font-bold text-ink">💰 {overview.settlement.payoutMonth} 지급 대상자 ({overview.settlement.persons.length}명)</h2>
                                        <p className="text-xs text-ink3 mt-0.5">개인 ×0.967(원천징수) / 사업자 ×1.1(부가세) · 실지급 전 SOP-월정산 대사(<code>tools/settlement/verify-month.cjs</code>) 필수 — 이 표는 요약이며 계좌/중복 검증을 대체하지 않음</p>
                                    </div>
                                    {overview.settlement.persons.length === 0 ? (
                                        <p className="px-4 py-6 text-center text-ink3 text-sm">지급 대상 없음</p>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="text-left text-ink3 border-b border-line">
                                                        <th className="px-4 py-2 font-medium">이름</th>
                                                        <th className="px-4 py-2 font-medium">구분</th>
                                                        <th className="px-4 py-2 font-medium">건수</th>
                                                        <th className="px-4 py-2 font-medium">협찬비 합</th>
                                                        <th className="px-4 py-2 font-medium">지급액</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {overview.settlement.persons.map((person) => (
                                                        <tr key={person.name} className="border-b border-line last:border-b-0">
                                                            <td className="px-4 py-2 text-ink">{person.name}</td>
                                                            <td className="px-4 py-2 text-ink2">{person.bizType || '개인'}</td>
                                                            <td className="px-4 py-2 text-ink2">{person.count}</td>
                                                            <td className="px-4 py-2 text-ink2 whitespace-nowrap">{won(person.feeSum)}원</td>
                                                            <td className="px-4 py-2 font-bold text-ink whitespace-nowrap">{won(person.paySum)}원</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </section>
                            </>
                        )}

                        {/* ── 탭: 지명형 제안 ── */}
                        {tab === 'offer' && (
                            <section className="bg-card border border-line rounded-lg overflow-hidden">
                                <div className="px-4 py-3 border-b border-line">
                                    <h2 className="font-bold text-ink">📨 지명형 제안 현황 — 대기 {overview.offers.counts.pending} · 확정 {overview.offers.counts.accepted} · 거절 {overview.offers.counts.rejected}{overview.offers.counts.other > 0 && ` · 기타 ${overview.offers.counts.other}`}</h2>
                                    <p className="text-xs text-ink3 mt-0.5">최신 30건 표시</p>
                                </div>
                                {overview.offers.rows.length === 0 ? (
                                    <p className="px-4 py-6 text-center text-ink3 text-sm">제안 없음</p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="text-left text-ink3 border-b border-line">
                                                    <th className="px-4 py-2 font-medium">상태</th>
                                                    <th className="px-4 py-2 font-medium">캠핑장</th>
                                                    <th className="px-4 py-2 font-medium">크리에이터</th>
                                                    <th className="px-4 py-2 font-medium">발송일</th>
                                                    <th className="px-4 py-2 font-medium">응답일</th>
                                                    <th className="px-4 py-2 font-medium">거절 사유</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {overview.offers.rows.map((offer) => (
                                                    <tr key={offer.id} className="border-b border-line last:border-b-0">
                                                        <td className="px-4 py-2 whitespace-nowrap">
                                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                                                offer.status === '확정' ? 'bg-brand-bg text-brand-strong border border-brand/30'
                                                                : offer.status === '거절' ? 'bg-red-500 text-white'
                                                                : 'bg-amber-400 text-black'
                                                            }`}>{offer.status}</span>
                                                        </td>
                                                        <td className="px-4 py-2 text-ink">{offer.camp}</td>
                                                        <td className="px-4 py-2 text-ink2">{offer.creatorChannel}</td>
                                                        <td className="px-4 py-2 text-ink2 whitespace-nowrap">{offer.sentAt || '-'}</td>
                                                        <td className="px-4 py-2 text-ink2 whitespace-nowrap">{offer.respondedAt || '-'}</td>
                                                        <td className="px-4 py-2 text-ink3 text-xs">{offer.rejectReason || '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </section>
                        )}

                        {/* ── 탭: 환불 검토 ── */}
                        {tab === 'refund' && (
                            <section className="bg-card border border-line rounded-lg overflow-hidden">
                                <div className="px-4 py-3 border-b border-line">
                                    <h2 className="font-bold text-ink">↩️ 환불/리밸런싱 검토 — 미모집 자리 있는 캠페인 ({overview.refundReviews.length}건)</h2>
                                    <p className="text-xs text-amber-600 mt-0.5 font-bold">⚠️ 표시 금액은 &quot;상한&quot;입니다 — gross 단가 필드는 수동이라 실행 전 반드시 실입금액 대조 + SOP-인원리밸런싱 절차(단가 변경 절대 금지 규칙 포함). 여기서 실행되는 건 없습니다.</p>
                                </div>
                                {overview.refundReviews.length === 0 ? (
                                    <p className="px-4 py-6 text-center text-ink3 text-sm">미모집 자리 없음 ✅</p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="text-left text-ink3 border-b border-line">
                                                    <th className="px-4 py-2 font-medium">검토</th>
                                                    <th className="px-4 py-2 font-medium">캠핑장</th>
                                                    <th className="px-4 py-2 font-medium">미모집 (⭐/✔/🔥)</th>
                                                    <th className="px-4 py-2 font-medium">환불 상한</th>
                                                    <th className="px-4 py-2 font-medium">VAT</th>
                                                    <th className="px-4 py-2 font-medium">신청</th>
                                                    <th className="px-4 py-2 font-medium">연장</th>
                                                    <th className="px-4 py-2 font-medium">기한</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {overview.refundReviews.map((review) => (
                                                    <tr key={review.campaignId} className="border-b border-line last:border-b-0">
                                                        <td className="px-4 py-2 whitespace-nowrap">
                                                            {review.candidate
                                                                ? <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-500 text-white">후보</span>
                                                                : <span className="text-xs text-ink3">-</span>}
                                                        </td>
                                                        <td className="px-4 py-2 text-ink">
                                                            <a href={review.airtableUrl} target="_blank" rel="noopener noreferrer" className="hover:text-brand-strong underline decoration-line underline-offset-2">{review.name}</a>
                                                        </td>
                                                        <td className="px-4 py-2 text-ink2 whitespace-nowrap">{review.unfilled.icon} / {review.unfilled.partner} / {review.unfilled.rising}</td>
                                                        <td className="px-4 py-2 font-bold text-ink whitespace-nowrap">{review.grossSum > 0 ? `${won(review.refundCeiling)}원` : '단가 미입력'}</td>
                                                        <td className="px-4 py-2 text-ink2 whitespace-nowrap">{review.friendly ? '프렌들리 ×1.0' : '×1.1'}</td>
                                                        <td className="px-4 py-2 text-ink2">{review.applications}</td>
                                                        <td className="px-4 py-2 text-ink2">+{review.extensionMonths}개월</td>
                                                        <td className="px-4 py-2 text-ink2 whitespace-nowrap">{formatDaysLeft(review.daysLeft)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </section>
                        )}
                    </>
                )}
            </div>

            {extendTarget && (
                <ExtendModal campaign={extendTarget} onClose={() => setExtendTarget(null)} onApplied={() => { setExtendTarget(null); load(); }} />
            )}
            {prepTarget && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setPrepTarget(null)}>
                    <div className="w-full max-w-lg bg-card rounded-2xl p-6 space-y-4" onClick={(event) => event.stopPropagation()}>
                        <h3 className="text-lg font-bold text-ink">🎟 쿠폰 재발급 준비물 — {prepTarget.name}</h3>
                        <pre className="bg-subtle rounded-lg p-4 text-xs text-ink whitespace-pre-wrap overflow-x-auto">{couponPrepText(prepTarget)}</pre>
                        <div className="flex gap-2 justify-end">
                            <button onClick={() => setPrepTarget(null)} className="bg-subtle text-ink text-sm font-bold rounded-lg px-4 py-2 border border-line">닫기</button>
                            <CopyButton text={couponPrepText(prepTarget)} label="전체 복사" />
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}

interface SummaryCardProps {
    label: string;
    value: number;
    sub?: string;
    tone?: 'ok' | 'warn' | 'danger';
    isWon?: boolean;
}

function SummaryCard({ label, value, sub, tone, isWon }: SummaryCardProps) {
    const valueColor =
        tone === 'danger' && value > 0 ? 'text-red-500'
        : tone === 'warn' && value > 0 ? 'text-amber-500'
        : 'text-ink';
    return (
        <div className="bg-card border border-line rounded-lg p-4">
            <p className="text-xs text-ink3">{label}</p>
            <p className={`font-bold mt-1 ${valueColor} ${isWon ? 'text-lg' : 'text-2xl'}`}>{isWon ? `${won(value)}원` : value}</p>
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
                                    <p className="text-ink2">🎟️ 함께 갱신: 방문 {preview.couponDates.visitStart}~{preview.couponDates.visitEnd} · 쿠폰 유효 {preview.couponDates.couponStart}~{preview.couponDates.couponEnd}</p>
                                )}
                                {preview.couponEvent && (
                                    <p className="text-amber-600 text-xs font-bold">⚠️ 실물 캠핏 쿠폰의 만료일은 수정이 불가능합니다 — 적용 후 쿠폰 재발급(SOP Step 5)을 별도로 진행해야 합니다.</p>
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
                                <p><b>✅ 연장 완료 · 재조회 검증 통과</b> — 새 기한 {result.newDeadline} (개월 {result.baseMonths}+{result.newExtension}) · 운영 로그 기록됨</p>
                            ) : (
                                <p><b>❌ 적용됐지만 검증 실패</b> — Airtable에서 직접 확인이 필요합니다. (기대: {result.newDeadline}, 연장 {result.newExtension})</p>
                            )}
                        </div>
                        {result.couponEvent && (
                            <p className="text-xs text-amber-600 font-bold">⚠️ 다음 단계: 실물 캠핏 쿠폰 재발급 (SOP Step 5) — 캠페인 행의 &quot;🎟 재발급 준비물&quot; 버튼으로 파라미터를 복사해 Claude 세션에 요청하세요.</p>
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
