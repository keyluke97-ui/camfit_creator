
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { updateApplicationStatus } from '@/lib/airtable';

// CHANGED: 폴백 값 제거 — 환경변수 미설정 시 서버 시작 단계에서 에러 발생하도록
if (!process.env.NEXTAUTH_SECRET) {
    throw new Error('NEXTAUTH_SECRET 환경변수가 설정되지 않았습니다.');
}
const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);

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
            // CHANGED: '잘못된 요청입니다' → 사용자 행동 지시 톤
            return NextResponse.json({ error: '요청 내용을 확인해주세요.' }, { status: 400 });
        }

        // 3. Airtable 상태 업데이트 호출
        await updateApplicationStatus(recordId, status);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Update status error:', error);
        return NextResponse.json(
            // CHANGED: 500 에러에 행동 안내 접미 통일
            { error: '상태 변경 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요. 계속되면 카카오톡 채널로 문의해주세요.' },
            { status: 500 }
        );
    }
}
