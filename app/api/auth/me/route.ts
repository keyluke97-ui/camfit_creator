// route.ts - 현재 로그인 사용자 정보 조회 API
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

// CHANGED: 폴백 값 제거 — 환경변수 미설정 시 서버 시작 단계에서 에러 발생하도록
if (!process.env.NEXTAUTH_SECRET) {
    throw new Error('NEXTAUTH_SECRET 환경변수가 설정되지 않았습니다.');
}
const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth-token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { payload } = await jwtVerify(token, JWT_SECRET);

        // CHANGED: creatorId/premiumId 분리 반환 (로그인 소스 전환)
        // CHANGED: 기존 JWT 호환 — 구 JWT는 payload.id에 premiumId가 있고 creatorId 없음
        // CHANGED: notificationEnabled 반환 추가 — 알림 토글 상태
        return NextResponse.json({
            user: {
                creatorId: payload.creatorId || null,
                channelName: payload.channelName,
                tier: payload.tier,
                channelTypes: payload.channelTypes || [],
                premiumId: payload.premiumId || payload.id || null,
                notificationEnabled: payload.notificationEnabled !== false
            }
        });
    } catch (error) {
        console.error('Auth me error:', error);
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
}
