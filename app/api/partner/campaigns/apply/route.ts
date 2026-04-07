// route.ts - 파트너 캠페인 신청 API (2단계 검증 + 자동 마감)
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { applyPartnerCampaign } from '@/lib/airtable';
// CHANGED: 공통 상수/함수를 constants.ts에서 import (중복 제거)
import { hasPartnerEligibleChannel } from '@/lib/constants';

if (!process.env.NEXTAUTH_SECRET) {
    throw new Error('NEXTAUTH_SECRET 환경변수가 설정되지 않았습니다.');
}
const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);

export async function POST(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth-token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { payload } = await jwtVerify(token, JWT_SECRET);
        const channelTypes = (payload.channelTypes as string[]) || [];

        // 블로거 제외 (이중 방어)
        if (!hasPartnerEligibleChannel(channelTypes)) {
            return NextResponse.json(
                { error: '파트너 협찬은 인스타그램 또는 유튜브 채널이 필요합니다.' },
                { status: 403 }
            );
        }

        // CHANGED: checkInDate/checkInSite 선택으로 변경 — 신청 후 성공 화면에서 등록
        const { campaignId, checkInDate, checkInSite } = await request.json();

        if (!campaignId) {
            return NextResponse.json(
                { error: '캠페인 ID를 입력해주세요.' },
                { status: 400 }
            );
        }

        // CHANGED: payload.id → payload.creatorId (로그인 소스 전환)
        const userRecordId = payload.creatorId as string;

        const result = await applyPartnerCampaign({
            campaignId,
            userRecordId,
            checkInDate: checkInDate || undefined,
            checkInSite: checkInSite || undefined
        });

        return NextResponse.json(result);
    } catch (error: unknown) {
        console.error('Partner apply error:', error);

        const errorMessage = error instanceof Error ? error.message : '';

        if (errorMessage === 'ALREADY_APPLIED') {
            return NextResponse.json(
                { error: '이미 신청한 캠페인입니다.' },
                { status: 409 }
            );
        }
        if (errorMessage === 'CAMPAIGN_FULL') {
            return NextResponse.json(
                { error: '모집이 마감되었습니다.' },
                { status: 409 }
            );
        }
        // CHANGED: 서버 사이드 날짜 범위 검증 에러 처리 추가
        if (errorMessage === 'INVALID_DATE_RANGE') {
            return NextResponse.json(
                { error: '입실일이 방문 가능 기간을 벗어났습니다.' },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: '신청 중 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}
