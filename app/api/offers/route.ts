// route.ts - 제안 수신함 목록 조회 API (지명형 1b — Phase B3)
// CHANGED: 1b — /api/** 는 미들웨어 밖 → 라우트 내 JWT 직접 검증 (CLAUDE.md §5).
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { getCreatorOffers } from '@/lib/airtable';

if (!process.env.NEXTAUTH_SECRET) {
    throw new Error('NEXTAUTH_SECRET 환경변수가 설정되지 않았습니다.');
}
const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);

/**
 * JWT에서 creatorId 추출 (IDOR 방어 — 쿼리스트링으로 id를 받지 않고 항상 토큰의 creatorId만 쓴다).
 * 무효/만료/위조 토큰은 null → 401. jwtVerify throw가 500으로 새지 않게 한다.
 */
async function resolveCreatorId(): Promise<string | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return null;
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return ((payload.creatorId || payload.id) as string) || null;
    } catch (error) {
        console.error('Invalid auth token on /api/offers:', error);
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

/** GET — 내 제안 목록. 서버가 소유권을 판정하므로 클라이언트는 필터를 보내지 않는다. */
export async function GET() {
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

        const offers = await getCreatorOffers(creatorId);
        return NextResponse.json({ offers });
    } catch (error) {
        console.error('GET /api/offers error:', error);
        return NextResponse.json(
            { error: '제안 목록을 불러오지 못했습니다.' },
            { status: 500 }
        );
    }
}
