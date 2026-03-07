import Airtable from 'airtable';
import type {
    TierLevel,
    Influencer,
    Campaign,
    CampaignTierData,
    AirtableUserRecord,
    AirtableCampaignRecord,
    AirtableApplicationRecord,
    Application
} from '@/types';

// Airtable 클라이언트 초기화
const airtable = new Airtable({
    apiKey: process.env.AIRTABLE_ACCESS_TOKEN
});

const base = airtable.base(process.env.AIRTABLE_BASE_ID!);

// 테이블 참조
const userTable = base(process.env.AIRTABLE_USER_TABLE_ID!);
const campaignTable = base(process.env.AIRTABLE_CAMPAIGN_TABLE_ID!);
const applicationTable = base(process.env.AIRTABLE_APPLICATION_TABLE_ID!);

/**
 * 등급별 필드명 매핑
 */
export function getTierFields(tier: TierLevel) {
    const fieldMap = {
        '3': { // Icon
            price: '⭐️ 협찬 제안 금액',
            total: '⭐️ 모집 희망 인원',
            available: '⭐️ 신청 가능 인원'
        },
        '2': { // Partner
            price: '✔️ 협찬 제안 금액',
            total: '✔️ 모집 인원',
            available: '✔️ 신청 가능 인원'
        },
        '1': { // Rising
            price: '🔥 협찬 제안 금액',
            total: '🔥 모집 인원',
            available: '🔥 신청 가능 인원'
        }
    };

    return fieldMap[tier];
}

/**
 * 마감 여부 판단
 */
export function isCampaignClosed(availableCount: number, price: number): boolean {
    return availableCount < 1 || price < 0;
}

/**
 * 생년월일 형식 변환: YYMMDD -> YYYY-MM-DD
 */
function convertBirthDate(input: string): string {
    if (input.length !== 6) return '';
    const yyStr = input.substring(0, 2);
    const yy = parseInt(yyStr, 10);
    const mm = input.substring(2, 4);
    const dd = input.substring(4, 6);
    const yyyy = yy > 30 ? `19${yyStr}` : `20${yyStr}`;
    return `${yyyy}-${mm}-${dd}`;
}

/**
 * 인플루언서 인증
 */
export async function authenticateInfluencer(
    channelName: string,
    birthDateInput: string,
    phoneLastFour: string
): Promise<Influencer | null> {
    try {
        // CHANGED: '크리에이터 채널명' → '크리에이터 채널명 (크리에이터 명단)' Link to Another Record 필드로 변경
        const records = await userTable
            .select({
                filterByFormula: `SEARCH("${channelName}", {크리에이터 채널명 (크리에이터 명단)})`,
                maxRecords: 1
            })
            .firstPage();

        if (records.length === 0) return null;

        const record = records[0] as unknown as AirtableUserRecord;
        const fields = record.fields;

        const expectedBirthDate = convertBirthDate(birthDateInput);
        if (fields['생년월일'] !== expectedBirthDate) return null;

        const phone = fields['연락처'] || '';
        const cleanedPhone = phone.replace(/[^0-9]/g, '');
        const actualLastFour = cleanedPhone.slice(-4);
        if (actualLastFour !== phoneLastFour) return null;

        const tierLookup = fields['등급화 (from 크리에이터 채널명 (크리에이터 명단))'];
        const tier = (Array.isArray(tierLookup) ? tierLookup[0] : tierLookup) as TierLevel;

        // CHANGED: Link to Another Record 필드는 레코드 ID를 반환하므로, 입력 파라미터 channelName을 그대로 사용
        return {
            id: record.id,
            channelName,
            birthDate: fields['생년월일'],
            phone: fields['연락처'],
            tier
        };
    } catch (error) {
        console.error('Authentication error:', error);
        return null;
    }
}

/**
 * 등급별 캠페인 목록 조회
 */
