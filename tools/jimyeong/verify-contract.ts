// tools/jimyeong/verify-contract.ts
// 포털 ↔ 캠지기측 Airtable 스키마 계약 검사. 문서로 주고받던 "필드가 이렇습니다"를 대체한다.
// 산문은 실물과 어긋나도 아무도 모르지만, 이 스크립트는 어긋나면 즉시 실패한다.
//
// 실행: npx tsx tools/jimyeong/verify-contract.ts
// 양쪽 레포가 같은 파일을 돌린다 — 한쪽이 필드를 지우거나 옵션을 바꾸면 반대쪽 CI/실행에서 잡힌다.

import { readFileSync } from 'node:fs';
import { CHANNEL_CONCEPTS, UPLOAD_DEADLINE_DEFAULT_DAYS } from '../../lib/constants';

const BASE_ID = 'appEGM6qarNr9M7HN';
const TABLE_ID = 'tblkuPln7nquA3dLA'; // 크리에이터 명단

/** 이 레포가 Airtable에 기대하는 것. 코드가 실제로 읽고 쓰는 필드만 적는다. */
const EXPECTED: Array<{ name: string; type: string; choices?: string[] }> = [
    { name: '업로드 기한(일)', type: 'number' },
    { name: '동반 인원', type: 'number' },
    { name: '반려동물 동반', type: 'checkbox' },
    { name: '드론 촬영', type: 'checkbox' },
    { name: '채널콘셉트(자기신고)', type: 'multipleSelects', choices: CHANNEL_CONCEPTS },
    // 운영자 관리 필드 — 포털은 읽기만 한다. 쓰면 170명 영업 분류가 지워진다.
    { name: '채널콘셉트', type: 'multipleSelects' },
];

function token(): string {
    const line = readFileSync('.env.local', 'utf8')
        .split('\n')
        .find((l) => l.startsWith('AIRTABLE_ACCESS_TOKEN='));
    if (!line) throw new Error('.env.local에 AIRTABLE_ACCESS_TOKEN이 없습니다.');
    return line.split('=')[1].trim();
}

async function main() {
    const res = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`, {
        headers: { Authorization: `Bearer ${token()}` },
    });
    if (!res.ok) throw new Error(`Airtable meta API ${res.status}`);

    const tables = (await res.json()).tables as Array<{
        id: string;
        fields: Array<{ name: string; type: string; options?: { choices?: Array<{ name: string }> } }>;
    }>;
    const table = tables.find((t) => t.id === TABLE_ID);
    if (!table) throw new Error(`테이블 ${TABLE_ID}를 찾을 수 없습니다.`);

    const actual = new Map(table.fields.map((f) => [f.name, f]));
    let failed = 0;

    for (const want of EXPECTED) {
        const got = actual.get(want.name);
        if (!got) {
            console.log(`FAIL  필드 없음 — ${want.name}`);
            failed++;
            continue;
        }
        if (got.type !== want.type) {
            console.log(`FAIL  타입 불일치 — ${want.name}: 기대 ${want.type} / 실제 ${got.type}`);
            failed++;
            continue;
        }
        if (want.choices) {
            const names = (got.options?.choices || []).map((c) => c.name);
            const missing = want.choices.filter((c) => !names.includes(c));
            const extra = names.filter((n) => !want.choices!.includes(n));
            if (missing.length || extra.length) {
                console.log(`FAIL  옵션 불일치 — ${want.name}: 없는 것 ${JSON.stringify(missing)} / 여분 ${JSON.stringify(extra)}`);
                failed++;
                continue;
            }
        }
        console.log(`ok    ${want.name} (${got.type})`);
    }

    // 표준값은 상수에만 있고 Airtable엔 없어야 한다 — 빈 값이 곧 "표준 적용 중"(스펙 E2).
    // 독촉 도구가 쓰는 GRACE_DAYS와 어긋나면 안내와 실제 대상이 달라진다.
    const grace = readFileSync('tools/content-followup/overdue.cjs', 'utf8').match(/--days'\)\s*\+\s*1\]\s*:\s*(\d+)/);
    if (grace && Number(grace[1]) !== UPLOAD_DEADLINE_DEFAULT_DAYS) {
        console.log(`FAIL  표준 기한 불일치 — 상수 ${UPLOAD_DEADLINE_DEFAULT_DAYS} / overdue.cjs GRACE_DAYS ${grace[1]}`);
        failed++;
    } else if (grace) {
        console.log(`ok    표준 기한 ${UPLOAD_DEADLINE_DEFAULT_DAYS}일 == overdue.cjs GRACE_DAYS`);
    }

    console.log(failed === 0 ? '\n계약 일치 — 스키마 드리프트 없음' : `\n${failed}건 불일치`);
    process.exit(failed === 0 ? 0 : 1);
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});
