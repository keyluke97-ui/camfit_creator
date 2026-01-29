import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getCampaigns } from '@/lib/airtable';
import type { TierLevel } from '@/types';

const JWT_SECRET = new TextEncoder().encode(
    process.env.NEXTAUTH_SECRET || 'your-secret-key-change-this'
);

export async function GET(request: NextRequest) {
    try {
        // JWT 토큰에서 유저 정보 추출
        const token = request.cookies.get('auth-token')?.value;

        if (!token) {
            return NextResponse.json(
                { error: '인증이 필요합니다.' },
                { status: 401 }
            );
        }

        const { payload } = await jwtVerify(token, JWT_SECRET);
        const tier = payload.tier as TierLevel;

        // 등급별 캠페인 목록 조회
        const campaigns = await getCampaigns(tier);

        return NextResponse.json({ campaigns });
    } catch (error) {
        console.error('Get campaigns error:', error);
        return NextResponse.json(
            { error: '캠페인 목록을 불러오는 중 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}
