// route.ts - 캠페인 알림 토글 API
// CHANGED: 캠페인 알림 토글 API 신규 생성
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { updateCreatorNotification } from '@/lib/airtable';

if (!process.env.NEXTAUTH_SECRET) {
    throw new Error('NEXTAUTH_SECRET 환경변수가 설정되지 않았습니다.');
}
const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);

export async function PATCH(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth-token')?.value;
        if (!token) {
            return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
        }

        const { payload } = await jwtVerify(token, JWT_SECRET);
        // JWT payload에서 creatorId 추출 (크리에이터 명단 레코드 ID)
        const creatorId = (payload.creatorId || payload.id) as string;
        if (!creatorId) {
            return NextResponse.json({ error: 'creatorId를 찾을 수 없습니다.' }, { status: 400 });
        }

        const body = await request.json();
        const { enabled } = body;
        if (typeof enabled !== 'boolean') {
            return NextResponse.json({ error: 'enabled는 boolean이어야 합니다.' }, { status: 400 });
        }

        await updateCreatorNotification(creatorId, enabled);
        return NextResponse.json({ success: true, notificationEnabled: enabled });
    } catch (error) {
        console.error('Notification toggle error:', error);
        return NextResponse.json({ error: '알림 설정 변경 중 오류가 발생했습니다.' }, { status: 500 });
    }
}
