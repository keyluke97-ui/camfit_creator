// CHANGED: 프리미엄 캠페인 검색 API — 콘텐츠 제출 시 프리미엄 캠페인 선택용
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
// CHANGED: 크리에이터의 신청 내역 기반으로 본인 캠페인만 반환
import { searchCreatorPremiumCampaigns } from '@/lib/airtable';

if (!process.env.NEXTAUTH_SECRET) {
    throw new Error('NEXTAUTH_SECRET 환경변수가 설정되지 않았습니다.');
}
const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);

export async function GET(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth-token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { payload } = await jwtVerify(token, JWT_SECRET);
        const channelName = payload.channelName as string | undefined;

        // CHANGED: channelName 누락 가드 — 옛 JWT/마이그레이션 중 토큰 방어
        if (!channelName) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q') || undefined;

        // CHANGED: creatorId 인자 제거 — searchCreatorPremiumCampaigns가 채널명만으로 동작 (BUG-A 픽스)
        const campaigns = await searchCreatorPremiumCampaigns(channelName, query);
        return NextResponse.json({ campaigns });
    } catch (error) {
        console.error('Premium campaigns search error:', error);
        return NextResponse.json(
            { error: '캠페인 검색 중 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}
