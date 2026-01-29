import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
    process.env.NEXTAUTH_SECRET || 'your-secret-key-change-this'
);

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
    matcher: ['/dashboard/:path*', '/login']
};