export async function getCampaigns(tier: TierLevel): Promise<Campaign[]> {
    try {
        // 입금내역 확인된 캠페인만 조회
        const records = await campaignTable.select({
            filterByFormula: '{입금내역 확인}'
        }).all();
        const tierFields = getTierFields(tier);

        return records.map((record) => {
            const rec = record as unknown as AirtableCampaignRecord;
            const fields = rec.fields;

            const price = fields[tierFields.price as keyof typeof fields] as number || 0;
            const totalCount = fields[tierFields.total as keyof typeof fields] as number || 0;
            const availableCount = fields[tierFields.available as keyof typeof fields] as number || 0;

            // CHANGED: 제공 가능한 사이트 종류 매핑 추가
            const siteTypes = fields['제공 가능한 사이트 종류'] || [];

            return {
                id: rec.id,
                accommodationName: fields['숙소 이름을 적어주세요.'] || '',
                location: fields['숙소 위치'] || '',
                deadline: fields['⏰ 콘텐츠 제작 기한'] || '',
                detailUrl: fields['숙소 링크 (캠핏 내 상세페이지만 삽입 가능)'] || '',
                applicationUrl: fields['신청 링크'] || 'https://airtable.com/appEGM6qarNr9M7HN/pagwr9veED083h45f/form',
                tierData: { price, totalCount, availableCount },
                isClosed: isCampaignClosed(availableCount, price),
                siteTypes
            };
        });
    } catch (error) {
        console.error('Get campaigns error:', error);
        return [];
    }
}

/**
 * 채널명 목록 조회 (Link to Another Record 필드 사용)
 */
export async function getChannelNames(): Promise<string[]> {
    try {
        // CHANGED: cellFormat: 'string' + sort 충돌 문제 해결 — cellFormat/userLocale/timeZone을 함께 지정하고, sort 제거 후 JS에서 정렬
        const records = await userTable.select({
            fields: ['크리에이터 채널명 (크리에이터 명단)'],
            cellFormat: 'string',
            userLocale: 'ko',
            timeZone: 'Asia/Seoul'
        } as any).all();

        const channelNames = records
            .map((record) => {
                const rawValue = record.get('크리에이터 채널명 (크리에이터 명단)') as string | undefined;
                if (!rawValue) return null;
                return rawValue.trim();
            })
            .filter((name): name is string => !!name && name.length > 0);

        // 중복 제거 후 가나다순 정렬
        const uniqueNames = [...new Set(channelNames)];
        uniqueNames.sort((a, b) => a.localeCompare(b, 'ko'));
        return uniqueNames;
    } catch (error) {
        console.error('Get channel names error:', error);
        return [];
    }
}

/**
 * 중복 신청 확인
 */
export async function checkDuplicateApplication(
    userRecordId: string,
    campaignId: string
): Promise<boolean> {
    try {
        const formula = `AND({크리에이터 채널명(프리미엄 협찬 신청)} = '${userRecordId}', {숙소 이름 (유료 오퍼)} = '${campaignId}')`;
        const records = await applicationTable
            .select({ filterByFormula: formula, maxRecords: 1 })
            .firstPage();
        return records.length > 0;
    } catch (error) {
        console.error('Check duplicate application error:', error);
        throw error;
    }
}

interface ApplyCampaignParams {
    campaignId: string;
    channelName: string;
    userRecordId: string;
    email: string;
}

/**
 * 캠페인 신청 처리
 */
export async function applyCampaign({
    campaignId,
    channelName,
    userRecordId,
    email
}: ApplyCampaignParams): Promise<{ success: boolean; couponCode: string }> {
    let createdApplicationId: string | null = null;

    try {
        // 1. 중복 신청 확인
        const isDuplicate = await checkDuplicateApplication(userRecordId, campaignId);
        if (isDuplicate) {
            throw new Error('ALREADY_APPLIED');
        }

        // 2. 쿠폰 코드 조회
        const campaignRecord = await campaignTable.find(campaignId) as unknown as AirtableCampaignRecord;
        const couponCode = campaignRecord.fields['쿠폰코드'];
        if (!couponCode) {
            throw new Error('COUPON_NOT_FOUND');
        }

        // 3. 유료 오퍼 신청 건 테이블에 레코드 생성
        const createdRecords = await applicationTable.create([
            {
                fields: {
                    '크리에이터 채널명': channelName,
                    '크리에이터 채널명(프리미엄 협찬 신청)': [userRecordId],
                    '이메일': email,
                    '숙소 이름 (유료 오퍼)': [campaignId]
                }
            }
        ]);

        if (!createdRecords || createdRecords.length === 0) {
            throw new Error('FAILED_TO_CREATE_APPLICATION');
        }

        createdApplicationId = createdRecords[0].id;

        // 4. 캠지기 모집 폼 테이블에 유저 추가 (PATCH)
        const existingApplicants = campaignRecord.fields['유료 오퍼 신청 인플루언서'] as string[] || [];
        const updatedApplicants = [...new Set([...existingApplicants, createdApplicationId])];

        await campaignTable.update([
            {
                id: campaignId,
                fields: {
                    '유료 오퍼 신청 인플루언서': updatedApplicants
                }
            }
        ]);

        return { success: true, couponCode };
    } catch (error: any) {
        console.error('Apply campaign error:', error);

        // [Cleanup] 캠페인 업데이트 실패 시 생성된 신청 레코드 삭제
        if (createdApplicationId) {
            try {
                await applicationTable.destroy(createdApplicationId);
            } catch (cleanupError) {
                console.error('Cleanup error:', cleanupError);
            }
        }

        throw error;
    }
}

