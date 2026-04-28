import Airtable, { FieldSet } from 'airtable';
import type {
    TierLevel,
    ChannelType,
    Influencer,
    Campaign,
    CampaignTierData,
    AirtableUserRecord,
    AirtableCreatorRecord,
    AirtableCampaignRecord,
    AirtableApplicationRecord,
    Application,
    PartnerCampaign,
    PartnerApplication,
    AirtablePartnerCampaignRecord,
    AirtablePartnerApplicationRecord,
    ContentSubmitPayload,
    ContentUpload
} from '@/types';

/**
 * Airtable select() 옵션 확장 타입 — cellFormat/userLocale/timeZone은 REST API에서 지원하지만 SDK 타입에 미포함
 */
interface AirtableSelectOptionsWithCellFormat {
    fields?: string[];
    filterByFormula?: string;
    maxRecords?: number;
    cellFormat?: 'json' | 'string';
    userLocale?: string;
    timeZone?: string;
}

/**
 * Airtable filterByFormula 인젝션 방어: 특수문자 이스케이프
 */
function escapeAirtableValue(value: string): string {
    return value
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/'/g, "\\'");
}

// CHANGED: lazy 초기화 — 빌드 타임에 환경변수 미설정으로 인한 에러 방지
// Next.js "Collecting page data" 단계에서 모듈이 평가되므로, 테이블 참조는 런타임에만 생성
let _base: ReturnType<Airtable['base']> | null = null;
function getBase() {
    if (!_base) {
        const airtable = new Airtable({
            apiKey: process.env.AIRTABLE_ACCESS_TOKEN
        });
        _base = airtable.base(process.env.AIRTABLE_BASE_ID!);
    }
    return _base;
}

// 테이블 getter — 최초 호출 시 초기화 (빌드 타임에는 실행되지 않음)
function getTable(envKey: string) {
    const tableId = process.env[envKey];
    if (!tableId) {
        throw new Error(`환경변수 ${envKey}가 설정되지 않았습니다.`);
    }
    return getBase()(tableId);
}

// 캐시된 테이블 참조
let _userTable: ReturnType<typeof getTable> | null = null;
let _campaignTable: ReturnType<typeof getTable> | null = null;
let _applicationTable: ReturnType<typeof getTable> | null = null;
let _creatorTable: ReturnType<typeof getTable> | null = null;
let _partnerCampaignTable: ReturnType<typeof getTable> | null = null;
let _partnerApplicationTable: ReturnType<typeof getTable> | null = null;
// CHANGED: 콘텐츠 업로드 + 캠핑장목록 테이블 추가
let _contentUploadTable: ReturnType<typeof getTable> | null = null;
let _accommodationTable: ReturnType<typeof getTable> | null = null;

const userTable = () => (_userTable ??= getTable('AIRTABLE_USER_TABLE_ID'));
const campaignTable = () => (_campaignTable ??= getTable('AIRTABLE_CAMPAIGN_TABLE_ID'));
const applicationTable = () => (_applicationTable ??= getTable('AIRTABLE_APPLICATION_TABLE_ID'));
const creatorTable = () => (_creatorTable ??= getTable('AIRTABLE_CREATOR_TABLE_ID'));
const partnerCampaignTable = () => (_partnerCampaignTable ??= getTable('AIRTABLE_PARTNER_CAMPAIGN_TABLE_ID'));
const partnerApplicationTable = () => (_partnerApplicationTable ??= getTable('AIRTABLE_PARTNER_APPLICATION_TABLE_ID'));
// CHANGED: 콘텐츠 업로드 + 캠핑장목록 테이블 getter
const contentUploadTable = () => (_contentUploadTable ??= getTable('AIRTABLE_CONTENT_UPLOAD_TABLE_ID'));
const accommodationTable = () => (_accommodationTable ??= getTable('AIRTABLE_ACCOMMODATION_TABLE_ID'));

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
 * 파트너 협찬 등급별 필드명 매핑 (신규)
 * - 프리미엄 getTierFields와 구분: 파트너는 '쿠폰 수량' / '모집 희망 인원' / '신청 가능 인원' 3셋.
 */
