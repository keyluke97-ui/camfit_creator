import { NextRequest, NextResponse } from 'next/server';
import { authenticateInfluencer } from '@/lib/airtable';
import { SignJWT } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
    process.env.NEXTAUTH_SECRET || 'your-secret-key-change-this'
);

export async function POST(request: NextRequest) {
    try {
        const { channelName, birthDate, phoneLastFour } = await request.json();

        // 입력 검증
        if (!channelName || !birthDate || !phoneLastFour) {
            return NextResponse.json(
                { error: '모든 필드를 입력해주세요.' },
                { status: 400 }
            );
        }

        // 생년월일 형식 검증 (6자리 숫자)
        if (!/^\d{6}$/.test(birthDate)) {
            return NextResponse.json(
                { error: '생년월일은 6자리 숫자로 입력해주세요. (YYMMDD)' },
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

        // Airtable 인증
        const influencer = await authenticateInfluencer(
            channelName,
            birthDate,
            phoneLastFour
        );

        if (!influencer) {
            return NextResponse.json(
                { error: '채널명, 생년월일 또는 연락처가 일치하지 않습니다.' },
                { status: 401 }
            );
        }

        // JWT 토큰 생성
        const token = await new SignJWT({
            id: influencer.id,
            channelName: influencer.channelName,
            tier: influencer.tier
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setExpirationTime('7d')
            .sign(JWT_SECRET);

        // 쿠키에 토큰 저장
        const response = NextResponse.json({
            success: true,
            influencer: {
                channelName: influencer.channelName,
                tier: influencer.tier
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
            { error: '로그인 중 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}
