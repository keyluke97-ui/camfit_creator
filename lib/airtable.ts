import Airtable from 'airtable';
import type {
    TierLevel,
    Influencer,
    Campaign,
    CampaignTierData,
    AirtableUserRecord,
    AirtableCampaignRecord
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
 * 이모지를 포함한 정확한 필드명 반환
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

    // 30보다 크면 1900년대, 30 이하면 2000년대로 판별
    const yyyy = yy > 30 ? `19${yyStr}` : `20${yyStr}`;

    return `${yyyy}-${mm}-${dd}`;
}

/**
 * 인플루언서 인증
 * @param channelName 크리에이터 채널명
 * @param birthDateInput 생년월일 6자리 (YYMMDD)
 * @param phoneLastFour 연락처 뒷자리 4자리
 */
export async function authenticateInfluencer(
    channelName: string,
    birthDateInput: string,
    phoneLastFour: string
): Promise<Influencer | null> {
    try {
        // Airtable에서 채널명으로 검색
        const records = await userTable
            .select({
                filterByFormula: `SEARCH("${channelName}", {크리에이터 채널명})`,
                maxRecords: 1
            })
            .firstPage();

        if (records.length === 0) {
            return null;
        }

        const record = records[0] as unknown as AirtableUserRecord;
        const fields = record.fields;

        // 생년월일 검증
        const expectedBirthDate = convertBirthDate(birthDateInput);
        if (fields['생년월일'] !== expectedBirthDate) {
            return null;
        }

        // 연락처 뒷자리 검증 (숫자만 남긴 후 뒷자리 4자리 비교)
        const phone = fields['연락처'] || '';
        const cleanedPhone = phone.replace(/[^0-9]/g, '');
        const actualLastFour = cleanedPhone.slice(-4);

        if (actualLastFour !== phoneLastFour) {
            return null;
        }

        // 등급 추출
        const tierLookup = fields['등급화 (from 크리에이터 채널명 (크리에이터 명단))'];
        const tier = (Array.isArray(tierLookup) ? tierLookup[0] : tierLookup) as TierLevel;

        return {
            id: record.id,
            channelName: Array.isArray(fields['크리에이터 채널명'])
                ? fields['크리에이터 채널명'][0]
                : fields['크리에이터 채널명'],
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
 * @param tier 인플루언서 등급
 */
export async function getCampaigns(tier: TierLevel): Promise<Campaign[]> {
    try {
        const records = await campaignTable.select().all();
        const tierFields = getTierFields(tier);

        const campaigns: Campaign[] = records.map((record) => {
            const rec = record as unknown as AirtableCampaignRecord;
            const fields = rec.fields;

            // 등급별 필드 값 추출
            const price = fields[tierFields.price as keyof typeof fields] as number || 0;
            const totalCount = fields[tierFields.total as keyof typeof fields] as number || 0;
            const availableCount = fields[tierFields.available as keyof typeof fields] as number || 0;

            const tierData: CampaignTierData = {
                price,
                totalCount,
                availableCount
            };

            return {
                id: rec.id,
                accommodationName: fields['숙소 이름을 적어주세요.'] || '',
                location: fields['숙소 위치'] || '',
                deadline: fields['⏰ 콘텐츠 제작 기한'] || '',
                detailUrl: fields['숙소 링크 (캠핏 내 상세페이지만 삽입 가능)'] || '',
                applicationUrl: fields['신청 링크'] || 'https://airtable.com/appEGM6qarNr9M7HN/pagwr9veED083h45f/form',
                tierData,
                isClosed: isCampaignClosed(availableCount, price)
            };
        });

        return campaigns;
    } catch (error) {
        console.error('Get campaigns error:', error);
        return [];
    }
}

/**
 * 채널명 목록 조회 (로그인 드롭다운용)
 */
export async function getChannelNames(): Promise<string[]> {
    try {
        console.log('Fetching channel names from Airtable...');
        const records = await userTable.select({
            fields: ['크리에이터 채널명'],
            sort: [{ field: '크리에이터 채널명', direction: 'asc' }]
        }).all();

        console.log(`Fetched ${records.length} user records.`);

        const channelNames = records
            .map((record) => {
                const fields = (record as unknown as AirtableUserRecord).fields;
                const name = fields['크리에이터 채널명'];

                if (!name) return null;

                // 문자열이거나 배열인 경우 모두 처리
                const cleanName = Array.isArray(name) ? name[0] : name;
                return typeof cleanName === 'string' ? cleanName.trim() : null;
            })
            .filter((name): name is string => !!name);

        const uniqueNames = [...new Set(channelNames)];
        console.log(`Returning ${uniqueNames.length} unique channel names.`);

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
        // filterByFormula를 사용하여 User ID와 Campaign ID가 모두 일치하는 레코드 검색
        // Airtable의 AND 함수 사용
        const formula = `AND({크리에이터 채널명(프리미엄 협찬 신청)} = '${userRecordId}', {숙소 이름 (유료 오퍼)} = '${campaignId}')`;

        const records = await applicationTable
            .select({
                filterByFormula: formula,
                maxRecords: 1
            })
            .firstPage();

        return records.length > 0;
    } catch (error) {
        console.error('Check duplicate application error:', error);
        // 에러 발생 시 안전을 위해 중복으로 간주하지 않거나, 에러를 던질 수 있음
        // 여기서는 에러를 던져서 상위에서 처리하도록 함
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
        await applicationTable.create([
            {
                fields: {
                    '크리에이터 채널명': channelName,
                    '크리에이터 채널명(프리미엄 협찬 신청)': [userRecordId],
                    '이메일': email,
                    '숙소 이름 (유료 오퍼)': [campaignId]
                }
            }
        ]);

        // 4. 캠지기 모집 폼 테이블에 유저 추가 (PATCH)
        // 기존 신청자 목록을 가져와서 추가해야 하는지, 아니면 그냥 배열에 추가하면 되는지 확인 필요.
        // Airtable API는 배열을 전달하면 "덮어쓰기"가 기본이므로, 기존 목록을 가져와야 함.
        // 하지만 update 시 'typecast': true 사용하거나, 기존 필드 값에 추가하는 로직이 필요.
        // 간단하게 기존 값을 읽어서 배열에 추가하는 방식으로 구현.

        const existingApplicants = campaignRecord.fields['유료 오퍼 신청 인플루언서'] as string[] || [];
        // 이미 있는지 확인 (중복 방지 2차)
        const updatedApplicants = [...new Set([...existingApplicants, userRecordId])];

        await campaignTable.update([
            {
                id: campaignId,
                fields: {
                    '유료 오퍼 신청 인플루언서': updatedApplicants
                }
            }
        ]);

        return { success: true, couponCode };
    } catch (error) {
        console.error('Apply campaign error:', error);
        throw error;
    }
}