export function getPartnerTierFields(tier: TierLevel) {
    const fieldMap = {
        '3': { // ⭐️ Icon
            couponAmount: '⭐️ 쿠폰 수량',
            total: '⭐️ 모집 희망 인원',
            available: '⭐️ 신청 가능 인원',
        },
        '2': { // ✔️ Partner
            couponAmount: '✔️ 쿠폰 수량',
            total: '✔️ 모집 희망 인원',
            available: '✔️ 신청 가능 인원',
        },
        '1': { // 🔥 Rising
            couponAmount: '🔥 쿠폰 수량',
            total: '🔥 모집 희망 인원',
            available: '🔥 신청 가능 인원',
        },
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
 * 크리에이터 명단 테이블 기반 인증 (Phase 1 전환)
 * — 채널명 + 연락처 뒤4자리로 인증
 * — 휴먼 상태 true면 로그인 차단
 * — premiumId는 프리미엄 협찬 신청 인플루언서 Link에서 추출
 */
export async function authenticateCreator(
    channelName: string,
    phoneLastFour: string
): Promise<Influencer | null> {
    try {
        // CHANGED: TRIM으로 Airtable 데이터 앞뒤 공백 무시 (캠퍼스타 등 공백 포함 데이터 대응)
        const trimmedName = channelName.trim();
        const formula = `TRIM({크리에이터 채널명}) = "${escapeAirtableValue(trimmedName)}"`;

        const records = await creatorTable()
            .select({ filterByFormula: formula, maxRecords: 1 })
            .firstPage();

        if (records.length === 0) return null;

        const record = records[0] as unknown as AirtableCreatorRecord;
        const fields = record.fields;

        // 휴먼 상태 체크 — true면 비활성 크리에이터, 로그인 차단
        // CHANGED: Airtable 필드명 끝에 공백 포함 ('휴먼 상태 ')
        if (fields['휴먼 상태 '] === true) return null;

        // 연락처 뒤4자리 검증
        const phone = fields['연락처'] || '';
        const cleanedPhone = phone.replace(/[^0-9]/g, '');
        const actualLastFour = cleanedPhone.slice(-4);
        if (actualLastFour !== phoneLastFour) return null;

        // 등급 추출 — rating 타입 (1~3 숫자)
        const ratingValue = fields['등급화'];
        const tier = (ratingValue ? String(ratingValue) : '1') as TierLevel;

        // 채널 종류 추출 — multipleSelects 타입
        const channelTypes = (fields['채널 종류'] || []) as ChannelType[];

        // premiumId 추출 — multipleRecordLinks는 string[] 반환
        const premiumLinks = fields['프리미엄 협찬 신청 인플루언서'];
        const premiumId = Array.isArray(premiumLinks) && premiumLinks.length > 0
            ? premiumLinks[0]
            : null;

        return {
            creatorId: record.id,
            channelName,
            tier,
            channelTypes,
            premiumId,
            notificationEnabled: fields['캠페인 알림'] !== false // CHANGED: 알림 상태 반환 (기본 true)
        };
    } catch (error) {
        console.error('Creator authentication error:', error);
        return null;
    }
}

/**
 * 등급별 캠페인 목록 조회
 */
export async function getCampaigns(tier: TierLevel): Promise<Campaign[]> {
    try {
        // 입금내역 확인된 캠페인만 조회
        const records = await campaignTable().select({
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
            // CHANGED: 숙소의 특장점 매핑 추가
            const highlights = fields['숙소의 특장점'] || '';
            // CHANGED: 캠지기 인스타그램 계정 매핑 추가
            const hostInstagram = fields['캠지기인스타그램'] || '';

            return {
                id: rec.id,
                accommodationName: fields['숙소 이름을 적어주세요.'] || '',
                location: fields['숙소 위치'] || '',
                deadline: fields['⏰ 콘텐츠 제작 기한'] || '',
                detailUrl: fields['숙소 링크 (캠핏 내 상세페이지만 삽입 가능)'] || '',
                applicationUrl: fields['신청 링크'] || 'https://airtable.com/appEGM6qarNr9M7HN/pagwr9veED083h45f/form',
                tierData: { price, totalCount, availableCount },
                isClosed: isCampaignClosed(availableCount, price),
                siteTypes,
                highlights: highlights || undefined,
                hostInstagram: hostInstagram || undefined
            };
        });
    } catch (error) {
        console.error('Get campaigns error:', error);
        return [];
    }
}

/**
 * 채널명 목록 조회 — 크리에이터 명단 테이블에서 직접 조회
 * — 휴먼 상태 true인 크리에이터 제외
 * — singleLineText 필드이므로 cellFormat 불필요
 */
export async function getChannelNames(): Promise<string[]> {
    try {
        // CHANGED: 크리에이터 명단 테이블로 전환 + 휴먼 상태 필터링
        const records = await creatorTable()
            .select({
                fields: ['크리에이터 채널명'],
                filterByFormula: `NOT({휴먼 상태 })`
            })
            .all();

        const channelNames = records
            .map((record) => {
                const rawValue = record.get('크리에이터 채널명') as string | undefined;
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
        // CHANGED: Formula Injection 방어
        const formula = `AND({크리에이터 채널명(프리미엄 협찬 신청)} = '${escapeAirtableValue(userRecordId)}', {숙소 이름 (유료 오퍼)} = '${escapeAirtableValue(campaignId)}')`;
        const records = await applicationTable()
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
    tier: TierLevel; // CHANGED: 잔여 인원 체크를 위해 등급 정보 추가
}

/**
 * 캠페인 신청 처리
 */
export async function applyCampaign({
    campaignId,
    channelName,
    userRecordId,
    email,
    tier
}: ApplyCampaignParams): Promise<{ success: boolean; couponCode: string }> {
    let createdApplicationId: string | null = null;

    try {
        // 1. 중복 신청 확인
        const isDuplicate = await checkDuplicateApplication(userRecordId, campaignId);
        if (isDuplicate) {
            throw new Error('ALREADY_APPLIED');
        }

        // 2. 쿠폰 코드 조회 + 잔여 인원 사전 체크
        const campaignRecord = await campaignTable().find(campaignId) as unknown as AirtableCampaignRecord;
        const couponCode = campaignRecord.fields['쿠폰코드'];
        if (!couponCode) {
            throw new Error('COUPON_NOT_FOUND');
        }

        // CHANGED: 신청 전 잔여 인원 사전 체크 (1차 방어)
        const tierFields = getTierFields(tier);
        const availableCountBeforeApply = campaignRecord.fields[tierFields.available as keyof typeof campaignRecord.fields] as number || 0;
        if (availableCountBeforeApply < 1) {
            throw new Error('CAMPAIGN_FULL');
        }

        // 3. 유료 오퍼 신청 건 테이블에 레코드 생성
        const createdRecords = await applicationTable().create([
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

        await campaignTable().update([
            {
                id: campaignId,
                fields: {
                    '유료 오퍼 신청 인플루언서': updatedApplicants
                }
            }
        ]);

        // CHANGED: 사후 검증 (2차 방어) — 레코드 생성 후 잔여 인원 재확인
        // Airtable에 트랜잭션이 없으므로, 동시 신청 시 availableCount가 음수가 될 수 있음
        const updatedCampaignRecord = await campaignTable().find(campaignId) as unknown as AirtableCampaignRecord;
        const availableCountAfterApply = updatedCampaignRecord.fields[tierFields.available as keyof typeof updatedCampaignRecord.fields] as number || 0;

        if (availableCountAfterApply < 0) {
            // 정원 초과 → 롤백: 신청 레코드 삭제 + 캠페인 링크 원복
            console.error(`[Race Condition 감지] campaignId=${campaignId}, availableCount=${availableCountAfterApply} — 롤백 실행`);

            const rollbackApplicants = updatedApplicants.filter((applicantId) => applicantId !== createdApplicationId);
            await campaignTable().update([
                {
                    id: campaignId,
                    fields: {
                        '유료 오퍼 신청 인플루언서': rollbackApplicants
                    }
                }
            ]);
            await applicationTable().destroy(createdApplicationId);
            createdApplicationId = null; // 롤백 완료, cleanup에서 중복 삭제 방지

            throw new Error('CAMPAIGN_FULL');
        }

        return { success: true, couponCode };
    } catch (error: unknown) {
        console.error('Apply campaign error:', error);

        // [Cleanup] 캠페인 업데이트 실패 시 생성된 신청 레코드 삭제
        if (createdApplicationId) {
            try {
                await applicationTable().destroy(createdApplicationId);
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
        // CHANGED: Formula Injection 방어
        const filterFormula = `AND(
            {크리에이터 채널명} = '${escapeAirtableValue(channelName)}',
            {예약 취소/변경} != '취소'
        )`;

        const records = await applicationTable()
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
            // CHANGED: 협찬 조건 복사용 추가 필드
            let detailUrl = '';
            let highlights = '';
            let deadline = '';

            if (fields['숙소 이름 (유료 오퍼)'] && fields['숙소 이름 (유료 오퍼)'].length > 0) {
                campaignId = fields['숙소 이름 (유료 오퍼)'][0];
                try {
                    const campRecord = await campaignTable().find(campaignId) as unknown as AirtableCampaignRecord;
                    accommodationName = campRecord.fields['숙소 이름을 적어주세요.'] || 'Unknown';
                    couponCode = campRecord.fields['쿠폰코드'] || '';
                    // CHANGED: 협찬 조건 복사용 필드 매핑
                    detailUrl = campRecord.fields['숙소 링크 (캠핏 내 상세페이지만 삽입 가능)'] || '';
                    highlights = campRecord.fields['숙소의 특장점'] || '';
                    deadline = campRecord.fields['⏰ 콘텐츠 제작 기한'] || '';
                } catch (campaignFetchError) {
                    // CHANGED: 에러 삼킴 방지 — 캠페인 조회 실패 시 로깅 복구
                    console.error('Failed to fetch campaign details for ID:', campaignId, campaignFetchError);
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
                isDepositConfirmed: fields['입금내역 확인'] || false,
                detailUrl: detailUrl || undefined,
                highlights: highlights || undefined,
                deadline: deadline || undefined
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
        // CHANGED: Airtable REST API는 null로 필드를 초기화하지만, SDK FieldSet 타입은 null 미지원
        // → unknown 경유 단언 (SDK 타입 한계, REST API에서는 null이 유효한 값)
        const checkinFields = {
            '입실일': checkInDate,
            '입실 사이트': checkInSite,
            '예약 취소/변경': null
        } as unknown as Partial<FieldSet>;
        await applicationTable().update([
            { id: recordId, fields: checkinFields }
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
        // CHANGED: Airtable REST API는 null로 필드를 초기화하지만, SDK FieldSet 타입은 null 미지원
        // → unknown 경유 단언 (SDK 타입 한계, REST API에서는 null이 유효한 값)
        const updates = {
            '예약 취소/변경': status,
            '입실일': null,
            '입실 사이트': null,
        } as unknown as Partial<FieldSet>;

        await applicationTable().update([
            { id: recordId, fields: updates }
        ]);
        return true;
    } catch (error) {
        console.error('Update application status error:', error);
        throw error;
    }
}

// ──────────────────────────────────────────────
// 프리미엄 협찬 신청 등록
// ──────────────────────────────────────────────

interface RegisterPremiumCreatorParams {
    creatorId: string;
    channelName: string;
    name: string;
    birthDate: string;
    phone: string;
    bank: string;
    customBank: string;
    accountHolder: string;
    accountNumber: string;
    residentNumber: string;
    address: string;
    businessType: string;
    taxEmail: string;
    businessNumber: string;
}

/**
 * 프리미엄 협찬 크리에이터 등록 — userTable(프리미엄 테이블)에 레코드 생성
 * — creatorId로 크리에이터 명단 테이블과 Link 자동 연결 (Airtable 양방향 Link)
 * — 동의 체크박스 4개는 API에서 true 고정 (프론트에서 미체크 시 제출 불가)
 */
export async function registerPremiumCreator(
    params: RegisterPremiumCreatorParams
): Promise<{ success: boolean; recordId: string }> {
    try {
        // 중복 등록 방지: 크리에이터 명단의 프리미엄 Link가 이미 있는지 확인
        const creatorRecord = await creatorTable().find(params.creatorId);
        const existingPremiumLinks = creatorRecord.get('프리미엄 협찬 신청 인플루언서') as string[] | undefined;
        if (Array.isArray(existingPremiumLinks) && existingPremiumLinks.length > 0) {
            throw new Error('ALREADY_REGISTERED');
        }

        // Airtable 레코드 생성 필드 구성
        const createFields: Record<string, unknown> = {
            '크리에이터 채널명': params.channelName,
            '크리에이터 채널명 (크리에이터 명단)': [params.creatorId],
            '이름': params.name,
            '생년월일': params.birthDate,
            '연락처': params.phone,
            '은행': params.bank,
            '예금주': params.accountHolder,
            '계좌번호': params.accountNumber,
            '주민등록번호': params.residentNumber,
            '주소 (상세주소 포함)': params.address,
            '개인 / 사업자': params.businessType,
            // 동의 체크박스 — 프론트에서 전부 체크해야 제출 가능하므로 true 고정
            '개인정보 수집 및 이용 동의': true,
            '원천징수 동의': true,
            '콘텐츠 사용 권한 동의': true,
            '지급 조건 동의': true
        };

        // 기타 은행 직접 입력
        if (params.bank === '기타(직접입력)' && params.customBank) {
            createFields['기타 은행 (직접 입력)'] = params.customBank;
        }

        // 사업자 조건부 필드
        if (params.businessType === '사업자') {
            if (params.taxEmail) {
                createFields['세금 계산서 발행을 위한 이메일'] = params.taxEmail;
            }
            if (params.businessNumber) {
                createFields['사업자 번호'] = params.businessNumber;
            }
        }

        const createdRecords = await userTable().create([
            { fields: createFields as Partial<FieldSet> }
        ]);

        if (!createdRecords || createdRecords.length === 0) {
            throw new Error('FAILED_TO_CREATE_RECORD');
        }

        return { success: true, recordId: createdRecords[0].id };
    } catch (error) {
        console.error('Register premium creator error:', error);
        throw error;
    }
}

// ──────────────────────────────────────────────
// 파트너 협찬 전용 함수
// ──────────────────────────────────────────────

/**
 * 파트너 캠페인 마감 여부 판단
 */
// CHANGED: 마감 상태여도 availableCount >= 1이면 자동 복구 판단
function isPartnerCampaignClosed(
    recruitmentStatus: string,
    availableCount: number
): boolean {
    if (availableCount >= 1 && recruitmentStatus === '마감') return false;
    return recruitmentStatus === '마감' || availableCount < 1;
}

/**
 * Airtable 파트너 캠페인 레코드 → 도메인 객체 변환 (v3)
 */
function mapPartnerCampaignRecord(
    record: AirtablePartnerCampaignRecord
): PartnerCampaign {
    const fields = record.fields;
    const recruitmentStatus = fields['모집 상태'] || '오픈전';

    const iconAvailable = fields['⭐️ 신청 가능 인원'] || 0;
    const partnerAvailable = fields['✔️ 신청 가능 인원'] || 0;
    const risingAvailable = fields['🔥 신청 가능 인원'] || 0;
    const totalAvailable = iconAvailable + partnerAvailable + risingAvailable;

    return {
        id: record.id,
        accommodationName: fields['캠핑장명'] || '',
        location: fields['소재 권역'] || '',
        couponApplyDays: (fields['쿠폰 적용 요일'] || '평일전용') as PartnerCampaign['couponApplyDays'],
        discount: fields['할인 금액'] || 0,
        accommodationDescription: fields['숙소 소개'] || '',
        recruitmentStatus: recruitmentStatus as PartnerCampaign['recruitmentStatus'],

        iconRecruitCount: fields['⭐️ 모집 희망 인원'] || 0,
        partnerRecruitCount: fields['✔️ 모집 희망 인원'] || 0,
        risingRecruitCount: fields['🔥 모집 희망 인원'] || 0,
        iconAvailable,
        partnerAvailable,
        risingAvailable,

        couponPerCreator: fields['인당 팔로워 쿠폰'] || 0,
        totalFollowerCoupon: fields['총 팔로워 쿠폰 수'] || 0,

        creatorCouponCode: fields['크리에이터 쿠폰 코드'] || '',
        followerCouponCode: fields['팔로워 쿠폰 코드'] || '',
        visitStartDate: fields['크리에이터 방문 가능 시작일'] || '',
        visitEndDate: fields['크리에이터 방문 가능 종료일'] || '',
        couponStartDate: fields['쿠폰 유효 시작일'] || '',
        couponEndDate: fields['쿠폰 유효 종료일'] || '',
        camfitLink: fields['캠핏링크'] || '',
        siteTypes: fields['제공 가능한 사이트 종류'] || [],
        creatorStayNights: fields['숙박박수(크리에이터 사이드)'] || 2,
        isClosed: isPartnerCampaignClosed(recruitmentStatus, totalAvailable),
    };
}

/**
 * 파트너 캠페인 목록 조회 (v3: tier 인자, 등급별 합산 기반 auto-close)
 */
export async function getPartnerCampaigns(tier: TierLevel): Promise<PartnerCampaign[]> {
    try {
        const records = await partnerCampaignTable()
            .select({
                filterByFormula: `{모집 상태} != '오픈전'`,
            })
            .all();

        const campaigns = records.map((record) => {
            const rec = record as unknown as AirtablePartnerCampaignRecord;
            return mapPartnerCampaignRecord(rec);
        });

        // v3 자동 마감/오픈 재전환: 전 등급 합계 기준
        const campaignsToReopen = records.filter((record) => {
            const rec = record as unknown as AirtablePartnerCampaignRecord;
            const sumAvailable =
                (rec.fields['⭐️ 신청 가능 인원'] || 0) +
                (rec.fields['✔️ 신청 가능 인원'] || 0) +
                (rec.fields['🔥 신청 가능 인원'] || 0);
            return rec.fields['모집 상태'] === '마감' && sumAvailable >= 1;
        });
        const campaignsToClose = records.filter((record) => {
            const rec = record as unknown as AirtablePartnerCampaignRecord;
            const sumAvailable =
                (rec.fields['⭐️ 신청 가능 인원'] || 0) +
                (rec.fields['✔️ 신청 가능 인원'] || 0) +
                (rec.fields['🔥 신청 가능 인원'] || 0);
            return rec.fields['모집 상태'] === '모집중' && sumAvailable < 1;
        });
        const statusUpdates = [
            ...campaignsToReopen.map((r) => ({ id: r.id, fields: { '모집 상태': '모집중' } })),
            ...campaignsToClose.map((r) => ({ id: r.id, fields: { '모집 상태': '마감' } })),
        ];
        if (statusUpdates.length > 0) {
            partnerCampaignTable()
                .update(statusUpdates)
                .catch((error) => console.error('Auto-sync partner campaign status error:', error));
        }

        campaigns.sort((a, b) => {
            if (a.recruitmentStatus === '모집중' && b.recruitmentStatus !== '모집중') return -1;
            if (a.recruitmentStatus !== '모집중' && b.recruitmentStatus === '모집중') return 1;
            return 0;
        });

        return campaigns;
    } catch (error) {
        console.error('Get partner campaigns error:', error);
        return [];
    }
}

/**
 * 파트너 캠페인 중복 신청 확인
 * CHANGED: 취소된 신청은 제외하여 재신청 허용
 */
export async function checkPartnerDuplicateApplication(
    userRecordId: string,
    campaignId: string
): Promise<boolean> {
    try {
        const formula = `AND({크리에이터} = '${escapeAirtableValue(userRecordId)}', {캠페인} = '${escapeAirtableValue(campaignId)}', {예약 취소/변경} != '취소')`;
        const records = await partnerApplicationTable()
            .select({ filterByFormula: formula, maxRecords: 1 })
            .firstPage();
        return records.length > 0;
    } catch (error) {
        console.error('Check partner duplicate application error:', error);
        throw error;
    }
}

interface ApplyPartnerCampaignParams {
    campaignId: string;
    userRecordId: string;
    channelName: string;
    tier: TierLevel; // v3 신규
    checkInDate?: string;
    checkInSite?: string;
}

/**
 * 파트너 캠페인 신청 (2단계 검증 + 자동 마감) — v3 tier 기반
 */
export async function applyPartnerCampaign({
    campaignId,
    userRecordId,
    channelName,
    tier,
    checkInDate,
    checkInSite,
}: ApplyPartnerCampaignParams): Promise<{ success: boolean; creatorCouponCode: string; followerCouponCode: string }> {
    let createdApplicationId: string | null = null;
    const tierFields = getPartnerTierFields(tier);

    try {
        // 1. 중복 신청 확인
        const isDuplicate = await checkPartnerDuplicateApplication(userRecordId, campaignId);
        if (isDuplicate) throw new Error('ALREADY_APPLIED');

        // 2. 해당 등급 잔여 인원 사전 체크
        const campaignRecord = (await partnerCampaignTable().find(campaignId)) as unknown as AirtablePartnerCampaignRecord;
        const tierAvailableBefore = (campaignRecord.fields[tierFields.available as keyof typeof campaignRecord.fields] as number) || 0;
        if (tierAvailableBefore < 1) throw new Error('CAMPAIGN_FULL');

        // 서버 사이드 날짜 범위 검증
        if (checkInDate) {
            const visitStart = campaignRecord.fields['크리에이터 방문 가능 시작일'] || '';
            const visitEnd = campaignRecord.fields['크리에이터 방문 가능 종료일'] || '';
            if (visitStart && visitEnd) {
                if (checkInDate < visitStart || checkInDate > visitEnd) throw new Error('INVALID_DATE_RANGE');
            }
        }

        // 3. 신청 레코드 생성
        const applicationFields: Record<string, unknown> = {
            '크리에이터': [userRecordId],
            '캠페인': [campaignId],
            '크리에이터 채널명': channelName,
            '신청 상태': '신청완료',
            '정책 확인 동의': true,
        };
        if (checkInDate) applicationFields['입실일'] = checkInDate;
        if (checkInSite) applicationFields['입실 사이트'] = checkInSite;

        const createdRecords = await partnerApplicationTable().create([
            { fields: applicationFields as Partial<FieldSet> },
        ]);
        if (!createdRecords || createdRecords.length === 0) throw new Error('FAILED_TO_CREATE_APPLICATION');
        createdApplicationId = createdRecords[0].id;

        // 4. 사후 검증: 해당 등급 잔여 재확인
        const updatedCampaign = (await partnerCampaignTable().find(campaignId)) as unknown as AirtablePartnerCampaignRecord;
        const tierAvailableAfter = (updatedCampaign.fields[tierFields.available as keyof typeof updatedCampaign.fields] as number) || 0;

        if (tierAvailableAfter < 0) {
            console.error(`[Partner Race Condition] tier=${tier}, campaignId=${campaignId}, available=${tierAvailableAfter} — 롤백`);
            await partnerApplicationTable().destroy(createdApplicationId);
            createdApplicationId = null;
            throw new Error('CAMPAIGN_FULL');
        }

        // 5. 자동 마감: 3등급 합계 0일 때만
        const totalAvailable =
            (updatedCampaign.fields['⭐️ 신청 가능 인원'] || 0) +
            (updatedCampaign.fields['✔️ 신청 가능 인원'] || 0) +
            (updatedCampaign.fields['🔥 신청 가능 인원'] || 0);

        if (totalAvailable === 0) {
            await partnerCampaignTable().update([{ id: campaignId, fields: { '모집 상태': '마감' } }]);
        }

        return {
            success: true,
            creatorCouponCode: updatedCampaign.fields['크리에이터 쿠폰 코드'] || '',
            followerCouponCode: updatedCampaign.fields['팔로워 쿠폰 코드'] || '',
        };
    } catch (error) {
        console.error('Apply partner campaign error:', error);
        if (createdApplicationId) {
            try {
                await partnerApplicationTable().destroy(createdApplicationId);
            } catch (cleanupError) {
                console.error('Partner cleanup error:', cleanupError);
            }
        }
        throw error;
    }
}

/**
 * 내 파트너 신청 내역 조회
 */
export async function getPartnerApplications(
    channelName: string
): Promise<PartnerApplication[]> {
    try {
        const filterFormula = `AND(
            {크리에이터 채널명 (from 크리에이터)} = '${escapeAirtableValue(channelName)}',
            {예약 취소/변경} != '취소'
        )`;

        const records = await partnerApplicationTable()
            .select({ filterByFormula: filterFormula })
            .all();

        return records.map((record) => {
            const r = record as unknown as AirtablePartnerApplicationRecord;
            const fields = r.fields;

            // Lookup 필드는 배열로 반환됨 → 첫 번째 값 추출
            const campaignIds = fields['캠페인'] || [];

            return {
                id: r.id,
                campaignId: campaignIds[0] || '',
                accommodationName: '', // enrichPartnerApplications에서 채워짐
                checkInDate: fields['입실일'] || '',
                checkInSite: fields['입실 사이트'] || '',
                applicationStatus: fields['신청 상태'] || '',
                reservationStatus: fields['예약 취소/변경'] || '',
                creatorCouponCode: (fields['크리에이터 쿠폰 코드 (from 캠페인)'] || [])[0] || '',
                followerCouponCode: (fields['팔로워 쿠폰 코드 (from 캠페인)'] || [])[0] || '',
                visitStartDate: (fields['방문 가능 시작일 (from 캠페인)'] || [])[0] || '',
                visitEndDate: (fields['방문 가능 종료일 (from 캠페인)'] || [])[0] || '',
                couponStartDate: (fields['쿠폰 유효 시작일 (from 캠페인)'] || [])[0] || '',
                couponEndDate: (fields['쿠폰 유효 종료일 (from 캠페인)'] || [])[0] || '',
                // v3 defaults — enrichPartnerApplications가 채움
                discount: 0,
                couponApplyDays: '',
                siteTypes: [],
                accommodationDescription: '',
                couponPerCreator: 0,
                totalFollowerCoupon: 0,
                creatorStayNights: 2,
            };
        });
    } catch (error) {
        console.error('Get partner applications error:', error);
        return [];
    }
}

/**
 * 파트너 신청 내역에 캠페인 상세 정보를 조인하는 유틸 함수
 * CHANGED: 캠핑장명뿐 아니라 할인금액/사이트종류/숙소소개 등 전체 캠페인 데이터 조인
 */
export async function enrichPartnerApplications(
    applications: PartnerApplication[]
): Promise<PartnerApplication[]> {
    try {
        const campaignIds = [...new Set(
            applications.map((application) => application.campaignId).filter(Boolean)
        )];

        if (campaignIds.length === 0) return applications;

        // 일괄 조회: OR(RECORD_ID() = 'id1', RECORD_ID() = 'id2', ...)
        const orConditions = campaignIds
            .map((id) => `RECORD_ID() = '${escapeAirtableValue(id)}'`)
            .join(', ');
        const filterFormula = `OR(${orConditions})`;

        const records = await partnerCampaignTable()
            .select({ filterByFormula: filterFormula })
            .all();

        // CHANGED: campaign 전체 데이터를 Map에 저장
        const campaignMap = new Map<string, PartnerCampaign>();
        for (const record of records) {
            const rec = record as unknown as AirtablePartnerCampaignRecord;
            campaignMap.set(rec.id, mapPartnerCampaignRecord(rec));
        }

        return applications.map((application) => {
            const campaign = campaignMap.get(application.campaignId);
            if (!campaign) return application;

            return {
                ...application,
                accommodationName: campaign.accommodationName,
                discount: campaign.discount,
                couponApplyDays: campaign.couponApplyDays,
                siteTypes: campaign.siteTypes,
                accommodationDescription: campaign.accommodationDescription,
                couponPerCreator: campaign.couponPerCreator,
                totalFollowerCoupon: campaign.totalFollowerCoupon,
                creatorStayNights: campaign.creatorStayNights,
            };
        });
    } catch (error) {
        console.error('Enrich partner applications error:', error);
        return applications;
    }
}

/**
 * 파트너 신청 레코드의 소유권 검증 — 해당 레코드가 요청 사용자의 것인지 확인
 * CHANGED: IDOR 취약점 방어를 위해 추가
 */
export async function verifyPartnerApplicationOwnership(
    recordId: string,
    userRecordId: string
): Promise<boolean> {
    try {
        const record = await partnerApplicationTable().find(recordId) as unknown as AirtablePartnerApplicationRecord;
        const creatorIds = record.fields['크리에이터'] || [];
        return creatorIds.includes(userRecordId);
    } catch (error) {
        console.error('Verify partner application ownership error:', error);
        return false;
    }
}

/**
 * 파트너 신청 체크인 정보 수정
 */
export async function updatePartnerCheckin(
    recordId: string,
    checkInDate: string,
    checkInSite: string
): Promise<boolean> {
    try {
        const checkinFields = {
            '입실일': checkInDate,
            '입실 사이트': checkInSite,
            '예약 취소/변경': null
        } as unknown as Partial<FieldSet>;

        await partnerApplicationTable().update([
            { id: recordId, fields: checkinFields }
        ]);
        return true;
    } catch (error) {
        console.error('Update partner checkin error:', error);
        throw error;
    }
}

/**
 * 파트너 신청 예약 상태 (변경/취소) 업데이트
 */
export async function updatePartnerApplicationStatus(
    recordId: string,
    status: '변경' | '취소'
): Promise<boolean> {
    try {
        const updates = {
            '예약 취소/변경': status,
            '입실일': null,
            '입실 사이트': null,
        } as unknown as Partial<FieldSet>;

        await partnerApplicationTable().update([
            { id: recordId, fields: updates }
        ]);
        return true;
    } catch (error) {
        console.error('Update partner application status error:', error);
        throw error;
    }
}

// CHANGED: 캠페인 알림 토글 함수 추가
export async function updateCreatorNotification(recordId: string, enabled: boolean): Promise<boolean> {
    try {
        await creatorTable().update(recordId, {
            '캠페인 알림': enabled
        } as unknown as Partial<FieldSet>);
        return true;
    } catch (error) {
        console.error('Update notification error:', error);
        throw error;
    }
}

// ──────────────────────────────────────────────
// 콘텐츠 업로드 함수
// ──────────────────────────────────────────────

// CHANGED: 캠핑장목록 검색 — 콘텐츠 제출 시 숙소 선택 드롭다운용
export async function searchAccommodations(query?: string): Promise<{ id: string; name: string }[]> {
    try {
        const options: AirtableSelectOptionsWithCellFormat = {
            fields: ['캠핑장명'],
            maxRecords: 50
        };

        if (query && query.trim()) {
            options.filterByFormula = `SEARCH(LOWER("${escapeAirtableValue(query.trim())}"), LOWER({캠핑장명}))`;
        }

        const records = await accommodationTable()
            .select(options as Record<string, unknown>)
            .all();

        const results = records
            .map((record) => ({
                id: record.id,
                name: (record.get('캠핑장명') as string) || ''
            }))
            .filter((item) => item.name.length > 0);

        // CHANGED: 이름 기준 중복 제거 (같은 캠핑장명이 여러 레코드로 존재할 수 있음)
        const seen = new Set<string>();
        const deduplicated = results.filter((item) => {
            if (seen.has(item.name)) return false;
            seen.add(item.name);
            return true;
        });

        return deduplicated.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    } catch (error) {
        console.error('Search accommodations error:', error);
        return [];
    }
}

// CHANGED: 프리미엄 캠페인 검색 — 크리에이터의 신청 내역 기반으로 본인이 신청한 캠페인만 반환
export async function searchCreatorPremiumCampaigns(
    channelName: string,
    creatorRecordId: string,
    query?: string
): Promise<{ id: string; name: string }[]> {
    try {
        // 1단계: 크리에이터의 프리미엄 신청 내역에서 캠페인 ID + 입실일 추출
        const formula = `{크리에이터 채널명} = "${escapeAirtableValue(channelName)}"`;
        const applicationRecords = await applicationTable()
            .select({
                filterByFormula: formula,
                fields: ['숙소 이름 (유료 오퍼)', '크리에이터 채널명', '입실일']
            } as Record<string, unknown>)
            .all();

        // linked record에서 캠페인 ID + 입실일 매핑
        const campaignMap = new Map<string, string>(); // campaignId → 입실일
        for (const record of applicationRecords) {
            const linkedCampaigns = record.get('숙소 이름 (유료 오퍼)') as string[] | undefined;
            const checkInDate = (record.get('입실일') as string) || '';
            if (Array.isArray(linkedCampaigns)) {
                linkedCampaigns.forEach((id) => {
                    // 입실일이 있는 신청건을 우선 보존
                    if (!campaignMap.has(id) || checkInDate) {
                        campaignMap.set(id, checkInDate);
                    }
                });
            }
        }

        if (campaignMap.size === 0) return [];

        // 2단계: 콘텐츠 업로드 테이블에서 이미 제출된 캠페인 ID 추출
        const submittedCampaignIds = new Set<string>();
        try {
            const creatorFormula = `FIND("${escapeAirtableValue(creatorRecordId)}", ARRAYJOIN({크리에이터 명단}))`;
            const contentRecords = await contentUploadTable()
                .select({
                    filterByFormula: creatorFormula
                } as Record<string, unknown>)
                .all();

            for (const record of contentRecords) {
                const sponsorshipType = record.get('협찬의 종류를 골라주세요') as string;
                if (sponsorshipType !== '프리미엄 협찬') continue;

                const premiumCampaignLinks = record.get('프리미엄 협찬 캠핑장 이름') as string[] | undefined;
                if (Array.isArray(premiumCampaignLinks)) {
                    premiumCampaignLinks.forEach((id) => submittedCampaignIds.add(id));
                }
            }
        } catch {
            // 콘텐츠 업로드 조회 실패 시 필터링 없이 진행
        }

        // 이미 제출된 캠페인 제외
        for (const campaignId of submittedCampaignIds) {
            campaignMap.delete(campaignId);
        }

        if (campaignMap.size === 0) return [];

        // 3단계: 해당 캠페인들의 숙소 이름 조회 + 입실일로 같은 캠핑장 구분
        const campaignResults: { id: string; name: string }[] = [];
        for (const [campaignId, checkInDate] of campaignMap) {
            try {
                const record = await campaignTable().find(campaignId);
                const accommodationName = (record.get('숙소 이름을 적어주세요.') as string) || '';
                if (accommodationName) {
                    // CHANGED: 입실일로 같은 캠핑장의 다른 신청건 구분 (크리에이터가 아는 정보)
                    const displayName = checkInDate
                        ? `${accommodationName} (입실: ${checkInDate})`
                        : accommodationName;
                    campaignResults.push({ id: campaignId, name: displayName });
                }
            } catch {
                // 삭제된 캠페인 무시
            }
        }

        // 3단계: 검색어 필터링
        let filtered = campaignResults;
        if (query && query.trim()) {
            const lowerQuery = query.trim().toLowerCase();
            // CHANGED: deduplicated → campaignResults (올바른 변수 참조)
            filtered = campaignResults.filter((item) =>
                item.name.toLowerCase().includes(lowerQuery)
            );
        }

        return filtered.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    } catch (error) {
        console.error('Search creator premium campaigns error:', error);
        return [];
    }
}

// CHANGED: 콘텐츠 제출 — 인플루언서 컨텐츠 업로드 테이블에 레코드 생성
export async function submitContentUpload(payload: ContentSubmitPayload): Promise<{ recordId: string }> {
    try {
        const fields: Record<string, unknown> = {
            '크리에이터 명단': [payload.creatorListRecordId],
            '협찬의 종류를 골라주세요': payload.sponsorshipType,
            '업로드 날짜': payload.uploadDate,
            '콘텐츠 링크': payload.contentLink,
            // CHANGED: 채널명 프라이머리 필드 + 제출 경로 매핑 추가
            '채널명': payload.channelName ?? '',
            '제출 경로': payload.submissionSource ?? '',
        };

        // 숙소 협찬 (캠핑장 예약)
        if (payload.accommodationRecordId) {
            fields['캠핑장 이름 OR 캠핑 용품 이름'] = [payload.accommodationRecordId];
        }
        if (payload.camfitLoungeUrl) {
            fields['캠핏 라운지 콘텐츠 업로드'] = payload.camfitLoungeUrl;
        }
        if (payload.officialCollabRequest) {
            fields['캠핏 오피셜 계정 공동작업 요청'] = true;
        }

        // 프리미엄 협찬
        if (payload.premiumCampaignRecordId) {
            fields['프리미엄 협찬 캠핑장 이름'] = [payload.premiumCampaignRecordId];
        }
        if (payload.premiumRegistrationRecordId) {
            fields['프리미엄 협찬을 신청했나요?'] = [payload.premiumRegistrationRecordId];
        }

        const record = await contentUploadTable().create(fields as unknown as Partial<FieldSet>);
        return { recordId: record.id };
    } catch (error) {
        console.error('Submit content upload error:', error);
        throw error;
    }
}

// 내 콘텐츠 조회 — {크리에이터 명단} 링크 기반 매칭만 사용. {채널명} 텍스트 필드는 오타가 많아 신뢰 불가 (사용 금지).
// 링크가 비어있는 레거시 레코드는 실제 비활동 크리에이터이므로 복구 불필요.
export async function getCreatorContentUploads(channelName: string): Promise<ContentUpload[]> {
    try {
        const formula = `AND(FIND("${escapeAirtableValue(channelName)}", ARRAYJOIN({크리에이터 채널명 (from 크리에이터 명단)})), OR({협찬의 종류를 골라주세요} = '프리미엄 협찬', {협찬의 종류를 골라주세요} = '캠핑장 예약'))`;

        const records = await contentUploadTable()
            .select({
                filterByFormula: formula
            } as Record<string, unknown>)
            .all();

        const uploads: ContentUpload[] = records.map((record) => {
            // lookup 필드에서 캠핑장명 추출
            const accommodationNames = record.get('캠핑장명 (from 캠핑장 이름 OR 캠핑 용품 이름)') as string[] | undefined;
            const accommodationName = Array.isArray(accommodationNames) && accommodationNames.length > 0
                ? accommodationNames[0]
                : undefined;

            // lookup 필드에서 프리미엄 캠페인명 추출
            const premiumNames = record.get('숙소 이름을 적어주세요. (from 캠지기 모집 폼)') as string[] | undefined;
            const premiumCampaignName = Array.isArray(premiumNames) && premiumNames.length > 0
                ? premiumNames[0]
                : undefined;

            // lookup 필드에서 크리에이터 채널명 추출
            const channelNames = record.get('크리에이터 채널명 (from 크리에이터 명단)') as string[] | undefined;
            const channelName = Array.isArray(channelNames) && channelNames.length > 0
                ? channelNames[0]
                : '';

            return {
                id: record.id,
                channelName,
                sponsorshipType: (record.get('협찬의 종류를 골라주세요') as string) || '',
                uploadDate: (record.get('업로드 날짜') as string) || '',
                contentLink: (record.get('콘텐츠 링크') as string) || '',
                accommodationName,
                camfitLoungeUrl: (record.get('캠핏 라운지 콘텐츠 업로드') as string) || undefined,
                officialCollabRequest: (record.get('캠핏 오피셜 계정 공동작업 요청') as boolean) || false,
                premiumCampaignName,
                createdAt: (record.get('Created') as string) || ''
            };
        });

        // 업로드 날짜 내림차순 정렬 (cellFormat: 'string' 미사용이므로 직접 비교)
        uploads.sort((a, b) => {
            if (!a.uploadDate) return 1;
            if (!b.uploadDate) return -1;
            return b.uploadDate.localeCompare(a.uploadDate);
        });

        // CHANGED: 포스트 필터 완화 — 콘텐츠 링크만 있으면 통과. 숙소명 미지정은 카드 측에서 '이름 없음'으로 폴백 렌더링.
        const validUploads = uploads.filter(u => u.contentLink);
        return validUploads;
    } catch (error) {
        // CHANGED: 에러 삼키지 않고 throw — 환경변수 누락 등 systemic 실패가 "콘텐츠 0건"으로 위장되는 것을 방지 (API route에서 500 반환).
        // 조회 함수 = 빈 배열 반환 컨벤션의 예외: 본 함수는 사용자에게 "내 콘텐츠"를 보여주는 핵심 경로라 정적/동적 구분이 중요.
        console.error('Get creator content uploads error:', error);
        throw error;
    }
}
