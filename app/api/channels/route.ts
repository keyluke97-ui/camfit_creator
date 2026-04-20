import { NextResponse } from 'next/server';
import { getChannelNames } from '@/lib/airtable';

export async function GET() {
    try {
        const channelNames = await getChannelNames();
        return NextResponse.json({ channelNames });
    } catch (error) {
        console.error('Get channels error:', error);
        return NextResponse.json(
            // CHANGED: 500 에러에 행동 안내 접미 통일
            { error: '채널 목록을 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요. 계속되면 카카오톡 채널로 문의해주세요.' },
            { status: 500 }
        );
    }
}
