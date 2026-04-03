// route.ts - 파트너 캠페인 목록 조회 API
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { getPartnerCampaigns } from '@/lib/airtable';
// CHANGED: 공통 상수/함수를 constants.ts에서 import (중복 제거)
import { hasPartnerEligibleChannel } from '@/lib/constants';

if (!process.env.NEXTAUTH_SECRET) {
    throw new Error('NEXTAUTH_SECRET 환경변수가 설정되지 않았습니다.');
}
const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth-token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { payload } = await jwtVerify(token, JWT_SECRET);
        const channelTypes = (payload.channelTypes as string[]) || [];

        // 블로거 제외 — API 레벨 접근 제어 (이중 방어)
        if (!hasPartnerEligibleChannel(channelTypes)) {
            return NextResponse.json(
                { error: '파트너 협찬은 인스타그램 또는 유튜브 채널이 필요합니다.' },
                { status: 403 }
            );
        }

        const campaigns = await getPartnerCampaigns();
        return NextResponse.json({ campaigns });
    } catch (error) {
        console.error('Partner campaigns error:', error);
        return NextResponse.json(
            { error: '캠페인 목록 조회 중 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}
