import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const response = NextResponse.json({ success: true });

    // 쿠키 삭제
    response.cookies.delete('auth-token');

    return response;
}
