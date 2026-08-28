// route.ts - 제안 수락/거절 API (지명형 1b — Phase B3)
// CHANGED: 1b — /api/** 는 미들웨어 밖 → 라우트 내 JWT 직접 검증 (CLAUDE.md §5).
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { respondToOffer } from '@/lib/airtable';
import { offerErrorMessage } from '@/lib/offerRules';

if (!process.env.NEXTAUTH_SECRET) {
    throw new Error('NEXTAUTH_SECRET 환경변수가 설정되지 않았습니다.');
}
const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);

async function resolveCreatorId(): Promise<string | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return null;
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return ((payload.creatorId || payload.id) as string) || null;
    } catch (error) {
        console.error('Invalid auth token on /api/offers/respond:', error);
        return null;
    }
}

/**
 * ⚠️ `AIRTABLE_OFFER_TABLE_ID`가 없으면 **조용히 빈 목록이 된다.**
 * `getCreatorOffers`는 조회 실패 시 빈 배열을 돌려주는 컨벤션이라, 환경변수 누락도 "제안 없음"으로
 * 보인다 — 크리에이터는 제안이 안 왔다고 믿고, 우리는 아무 신호도 못 받는다.
 * 설정 문제와 데이터 없음을 갈라서, 설정 문제는 소리내어 실패시킨다.
 * (모듈 최상단에서 throw하지 않는 이유: 1b 환경변수 하나 때문에 프리미엄 협찬까지 죽으면 안 된다.)
 */
function offerTableConfigured(): boolean {
    if (process.env.AIRTABLE_OFFER_TABLE_ID) return true;
    console.error('AIRTABLE_OFFER_TABLE_ID 환경변수가 없습니다 — 제안 수신함을 열 수 없습니다.');
    return false;
}

/**
 * 실패 코드 → HTTP 상태.
 * 상태만으로는 화면이 무슨 말을 보여줄지 정할 수 없어서, 본문에 `code`를 항상 같이 보낸다.
 * 409로 묶인 셋(끝난 건 / 이미 응답 / 끼어듦)은 전부 "목록 새로고침"이 답이지만 문장이 다르다.
 */
const STATUS_BY_CODE: Record<string, number> = {
    NOT_FOUND: 404,
    FORBIDDEN: 403,
    INVALID_ACTION: 400,
    INVALID_REASON: 400,
    NOT_PENDING: 409,
    ALREADY_RESPONDED: 409,
    EXPIRED: 409,
    CONFLICT: 409,
    WRITE_FAILED: 500,
};

/** PATCH — 수락/거절. 제안 id는 본문으로 받되, 소유권은 서버가 JWT로 다시 판정한다. */
export async function PATCH(request: NextRequest) {
    try {
        const creatorId = await resolveCreatorId();
        if (!creatorId) {
            return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
        }

        if (!offerTableConfigured()) {
            return NextResponse.json(
                { error: '제안 수신함이 아직 준비 중이에요. 잠시 후 다시 시도해주세요.' },
                { status: 503 }
            );
        }

        const body = await request.json().catch(() => ({}));
        const offerId = typeof body?.offerId === 'string' ? body.offerId : '';
        const action = typeof body?.action === 'string' ? body.action : '';
        const rejectReason = typeof body?.rejectReason === 'string' ? body.rejectReason : undefined;
        const rejectDetail = typeof body?.rejectDetail === 'string' ? body.rejectDetail : undefined;

        if (!offerId) {
            return NextResponse.json(
                { error: '제안을 찾을 수 없어요. 목록을 새로고침해주세요.', code: 'NOT_FOUND' },
                { status: 404 }
            );
        }

        const result = await respondToOffer({ creatorId, offerId, action, rejectReason, rejectDetail });

        if (!result.ok) {
            return NextResponse.json(
                { error: offerErrorMessage(result.code), code: result.code },
                { status: STATUS_BY_CODE[result.code] ?? 400 }
            );
        }

        return NextResponse.json({ success: true, status: result.status });
    } catch (error) {
        console.error('PATCH /api/offers/respond error:', error);
        return NextResponse.json(
            { error: '요청을 처리하지 못했습니다.' },
            { status: 500 }
        );
    }
}
