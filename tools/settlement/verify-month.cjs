// 프리미엄 협찬 월정산 대사 (읽기 전용)
//
// 하는 일:
//   ① 지정 월에 "저장(Created)"된 프리미엄 협찬 콘텐츠 건을 전부 뽑는다
//   ② 이중 정산 위험(중복 저장)을 3축으로 검사한다
//   ③ 등급별 협찬비 → 지급액을 계산한다 (개인 ×0.967 / 사업자 ×1.1)
//   ④ 첫 정산자(통장사본 요구 대상)를 표시한다
//   ⑤ 계좌/성함/주민번호 결손·오염을 잡아낸다
//
// 실행: node tools/settlement/verify-month.cjs 2026-07
//   시트 대조까지 하려면 구글시트를 "파일 → 다운로드 → Microsoft Excel(.xlsx)"로 받아
//   그 경로를 2번째 인자로 넘긴다. (python3 + openpyxl 사용)
//   node tools/settlement/verify-month.cjs 2026-07 ~/Downloads/"프리미엄 협찬 정산(2026년).xlsx"
//
// ⚠️ 기준 날짜는 반드시 Created(저장일). 업로드 날짜로 필터하면 이중 지급이 난다.
// ⚠️ 시트는 반드시 .xlsx로 읽는다. 드라이브 MCP 텍스트 변환본은 뒤가 잘리고 캐시돼서
//    멀쩡한 행을 "누락"으로 오판한 사고가 있었다(2026-08-03).
// 배경/설계: docs/SOP-프리미엄협찬-월정산-대사.md
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const REPO_ROOT = path.join(__dirname, '..', '..');
const Airtable = require(path.join(REPO_ROOT, 'node_modules/airtable'));

