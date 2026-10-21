// CHANGED: 콘텐츠 제출 API — 인플루언서 컨텐츠 업로드 테이블에 레코드 생성
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { submitContentUpload, countSafeCancelRewardsThisMonth } from '@/lib/airtable';
import type { ContentSubmitPayload, SponsorshipType, SafeCancelRewardSubmission } from '@/types';
// CHANGED: 안심취소 리워드(트랙 A 파일럿) 설정값 — 클라이언트와 같은 검증 기준
import {
    SAFE_CANCEL_CHECKLIST,
    SAFE_CANCEL_MONTHLY_LIMIT_PER_CREATOR,
    SAFE_CANCEL_MONTHLY_LIMIT_MESSAGE,
    isInstagramReelUrl,
    isSafeCancelParticipationType,
} from '@/lib/safeCancelReward';

if (!process.env.NEXTAUTH_SECRET) {
    throw new Error('NEXTAUTH_SECRET 환경변수가 설정되지 않았습니다.');
}
const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);

const VALID_SPONSORSHIP_TYPES: SponsorshipType[] = ['캠핑장 예약', '프리미엄 협찬'];

// CHANGED: 안심취소 리워드 페이로드 검증 — 실패 시 에러 메시지, 통과 시 정규화된 값
function parseSafeCancelReward(raw: unknown, contentLink: string): { value?: SafeCancelRewardSubmission; error?: string } {
    if (raw === undefined || raw === null) return {};
    if (typeof raw !== 'object') return { error: '안심취소 리워드 정보가 올바르지 않습니다.' };
    const input = raw as { checklist?: Record<string, unknown>; participationType?: unknown; repostConsent?: unknown };

    if (!isInstagramReelUrl(contentLink)) {
        return { error: '안심취소 리워드는 인스타그램 릴스 링크만 참여할 수 있습니다.' };
    }
    const checklist = Object.fromEntries(
        SAFE_CANCEL_CHECKLIST.map((item) => [item.key, input.checklist?.[item.key] === true])
    );
    if (Object.values(checklist).some((checked) => !checked)) {
        return { error: '안심취소 리워드 참여 조건을 모두 확인해주세요.' };
    }
    if (!isSafeCancelParticipationType(input.participationType)) {
        return { error: '안심취소 리워드 참여 유형을 선택해주세요.' };
    }
    return {
        value: {
            checklist,
            participationType: input.participationType,
            repostConsent: input.repostConsent === true,
        },
    };
}

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth-token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { payload: jwtPayload } = await jwtVerify(token, JWT_SECRET);
        const creatorId = jwtPayload.creatorId as string;
        const premiumId = jwtPayload.premiumId as string | null;
        // CHANGED: 채널명 + 제출 경로 필드 추가 — Airtable 프라이머리 필드 채우기 + 포털 경유 식별
        const channelName = jwtPayload.channelName as string;

        const body = await request.json();
        const { sponsorshipType, uploadDate, contentLink, accommodationRecordId, camfitLoungeUrl, officialCollabRequest, premiumCampaignRecordId } = body;

        // CHANGED: 콘텐츠2/3/4 다중 채널 링크 — optional, trim + 빈 값 제외 + 최대 3개
        const additionalContentLinks = Array.isArray(body.additionalContentLinks)
            ? body.additionalContentLinks.map((l: unknown) => String(l).trim()).filter(Boolean).slice(0, 3)
            : [];

        // 필수 필드 검증
        if (!sponsorshipType || !uploadDate || !contentLink) {
            return NextResponse.json(
                { error: '협찬 종류, 업로드 날짜, 콘텐츠 링크는 필수입니다.' },
                { status: 400 }
            );
        }

        if (!VALID_SPONSORSHIP_TYPES.includes(sponsorshipType)) {
            return NextResponse.json(
                { error: '올바른 협찬 종류를 선택해주세요.' },
                { status: 400 }
            );
        }

        // 캠핑장 예약 시 숙소 선택 필수
        if (sponsorshipType === '캠핑장 예약' && !accommodationRecordId) {
            return NextResponse.json(
                { error: '다녀온 숙소를 선택해주세요.' },
                { status: 400 }
            );
        }

        // 프리미엄 협찬 시 캠페인 선택 필수
        if (sponsorshipType === '프리미엄 협찬' && !premiumCampaignRecordId) {
            return NextResponse.json(
                { error: '프리미엄 협찬 캠핑장을 선택해주세요.' },
                { status: 400 }
            );
        }

        // CHANGED: 안심취소 리워드 참여 검증 + 1인 월 1회(전달일 기준) 차단. 토글 OFF 일반 전달은 조회하지 않음
        const safeCancel = parseSafeCancelReward(body.safeCancelReward, contentLink);
        if (safeCancel.error) {
            return NextResponse.json({ error: safeCancel.error }, { status: 400 });
        }
        if (safeCancel.value) {
            const usedThisMonth = await countSafeCancelRewardsThisMonth(creatorId);
            if (usedThisMonth >= SAFE_CANCEL_MONTHLY_LIMIT_PER_CREATOR) {
                return NextResponse.json({ error: SAFE_CANCEL_MONTHLY_LIMIT_MESSAGE }, { status: 409 });
            }
        }

        const submitPayload: ContentSubmitPayload = {
            creatorListRecordId: creatorId,
            sponsorshipType,
            uploadDate,
            contentLink,
            // CHANGED: 콘텐츠2/3/4 다중 채널 링크 — 협찬 타입 무관 공통 적용
            additionalContentLinks,
            accommodationRecordId: sponsorshipType === '캠핑장 예약' ? accommodationRecordId : undefined,
            camfitLoungeUrl: sponsorshipType === '캠핑장 예약' ? camfitLoungeUrl : undefined,
            officialCollabRequest: sponsorshipType === '캠핑장 예약' ? officialCollabRequest : undefined,
            premiumCampaignRecordId: sponsorshipType === '프리미엄 협찬' ? premiumCampaignRecordId : undefined,
            premiumRegistrationRecordId: sponsorshipType === '프리미엄 협찬' ? (premiumId || undefined) : undefined,
            // CHANGED: 채널명 + 제출 경로 필드 추가
            channelName,
            submissionSource: '크리에이터 포털 통해서 진행',
            safeCancelReward: safeCancel.value,
        };

        const result = await submitContentUpload(submitPayload);
        return NextResponse.json({ success: true, recordId: result.recordId });
    } catch (error) {
        console.error('Content submit error:', error);
        return NextResponse.json(
            { error: '콘텐츠 제출 중 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}
