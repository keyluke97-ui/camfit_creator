
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { updateApplicationCheckin } from '@/lib/airtable';

const JWT_SECRET = new TextEncoder().encode(
    process.env.NEXTAUTH_SECRET || 'your-secret-key-change-this'
);

export async function PATCH(request: Request) {
    try {
        // 1. 토큰 검증
        const cookieStore = await cookies();
        const token = cookieStore.get('auth-token')?.value;
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        await jwtVerify(token, JWT_SECRET);

        // 2. Body 파싱
        const body = await request.json();
        const { recordId, checkInDate, checkInSite } = body;

        if (!recordId || !checkInDate || !checkInSite) {
            return NextResponse.json(
                { error: '필수 정보가 누락되었습니다.' },
                { status: 400 }
            );
        }

        // 3. 입실 정보 업데이트
        await updateApplicationCheckin(recordId, checkInDate, checkInSite);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Failed to update check-in:', error);
        return NextResponse.json(
            { error: '입실 정보 등록 중 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}
