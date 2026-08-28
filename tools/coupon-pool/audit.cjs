// 쿠폰이벤트 캠페인 팔로워 쿠폰 풀 정합성 감사 (주간 안전망)
//
// 불변식(이걸 깨면 신청 시 COUPON_POOL_EMPTY):
//   ① 풀(팔로워 쿠폰 코드 줄 수) >= 열린 자리(총 신청 가능 인원)
//   ② 배포완료 줄 수 == 살아있는(취소 아닌) 신청 수  → 어긋나면 취소 후 미반납 코드 존재
//
// 실행: node tools/coupon-pool/audit.cjs
//   - 리포트만 출력. 아무것도 쓰지 않음(읽기 전용).
//
// 배경/설계: docs/SOP-프리미엄협찬-쿠폰풀-정합성.md
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..', '..');
const Airtable = require(path.join(REPO_ROOT, 'node_modules/airtable'));

// .env.local 수동 파싱 (dotenv 의존 없이)
const env = {};
for (const line of fs.readFileSync(path.join(REPO_ROOT, '.env.local'), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const base = new Airtable({ apiKey: env.AIRTABLE_ACCESS_TOKEN }).base(env.AIRTABLE_BASE_ID);
const CAMPAIGN = env.AIRTABLE_CAMPAIGN_TABLE_ID;
const APPLICATION = env.AIRTABLE_APPLICATION_TABLE_ID;

const lines = (v) => (v || '').split('\n').map((s) => s.trim()).filter(Boolean);
const pad = (s, n) => String(s).padEnd(n);

(async () => {
    // CHANGED: 취소 신청건 제외한 '살아있는 신청' 수를 신청 테이블에서 직접 집계.
    //   기존엔 캠페인의 링크 필드 길이를 썼는데, 포털 취소(예약 취소/변경='취소')는
    //   레코드가 남으므로 취소건까지 살아있는 신청으로 세어 붕뜬코드를 0으로 오판했다.
    //   (2026-07-24 파머스힐: 취소건 1을 살아있는 신청으로 세어 유형 A를 B로 오분류)
    const liveAppCountByCampaign = {};
    const apps = await base(APPLICATION)
        .select({ fields: ['숙소 이름 (유료 오퍼)', '예약 취소/변경'] })
        .all();
    for (const a of apps) {
        if (a.fields['예약 취소/변경'] === '취소') continue;
        const link = a.fields['숙소 이름 (유료 오퍼)'];
        if (!Array.isArray(link)) continue;
        for (const campaignId of link) {
            liveAppCountByCampaign[campaignId] = (liveAppCountByCampaign[campaignId] || 0) + 1;
        }
    }

    const recs = await base(CAMPAIGN)
        .select({
            filterByFormula: '{쿠폰이벤트희망}=TRUE()',
            fields: [
                '숙소 이름을 적어주세요.',
                '총 신청 가능 인원',
                '팔로워 쿠폰 코드', '배포 완료된 쿠폰',
                '유료 오퍼 신청 인플루언서',
                '입금내역 확인',
            ],
        })
        .all();

    console.log(`\n쿠폰이벤트 캠페인 ${recs.length}건 점검\n`);

    const rows = [];
    const problems = [];
    for (const r of recs) {
        const f = r.fields;
        const name = f['숙소 이름을 적어주세요.'] || '(무명)';
        const open = f['총 신청 가능 인원'] || 0;
        const pool = lines(f['팔로워 쿠폰 코드']);
        const dispensed = lines(f['배포 완료된 쿠폰']);
        const liveApps = liveAppCountByCampaign[r.id] || 0; // CHANGED: 취소건 제외 집계 사용
        const live = f['입금내역 확인'] === true; // 포털 노출(=지금 신청 가능) 여부

        const stranded = Math.max(0, new Set(dispensed).size - liveApps); // 붕 뜬(미반납) 코드 추정
        const poolShort = pool.length < open;                            // 자리는 있는데 코드 부족

        const row = { id: r.id, name, open, pool: pool.length, dispensed: dispensed.length, liveApps, stranded, poolShort, live, poolCodes: pool, dispensedCodes: dispensed };
        rows.push(row);
        if (poolShort || stranded > 0) problems.push(row);
    }

    console.log(pad('캠핑장', 22), pad('노출', 5), pad('열린자리', 9), pad('풀', 5), pad('배포완료', 9), pad('살아신청', 9), pad('붕뜬', 5), '풀부족?');
    console.log('-'.repeat(95));
    for (const x of rows.sort((a, b) => (b.live - a.live) || (b.poolShort - a.poolShort) || (b.stranded - a.stranded))) {
        console.log(
            pad(x.name, 22), pad(x.live ? '🔴' : '⚪', 5), pad(x.open, 9), pad(x.pool, 5),
            pad(x.dispensed, 9), pad(x.liveApps, 9), pad(x.stranded, 5), x.poolShort ? '⚠️ 예' : '아니오'
        );
    }

    // 실제 위험 = 포털 노출中(live) 이면서 풀 부족. 그 외는 잠재/오픈 전.
    const liveBroken = problems.filter((p) => p.live && p.poolShort);
    console.log(`\n=== 요약 ===`);
    console.log(`전체 ${rows.length} · 플래그 ${problems.length} · 🔴지금 실제 위험(노출中+풀부족) ${liveBroken.length}`);

    if (problems.length) {
        console.log(`\n=== 플래그 상세 ===`);
        for (const p of problems) {
            const kind = p.stranded > 0 ? 'A: 붕뜬코드 회수형(취소 미반납)' : 'B: 풀 미발행형(발행 필요)';
            console.log(`\n▶ ${p.name} (${p.id})  [${p.live ? '🔴 노출中' : '⚪ 미노출'}]  유형 ${kind}`);
            console.log(`   열린자리=${p.open}, 풀=${p.pool}, 배포완료=${p.dispensed}, 살아있는신청=${p.liveApps}, 붕뜬코드=${p.stranded}`);
            if (p.poolShort) console.log(`   ⚠️ 풀(${p.pool}) < 열린자리(${p.open}) → 신청 시 COUPON_POOL_EMPTY`);
            if (p.stranded > 0) console.log(`   ↩︎ 회수 후보(배포완료 − 살아있는신청): ${JSON.stringify(p.dispensedCodes)}`);
        }
        console.log(`\n조치: 유형 A는 취소된 신청을 tools/coupon-pool/cancel-application.cjs 로 반납 처리(또는 SOP 수동 반납).`);
        console.log(`      유형 B(노출中)는 어드민 쿠폰 자동발행으로 풀을 먼저 채워야 함.`);
    } else {
        console.log('\n모든 쿠폰이벤트 캠페인 정합성 OK');
    }
})().catch((e) => { console.error('ERROR', e.message); process.exit(1); });
