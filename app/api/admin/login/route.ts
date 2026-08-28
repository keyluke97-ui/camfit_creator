import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { SignJWT } from 'jose';

if (!process.env.NEXTAUTH_SECRET) {
    throw new Error('NEXTAUTH_SECRET 환경변수가 설정되지 않았습니다.');
}
const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);

const ADMIN_SESSION_HOURS = 12;

// 관리자 로그인 — ADMIN_PASSWORD 환경변수 대조 후 role=admin JWT 발급.
// 크리에이터 인증(auth-token)과 완전히 분리된 별도 쿠키(admin-token)를 쓴다.
export async function POST(request: Request) {
    try {
        const adminPassword = process.env.ADMIN_PASSWORD;
        if (!adminPassword) {
            // 환경변수 미등록 상태에서는 어드민 자체를 잠근다 (Vercel에 ADMIN_PASSWORD 등록 필요)
            return NextResponse.json(
                { error: '관리자 비밀번호가 설정되지 않았습니다. 운영자에게 문의하세요.' },
                { status: 503 }
            );
        }

        const { password } = await request.json();
        if (typeof password !== 'string' || password.length === 0) {
            return NextResponse.json({ error: '비밀번호를 입력해주세요.' }, { status: 400 });
        }

        // 길이가 다르면 timingSafeEqual이 throw하므로 먼저 거른다 (길이 자체는 비밀이 아님)
        const given = Buffer.from(password);
        const expected = Buffer.from(adminPassword);
        const matched = given.length === expected.length && timingSafeEqual(given, expected);
        if (!matched) {
            return NextResponse.json({ error: '비밀번호가 올바르지 않습니다.' }, { status: 401 });
        }

        const token = await new SignJWT({ role: 'admin' })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime(`${ADMIN_SESSION_HOURS}h`)
            .sign(JWT_SECRET);

        const response = NextResponse.json({ success: true });
        response.cookies.set('admin-token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * ADMIN_SESSION_HOURS
        });
        return response;
    } catch (error) {
        console.error('Admin login error:', error);
        return NextResponse.json(
            { error: '로그인 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
            { status: 500 }
        );
    }
}
