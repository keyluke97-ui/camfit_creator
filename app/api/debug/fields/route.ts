
import { NextResponse } from 'next/server';
import Airtable from 'airtable';

export async function GET() {
    try {
        const airtable = new Airtable({
            apiKey: process.env.AIRTABLE_ACCESS_TOKEN
        });
        const base = airtable.base(process.env.AIRTABLE_BASE_ID!);
        const table = base(process.env.AIRTABLE_APPLICATION_TABLE_ID!);

        // 아무 필터 없이 첫 레코드 하나만 가져오기
        const records = await table.select({
            maxRecords: 3
        }).all();

        const fieldInspection = records.map(record => ({
            id: record.id,
            allFieldNames: Object.keys(record.fields),
            fieldsWithValues: Object.entries(record.fields).map(([key, value]) => ({
                fieldName: key,
                value: value,
                type: typeof value,
                isArray: Array.isArray(value)
            }))
        }));

        return NextResponse.json({
            count: records.length,
            records: fieldInspection
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
