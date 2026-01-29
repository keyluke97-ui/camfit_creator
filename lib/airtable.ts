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

    const yy = input.substring(0, 2);
    const mm = input.substring(2, 4);
    const dd = input.substring(4, 6);

    // 2000년대 기준 (00-99 -> 2000-2099)
    const yyyy = `20${yy}`;

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

        // 연락처 뒷자리 검증
        const phone = fields['연락처'] || '';
        const actualLastFour = phone.slice(-4);
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
                deadline: fields['콘텐츠 제작 기한'] || '',
                features: fields['숙소 특장점'],
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
        const records = await userTable.select({
            fields: ['크리에이터 채널명']
        }).all();

        const channelNames = records
            .map((record) => {
                const fields = (record as unknown as AirtableUserRecord).fields;
                const name = fields['크리에이터 채널명'];
                return Array.isArray(name) ? name[0] : name;
            })
            .filter(Boolean);

        return [...new Set(channelNames)]; // 중복 제거
    } catch (error) {
        console.error('Get channel names error:', error);
        return [];
    }
}
