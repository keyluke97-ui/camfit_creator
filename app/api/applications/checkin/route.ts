
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { updateApplicationCheckin } from '@/lib/airtable';

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
            // CHANGED: 500 에러에 행동 안내 접미 통일
            { error: '입실 정보 등록 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요. 계속되면 카카오톡 채널로 문의해주세요.' },
            { status: 500 }
        );
    }
}
