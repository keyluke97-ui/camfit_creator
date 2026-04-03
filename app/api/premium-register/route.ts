// route.ts - 프리미엄 협찬 크리에이터 등록 API
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { registerPremiumCreator } from '@/lib/airtable';

if (!process.env.NEXTAUTH_SECRET) {
    throw new Error('NEXTAUTH_SECRET 환경변수가 설정되지 않았습니다.');
}
const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);

// 필수 입력 필드 목록
const REQUIRED_FIELDS = [
    'name', 'birthDate', 'phone', 'bank',
    'accountHolder', 'accountNumber', 'residentNumber',
    'address', 'businessType'
] as const;

export async function POST(request: NextRequest) {
    try {
        // 1. JWT 인증
        const token = request.cookies.get('auth-token')?.value;
        if (!token) {
            return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
        }

        const { payload } = await jwtVerify(token, JWT_SECRET);
        const creatorId = payload.creatorId as string;
        const channelName = payload.channelName as string;

        if (!creatorId || !channelName) {
            return NextResponse.json({ error: '유효하지 않은 토큰입니다.' }, { status: 401 });
        }

        // 2. 이미 프리미엄 등록된 경우 차단
        const premiumId = payload.premiumId as string | null;
        if (premiumId) {
            return NextResponse.json({ error: '이미 프리미엄 협찬에 등록되어 있습니다.' }, { status: 409 });
        }

        // 3. 요청 body 파싱
        const body = await request.json();

        // 4. 필수 필드 검증
        for (const field of REQUIRED_FIELDS) {
            if (!body[field] || String(body[field]).trim() === '') {
                return NextResponse.json(
                    { error: `필수 항목이 누락되었습니다: ${field}` },
                    { status: 400 }
                );
            }
        }

        // 5. 기타 은행 선택 시 직접 입력 값 검증
        if (body.bank === '기타(직접입력)' && (!body.customBank || body.customBank.trim() === '')) {
            return NextResponse.json(
                { error: '기타 은행명을 입력해주세요.' },
                { status: 400 }
            );
        }

        // 6. 사업자 선택 시 조건부 필드 검증
        if (body.businessType === '사업자') {
            if (!body.taxEmail || body.taxEmail.trim() === '') {
                return NextResponse.json(
                    { error: '세금 계산서 발행 이메일을 입력해주세요.' },
                    { status: 400 }
                );
            }
            if (!body.businessNumber || body.businessNumber.trim() === '') {
                return NextResponse.json(
                    { error: '사업자 번호를 입력해주세요.' },
                    { status: 400 }
                );
            }
        }

        // 7. 동의 체크박스 4개 전부 체크 확인
        if (!body.consentPrivacy || !body.consentTax || !body.consentContent || !body.consentPayment) {
            return NextResponse.json(
                { error: '모든 동의 항목에 체크해주세요.' },
                { status: 400 }
            );
        }

        // 8. Airtable 레코드 생성
        const result = await registerPremiumCreator({
            creatorId,
            channelName,
            name: body.name.trim(),
            birthDate: body.birthDate,
            phone: body.phone.trim(),
            bank: body.bank,
            customBank: body.customBank?.trim() || '',
            accountHolder: body.accountHolder.trim(),
            accountNumber: body.accountNumber.trim(),
            residentNumber: body.residentNumber.trim(),
            address: body.address.trim(),
            businessType: body.businessType,
            taxEmail: body.taxEmail?.trim() || '',
            businessNumber: body.businessNumber?.trim() || ''
        });

        return NextResponse.json({
            success: true,
            recordId: result.recordId,
            message: '프리미엄 협찬 등록이 완료되었습니다. 재로그인하시면 프리미엄 탭이 활성화됩니다.'
        });
    } catch (error: unknown) {
        console.error('Premium register API error:', error);

        const errorMessage = error instanceof Error ? error.message : '';

        if (errorMessage === 'ALREADY_REGISTERED') {
            return NextResponse.json(
                { error: '이미 프리미엄 협찬에 등록되어 있습니다.' },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { error: '등록 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
            { status: 500 }
        );
    }
}
