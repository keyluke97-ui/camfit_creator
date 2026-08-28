import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { getAdminOverview } from '@/lib/airtable';

if (!process.env.NEXTAUTH_SECRET) {
    throw new Error('NEXTAUTH_SECRET 환경변수가 설정되지 않았습니다.');
}
const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);

// 관리자 어드민 개요 — 조회 전용. admin-token(role=admin)만 통과.
export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('admin-token')?.value;
        if (!token) {
            return NextResponse.json({ error: '관리자 로그인이 필요합니다.' }, { status: 401 });
        }

        try {
            const { payload } = await jwtVerify(token, JWT_SECRET);
            if (payload.role !== 'admin') {
                return NextResponse.json({ error: '관리자 권한이 없습니다.' }, { status: 403 });
            }
        } catch {
            return NextResponse.json({ error: '세션이 만료되었습니다. 다시 로그인해주세요.' }, { status: 401 });
        }

        const overview = await getAdminOverview();
        return NextResponse.json({ overview });
    } catch (error) {
        console.error('Admin overview error:', error);
        return NextResponse.json(
            { error: '현황을 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
            { status: 500 }
        );
    }
}
