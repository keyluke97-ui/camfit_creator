import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// CHANGED: 하드코딩된 폴백 시크릿 제거 — 환경변수 미설정 시 즉시 에러
const nextAuthSecret = process.env.NEXTAUTH_SECRET;
if (!nextAuthSecret) {
    throw new Error('NEXTAUTH_SECRET 환경변수가 설정되지 않았습니다.');
}
const JWT_SECRET = new TextEncoder().encode(nextAuthSecret);

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // 로그인 페이지 접속 시 이미 로그인되어 있다면 대시보드로 이동
    if (pathname === '/login' || pathname === '/') {
        const token = request.cookies.get('auth-token')?.value;
        if (token) {
            try {
                await jwtVerify(token, JWT_SECRET);
                return NextResponse.redirect(new URL('/dashboard', request.url));
            } catch (error) {
                // 토큰이 유효하지 않으면 그냥 진행 (로그인 페이지 표시)
            }
        }
        if (pathname === '/login') return NextResponse.next();
    }

    // CHANGED: 프리미엄 등록 페이지 — 로그인 필수 (JWT에서 creatorId 필요)
    if (pathname.startsWith('/premium-register')) {
        const token = request.cookies.get('auth-token')?.value;

        if (!token) {
            return NextResponse.redirect(new URL('/login', request.url));
        }

        try {
            await jwtVerify(token, JWT_SECRET);
            return NextResponse.next();
        } catch (error) {
            console.error('Token verification failed:', error);
            return NextResponse.redirect(new URL('/login', request.url));
        }
    }

    // 대시보드는 인증 필요
    if (pathname.startsWith('/dashboard')) {
        const token = request.cookies.get('auth-token')?.value;

        if (!token) {
            return NextResponse.redirect(new URL('/login', request.url));
        }

        try {
            // JWT 검증
            await jwtVerify(token, JWT_SECRET);
            return NextResponse.next();
        } catch (error) {
            console.error('Token verification failed:', error);
            return NextResponse.redirect(new URL('/login', request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    // CHANGED: /premium-register 경로 보호 추가
    matcher: ['/dashboard/:path*', '/premium-register', '/login']
};
