
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { getUserApplications } from '@/lib/airtable';

const JWT_SECRET = new TextEncoder().encode(
    process.env.NEXTAUTH_SECRET || 'your-secret-key-change-this'
);

export async function GET() {
    try {
        // 1. 토큰 검증 및 사용자 정보 추출
        const cookieStore = await cookies();
        const token = cookieStore.get('auth-token')?.value;

        if (!token) {
            return NextResponse.json(
                { error: '로그인이 필요합니다.' },
                { status: 401 }
            );
        }

        const { payload } = await jwtVerify(token, JWT_SECRET);
        const channelName = payload.channelName as string;

        if (!channelName) {
            return NextResponse.json(
                { error: '유효하지 않은 사용자 정보입니다.' },
                { status: 401 }
            );
        }

        // 2. Airtable에서 신청 내역 조회
        const applications = await getUserApplications(channelName);

        return NextResponse.json({ applications });
    } catch (error: any) {
        console.error('Failed to fetch applications:', error);
        return NextResponse.json(
            { error: '신청 내역을 불러오는 중 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}
