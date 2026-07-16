// route.ts - 크리에이터 프로필(포트폴리오+조건+원정+정산) 조회/저장 API
// CHANGED: 지명형 1a — 프로필 GET/PATCH 신규 생성. /api/** 는 미들웨어 밖 → 라우트 내 JWT 직접 검증.
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { getCreatorProfile, updateCreatorProfile } from '@/lib/airtable';
import type { CreatorProfileUpdate } from '@/types';

if (!process.env.NEXTAUTH_SECRET) {
    throw new Error('NEXTAUTH_SECRET 환경변수가 설정되지 않았습니다.');
}
const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);

// JWT에서 creatorId 추출 (IDOR 방어 — body로 record id 받지 않고 항상 토큰의 creatorId만 사용)
// 무효/만료/위조 토큰은 null 반환 → 401(토큰 없음과 동일). jwtVerify throw가 500으로 새지 않게.
async function resolveCreatorId(): Promise<string | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return null;
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return ((payload.creatorId || payload.id) as string) || null;
    } catch (error) {
        console.error('Invalid auth token on /api/creator/profile:', error);
        return null;
    }
}

export async function GET() {
    try {
        const creatorId = await resolveCreatorId();
        if (!creatorId) {
            return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
        }

        const profile = await getCreatorProfile(creatorId);
        if (!profile) {
            return NextResponse.json(
                { error: '프로필을 불러오지 못했습니다. 잠시 후 다시 시도해주세요. 계속되면 카카오톡 채널로 문의해주세요.' },
                { status: 500 }
            );
        }
        return NextResponse.json({ profile });
    } catch (error) {
        console.error('Get creator profile route error:', error);
        return NextResponse.json(
            { error: '프로필 조회 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
            { status: 500 }
        );
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const creatorId = await resolveCreatorId();
        if (!creatorId) {
            return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
        }

        const body = await request.json();
        // 방어적 파싱 — 편집 가능 필드만 취함(그 외 무시). 공개 게이팅·원정 검증은 lib 서버측에서 재확인.
        const payload: CreatorProfileUpdate = {
            representativeLink: typeof body.representativeLink === 'string' ? body.representativeLink : '',
            minSponsorAmount: typeof body.minSponsorAmount === 'number' ? body.minSponsorAmount : 0,
            visitRegions: Array.isArray(body.visitRegions) ? body.visitRegions : [],
            visitDays: Array.isArray(body.visitDays) ? body.visitDays : [],
            acceptSiteTypes: Array.isArray(body.acceptSiteTypes) ? body.acceptSiteTypes : [],
            baseRegion: typeof body.baseRegion === 'string' ? body.baseRegion : '',
            wonjeongRegions: Array.isArray(body.wonjeongRegions) ? body.wonjeongRegions : [],
            isPublic: body.isPublic === true,
            autoAcceptActive: body.autoAcceptActive === true,
        };

        const result = await updateCreatorProfile(creatorId, payload);
        if (!result.ok) {
            // 게이팅/원정 검증 실패 → 400 + code/missing (클라이언트가 안내 렌더)
            return NextResponse.json(
                { error: '입력 조건을 확인해주세요.', code: result.code, missing: result.missing },
                { status: 400 }
            );
        }
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Update creator profile route error:', error);
        return NextResponse.json(
            { error: '프로필 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요. 계속되면 카카오톡 채널로 문의해주세요.' },
            { status: 500 }
        );
    }
}
