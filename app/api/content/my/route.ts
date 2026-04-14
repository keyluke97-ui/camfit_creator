// CHANGED: 내 콘텐츠 제출 내역 조회 API
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { getCreatorContentUploads } from '@/lib/airtable';

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
        // CHANGED: ARRAYJOIN({크리에이터 명단})은 record ID가 아닌 primary field(채널명)를 반환하므로 channelName으로 필터링
        const channelName = payload.channelName as string;

        const uploads = await getCreatorContentUploads(channelName);
        return NextResponse.json({ uploads });
    } catch (error) {
        console.error('Content my error:', error);
        return NextResponse.json(
            { error: '콘텐츠 내역 조회 중 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}
