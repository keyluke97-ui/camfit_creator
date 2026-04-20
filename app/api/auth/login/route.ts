// route.ts - 크리에이터 로그인 API (크리에이터 명단 테이블 기반)
import { NextRequest, NextResponse } from 'next/server';
// CHANGED: authenticateInfluencer → authenticateCreator (로그인 소스 전환)
import { authenticateCreator } from '@/lib/airtable';
import { SignJWT } from 'jose';

// CHANGED: 폴백 값 제거 — 환경변수 미설정 시 서버 시작 단계에서 에러 발생하도록
if (!process.env.NEXTAUTH_SECRET) {
    throw new Error('NEXTAUTH_SECRET 환경변수가 설정되지 않았습니다.');
}
const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);

export async function POST(request: NextRequest) {
    try {
        // CHANGED: 생년월일 제거 — 채널명 + 연락처 뒤4자리만으로 인증
        const { channelName, phoneLastFour } = await request.json();

        // 입력 검증
        if (!channelName || !phoneLastFour) {
            return NextResponse.json(
                { error: '채널명과 연락처 뒤 4자리를 입력해주세요.' },
                { status: 400 }
            );
        }

        // 연락처 뒷자리 검증 (4자리 숫자)
        if (!/^\d{4}$/.test(phoneLastFour)) {
            return NextResponse.json(
                { error: '연락처 뒷자리는 4자리 숫자로 입력해주세요.' },
                { status: 400 }
            );
        }

        // CHANGED: 크리에이터 명단 테이블 기반 인증
        const creator = await authenticateCreator(channelName, phoneLastFour);

        if (!creator) {
            return NextResponse.json(
                { error: '채널명 또는 연락처가 일치하지 않습니다.' },
                { status: 401 }
            );
        }

        // CHANGED: JWT payload에 creatorId/premiumId 분리
        // CHANGED: notificationEnabled 추가 — 알림 토글 상태
        const token = await new SignJWT({
            creatorId: creator.creatorId,
            channelName: creator.channelName,
            tier: creator.tier,
            channelTypes: creator.channelTypes,
            premiumId: creator.premiumId,
            notificationEnabled: creator.notificationEnabled
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setExpirationTime('7d')
            .sign(JWT_SECRET);

        // CHANGED: 응답에 premiumId 포함
        const response = NextResponse.json({
            success: true,
            creator: {
                channelName: creator.channelName,
                tier: creator.tier,
                channelTypes: creator.channelTypes,
                premiumId: creator.premiumId
            }
        });

        response.cookies.set('auth-token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7 // 7 days
        });

        return response;
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            // CHANGED: 500 에러에 행동 안내 접미 통일
            { error: '로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요. 계속되면 카카오톡 채널로 문의해주세요.' },
            { status: 500 }
        );
    }
}
