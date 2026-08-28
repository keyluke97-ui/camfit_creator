#!/usr/bin/env node
/**
 * SOP-죽은캠페인-소생 Step 1~4: 기한 지남/30일 이내 + 잔여 있는 캠페인의 제작기한을
 * 목표일 이상이 되도록 `추가 기간 연장`(개월)을 올리고, 쿠폰이벤트 캠페인은
 * 방문/쿠폰 유효 날짜 4개도 같이 민다 (방문종료 = min(오늘+방문일수, 새기한-14일)).
 *
 *   node tools/campaign-revival/extend.cjs                     # 드라이런 (기본, 목표 상수 TARGET 확인!)
 *   node tools/campaign-revival/extend.cjs --apply             # 실제 쓰기 + 재조회 검증
 *
 * ⚠️ 실행 전 TARGET 상수(목표 기한)를 이번 회차 값으로 바꿀 것.
 * ⚠️ 기한은 Created+개월 수식이라 정확한 날짜로 못 맞춘다 — "목표일 이상 최소 개월"로 계산됨.
 * ⚠️ 이 스크립트는 Airtable까지만. 실물 쿠폰은 만료일 수정이 불가능하므로 SOP Step 5(재발급+교체) 별도 진행.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const env = {};
for (const line of fs.readFileSync(`${ROOT}/.env.local`, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
}
const TOKEN = env.AIRTABLE_ACCESS_TOKEN;
const BASE = env.AIRTABLE_BASE_ID;
const T_CAMP = env.AIRTABLE_CAMPAIGN_TABLE_ID;
const T_APP = env.AIRTABLE_APPLICATION_TABLE_ID;

const APPLY = process.argv.includes('--apply');
const TARGET = '2026-10-31'; // 이 날짜 이상이 되는 최소 개월수 적용
const WINDOW_DAYS = 30;
const DAY = 86400000;

const FIELDS = [
    '숙소 이름을 적어주세요.', '입금내역 확인', 'Select', '환불 요청일', '환불 요청 금액',
    'Created', '기본 제작 개월수', '추가 기간 연장', '콘텐츠 제작 기한 (날짜)', '쿠폰이벤트희망',
    '⭐️ 신청 가능 인원', '✔️ 신청 가능 인원', '🔥 신청 가능 인원',
    '크리에이터 방문 가능 시작일', '크리에이터 방문 가능 종료일', '쿠폰 유효 시작일', '쿠폰 유효 종료일',
    '방문 가능 기간(일수)', '쿠폰 유효 기간(일수)', '🎟️ 쿠폰 자동 발행', '쿠폰코드', '팔로워 쿠폰 코드',
];

async function fetchAll(tableId, fields, formula) {
    const out = [];
    let offset;
    do {
        const url = new URL(`https://api.airtable.com/v0/${BASE}/${tableId}`);
        (fields || []).forEach((f) => url.searchParams.append('fields[]', f));
        url.searchParams.set('pageSize', '100');
        if (formula) url.searchParams.set('filterByFormula', formula);
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

// Airtable DATEADD(Created, n, 'months') 근사 — KST 기준 날짜에 n개월 더하고 월말 클램프
function addMonthsKst(createdIso, n) {
    const kst = new Date(new Date(createdIso).getTime() + 9 * 3600000);
    let y = kst.getUTCFullYear();
    let mo = kst.getUTCMonth() + n;
    const d = kst.getUTCDate();
    y += Math.floor(mo / 12);
    mo = ((mo % 12) + 12) % 12;
    const lastDay = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
    const day = Math.min(d, lastDay);
    return `${y}-${String(mo + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

(async () => {
    const camps = await fetchAll(T_CAMP, FIELDS, '{입금내역 확인}');
    const apps = await fetchAll(T_APP, ['숙소 이름 (유료 오퍼)', '예약 취소/변경']);
    const today = kstDay(new Date(Date.now() + 9 * 3600000).toISOString());

    // 캠페인 ID → 유효 신청 수 (레코드 ID 조인, SOP §3 함정: 이름 조인 금지)
    const appCount = new Map();
    for (const a of apps) {
        if (a.fields['예약 취소/변경'] === '취소') continue;
        for (const cid of (a.fields['숙소 이름 (유료 오퍼)'] || [])) {
            appCount.set(cid, (appCount.get(cid) || 0) + 1);
        }
    }

    const targets = [];
    for (const c of camps) {
        const f = c.fields;
        const avail = (f['⭐️ 신청 가능 인원'] || 0) + (f['✔️ 신청 가능 인원'] || 0) + (f['🔥 신청 가능 인원'] || 0);
        if (avail < 1) continue;
        const deadlineRaw = f['콘텐츠 제작 기한 (날짜)'];
        if (!deadlineRaw) continue;
        const dLeft = Math.floor((kstDay(deadlineRaw) - today) / DAY);
        if (dLeft > WINDOW_DAYS) continue; // 지남 포함, 30일 이내까지 대상

        const base = f['기본 제작 개월수'] || 0;
        const ext = f['추가 기간 연장'] || 0;
        const predicted = addMonthsKst(f['Created'], base + ext);
        const actual = String(deadlineRaw).slice(0, 10);

        // 목표: 기한 ≥ TARGET이 되는 최소 총 개월수
        let newTotal = base + ext;
        while (kstDay(addMonthsKst(f['Created'], newTotal)) < kstDay(TARGET)) newTotal++;
        const newExt = newTotal - base;

        const newDeadline = addMonthsKst(f['Created'], newTotal);

        // Step 4 (쿠폰이벤트만): 방문시작=오늘, 방문종료=min(오늘+방문일수, 새기한-14일), 쿠폰=오늘~오늘+쿠폰일수
        const iso = (t) => new Date(t + 9 * 3600000 - new Date(t + 9 * 3600000).getTimezoneOffset() * 0).toISOString().slice(0, 10);
        const dayStr = (epochKstMidnight) => {
            const d = new Date(epochKstMidnight + 12 * 3600000); // KST 자정 + 12h → UTC 슬라이스로 날짜 안전 추출
            return new Date(d.getTime() + 9 * 3600000).toISOString().slice(0, 10);
        };
        const visitDays = f['방문 가능 기간(일수)'] || 60;
        const couponDays = f['쿠폰 유효 기간(일수)'] || 104;
        const visitEndNew = dayStr(Math.min(today + visitDays * DAY, kstDay(newDeadline) - 14 * DAY));
        const stepFour = f['쿠폰이벤트희망'] ? {
            '크리에이터 방문 가능 시작일': dayStr(today),
            '크리에이터 방문 가능 종료일': visitEndNew,
            '쿠폰 유효 시작일': dayStr(today),
            '쿠폰 유효 종료일': dayStr(today + couponDays * DAY),
        } : null;

        const poolCount = String(f['팔로워 쿠폰 코드'] || '').split('\n').filter(Boolean).length;
        targets.push({
            id: c.id,
            name: f['숙소 이름을 적어주세요.'] || c.id,
            created: String(f['Created']).slice(0, 10),
            dLeft,
            actual,
            predicted,
            formulaOk: predicted === actual,
            base, ext, newExt,
            newDeadline,
            stepFour,
            avail,
            poolCount,
            autoIssue: !!f['🎟️ 쿠폰 자동 발행'],
            hasMasterCoupon: !!f['쿠폰코드'],
            applications: appCount.get(c.id) || 0,
            couponEvent: !!f['쿠폰이벤트희망'],
            refund: f['환불 요청일'] || f['환불 요청 금액'] ? '⚠️환불접수' : '',
            select: f['Select'] || '',
            visitEnd: f['크리에이터 방문 가능 종료일'] || '',
        });
    }

    targets.sort((a, b) => a.dLeft - b.dLeft);

    console.log(`\n${APPLY ? '🔴 APPLY 모드' : '🟡 드라이런'} — 목표: 제작기한 ≥ ${TARGET} (개월 단위 최소치)`);
    console.log(`대상 ${targets.length}건\n`);
    for (const t of targets) {
        const flags = [];
        if (!t.formulaOk) flags.push(`❌수식예측 불일치(예측 ${t.predicted} ≠ 실제 ${t.actual})`);
        if (t.refund) flags.push(t.refund);
        if (t.select === '미운영') flags.push('⚠️미운영');
        if (t.applications === 0) flags.push('⚠️신청 0명(SOP§4 연장무익 후보)');
        if (t.couponEvent) flags.push('🎟️쿠폰이벤트(Step4 날짜 4개 + 쿠폰 재발급 별도)');
        console.log(`  ${t.name} (${t.id})`);
        console.log(`    신청일 ${t.created} · 현재기한 ${t.actual} (${t.dLeft < 0 ? 'D+' + -t.dLeft + ' 지남' : 'D-' + t.dLeft}) · 잔여 ${t.avail} · 유효신청 ${t.applications}건`);
        console.log(`    연장: ${t.base}+${t.ext} → ${t.base}+${t.newExt}개월 ⇒ 새 기한 ${t.newDeadline}`);
        if (t.stepFour) console.log(`    Step4: 방문 ${t.stepFour['크리에이터 방문 가능 시작일']}~${t.stepFour['크리에이터 방문 가능 종료일']} · 쿠폰유효 ${t.stepFour['쿠폰 유효 시작일']}~${t.stepFour['쿠폰 유효 종료일']} · 풀 ${t.poolCount}/잔여 ${t.avail}`);
        if (flags.length) console.log(`    ${flags.join(' · ')}`);
    }

    // 쓰기 가드 (SOP Step 6)
    const guarded = [];
    for (const t of targets) {
        const reasons = [];
        if (!t.formulaOk) reasons.push('수식 예측 불일치');
        if (t.select === '미운영') reasons.push('미운영');
        if (t.couponEvent && t.autoIssue) reasons.push('자동발행 ON');
        if (t.couponEvent && !t.hasMasterCoupon) reasons.push('대표쿠폰 없음');
        if (t.couponEvent && t.poolCount < t.avail) reasons.push(`풀(${t.poolCount}) < 잔여(${t.avail}) 불변식 위반`);
        if (reasons.length) { console.log(`\n⛔ ${t.name} 제외: ${reasons.join(', ')}`); continue; }
        guarded.push(t);
    }

    if (!APPLY) {
        console.log(`\n(쓰기 없음 — 가드 통과 ${guarded.length}/${targets.length}건, 적용하려면 --apply)`);
        return;
    }

    console.log(`\n쓰기 대상 ${guarded.length}건...`);
    for (let i = 0; i < guarded.length; i += 10) {
        const batch = guarded.slice(i, i + 10);
        const res = await fetch(`https://api.airtable.com/v0/${BASE}/${T_CAMP}`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                records: batch.map((t) => ({
                    id: t.id,
                    fields: { '추가 기간 연장': t.newExt, ...(t.stepFour || {}) },
                })),
            }),
        });
        if (!res.ok) throw new Error(`PATCH 실패: ${res.status} ${await res.text()}`);
    }

    // 재조회 검증 (SOP Step 6: 쓴 값 + hasAllCouponFields 재현)
    console.log('재조회 검증...');
    const after = await fetchAll(T_CAMP, [
        '숙소 이름을 적어주세요.', '추가 기간 연장', '콘텐츠 제작 기한 (날짜)', '쿠폰이벤트희망',
        '할인 금액', '쿠폰 적용 요일', '인당 팔로워 쿠폰',
        '크리에이터 방문 가능 시작일', '크리에이터 방문 가능 종료일', '쿠폰 유효 시작일', '쿠폰 유효 종료일',
    ], '{입금내역 확인}');
    const afterMap = new Map(after.map((c) => [c.id, c.fields]));
    let ok = 0;
    for (const t of guarded) {
        const f = afterMap.get(t.id) || {};
        const gotExt = f['추가 기간 연장'];
        const gotDeadline = String(f['콘텐츠 제작 기한 (날짜)'] || '').slice(0, 10);
        let pass = gotExt === t.newExt && gotDeadline === t.newDeadline;
        let couponNote = '';
        if (t.couponEvent) {
            const hasAll = !!(f['쿠폰이벤트희망'] && f['할인 금액'] && f['쿠폰 적용 요일'] && f['인당 팔로워 쿠폰'] &&
                f['크리에이터 방문 가능 시작일'] && f['크리에이터 방문 가능 종료일'] && f['쿠폰 유효 시작일'] && f['쿠폰 유효 종료일']);
            if (!hasAll) pass = false;
            couponNote = ` · couponEvent ${hasAll ? '유지✅' : '깨짐❌'} · 방문 ${f['크리에이터 방문 가능 시작일']}~${f['크리에이터 방문 가능 종료일']} · 쿠폰 ${f['쿠폰 유효 시작일']}~${f['쿠폰 유효 종료일']}`;
        }
        if (pass) ok++;
        console.log(`  ${pass ? '✅' : '❌'} ${t.name}: 연장 ${gotExt}, 기한 ${gotDeadline}${couponNote}${pass ? '' : ` (기대: ${t.newExt}, ${t.newDeadline})`}`);
    }
    console.log(`\n${ok}/${guarded.length} 검증 통과`);
})();
