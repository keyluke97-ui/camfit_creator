// page.tsx - 제안 수신함 (지명형 1b — Phase C4)
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import OfferCard from '@/components/OfferCard';
import OfferDetailModal from '@/components/OfferDetailModal';
import { readSeen, markSeen, unseenIds } from '@/lib/offerSeen';
import type { Offer } from '@/types';

/**
 * 내 제안 목록.
 *
 * ⚠️ **제안 id를 URL에 담지 않는다.** 메일에서 오는 링크도 이 목록으로만 보낸다 —
 *    URL에 id가 있으면 그 주소를 아는 사람이 남의 제안을 여는 경로가 생긴다.
 *    (서버가 소유권을 다시 판정하지만, 애초에 그런 주소를 만들지 않는다.)
 */
export default function OffersPage() {
    const router = useRouter();
    const [offers, setOffers] = useState<Offer[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [selected, setSelected] = useState<Offer | null>(null);
    const [saving, setSaving] = useState(false);
    const [actionError, setActionError] = useState('');
    // 카운트다운을 1분마다 다시 그린다. 초 단위로 돌릴 이유가 없다(기한이 영업일 단위다).
    const [now, setNow] = useState(() => Date.now());
    // 열어본 제안 id — 서버에 쓰지 않고 기기 로컬에만 남긴다(lib/offerSeen 주석 참고).
    // 첫 렌더는 빈 배열로 두고 마운트 후 읽는다. SSR과 클라이언트 마크업이 어긋나면 안 된다.
    const [seen, setSeen] = useState<string[]>([]);
    useEffect(() => { setSeen(readSeen()); }, []);

    const openOffer = (offer: Offer) => {
        setSelected(offer);
        setSeen(markSeen(offer.id));
    };

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 60_000);
        return () => clearInterval(timer);
    }, []);

    const load = useCallback(async () => {
        try {
            const response = await fetch('/api/offers');
            if (response.status === 401) {
                router.push('/login');
                return;
            }
            const data = await response.json();
            if (!response.ok) {
                setLoadError(data?.error || '제안 목록을 불러오지 못했어요.');
                return;
            }
            setOffers(data.offers || []);
            setLoadError('');
        } catch {
            setLoadError('제안 목록을 불러오지 못했어요. 잠시 후 다시 시도해주세요.');
        } finally {
            setLoading(false);
        }
    }, [router]);

    useEffect(() => { load(); }, [load]);

    const respond = async (offer: Offer, action: 'accept' | 'reject', rejectReason?: string, rejectDetail?: string) => {
        setSaving(true);
        setActionError('');
        try {
            const response = await fetch('/api/offers/respond', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ offerId: offer.id, action, rejectReason, rejectDetail }),
            });
            const data = await response.json();
            if (!response.ok) {
                // 서버가 코드별 문장을 준다. 화면이 다시 쓰지 않는다 — 두 곳이 어긋나면 말이 갈린다.
                setActionError(data?.error || '요청을 처리하지 못했어요.');
                await load();
                return;
            }
            setSelected(null);
            await load();
        } catch {
            setActionError('요청을 처리하지 못했어요. 잠시 후 다시 시도해주세요.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-page">
            <header className="sticky top-0 z-10 bg-page/95 backdrop-blur border-b border-line">
                <div className="max-w-md mx-auto px-4 h-14 flex items-center gap-2">
                    <button type="button" onClick={() => router.push('/dashboard')} className="text-ink2 text-lg px-1" aria-label="뒤로">‹</button>
                    <h1 className="text-base font-bold text-ink">받은 제안</h1>
                    {/* CHANGED (2026-09-02): 프로필 링크를 빈 상태 밖으로 꺼내 상시 노출한다.
                        대시보드의 '내 협찬 프로필' 배너가 2카드로 흡수되면서, 카드는 제안이 있으면
                        수신함으로만 간다. 확정 제안은 목록에서 사라지지 않으므로(getCreatorOffers가
                        `확정`도 읽는다) 협찬을 한 번이라도 성사시킨 사람은 프로필로 갈 길을
                        영영 잃는다. 여기가 그 유일한 복구 경로다.
                        px-2 py-2 = 터치 타깃 32px — text-xs 줄높이만으론 17px이라
                        WCAG 2.5.8 최소 24px에 미달한다. 유일한 경로라 더 중요하다. */}
                    <button
                        type="button"
                        onClick={() => router.push('/dashboard/portfolio')}
                        className="ml-auto text-xs font-medium text-ink2 hover:text-ink transition-colors px-2 py-2"
                    >
                        내 프로필
                    </button>
                </div>
            </header>

            <main className="max-w-md mx-auto px-4 py-5 flex flex-col gap-3">
                {loading ? (
                    <p className="text-sm text-ink3 text-center py-16">불러오는 중...</p>
                ) : loadError ? (
                    <div className="bg-card border border-line rounded-xl p-6 flex flex-col items-center gap-3">
                        <p className="text-sm text-ink2 text-center">{loadError}</p>
                        <button
                            type="button"
                            onClick={() => { setLoading(true); load(); }}
                            className="h-10 px-4 bg-subtle border border-line rounded-lg text-sm font-medium text-ink hover:border-strong transition-colors"
                        >
                            다시 시도
                        </button>
                    </div>
                ) : offers.length === 0 ? (
                    <div className="bg-card border border-line rounded-xl p-8 flex flex-col items-center gap-2">
                        <p className="text-sm font-bold text-ink">아직 받은 제안이 없어요</p>
                        <p className="text-xs text-ink2 text-center leading-relaxed">
                            협찬 프로필을 공개해두시면 캠지기가 조건을 보고 제안해요.<br />
                            제안이 오면 이메일로도 알려드려요.
                        </p>
                        <button
                            type="button"
                            onClick={() => router.push('/dashboard/portfolio')}
                            className="mt-2 h-11 px-4 bg-brand text-black font-bold rounded-lg hover:bg-brand-hover transition-colors text-sm"
                        >
                            내 협찬 프로필 보기
                        </button>
                    </div>
                ) : (
                    offers.map((offer) => (
                        <OfferCard
                            key={offer.id}
                            offer={offer}
                            now={now}
                            isNew={unseenIds([offer.id], seen).length > 0}
                            onOpen={openOffer}
                        />
                    ))
                )}
            </main>

            <OfferDetailModal
                key={selected?.id || 'none'}
                offer={selected}
                now={now}
                saving={saving}
                errorMessage={actionError}
                onClose={() => { setSelected(null); setActionError(''); }}
                onAccept={(offer) => respond(offer, 'accept')}
                onReject={(offer, reason, detail) => respond(offer, 'reject', reason, detail)}
            />
        </div>
    );
}