/**
 * 내 신청 내역 조회 (필터링: 예약취소건 제외, 입금확인된 건만)
 */
export async function getUserApplications(channelName: string): Promise<Application[]> {
    try {
        // 필터링: 채널명 일치 & 예약 취소/변경 != '취소'
        // (입금내역은 캠페인 목록 필터용이므로 여기선 불필요)
        const filterFormula = `AND(
            {크리에이터 채널명} = '${channelName}',
            {예약 취소/변경} != '취소'
        )`;

        const records = await applicationTable
            .select({
                filterByFormula: filterFormula,
                sort: [{ field: '입실일', direction: 'asc' }] // 가까운 날짜부터
            })
            .all();

        // 메모리 정렬 제거 (서버 측 정렬 사용)
        const applications = await Promise.all(records.map(async (record) => {
            const r = record as unknown as AirtableApplicationRecord;
            const fields = r.fields;

            // 숙소 이름 & 쿠폰코드 가져오기 (Linked Record)
            let accommodationName = 'Unknown';
            let couponCode = '';
            let campaignId = '';

            if (fields['숙소 이름 (유료 오퍼)'] && fields['숙소 이름 (유료 오퍼)'].length > 0) {
                campaignId = fields['숙소 이름 (유료 오퍼)'][0];
                try {
                    const campRecord = await campaignTable.find(campaignId) as unknown as AirtableCampaignRecord;
                    accommodationName = campRecord.fields['숙소 이름을 적어주세요.'] || 'Unknown';
                    couponCode = campRecord.fields['쿠폰코드'] || '';
                } catch (e) {
                    // console.error('Failed to fetch campaign details', e);
                }
            }

            return {
                id: r.id,
                campaignId,
                accommodationName,
                checkInDate: fields['입실일'] || '',
                checkInSite: fields['입실 사이트'] || '',
                status: fields['Status'] || '',
                couponCode,
                reservationStatus: fields['예약 취소/변경'] || '',
                isDepositConfirmed: fields['입금내역 확인'] || false
            };
        }));

        return applications;
    } catch (error) {
        console.error('Get user applications error:', error);
        return [];
    }
}

/**
 * 입실 정보 업데이트 (Check-in)
 */
export async function updateApplicationCheckin(
    recordId: string,
    checkInDate: string,
    checkInSite: string
): Promise<boolean> {
    try {
        await applicationTable.update([
            {
                id: recordId,
                fields: {
                    '입실일': checkInDate,
                    '입실 사이트': checkInSite,
                    '예약 취소/변경': null as any // Single Select 필드 초기화
                }
            }
        ]);
        return true;
    } catch (error) {
        console.error('Update application checkin error:', error);
        throw error;
    }
}

/**
 * 예약 상태 (변경/취소) 업데이트
 */
export async function updateApplicationStatus(
    recordId: string,
    status: '변경' | '취소'
): Promise<boolean> {
    try {
        const updates: any = {
            '예약 취소/변경': status,
        };

        // 변경 및 취소 시 입실 정보 초기화
        updates['입실일'] = null;
        updates['입실 사이트'] = null;

        await applicationTable.update([
            {
                id: recordId,
                fields: updates
            }
        ]);
        return true;
    } catch (error) {
        console.error('Update application status error:', error);
        throw error;
    }
}
