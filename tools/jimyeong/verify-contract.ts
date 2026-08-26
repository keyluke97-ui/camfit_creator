// tools/jimyeong/verify-contract.ts
// 포털 ↔ 캠지기측 Airtable 스키마 계약 검사. 문서로 주고받던 "필드가 이렇습니다"를 대체한다.
// 산문은 실물과 어긋나도 아무도 모르지만, 이 스크립트는 어긋나면 즉시 실패한다.
//
// 실행: npx tsx tools/jimyeong/verify-contract.ts
// 양쪽 레포가 같은 파일을 돌린다 — 한쪽이 필드를 지우거나 옵션을 바꾸면 반대쪽 CI/실행에서 잡힌다.

import { readFileSync } from 'node:fs';
import { CHANNEL_CONCEPTS, UPLOAD_DEADLINE_DEFAULT_DAYS, OFFER_WRITABLE_FIELDS, OFFER_STATUS_PENDING, OFFER_STATUS_ACCEPTED, OFFER_STATUS_REJECTED, OFFER_REJECT_REASONS } from '../../lib/constants';

const BASE_ID = 'appEGM6qarNr9M7HN';
const TABLE_ID = 'tblkuPln7nquA3dLA'; // 크리에이터 명단
const OFFER_TABLE_ID = 'tbl8uODx66771zsKh'; // 지명 제안

/** 포털이 `지명 제안`에서 읽는 필드 + 타입. 쓰기 가능 여부는 OFFER_WRITABLE_FIELDS가 정한다. */
const OFFER_EXPECTED: Array<{ name: string; type: string }> = [
    { name: '크리에이터', type: 'multipleRecordLinks' },
    { name: '상태', type: 'singleSelect' },
    { name: '제안 금액(크리에이터)', type: 'number' },
    { name: '크리에이터 발송 일시', type: 'dateTime' }, // 확인 창 기산점 — 만료 예정 일시 아님
    { name: '응답 일시', type: 'dateTime' },            // 중복 응답 가드
    { name: '거절 사유', type: 'singleSelect' },
    { name: '거절 상세 사유', type: 'multilineText' },
    { name: '캠핑장 이름', type: 'singleLineText' },
    { name: '캠핑장 링크', type: 'url' },
    { name: '제안서 전문', type: 'multilineText' },     // 읽기 전용 — 그대로 보여준다
    { name: '메시지', type: 'multilineText' },
];

/**
 * 포털이 절대 쓰면 안 되는 필드. 분쟁 시 증거이거나(금액·전문·스냅샷),
 * 여기서 성립하지 않는 동시성 장치(버전·멱등키)다.
 */
const OFFER_FORBIDDEN_WRITES: string[] = [
    '제안 금액(크리에이터)', '노출 금액(캠핑장)', '할인 금액', '인당 장수',
    '제안서 전문', '조건 스냅샷', '버전', '멱등키', '만료 예정 일시',
];

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

    // ── 지명 제안 (제안 수신함) ──
    const offerTable = tables.find((t) => t.id === OFFER_TABLE_ID);
    if (!offerTable) {
        console.log(`FAIL  테이블 없음 — 지명 제안 ${OFFER_TABLE_ID}`);
        failed++;
    } else {
        const offerFields = new Map(offerTable.fields.map((f) => [f.name, f]));
        for (const want of OFFER_EXPECTED) {
            const got = offerFields.get(want.name);
            if (!got) {
                console.log(`FAIL  [지명제안] 필드 없음 — ${want.name}`);
                failed++;
            } else if (got.type !== want.type) {
                console.log(`FAIL  [지명제안] 타입 불일치 — ${want.name}: 기대 ${want.type} / 실제 ${got.type}`);
                failed++;
            } else {
                console.log(`ok    [지명제안] ${want.name} (${got.type})`);
            }
        }

        // 상태·거절 사유는 includes 모드 — 폐기된 구 옵션이 남아 있어(2026-08-03 데이터 보존 결정)
        // 엄격 비교하면 영원히 빨간불이고, 그럼 아무도 안 돌린다. 우리가 쓰는 값이 있기만 하면 된다.
        const statusChoices = (offerFields.get('상태')?.options?.choices || []).map((c) => c.name);
        for (const need of [OFFER_STATUS_PENDING, OFFER_STATUS_ACCEPTED, OFFER_STATUS_REJECTED]) {
            if (!statusChoices.includes(need)) {
                console.log(`FAIL  [지명제안] 상태 옵션 없음 — ${need}`);
                failed++;
            } else {
                console.log(`ok    [지명제안] 상태 옵션 '${need}'`);
            }
        }
        const reasonChoices = (offerFields.get('거절 사유')?.options?.choices || []).map((c) => c.name);
        const missingReasons = OFFER_REJECT_REASONS.filter((r) => !reasonChoices.includes(r));
        if (missingReasons.length) {
            console.log(`FAIL  [지명제안] 거절 사유 옵션 없음 — ${JSON.stringify(missingReasons)}`);
            failed++;
        } else {
            console.log(`ok    [지명제안] 거절 사유 3종`);
        }

        // 쓰기 화이트리스트 — 캠지기측과 합의한 4개에서 벗어나면 실패시킨다.
        // 코드가 조용히 늘어나는 것을 막는 자리다(계약 v2 §9 개정).
        const AGREED = ['상태', '응답 일시', '거절 사유', '거절 상세 사유'];
        const extra = OFFER_WRITABLE_FIELDS.filter((f) => !AGREED.includes(f));
        const lost = AGREED.filter((f) => !OFFER_WRITABLE_FIELDS.includes(f));
        const forbidden = OFFER_WRITABLE_FIELDS.filter((f) => OFFER_FORBIDDEN_WRITES.includes(f));
        if (extra.length || lost.length || forbidden.length) {
            console.log(`FAIL  [지명제안] 쓰기 화이트리스트 이탈 — 추가 ${JSON.stringify(extra)} / 누락 ${JSON.stringify(lost)} / 금지필드 ${JSON.stringify(forbidden)}`);
            failed++;
        } else {
            console.log(`ok    [지명제안] 쓰기 화이트리스트 4개 (${AGREED.join(' · ')})`);
        }
    }

    console.log(failed === 0 ? '\n계약 일치 — 스키마 드리프트 없음' : `\n${failed}건 불일치`);
    process.exit(failed === 0 ? 0 : 1);
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});
