// 쿠폰이벤트 신청 취소 = 쿠폰 반납 후 삭제 (안전 툴)
//
// 왜 필요한가: 신청 레코드를 Airtable에서 그냥 삭제하면 '신청 가능 인원'은 되돌아오지만
//   그 크리에이터가 받았던 팔로워 쿠폰 코드는 캠페인 풀로 돌아오지 않는다.
//   → 풀이 자리보다 먼저 바닥나 다음 신청자가 COUPON_POOL_EMPTY를 맞는다.
//   이 툴은 삭제 전에 코드를 풀로 되돌리고(배포완료에서 제거) 검증한 뒤 레코드를 삭제한다.
//
// 사용:
//   node tools/coupon-pool/cancel-application.cjs <신청레코드ID>            # dry-run (계획만 출력, 안 씀)
//   node tools/coupon-pool/cancel-application.cjs <신청레코드ID> --commit    # 실제 실행
//
// 신청레코드ID = 유료 오퍼 신청 건 테이블(tblIV8Wk4SLx2Hh91)의 recXXXX
//
// 배경/설계: docs/SOP-프리미엄협찬-쿠폰풀-정합성.md
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..', '..');
const Airtable = require(path.join(REPO_ROOT, 'node_modules/airtable'));

const env = {};
for (const line of fs.readFileSync(path.join(REPO_ROOT, '.env.local'), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const base = new Airtable({ apiKey: env.AIRTABLE_ACCESS_TOKEN }).base(env.AIRTABLE_BASE_ID);
const CAMPAIGN = env.AIRTABLE_CAMPAIGN_TABLE_ID;
const APPLICATION = env.AIRTABLE_APPLICATION_TABLE_ID;

const lines = (v) => (v || '').split('\n').map((s) => s.trim()).filter(Boolean);

const appId = process.argv[2];
const COMMIT = process.argv.includes('--commit');

if (!appId || !appId.startsWith('rec')) {
    console.error('사용: node tools/coupon-pool/cancel-application.cjs <신청레코드ID> [--commit]');
    process.exit(1);
}

(async () => {
    // 1. 신청 레코드 조회
    const app = await base(APPLICATION).find(appId);
    const myCode = (app.fields['팔로워 쿠폰 코드'] || '').trim();
    const channel = app.fields['크리에이터 채널명'] || '(무명)';
    const campLink = app.fields['숙소 이름 (유료 오퍼)'];
    const campaignId = Array.isArray(campLink) ? campLink[0] : null;

    console.log(`\n신청: ${channel}  (${appId})`);
    console.log(`본인 쿠폰 코드: ${myCode || '(없음)'}`);

    if (!campaignId) {
        console.log(`\n⚠️ 캠페인 링크 없음 → 쿠폰 반납 불가. 이 레코드는 삭제만 하면 됩니다.`);
        if (COMMIT) { await base(APPLICATION).destroy(appId); console.log('✅ 레코드 삭제 완료'); }
        else console.log('(dry-run) --commit 붙이면 삭제');
        return;
    }

    // 2. 캠페인 조회
    const camp = await base(CAMPAIGN).find(campaignId);
    const campName = camp.fields['숙소 이름을 적어주세요.'] || campaignId;
    const isCouponEvent = camp.fields['쿠폰이벤트희망'] === true;
    const pool = lines(camp.fields['팔로워 쿠폰 코드']);
    const dispensed = lines(camp.fields['배포 완료된 쿠폰']);

    console.log(`캠페인: ${campName}  (${campaignId})  쿠폰이벤트=${isCouponEvent}`);
    console.log(`현재 풀=${pool.length}, 배포완료=${dispensed.length}`);

    // 3. 반납 계획
    let campaignUpdate = null;
    if (isCouponEvent && myCode) {
        const alreadyInPool = pool.includes(myCode);
        const newPool = alreadyInPool ? pool : [...pool, myCode];
        const newDispensed = dispensed.filter((c) => c !== myCode); // 재분배 시 이중카운트 방지 위해 배포완료에서 제거

        console.log(`\n[계획] 쿠폰 ${myCode} 반납:`);
        console.log(`  풀        ${pool.length} → ${newPool.length}${alreadyInPool ? ' (이미 풀에 있음 → 그대로)' : ` (+${myCode})`}`);
        console.log(`  배포완료  ${dispensed.length} → ${newDispensed.length}${dispensed.includes(myCode) ? ` (-${myCode})` : ' (배포완료에 없었음)'}`);
        campaignUpdate = {
            '팔로워 쿠폰 코드': newPool.join('\n'),
            '배포 완료된 쿠폰': newDispensed.join('\n'),
        };
    } else if (isCouponEvent && !myCode) {
        console.log(`\n⚠️ 쿠폰이벤트 캠페인인데 신청 레코드에 본인 코드가 없음 → 반납할 코드 없음(삭제만).`);
    } else {
        console.log(`\n쿠폰이벤트 아님 → 반납 없이 삭제만.`);
    }
    console.log(`[계획] 신청 레코드 ${appId} 삭제 (→ '신청 가능 인원' +1 자동 복구)`);

    if (!COMMIT) {
        console.log(`\n(dry-run) 실제 실행하려면 --commit 을 붙이세요.`);
        return;
    }

    // 4. 실행: 코드 반납 먼저(+검증) → 그 다음 레코드 삭제
    if (campaignUpdate) {
        await base(CAMPAIGN).update([{ id: campaignId, fields: campaignUpdate }]);
        const after = await base(CAMPAIGN).find(campaignId);
        const poolAfter = lines(after.fields['팔로워 쿠폰 코드']);
        const dispAfter = lines(after.fields['배포 완료된 쿠폰']);
        const ok = poolAfter.includes(myCode) && !dispAfter.includes(myCode);
        if (!ok) {
            console.error(`\n❌ 검증 실패: 풀에 ${myCode} 포함=${poolAfter.includes(myCode)}, 배포완료 제거=${!dispAfter.includes(myCode)}. 레코드 삭제 보류.`);
            process.exit(1);
        }
        console.log(`\n✅ 쿠폰 반납 검증 완료 (풀=${poolAfter.length}, 배포완료=${dispAfter.length})`);
    }
    await base(APPLICATION).destroy(appId);
    console.log(`✅ 신청 레코드 삭제 완료`);
    console.log(`\n권장: node tools/coupon-pool/audit.cjs 로 정합성 재확인`);
})().catch((e) => { console.error('ERROR', e.message); process.exit(1); });