const env = {};
for (const line of fs.readFileSync(path.join(REPO_ROOT, '.env.local'), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const base = new Airtable({ apiKey: env.AIRTABLE_ACCESS_TOKEN }).base(env.AIRTABLE_BASE_ID);
const CONTENT = env.AIRTABLE_CONTENT_UPLOAD_TABLE_ID;

const month = process.argv[2];
const sheetFile = process.argv[3];
if (!/^\d{4}-\d{2}$/.test(month || '')) {
    console.error('사용법: node tools/settlement/verify-month.cjs YYYY-MM [정산시트.xlsx]');
    process.exit(1);
}

// .xlsx 『콘텐츠 제작 완료_ (크리에이터)』 탭에서 해당 월 행을 뽑는다 (python3 + openpyxl)
function readSheetRows(xlsxPath, ym) {
    const py = `
import openpyxl, datetime, json, sys
wb = openpyxl.load_workbook(sys.argv[1], data_only=True)
ws = next((w for w in wb.worksheets if '콘텐츠 제작 완료' in w.title), None)
if ws is None:
    print(json.dumps({'error': '『콘텐츠 제작 완료』 탭을 찾지 못했습니다. 탭 목록=' + str(wb.sheetnames)})); sys.exit()
out = []
for r in ws.iter_rows(min_row=2, values_only=True):
    d = r[0]
    if not isinstance(d, datetime.datetime) or d.strftime('%Y-%m') != sys.argv[2]:
        continue
    out.append({'date': d.strftime('%Y-%m-%d'), 'camp': str(r[8] or '').strip(), 'channel': str(r[9] or '').strip(),
                'name': str(r[2] or '').strip(), 'tier': r[12], 'fee': r[13], 'commission': r[14],
                'pay': r[15], 'basisDate': r[1], 'bizNo': r[21], 'confirmed': r[22]})
print(json.dumps({'rows': out}, ensure_ascii=False, default=str))
`;
    const raw = execFileSync('python3', ['-c', py, xlsxPath, ym], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    const parsed = JSON.parse(raw);
    if (parsed.error) throw new Error(parsed.error);
    return parsed.rows;
}

const first = (v) => (Array.isArray(v) ? v[0] : v);
const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const won = (n) => (n == null ? '?' : Number(n).toLocaleString());

// 등급별 협찬비: 3=⭐️아이콘 / 2=✔️파트너 / 1=🔥라이징
function tierFee(r) {
    const t = first(r.get('등급화 (from 크리에이터 명단)'));
    const field = t === 3 ? '⭐️ 협찬 제안 금액 (from 프리미엄 협찬 캠핑장 이름)'
        : t === 2 ? '✔️ 협찬 제안 금액 (from 프리미엄 협찬 캠핑장 이름)'
        : t === 1 ? '🔥 협찬 제안 금액 (from 프리미엄 협찬 캠핑장 이름)' : null;
    return { tier: t, fee: field ? first(r.get(field)) : null };
}

// 개인: 원천징수 3.3% 공제 / 사업자: 부가세 10% 가산
function payout(fee, bizType) {
    if (fee == null) return null;
    return bizType === '사업자' ? Math.round(fee * 1.1) : Math.round(fee * 0.967);
}

base(CONTENT).select().all().then((records) => {
    const premium = records.filter((r) => r.get('협찬의 종류를 골라주세요') === '프리미엄 협찬');
    const target = premium.filter((r) => String(r.get('Created') || '').slice(0, 7) === month);

    // 인별 최초 저장월 — 첫 정산자(통장사본 요구 대상) 판별
    const firstSeen = new Map();
    for (const r of premium) {
        const nm = norm(first(r.get('이름 (from 프리미엄 협찬을 신청했나요?)')));
        if (!nm) continue;
        const c = String(r.get('Created') || '').slice(0, 10);
        if (!firstSeen.has(nm) || c < firstSeen.get(nm)) firstSeen.set(nm, c);
    }

    const rows = target.map((r) => {
        const { tier, fee } = tierFee(r);
        const bizType = first(r.get('개인 / 사업자 (from 프리미엄 협찬을 신청했나요?)')) || '';
        return {
            id: r.id,
            created: String(r.get('Created') || '').slice(0, 10),
            uploaded: String(r.get('업로드 날짜') || '').slice(0, 10),
            camp: norm(first(r.get('숙소 이름을 적어주세요. (from 캠지기 모집 폼)'))),
            campId: first(r.get('캠핑장 레코드 id (from 프리미엄 협찬 캠핑장 이름) 2')) || '',
            channel: norm(first(r.get('크리에이터 채널명 (from 크리에이터 명단)'))),
            name: norm(first(r.get('이름 (from 프리미엄 협찬을 신청했나요?)'))),
            holder: norm(first(r.get('예금주 (from 프리미엄 협찬을 신청했나요?)'))),
            rrn: first(r.get('주민등록번호 (from 프리미엄 협찬을 신청했나요?)')) || '',
            bank: first(r.get('은행 (from 프리미엄 협찬을 신청했나요?)')) || '',
            acct: String(first(r.get('계좌번호 (from 프리미엄 협찬을 신청했나요?)')) || ''),
            phone: first(r.get('연락처 (from 프리미엄 협찬을 신청했나요?)')) || '',
            link: norm(r.get('콘텐츠 링크')),
            bizType, tier, fee,
            commission: first(r.get('캠핏수수료 (from 프리미엄 협찬 캠핑장 이름)')),
            pay: payout(fee, bizType),
        };
    }).sort((a, b) => a.created.localeCompare(b.created));

    console.log(`\n=== ${month} 정산 대상 (Created 기준) — ${rows.length}건 ===\n`);
    for (const x of rows) {
        console.log(`${x.created} | ${x.camp} / ${x.channel} | ${x.name}(${x.bizType}) | 등급${x.tier} | 협찬비 ${won(x.fee)} | 수수료 ${won(x.commission)} | 지급액 ${won(x.pay)}`);
    }

    // ── 중복 저장 검사 (이중 정산 방지) ─────────────────────────
    console.log('\n=== 🚨 중복 저장 검사 ===');
    let dup = 0;

    // 축1: 동일 크리에이터 + 동일 캠페인 레코드 (전체 기간)
    const pair = new Map();
    for (const r of premium) {
        const ch = norm(first(r.get('크리에이터 채널명 (from 크리에이터 명단)')));
        const cid = first(r.get('캠핑장 레코드 id (from 프리미엄 협찬 캠핑장 이름) 2')) || '(없음)';
        const k = ch + '||' + cid;
        if (!pair.has(k)) pair.set(k, []);
        pair.get(k).push(r);
    }
    for (const [, list] of pair) {
        if (list.length < 2) continue;
        if (!list.some((r) => String(r.get('Created') || '').slice(0, 7) === month)) continue;
        dup++;
        console.log(`[동일 크리에이터+캠페인] ${norm(first(list[0].get('크리에이터 채널명 (from 크리에이터 명단)')))} @ ${norm(first(list[0].get('숙소 이름을 적어주세요. (from 캠지기 모집 폼)')))}`);
        for (const r of list) console.log(`   · ${String(r.get('Created')).slice(0, 10)} | ${r.get('콘텐츠 링크')} | ${r.id}`);
    }

    // 축2: 동일 콘텐츠 링크
    const byLink = new Map();
    for (const r of premium) {
        const l = norm(r.get('콘텐츠 링크'));
        if (!l) continue;
        if (!byLink.has(l)) byLink.set(l, []);
        byLink.get(l).push(r);
    }
    for (const [l, list] of byLink) {
        if (list.length < 2) continue;
        if (!list.some((r) => String(r.get('Created') || '').slice(0, 7) === month)) continue;
        dup++;
        console.log(`[동일 링크] ${l}`);
        for (const r of list) console.log(`   · ${String(r.get('Created')).slice(0, 10)} | ${r.id}`);
    }

    // 축3: 월 경계 — Created와 업로드 날짜의 월이 다른 건 (지난달 정산분과 겹칠 수 있음)
    const edge = rows.filter((x) => x.uploaded && x.uploaded.slice(0, 7) !== month);
    if (edge.length) {
        dup++;
        console.log('[월 경계 주의] Created와 업로드 날짜의 월이 다름 — 지난달 원장에 이미 있는지 직접 확인할 것');
        for (const x of edge) console.log(`   · 저장 ${x.created} / 업로드 ${x.uploaded} | ${x.camp} / ${x.channel}`);
    }
    if (!dup) console.log('(이상 없음)');

    // ── 데이터 결손·오염 ────────────────────────────────────
    console.log('\n=== ⚠️ 지급정보 점검 ===');
    let bad = 0;
    for (const x of rows) {
        const issues = [];
        if (!x.campId) issues.push('캠핑장 레코드 id 없음');
        if (x.fee == null) issues.push(`협찬비 산출 불가(등급=${x.tier})`);
        if (!x.rrn) issues.push('주민등록번호 없음');
        if (!x.bank) issues.push('은행 없음');
        if (!x.acct) issues.push('계좌번호 없음');
        if (/[가-힣]/.test(x.acct)) issues.push(`계좌번호에 한글 포함 "${x.acct}"`);
        if (x.name && x.holder && x.name !== x.holder) issues.push(`성함(${x.name}) ≠ 예금주(${x.holder})`);
        if (issues.length) { bad++; console.log(`- ${x.camp} / ${x.channel}: ${issues.join(' / ')}`); }
    }
    if (!bad) console.log('(이상 없음)');

    // ── 인별 집계 + 첫 정산자 ────────────────────────────────
    console.log('\n=== 👤 인별 합계 (시트 『정산 요약』 대조용) ===');
    const byPerson = new Map();
    for (const x of rows) {
        if (!byPerson.has(x.name)) {
            byPerson.set(x.name, { fee: 0, pay: 0, biz: x.bizType, bank: x.bank, acct: x.acct, holder: x.holder, phone: x.phone, camps: [] });
        }
        const e = byPerson.get(x.name);
        e.fee += x.fee || 0;
        e.pay += x.pay || 0;
        e.camps.push(x.camp);
    }
    for (const [nm, e] of byPerson) {
        const isFirst = (firstSeen.get(nm) || '').slice(0, 7) === month;
        console.log(`${isFirst ? '🆕첫정산(통장사본 필요) ' : '                       '}${nm}(${e.biz}) | 협찬비 ${won(e.fee)} → 지급액 ${won(e.pay)} | ${e.bank} ${e.acct} 예금주 ${e.holder} | ${e.camps.join(', ')}`);
    }

    // ── 시트 대조 (선택) ────────────────────────────────────
    if (sheetFile) {
        console.log('\n=== 📄 정산시트(.xlsx) 대조 ===');
        const sheetRows = readSheetRows(sheetFile, month);
        console.log(`시트 ${sheetRows.length}행 vs 에어테이블 ${rows.length}건`);

        const pool = new Map();
        for (const s of sheetRows) pool.set(norm(s.camp) + '||' + norm(s.channel), s);

        const missing = [];
        let mismatch = 0;
        for (const x of rows) {
            const k = x.camp + '||' + x.channel;
            const s = pool.get(k);
            if (!s) { missing.push(x); continue; }
            const p = [];
            if (Number(s.fee) !== Number(x.fee)) p.push(`협찬비 시트 ${won(s.fee)} vs AT ${won(x.fee)}`);
            if (Number(s.commission) !== Number(x.commission)) p.push(`수수료 시트 ${won(s.commission)} vs AT ${won(x.commission)}`);
            if (Number(s.tier) !== Number(x.tier)) p.push(`등급 시트 ${s.tier} vs AT ${x.tier}`);
            if (s.date !== x.created) p.push(`저장일 시트 ${s.date} vs AT ${x.created}`);
            if (p.length) { mismatch++; console.log(`⚠ 값 불일치 ${x.camp} / ${x.channel}: ${p.join(', ')}`); }
            pool.delete(k);
        }
        console.log('\n[시트에 누락 — 시트에 추가할 것]');
        console.log(missing.length ? missing.map((x) => `- ${x.created} ${x.camp} / ${x.channel} (${x.name}) 지급액 ${won(x.pay)}`).join('\n') : '(없음)');
        console.log('\n[시트에만 있음 — 원인 확인 전 지급 금지]');
        console.log(pool.size ? [...pool.keys()].map((k) => '- ' + k).join('\n') : '(없음)');
        if (!missing.length && !pool.size && !mismatch) console.log('\n✅ 행·값 전부 일치');

        // 파생 열 공란 점검 — 행이 있어도 이게 비면 이체 금액이 없다
        console.log('\n[파생 열 공란 점검]');
        const cols = [['pay', '지급액'], ['basisDate', '정산 기준일'], ['bizNo', '사업자번호(캠핑장)'], ['confirmed', '정산 정보 확인']];
        for (const [k, label] of cols) {
            const empty = sheetRows.filter((s) => s[k] === null || s[k] === '' || s[k] === 'None').length;
            console.log(`  ${empty ? '⚠' : ' '} ${label}: 공란 ${empty}/${sheetRows.length}`);
        }
    } else {
        console.log('\n(정산시트를 .xlsx로 받아 2번째 인자로 주면 시트 대조까지 수행합니다)');
    }

    const t = rows.reduce((a, x) => ({ fee: a.fee + (x.fee || 0), pay: a.pay + (x.pay || 0), com: a.com + (x.commission || 0) }), { fee: 0, pay: 0, com: 0 });
    console.log(`\n=== 합계 ===\n건수 ${rows.length} / 협찬비 ${won(t.fee)} / 지급액 ${won(t.pay)} / 캠핏수수료 ${won(t.com)}`);
}).catch((e) => { console.error('조회 실패:', e.message); process.exit(1); });
