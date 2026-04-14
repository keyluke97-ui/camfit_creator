// CHANGED: 캠핑장목록 검색 API — 콘텐츠 제출 시 숙소 선택 드롭다운용
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { searchAccommodations } from '@/lib/airtable';

if (!process.env.NEXTAUTH_SECRET) {
    throw new Error('NEXTAUTH_SECRET 환경변수가 설정되지 않았습니다.');
}
const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);

export async function GET(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth-token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await jwtVerify(token, JWT_SECRET);

        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q') || undefined;

        const accommodations = await searchAccommodations(query);
        return NextResponse.json({ accommodations });
    } catch (error) {
        console.error('Accommodations search error:', error);
        return NextResponse.json(
            { error: '캠핑장 검색 중 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}
