import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { applyCampaign } from '@/lib/airtable';
import type { TierLevel } from '@/types';

// CHANGED: 폴백 값 제거 — 환경변수 미설정 시 서버 시작 단계에서 에러 발생하도록
if (!process.env.NEXTAUTH_SECRET) {
    throw new Error('NEXTAUTH_SECRET 환경변수가 설정되지 않았습니다.');
}
const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);

export async function POST(req: NextRequest) {
    try {
        // 1. 세션 검증 (Manual JWT Verification)
        const token = req.cookies.get('auth-token')?.value;

        if (!token) {
            return NextResponse.json(
                { error: '로그인이 필요한 서비스입니다.' },
                { status: 401 }
            );
        }

        let payload;
        try {
            const result = await jwtVerify(token, JWT_SECRET);
            payload = result.payload;
        } catch (error) {
            return NextResponse.json(
                { error: '유효하지 않은 세션입니다.' },
                { status: 401 }
            );
        }

        // CHANGED: payload.id → payload.premiumId (로그인 소스 전환)
        // CHANGED: 기존 JWT 호환 — 구 JWT는 payload.id에 premiumId가 있음 (7일 내 자연 만료)
        const premiumId = (payload.premiumId || payload.id) as string | null;
        const channelName = payload.channelName as string;
        const tier = payload.tier as TierLevel;
        // CHANGED: 통합 — 블로거 차단(쿠폰 이벤트 캠페인 한정)에 사용
        const channelTypes = (payload.channelTypes || []) as string[];

        if (!premiumId || !channelName) {
            return NextResponse.json(
                { error: '프리미엄 협찬 등록이 필요합니다.' },
                { status: 403 }
            );
        }

        // 2. 요청 데이터 파싱
        const body = await req.json();
        const { campaignId, email } = body;

        if (!campaignId || !email) {
            return NextResponse.json(
                { error: '필수 정보가 누락되었습니다.' },
                { status: 400 }
            );
        }

        // 3. 에어테이블 로직 호출
        // CHANGED: userRecordId → premiumId (프리미엄 테이블 record ID)
        // CHANGED: 통합 — channelTypes 전달 → applyCampaign 내부에서 블로거+couponEvent 시 403 처리
        const result = await applyCampaign({
            campaignId,
            channelName,
            userRecordId: premiumId,
            email,
            tier,
            channelTypes
        });

        // 4. 성공 응답
        return NextResponse.json(result);

    } catch (error) {
        console.error('Campaign application error:', error);
        // CHANGED: 명시적 타입 어노테이션 제거 — unknown 내로잉으로 메시지 추출
        const message = error instanceof Error ? error.message : '';

        // 에러 코드에 따른 메시지 처리
        if (message === 'ALREADY_APPLIED') {
            return NextResponse.json(
                { error: '이미 신청한 캠페인입니다.' },
                { status: 409 }
            );
        }

        if (message === 'COUPON_NOT_FOUND') {
            return NextResponse.json(
                { error: '쿠폰 코드를 찾을 수 없습니다. 관리자에게 문의해주세요.' },
                { status: 404 }
            );
        }

        // CHANGED: 모집 인원 초과 에러 처리
        if (message === 'CAMPAIGN_FULL') {
            return NextResponse.json(
                { error: '해당 캠페인의 모집 인원이 마감되었습니다.' },
                { status: 409 }
            );
        }

        // CHANGED: 통합 — 쿠폰 풀 비어있음 (운영 실수로 쿠폰 자동 발행 전 모집중 전환)
        if (message === 'COUPON_POOL_EMPTY') {
            return NextResponse.json(
                { error: '팔로워 쿠폰이 일시적으로 부족합니다. 잠시 후 다시 시도해주세요. 계속되면 카카오톡 채널로 문의해주세요.' },
                { status: 409 }
            );
        }

        // CHANGED: 통합 — 동시 신청 race condition (배포 완료 사후 검증 실패)
        if (message === 'CAMPAIGN_RACE') {
            return NextResponse.json(
                { error: '동시 신청으로 일시적 충돌이 발생했습니다. 다시 시도해주세요.' },
                { status: 409 }
            );
        }

        // CHANGED: 통합 — 블로거가 쿠폰 이벤트 캠페인 신청 시 차단 (이중 방어의 백엔드단)
        if (message === 'BLOGGER_NOT_ELIGIBLE') {
            return NextResponse.json(
                { error: '팔로워 쿠폰 협찬은 인스타그램/유튜브 채널 보유자만 신청 가능합니다.' },
                { status: 403 }
            );
        }

        return NextResponse.json(
            // CHANGED: 500 에러에 행동 안내 접미 통일
            { error: '신청 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요. 계속되면 카카오톡 채널로 문의해주세요.' },
            { status: 500 }
        );
    }
}
