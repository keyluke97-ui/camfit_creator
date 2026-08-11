#!/usr/bin/env node
/**
 * 콘텐츠 미업로드 독촉 대상 추출 (읽기 전용)
 *
 * 퇴실 후 N일(기본 14일)이 지났는데 콘텐츠 업로드가 확인되지 않는 신청 건을 뽑는다.
 * 운영자가 프리미엄 협찬 신청을 전수로 눈으로 훑지 않으면 알 수 없던 문제를 대체한다.
 *
 * ⚠️ 퇴실일은 1박 가정(입실일 + 1일)이다 — 신청 테이블에 퇴실일/박수 필드가 없다(사용자 확정 2026-08-11).
 *    2박 이상 묵은 건은 실제보다 하루 이상 빨리 잡히므로, D+1~2 경계 건은 사람이 확인할 것.
 *
 * ⚠️ 조인 키는 채널명 문자열이 아니라 '크리에이터 명단' 레코드 ID다.
 *    업로드 테이블의 채널명은 표기가 흔들린다(`seori1122`↔`seori1123`, `chillax.daram (다람캠프)`↔`chillax.daram`).
 *    글자로 이으면 멀쩡히 올린 사람을 미업로드로 오탐한다(실측 2건). 두 테이블 모두
 *    크리에이터 명단 링크를 갖고 있으므로 ID로 잇는다.
 *
 * 아무것도 쓰지 않는다. 주 1회 실행 권장.
 *
 *   node tools/content-followup/overdue.cjs            # 기본 14일
 *   node tools/content-followup/overdue.cjs --days 21  # 기준일 변경
 *   node tools/content-followup/overdue.cjs --all      # D+90 초과 과거 건까지 전부
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
const T_APP = env.AIRTABLE_APPLICATION_TABLE_ID;
const T_CAMP = env.AIRTABLE_CAMPAIGN_TABLE_ID;
const T_PREMIUM = env.AIRTABLE_USER_TABLE_ID;
const T_UPLOAD = 'tblta2cow9ymKr68J'; // 인플루언서 컨텐츠 업로드

const args = process.argv.slice(2);
const GRACE_DAYS = Number((args[args.indexOf('--days') + 1] > 0 && args.includes('--days')) ? args[args.indexOf('--days') + 1] : 14);
const SHOW_ALL = args.includes('--all');
const DAY = 86400000;

async function fetchAll(tableId, fields) {
    const out = [];
    let offset;
    do {
        const url = new URL(`https://api.airtable.com/v0/${BASE}/${tableId}`);
        (fields || []).forEach((f) => url.searchParams.append('fields[]', f));
        url.searchParams.set('pageSize', '100');
        if (offset) url.searchParams.set('offset', offset);
        const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
        if (!res.ok) throw new Error(`${tableId}: ${res.status} ${await res.text()}`);
        const json = await res.json();
        out.push(...json.records);
        offset = json.offset;
    } while (offset);
    return out;
}

const kstDay = (ymd) => new Date(`${String(ymd).slice(0, 10)}T00:00:00+09:00`).getTime();
const pad = (s, n) => String(s ?? '').padEnd(n).slice(0, n);

(async () => {
    const [apps, premiums, uploads, camps] = await Promise.all([
        fetchAll(T_APP, ['크리에이터 채널명', '크리에이터 채널명(프리미엄 협찬 신청)', '숙소 이름 (유료 오퍼)', '입실일', '입실 사이트', '예약 취소/변경']),
        fetchAll(T_PREMIUM, ['크리에이터 채널명 (크리에이터 명단)', '연락처']),
        fetchAll(T_UPLOAD, ['크리에이터 명단', '프리미엄 협찬 캠핑장 이름', '업로드 날짜']),
        fetchAll(T_CAMP, ['숙소 이름을 적어주세요.', '콘텐츠 제작 기한 (날짜)', '⏰ 콘텐츠 제작 기한']),
    ]);

    // premiumId → 크리에이터 명단 ID / 연락처
    const premiumMap = new Map(premiums.map((p) => [p.id, {
        creatorId: (p.fields['크리에이터 채널명 (크리에이터 명단)'] || [])[0] || null,
        phone: p.fields['연락처'] || '',
    }]));
    const campMap = new Map(camps.map((c) => [c.id, c.fields]));

    // 업로드 인덱스: `크리에이터명단ID::캠페인ID` (문자열 채널명 대신 링크 ID로 조인)
    const uploaded = new Map();
    for (const u of uploads) {
        const creatorId = (u.fields['크리에이터 명단'] || [])[0];
        if (!creatorId) continue;
        for (const campId of (u.fields['프리미엄 협찬 캠핑장 이름'] || [])) {
            const key = `${creatorId}::${campId}`;
            const date = u.fields['업로드 날짜'] || '';
            if (!uploaded.has(key) || date < uploaded.get(key)) uploaded.set(key, date);
        }
    }

    const today = Date.now();
    const overdue = [];
    let noCheckin = 0;
    let live = 0;

    for (const a of apps) {
        const f = a.fields;
        if (f['예약 취소/변경'] === '취소') continue;
        const campId = (f['숙소 이름 (유료 오퍼)'] || [])[0];
        if (!campId) continue;
        live++;

        if (!f['입실일']) { noCheckin++; continue; }

        const premiumId = (f['크리에이터 채널명(프리미엄 협찬 신청)'] || [])[0];
        const premium = premiumId ? premiumMap.get(premiumId) : null;
        const creatorId = premium?.creatorId;

        // 퇴실일 = 입실일 + 1박 (사용자 확정 가정)
        const checkout = kstDay(f['입실일']) + DAY;
        const dueAt = checkout + GRACE_DAYS * DAY;
        if (dueAt > today) continue;

        const key = creatorId ? `${creatorId}::${campId}` : null;
        if (key && uploaded.has(key)) continue;

        const camp = campMap.get(campId) || {};
        const deadlineRaw = camp['콘텐츠 제작 기한 (날짜)'];
        const deadline = deadlineRaw ? String(deadlineRaw).slice(0, 10) : '';
        overdue.push({
            channel: f['크리에이터 채널명'] || '(이름 없음)',
            camp: camp['숙소 이름을 적어주세요.'] || campId,
            checkin: f['입실일'],
            daysOver: Math.floor((today - dueAt) / DAY),
            deadline,
            deadlinePassed: deadline ? kstDay(deadline) < today : false,
            phone: premium?.phone || '',
            noCreatorLink: !creatorId,
            appId: a.id,
        });
    }

    overdue.sort((x, y) => x.daysOver - y.daysOver);
    const recent = SHOW_ALL ? overdue : overdue.filter((o) => o.daysOver <= 90);

    console.log(`\n콘텐츠 미업로드 독촉 대상 — 퇴실(입실+1박) + ${GRACE_DAYS}일 경과 기준`);
    console.log(`유효 신청 ${live}건 / 입실일 미등록 ${noCheckin}건 / 미업로드 ${overdue.length}건` +
        (SHOW_ALL ? '' : ` (D+90 이내 ${recent.length}건만 표시, 전체는 --all)`));
    console.log('-'.repeat(96));
    if (recent.length === 0) {
        console.log('  대상 없음 ✅');
    } else {
        console.log(`  ${pad('경과', 6)}${pad('크리에이터', 22)}${pad('캠핑장', 26)}${pad('입실일', 12)}${pad('제작기한', 12)}비고`);
        for (const o of recent) {
            const notes = [];
            if (o.deadlinePassed) notes.push('제작기한 지남');
            if (o.noCreatorLink) notes.push('⚠️크리에이터 링크 없음(수동확인)');
            console.log(`  ${pad('D+' + o.daysOver, 6)}${pad(o.channel, 22)}${pad(o.camp, 26)}${pad(o.checkin, 12)}${pad(o.deadline || '-', 12)}${notes.join(' · ')}`);
        }
    }

    console.log('\n※ 퇴실일은 1박 가정(입실일+1일). 2박 이상 묵은 건은 실제보다 하루 이상 빨리 잡히므로 D+0~2 경계는 확인 요망.');
    console.log('※ 조인은 크리에이터 명단 레코드 ID 기준 — 업로드 테이블 채널명 표기 흔들림(오타)에 영향받지 않음.');
})();
