// route.ts - 크리에이터 프로필(포트폴리오+조건+원정+정산) 조회/저장 API
// CHANGED: 지명형 1a — 프로필 GET/PATCH 신규 생성. /api/** 는 미들웨어 밖 → 라우트 내 JWT 직접 검증.
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { getCreatorProfile, updateCreatorProfile } from '@/lib/airtable';
import { CHANNEL_TYPES } from '@/lib/constants';
import { violationMessage, wonjeongMessage } from '@/lib/creatorProfileRules';
import type { CreatorProfileUpdate, ChannelDetail } from '@/types';

if (!process.env.NEXTAUTH_SECRET) {
    throw new Error('NEXTAUTH_SECRET 환경변수가 설정되지 않았습니다.');
}
const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);

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
        console.error('Invalid auth token on /api/creator/profile:', error);
        return null;
    }
}

/**
 * CHANGED: 1a-v2 — 클라이언트가 보낸 channels 객체를 알려진 채널 키로만 재구성한다.
 * 임의 키를 그대로 통과시키면 ① Object.values 순회에 이상 값이 섞이고
 * ② `__proto__` 같은 상속키가 CHANNEL_FIELD_MAP 인덱싱에 닿는다.
 * 값 범위 검증(0 이상 정수 등)은 validateChannelPayload가 다시 한다.
 */
function parseChannels(raw: unknown): Record<string, ChannelDetail> {
    const source = (raw && typeof raw === 'object') ? (raw as Record<string, unknown>) : {};
    const result: Record<string, ChannelDetail> = {};
    for (const channel of CHANNEL_TYPES) {
        const entry = Object.prototype.hasOwnProperty.call(source, channel)
            ? (source[channel] as Record<string, unknown> | null)
            : null;
        const detail = (entry && typeof entry === 'object') ? entry : {};
        result[channel] = {
            url: typeof detail.url === 'string' ? detail.url : '',
            follower: typeof detail.follower === 'number' ? detail.follower : 0,
            engagement: typeof detail.engagement === 'number' ? detail.engagement : 0,
            blogIndex: typeof detail.blogIndex === 'string' ? detail.blogIndex : '',
            strength: typeof detail.strength === 'string' ? detail.strength : '',
        };
    }
    return result;
}

export async function GET() {
    try {
        const creatorId = await resolveCreatorId();
        if (!creatorId) {
            return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
        }

        const profile = await getCreatorProfile(creatorId);
        if (!profile) {
            return NextResponse.json(
                { error: '프로필을 불러오지 못했습니다. 잠시 후 다시 시도해주세요. 계속되면 카카오톡 채널로 문의해주세요.' },
                { status: 500 }
            );
        }
        return NextResponse.json({ profile });
    } catch (error) {
        console.error('Get creator profile route error:', error);
        return NextResponse.json(
            { error: '프로필 조회 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
            { status: 500 }
        );
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const creatorId = await resolveCreatorId();
        if (!creatorId) {
            return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
        }

        const body = await request.json();
        // 방어적 파싱 — 편집 가능 필드만 취함(그 외 무시). 공개 게이팅·원정 검증은 lib 서버측에서 재확인.
        const payload: CreatorProfileUpdate = {
            representativeLink: typeof body.representativeLink === 'string' ? body.representativeLink : '',
            minSponsorAmount: typeof body.minSponsorAmount === 'number' ? body.minSponsorAmount : 0,
            visitRegions: Array.isArray(body.visitRegions) ? body.visitRegions : [],
            visitDays: Array.isArray(body.visitDays) ? body.visitDays : [],
            acceptSiteTypes: Array.isArray(body.acceptSiteTypes) ? body.acceptSiteTypes : [],
            // CHANGED: 2026-08-31 — baseRegion을 의도적으로 안 받는다(심사 필드와 같은 이유).
            //   기준 지역은 원정 후보 집합 전체를 결정하는 앵커라, 크리에이터가 정하면
            //   자기 거주지를 원정으로 켤 수 있다(WONJEONG_MAP 좌우 대칭). 서버가 정산 주소에서 파생시킨다.
            wonjeongRegions: Array.isArray(body.wonjeongRegions) ? body.wonjeongRegions : [],
            isPublic: body.isPublic === true,
            // CHANGED: 1a-v2 — 채널 포트폴리오·콘텐츠. autoAcceptActive는 폐지(D1).
            //          심사 필드는 의도적으로 안 받는다 — 크리에이터가 자기 프로필을 '승인'으로 만들 수 없어야 한다.
            channelTypes: Array.isArray(body.channelTypes) ? body.channelTypes : [],
            representativeChannel: typeof body.representativeChannel === 'string' ? body.representativeChannel : '',
            channels: parseChannels(body.channels),
            representativeLink2: typeof body.representativeLink2 === 'string' ? body.representativeLink2 : '',
            representativeLink3: typeof body.representativeLink3 === 'string' ? body.representativeLink3 : '',
            contentFormats: Array.isArray(body.contentFormats) ? body.contentFormats : [],
            contentStandard: typeof body.contentStandard === 'string' ? body.contentStandard : '',
            creatorEmail: typeof body.creatorEmail === 'string' ? body.creatorEmail : '',
            // CHANGED: 2026-08-12 협찬 조건 표준화. 검증은 updateCreatorProfile이 한다
            uploadDeadlineDays: typeof body.uploadDeadlineDays === 'number' ? body.uploadDeadlineDays : null,
            companions: typeof body.companions === 'number' ? body.companions : 0,
            petAllowed: body.petAllowed === true,
            droneUsed: body.droneUsed === true,
            channelConcepts: Array.isArray(body.channelConcepts) ? body.channelConcepts : [],
        };

        const result = await updateCreatorProfile(creatorId, payload);
        if (!result.ok) {
            // CHANGED: 2026-08-25 — 어느 항목이 문제인지 말해준다(캠지기측 협의 (c)).
            // 전에는 전부 "입력 조건을 확인해주세요."라, 승인 이후 다른 항목만 고치려던 사람이
            // 자기가 건드린 적 없는 항목 때문에 막힌 채 이유를 알 수 없었다.
            let message: string;
            if (result.code === 'INCOMPLETE' && result.missing?.length) {
                message = `공개하려면 다음을 먼저 채워주세요 — ${result.missing.join(' · ')}`;
            } else if (result.code === 'INVALID_WONJEONG') {
                // CHANGED: 2026-08-31 — 막힌 이유가 4가지라 detail로 갈라 말해준다(WONJEONG_MESSAGES).
                message = wonjeongMessage(result.detail);
            } else {
                message = violationMessage(result.detail);
            }
            return NextResponse.json(
                { error: message, code: result.code, missing: result.missing, detail: result.detail },
                { status: 400 }
            );
        }
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Update creator profile route error:', error);
        return NextResponse.json(
            { error: '프로필 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요. 계속되면 카카오톡 채널로 문의해주세요.' },
            { status: 500 }
        );
    }
}
