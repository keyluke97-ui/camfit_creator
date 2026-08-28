import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { extendCampaignDeadline } from '@/lib/airtable';

if (!process.env.NEXTAUTH_SECRET) {
    throw new Error('NEXTAUTH_SECRET 환경변수가 설정되지 않았습니다.');
}
const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);

// 기한 연장 액션 — apply=false면 미리보기(계산+가드), apply=true면 실행+재조회 검증.
// 유일한 쓰기 어드민 API. 실물 캠핏 쿠폰 재발급은 웹에서 하지 않는다(SOP Step 5 별도 트랙).
export async function POST(request: Request) {
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

        const { campaignId, targetDate, apply } = await request.json();
        if (typeof campaignId !== 'string' || !/^rec[A-Za-z0-9]{14}$/.test(campaignId)) {
            return NextResponse.json({ error: '캠페인 ID가 올바르지 않습니다.' }, { status: 400 });
        }
        if (typeof targetDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
            return NextResponse.json({ error: '목표 날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)' }, { status: 400 });
        }

        const result = await extendCampaignDeadline(campaignId, targetDate, apply === true);
        return NextResponse.json({ result });
    } catch (error) {
        console.error('Admin extend error:', error);
        return NextResponse.json(
            { error: '기한 연장 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
            { status: 500 }
        );
    }
}
