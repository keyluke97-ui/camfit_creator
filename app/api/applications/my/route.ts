
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { getUserApplications } from '@/lib/airtable';

// CHANGED: 폴백 값 제거 — 환경변수 미설정 시 서버 시작 단계에서 에러 발생하도록
if (!process.env.NEXTAUTH_SECRET) {
    throw new Error('NEXTAUTH_SECRET 환경변수가 설정되지 않았습니다.');
}
const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);

export async function GET() {
    try {
        // 1. 토큰 검증 및 사용자 정보 추출
        const cookieStore = await cookies();
        const token = cookieStore.get('auth-token')?.value;

        if (!token) {
            return NextResponse.json(
                { error: '로그인이 필요합니다.' },
                { status: 401 }
            );
        }

        const { payload } = await jwtVerify(token, JWT_SECRET);
        const channelName = payload.channelName as string;

        // CHANGED: premiumId 없으면 프리미엄 신청 내역 조회 불가
        // CHANGED: 기존 JWT 호환 — 구 JWT는 payload.id에 premiumId가 있음
        if (!channelName || (!payload.premiumId && !payload.id)) {
            return NextResponse.json(
                { error: '프리미엄 협찬 등록이 필요합니다.' },
                { status: 403 }
            );
        }

        // 2. Airtable에서 신청 내역 조회
        const applications = await getUserApplications(channelName);

        return NextResponse.json({ applications });
    } catch (error: any) {
        console.error('Failed to fetch applications:', error);
        return NextResponse.json(
            // CHANGED: 500 에러에 행동 안내 접미 통일
            { error: '신청 내역을 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요. 계속되면 카카오톡 채널로 문의해주세요.' },
            { status: 500 }
        );
    }
}
