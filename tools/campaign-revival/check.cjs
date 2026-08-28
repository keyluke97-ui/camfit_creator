#!/usr/bin/env node
/**
 * "죽은/죽어가는 공고" 체크 (읽기 전용) — SOP-프리미엄협찬-죽은캠페인-소생 Step 1
 * 지금 노출 중(입금내역 확인)이고 잔여 자리가 있는데, 콘텐츠 제작 기한이 너무 가까워서
 * 크리에이터가 사실상 신청할 수 없는 공고를 뽑는다.
 * 가정: 인플루언서 일정은 ~1달 선점 → 기한이 오늘+30일 이내면 신규 신청 실질 불가.
 *
 *   node tools/campaign-revival/check.cjs        # 기본 D-30 기준
 *   node tools/campaign-revival/check.cjs 45     # 선점 기간 가정 변경
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const env = {};
for (const line of fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
}
const TOKEN = env.AIRTABLE_ACCESS_TOKEN;
const BASE = env.AIRTABLE_BASE_ID;
const T_CAMP = env.AIRTABLE_CAMPAIGN_TABLE_ID;

const LEAD_DAYS = Number(process.argv[2] || 30); // 크리에이터 일정 선점 기간
const DAY = 86400000;

const FIELDS = [
    '숙소 이름을 적어주세요.',
    '입금내역 확인',
    '콘텐츠 제작 기한 (날짜)',
    '⭐️ 신청 가능 인원', '✔️ 신청 가능 인원', '🔥 신청 가능 인원',
    '⭐️ 모집 희망 인원', '✔️ 모집 인원', '🔥 모집 인원',
    '크리에이터 방문 가능 종료일',
];

async function fetchAll() {
    const out = [];
    let offset;
    do {
        const url = new URL(`https://api.airtable.com/v0/${BASE}/${T_CAMP}`);
        FIELDS.forEach((f) => url.searchParams.append('fields[]', f));
        url.searchParams.set('pageSize', '100');
        url.searchParams.set('filterByFormula', '{입금내역 확인}');
        if (offset) url.searchParams.set('offset', offset);
        const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
        if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
        const json = await res.json();
        out.push(...json.records);
        offset = json.offset;
    } while (offset);
    return out;
}

const kstDay = (ymd) => new Date(`${String(ymd).slice(0, 10)}T00:00:00+09:00`).getTime();
const pad = (s, n) => {
    // 한글은 2칸 차지 — 대략 보정
    const str = String(s ?? '');
    let w = 0;
    for (const ch of str) w += /[ᄀ-퟿　-〿＀-￯]/.test(ch) ? 2 : 1;
    return str + ' '.repeat(Math.max(0, n - w));
};

(async () => {
    const camps = await fetchAll();
    const today = kstDay(new Date(Date.now() + 9 * 3600000).toISOString());

    const open = [];
    let closed = 0;
    let noDeadline = 0;

    for (const c of camps) {
        const f = c.fields;
        const avail = (f['⭐️ 신청 가능 인원'] || 0) + (f['✔️ 신청 가능 인원'] || 0) + (f['🔥 신청 가능 인원'] || 0);
        if (avail < 1) { closed++; continue; } // 전 등급 마감 → 모집 끝난 공고
        const deadlineRaw = f['콘텐츠 제작 기한 (날짜)'];
        if (!deadlineRaw) { noDeadline++; continue; }
        const deadline = String(deadlineRaw).slice(0, 10);
        const dLeft = Math.floor((kstDay(deadline) - today) / DAY);
        open.push({
            name: f['숙소 이름을 적어주세요.'] || c.id,
            deadline,
            dLeft,
            avail,
            slots: `⭐${f['⭐️ 신청 가능 인원'] || 0}/${f['⭐️ 모집 희망 인원'] || 0} ✔${f['✔️ 신청 가능 인원'] || 0}/${f['✔️ 모집 인원'] || 0} 🔥${f['🔥 신청 가능 인원'] || 0}/${f['🔥 모집 인원'] || 0}`,
            visitEnd: f['크리에이터 방문 가능 종료일'] ? String(f['크리에이터 방문 가능 종료일']).slice(0, 10) : '',
        });
    }

    open.sort((a, b) => a.dLeft - b.dLeft);
    const dead = open.filter((o) => o.dLeft < 0);
    const dying = open.filter((o) => o.dLeft >= 0 && o.dLeft <= LEAD_DAYS);
    const healthy = open.filter((o) => o.dLeft > LEAD_DAYS);

    const fmt = (o) => {
        const d = o.dLeft < 0 ? `지남 D+${-o.dLeft}` : o.dLeft === 0 ? 'D-day' : `D-${o.dLeft}`;
        return `  ${pad(d, 10)}${pad(o.deadline, 12)}${pad(o.name, 30)}${pad('잔여 ' + o.avail, 8)}${pad(o.slots, 22)}${o.visitEnd ? '방문종료 ' + o.visitEnd : ''}`;
    };

    console.log(`\n노출 중 공고(입금확인) ${camps.length}건 / 전 등급 마감 ${closed}건 / 잔여자리 있음 ${open.length}건 (기한 미설정 ${noDeadline}건)`);
    console.log(`기준: 크리에이터 일정 선점 ${LEAD_DAYS}일 → 제작기한 ${LEAD_DAYS}일 이내면 신규 신청 실질 불가\n`);

    console.log(`🔴 기한 이미 지남 — 잔여 자리가 있어도 신청 불가능한 죽은 공고 (${dead.length}건)`);
    dead.length ? dead.forEach((o) => console.log(fmt(o))) : console.log('  없음');

    console.log(`\n🟠 기한 ${LEAD_DAYS}일 이내 — 사실상 신규 신청 어려운 공고 (${dying.length}건)`);
    dying.length ? dying.forEach((o) => console.log(fmt(o))) : console.log('  없음');

    console.log(`\n🟢 기한 여유 (${healthy.length}건)`);
    healthy.forEach((o) => console.log(fmt(o)));
})();
