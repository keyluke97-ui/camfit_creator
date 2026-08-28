// route.ts - 지명형 프로필 이미지 업로드 API
// CHANGED: 지명형 1a — 프로필 이미지 POST 신규 생성. /api/** 는 미들웨어 밖 → 라우트 내 JWT 직접 검증.
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { uploadCreatorProfileImage } from '@/lib/airtable';

if (!process.env.NEXTAUTH_SECRET) {
    throw new Error('NEXTAUTH_SECRET 환경변수가 설정되지 않았습니다.');
}
const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);

// data URL 최대 크기(base64 팽창 고려 ~6.7MB → 원본 ≤5MB, Airtable uploadAttachment 한도)
const MAX_DATA_URL_LENGTH = 7_000_000;

// JWT에서 creatorId 추출 (IDOR 방어 — body로 record id 받지 않고 항상 토큰의 creatorId만 사용)
// 무효/만료/위조 토큰은 null 반환 → 401(토큰 없음과 동일). jwtVerify throw가 500으로 새지 않게.
async function resolveCreatorId(): Promise<string | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return null;
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return ((payload.creatorId || payload.id) as string) || null;
    } catch (error) {
        console.error('Invalid auth token on /api/creator/profile/image:', error);
        return null;
    }
}

export async function POST(request: NextRequest) {
    try {
        const creatorId = await resolveCreatorId();
        if (!creatorId) {
            return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
        }

        const body = await request.json();
        const dataUrl: string = typeof body.dataUrl === 'string' ? body.dataUrl : '';
        const filename: string = typeof body.filename === 'string' ? body.filename : 'profile.jpg';

        // 크기 먼저 확인(오버사이즈 페이로드 조기 차단) → 형식 확인
        if (dataUrl.length > MAX_DATA_URL_LENGTH) {
            return NextResponse.json(
                { error: '이미지 용량이 너무 큽니다. 5MB 이하로 올려주세요.' },
                { status: 400 }
            );
        }
        // data:<contentType>;base64,<data>
        const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
        if (!match) {
            return NextResponse.json({ error: '이미지 형식이 올바르지 않습니다.' }, { status: 400 });
        }
        const contentType = match[1];
        const fileBase64 = match[2];

        const imageUrl = await uploadCreatorProfileImage(creatorId, fileBase64, contentType, filename);
        return NextResponse.json({ success: true, imageUrl });
    } catch (error) {
        console.error('Upload profile image route error:', error);
        return NextResponse.json(
            { error: '이미지 업로드 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
            { status: 500 }
        );
    }
}
