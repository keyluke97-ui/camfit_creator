import { NextResponse } from 'next/server';
import { getChannelNames } from '@/lib/airtable';

export async function GET() {
    try {
        const channelNames = await getChannelNames();
        return NextResponse.json({ channelNames });
    } catch (error) {
        console.error('Get channels error:', error);
        return NextResponse.json(
            { error: '채널 목록을 불러오는 중 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}
