import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { applyCampaign } from '@/lib/airtable';

const JWT_SECRET = new TextEncoder().encode(
    process.env.NEXTAUTH_SECRET || 'your-secret-key-change-this'
);

export async function POST(req: NextRequest) {
    try {
        // 1. 세션 검증 (Manual JWT Verification)
        const token = req.cookies.get('auth-token')?.value;

        if (!token) {
            return NextResponse.json(
                { error: '로그인이 필요한 서비스입니다.' },
                { status: 401 }
            );
        }

        let payload;
        try {
            const result = await jwtVerify(token, JWT_SECRET);
            payload = result.payload;
        } catch (error) {
            return NextResponse.json(
                { error: '유효하지 않은 세션입니다.' },
                { status: 401 }
            );
        }

        const userRecordId = payload.id as string;
        const channelName = payload.channelName as string;

        if (!userRecordId || !channelName) {
            return NextResponse.json(
                { error: '세션 정보가 올바르지 않습니다.' },
                { status: 401 }
            );
        }

        // 2. 요청 데이터 파싱
        const body = await req.json();
        const { campaignId, email } = body;

        if (!campaignId || !email) {
            return NextResponse.json(
                { error: '필수 정보가 누락되었습니다.' },
                { status: 400 }
            );
        }

        // 3. 에어테이블 로직 호출
        const result = await applyCampaign({
            campaignId,
            channelName,
            userRecordId,
            email
        });

        // 4. 성공 응답
        return NextResponse.json(result);

    } catch (error: any) {
        console.error('Campaign application error:', error);

        // 에러 코드에 따른 메시지 처리
        if (error.message === 'ALREADY_APPLIED') {
            return NextResponse.json(
                { error: '이미 신청한 캠페인입니다.' },
                { status: 409 }
            );
        }

        if (error.message === 'COUPON_NOT_FOUND') {
            return NextResponse.json(
                { error: '쿠폰 코드를 찾을 수 없습니다. 관리자에게 문의해주세요.' },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { error: '신청 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
            { status: 500 }
        );
    }
}
