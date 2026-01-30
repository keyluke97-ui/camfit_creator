
import { NextResponse } from 'next/server';
import Airtable from 'airtable';

export async function GET() {
    try {
        const airtable = new Airtable({
            apiKey: process.env.AIRTABLE_ACCESS_TOKEN
        });
        const base = airtable.base(process.env.AIRTABLE_BASE_ID!);
        const table = base(process.env.AIRTABLE_APPLICATION_TABLE_ID!);

        // 특정 채널명에 대해 필터 없이 모든 레코드 가져오기
        const records = await table.select({
            filterByFormula: `{크리에이터 채널명} = '최우석_프리미엄 협찬 테스트 계정'`
        }).all();

        const debugData = records.map(record => ({
            id: record.id,
            channelName: record.fields['크리에이터 채널명'],
            accommodationName: record.fields['숙소 이름을 적어주세요. (from 숙소 이름 (유료 오퍼ㅏ))'],
            depositConfirmed: record.fields['입금내역 확인'],
            depositConfirmedType: typeof record.fields['입금내역 확인'],
            depositConfirmedRaw: JSON.stringify(record.fields['입금내역 확인']),
            status: record.fields['예약 취소/변경'],
            statusType: typeof record.fields['예약 취소/변경'],
            checkInDate: record.fields['입실일'],
            allFieldKeys: Object.keys(record.fields)
        }));

        return NextResponse.json({
            count: records.length,
            records: debugData
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
}
