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
        // 여기서 반환된 레코드 ID가 '유료 오퍼 신청 건'의 고유 ID입니다.
        const createdRecords = await applicationTable.create([
            {
                fields: {
                    '크리에이터 채널명': channelName,
                    '크리에이터 채널명(프리미엄 협찬 신청)': [userRecordId], // 이건 유저 테이블의 ID (올바름)
                    '이메일': email,
                    '숙소 이름 (유료 오퍼)': [campaignId] // 이건 캠페인 테이블의 ID (올바름)
                }
            }
        ]);

        if (!createdRecords || createdRecords.length === 0) {
            throw new Error('FAILED_TO_CREATE_APPLICATION');
        }

        const applicationRecordId = createdRecords[0].id; // 새로 생성된 신청 레코드의 ID

        // 4. 캠지기 모집 폼 테이블에 유저 추가 (PATCH)
        // [중요 수정]
        // 기존: '유료 오퍼 신청 인플루언서' 필드에 userRecordId (유저 테이블 ID)를 넣어서 에러 발생
        // 수정: 이 필드는 '유료 오퍼 신청 건' 테이블을 참조하고 있다면 applicationRecordId를 넣어야 하고,
        //      '프리미엄 협찬 신청 인플루언서' 테이블을 참조하고 있다면 userRecordId가 맞음.
        //      에러 메시지 "Record ID rec... belongs to table tblDOC... (UserTable), but field links to table tblIV8... (ApplicationTable)"
        //      따라서, '유료 오퍼 신청 인플루언서' 필드는 '유료 오퍼 신청 건' 테이블을 참조하고 있음이 확실함.
        //      그러므로 userRecordId가 아니라 방금 생성한 applicationRecordId를 넣어야 함.

        const existingApplicants = campaignRecord.fields['유료 오퍼 신청 인플루언서'] as string[] || [];
        const updatedApplicants = [...new Set([...existingApplicants, applicationRecordId])]; // applicationRecordId 사용

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
