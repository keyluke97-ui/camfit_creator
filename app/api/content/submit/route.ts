// CHANGED: 콘텐츠 제출 API — 인플루언서 컨텐츠 업로드 테이블에 레코드 생성
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { submitContentUpload } from '@/lib/airtable';
import type { ContentSubmitPayload, SponsorshipType } from '@/types';

if (!process.env.NEXTAUTH_SECRET) {
    throw new Error('NEXTAUTH_SECRET 환경변수가 설정되지 않았습니다.');
}
const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);

const VALID_SPONSORSHIP_TYPES: SponsorshipType[] = ['캠핑장 예약', '프리미엄 협찬'];

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

        const submitPayload: ContentSubmitPayload = {
            creatorListRecordId: creatorId,
            sponsorshipType,
            uploadDate,
            contentLink,
            accommodationRecordId: sponsorshipType === '캠핑장 예약' ? accommodationRecordId : undefined,
            camfitLoungeUrl: sponsorshipType === '캠핑장 예약' ? camfitLoungeUrl : undefined,
            officialCollabRequest: sponsorshipType === '캠핑장 예약' ? officialCollabRequest : undefined,
            premiumCampaignRecordId: sponsorshipType === '프리미엄 협찬' ? premiumCampaignRecordId : undefined,
            premiumRegistrationRecordId: sponsorshipType === '프리미엄 협찬' ? (premiumId || undefined) : undefined,
            // CHANGED: 채널명 + 제출 경로 필드 추가
            channelName,
            submissionSource: '크리에이터 포털 통해서 진행',
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
