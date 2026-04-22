// route.ts - 파트너 캠페인 목록 조회 API (v3: tier 전달)
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { getPartnerCampaigns } from '@/lib/airtable';
import { hasPartnerEligibleChannel } from '@/lib/constants';
import type { TierLevel } from '@/types';

if (!process.env.NEXTAUTH_SECRET) {
    throw new Error('NEXTAUTH_SECRET 환경변수가 설정되지 않았습니다.');
}
const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth-token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { payload } = await jwtVerify(token, JWT_SECRET);
        const channelTypes = (payload.channelTypes as string[]) || [];
        const tier = payload.tier as TierLevel;

        if (!hasPartnerEligibleChannel(channelTypes)) {
            return NextResponse.json(
                { error: '파트너 협찬은 인스타그램 또는 유튜브 채널이 필요합니다.' },
                { status: 403 }
            );
        }
        if (!tier) {
            return NextResponse.json({ error: '등급 정보가 없습니다. 다시 로그인해주세요.' }, { status: 401 });
        }

        const campaigns = await getPartnerCampaigns(tier);
        return NextResponse.json({ campaigns, myTier: tier });
    } catch (error) {
        console.error('Partner campaigns error:', error);
        return NextResponse.json(
            { error: '캠페인 목록 조회 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요. 계속되면 카카오톡 채널로 문의해주세요.' },
            { status: 500 }
        );
    }
}
