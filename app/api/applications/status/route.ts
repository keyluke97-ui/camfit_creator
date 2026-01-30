
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { updateApplicationStatus } from '@/lib/airtable';

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

        // 2. 요청 데이터 확인
        const body = await request.json();
        const { recordId, status } = body;

        if (!recordId || !status || (status !== '변경' && status !== '취소')) {
            return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
        }

        // 3. Airtable 상태 업데이트 호출
        await updateApplicationStatus(recordId, status);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Update status error:', error);
        return NextResponse.json(
            { error: '상태 변경 중 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}
