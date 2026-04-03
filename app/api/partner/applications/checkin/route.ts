// route.ts - 파트너 신청 체크인 정보 수정 API
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { updatePartnerCheckin, verifyPartnerApplicationOwnership } from '@/lib/airtable';

if (!process.env.NEXTAUTH_SECRET) {
    throw new Error('NEXTAUTH_SECRET 환경변수가 설정되지 않았습니다.');
}
const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);

export async function PATCH(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth-token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { payload } = await jwtVerify(token, JWT_SECRET);
        // CHANGED: payload.id → payload.creatorId (로그인 소스 전환)
        const userRecordId = payload.creatorId as string;

        const { recordId, checkInDate, checkInSite } = await request.json();

        if (!recordId || !checkInDate || !checkInSite) {
            return NextResponse.json(
                { error: '레코드 ID, 입실일, 입실 사이트를 모두 입력해주세요.' },
                { status: 400 }
            );
        }

        // CHANGED: IDOR 방어 — 해당 신청이 현재 로그인 사용자의 것인지 검증
        const isOwner = await verifyPartnerApplicationOwnership(recordId, userRecordId);
        if (!isOwner) {
            return NextResponse.json(
                { error: '본인의 신청만 수정할 수 있습니다.' },
                { status: 403 }
            );
        }

        await updatePartnerCheckin(recordId, checkInDate, checkInSite);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Partner checkin error:', error);
        return NextResponse.json(
            { error: '체크인 정보 수정 중 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}
