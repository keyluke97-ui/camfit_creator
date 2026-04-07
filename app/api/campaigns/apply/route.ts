import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { applyCampaign } from '@/lib/airtable';
import type { TierLevel } from '@/types';

// CHANGED: 폴백 값 제거 — 환경변수 미설정 시 서버 시작 단계에서 에러 발생하도록
if (!process.env.NEXTAUTH_SECRET) {
    throw new Error('NEXTAUTH_SECRET 환경변수가 설정되지 않았습니다.');
}
const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);

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

        // CHANGED: payload.id → payload.premiumId (로그인 소스 전환)
        // CHANGED: 기존 JWT 호환 — 구 JWT는 payload.id에 premiumId가 있음 (7일 내 자연 만료)
        const premiumId = (payload.premiumId || payload.id) as string | null;
        const channelName = payload.channelName as string;
        const tier = payload.tier as TierLevel;

        if (!premiumId || !channelName) {
            return NextResponse.json(
                { error: '프리미엄 협찬 등록이 필요합니다.' },
                { status: 403 }
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
        // CHANGED: userRecordId → premiumId (프리미엄 테이블 record ID)
        const result = await applyCampaign({
            campaignId,
            channelName,
            userRecordId: premiumId,
            email,
            tier
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

        // CHANGED: 모집 인원 초과 에러 처리
        if (error.message === 'CAMPAIGN_FULL') {
            return NextResponse.json(
                { error: '해당 캠페인의 모집 인원이 마감되었습니다.' },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { error: '신청 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
            { status: 500 }
        );
    }
}
