// 프리미엄 협찬 입금 → 노출 → 신청 경로 점검 (읽기 전용)
//
// 2026-10 '입금내역 확인' 체크박스 개편 이후, 한 캠페인이 거쳐야 할 관문 5개를 실제 값으로 확인한다.
//   ① 입금 기록   입금 체크 + 입금액(≥ 실입금 필요 금액, 프렌들리 예외) → '입금 게이트 통과' = 1
//   ② 시트 전송   자동화 '입금 정산 확인'(게이트=1 AND 전송됨=false)이 시트 1행 + 메일 1통 후 '정산 시트 전송됨'✔
//   ③ 모집 시작   같은 자동화의 스크립트가 '입금 확인일'·'모집 시작일'을 (비어 있을 때만) 오늘로 기록
//   ④ 포털 노출   '포털 노출' 수식 = 입금 체크 + 모집 시작일 도래(KST) + 미운영 아님 + (쿠폰이벤트면 발행 전체성공)
//   ⑤ 신청        활성 신청 수 · 등급별 신청 가능 인원 ≥ 0 · 같은 크리에이터 중복 없음
//
// 실행:
//   node tools/premium-deposit/check.cjs                 전체 스캔 — 멈춘 건·새는 건만 경고
//   node tools/premium-deposit/check.cjs recXXXX         한 캠페인 5관문 추적
//   node tools/premium-deposit/check.cjs recXXXX ~/Downloads/"프리미엄 협찬 정산 시트.xlsx"
//       시트 행 수까지 대조(『캠핑장 정산_raw』 탭, 정확히 1행이어야 정상). python3 + openpyxl 사용.
//
// ⚠️ 메일 발송 횟수는 여기서 못 본다 — 캠지기 수신함(또는 발신 계정 보낸편지함)에서 "[캠핏] 프리미엄 협찬 입금 확인 안내" 1통인지 직접 확인.
// ⚠️ 시트는 .xlsx로 받아 읽는다. 드라이브 텍스트 변환본은 뒤가 잘린다(verify-month.cjs 참고).
// 배경: 메모리 project_deposit_checkbox_overhaul
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
const CAMPAIGN = env.AIRTABLE_CAMPAIGN_TABLE_ID;
const APPLICATION = env.AIRTABLE_APPLICATION_TABLE_ID;

const CAMPAIGN_FIELDS = [
    '숙소 이름을 적어주세요.', 'Created', '입금내역 확인', '입금액', '입금자명', '실입금 필요 금액',
    '입금 게이트 통과', '프렌들리', '정산 시트 전송됨', '입금 확인일', '모집 시작일', '포털 노출',
    'Select', '쿠폰이벤트희망', '🎟️ 발행 상태', '총 모집 인원',
    '⭐️ 신청 가능 인원', '✔️ 신청 가능 인원', '🔥 신청 가능 인원'
];

// 개편 배포일(#36). 이 날 이후 생성된 캠페인이 새 경로(게이트 → 자동화 → 노출)를 처음부터 타는 건이다.
const OVERHAUL_DATE = '2026-10-15';

const todayKst =() => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
const won = (n) => (typeof n === 'number' ? n.toLocaleString('ko-KR') + '원' : '(비어 있음)');

// 한 캠페인의 상태를 문제 목록으로 판정한다. 전체 스캔과 단건 추적이 같은 규칙을 쓴다.
function diagnose(f) {
    const problems = [];
    const deposited = !!f['입금내역 확인'];
    const gate = f['입금 게이트 통과'] === 1;
    const sent = !!f['정산 시트 전송됨'];
    const exposed = f['포털 노출'] === 1;

    if (deposited && !gate && !sent) {
        const reason = f['프렌들리'] ? '' : (typeof f['입금액'] !== 'number'
            ? '입금액 미입력'
            : `입금액 ${won(f['입금액'])} < 필요 ${won(f['실입금 필요 금액'])}`);
        problems.push({ level: '🟠', text: `입금 체크됐지만 게이트 미통과(${reason}) — 시트·메일·모집 시작일이 안 나간 채 멈춤` });
    }
    // 게이트를 안 거치고 열린 건: 모집 시작일을 미리 손으로 넣어 두면 자동화 없이도 노출된다.
    if (exposed && !sent) {
        problems.push({ level: '🔴', text: '포털에 노출 중인데 정산 시트 전송 전 — 시트 행·입금 안내 메일 없이 모집이 열림' });
    }
    // 개편 전 캠페인은 백필 때 '입금 확인일'을 알 수 없어 비워 뒀다(추적 필드가 없었음) — 그건 정상.
    // 개편 후 건에서 비었으면 자동화 마지막 스크립트가 실패한 것이다.
    const isPostOverhaul = (f['Created'] || '') >= OVERHAUL_DATE;
    if (sent && isPostOverhaul && (!f['입금 확인일'] || !f['모집 시작일'])) {
        problems.push({ level: '🟠', text: '시트 전송됨인데 입금 확인일/모집 시작일 빈 값 — 자동화 마지막 스크립트 실패 의심' });
    }
    if (deposited && sent && !isPostOverhaul && !f['모집 시작일'] && f['Select'] !== '미운영') {
        problems.push({ level: '🔴', text: '레거시 진행 건인데 모집 시작일 빈 값 — 포털 노출 수식에서 빠져 숨겨짐' });
    }
    for (const tier of ['⭐️', '✔️', '🔥']) {
        const available = f[`${tier} 신청 가능 인원`];
        if (typeof available === 'number' && available < 0) {
            problems.push({ level: '🔴', text: `${tier} 신청 가능 인원 ${available} — 초과 신청` });
        }
    }
    return problems;
}

async function scanAll() {
    const records = await base(CAMPAIGN).select({
        fields: CAMPAIGN_FIELDS,
        filterByFormula: 'OR({입금내역 확인}, {포털 노출} = 1, {정산 시트 전송됨})'
    }).all();

    let flagged = 0;
    for (const record of records) {
        const problems = diagnose(record.fields);
        if (!problems.length) continue;
        flagged++;
        console.log(`\n${record.id}  ${record.fields['숙소 이름을 적어주세요.'] || '(이름 없음)'}`);
        for (const p of problems) console.log(`  ${p.level} ${p.text}`);
    }

    // 개편 후 신규 건 = 백필(전송됨 일괄 체크) 이후 생성된 캠페인. 첫 실동작 확인 대상.
    const fresh = records.filter((r) => (r.fields['Created'] || '') >= OVERHAUL_DATE);
    console.log(`\n점검 ${records.length}건 · 경고 ${flagged}건 · 오늘(KST) ${todayKst()}`);
    console.log(fresh.length
        ? `개편 후 신규 입금 건 ${fresh.length}건: ${fresh.map((r) => r.id).join(', ')} → 단건 추적으로 5관문 확인`
        : '개편 후(10-15~) 생성된 입금 건 없음 — 첫 실동작 확인은 아직 대기');
}

function countSheetRows(xlsxPath, campName, createdIso) {
    const py = `
import openpyxl, json, sys
wb = openpyxl.load_workbook(sys.argv[1], data_only=True, read_only=True)
ws = next((w for w in wb.worksheets if w.title.strip().lower() == '캠핑장 정산_raw'), None)
if ws is None:
    print(json.dumps({'error': '『캠핑장 정산_raw』 탭 없음. 탭 목록=' + str(wb.sheetnames)})); sys.exit()
rows = [[str(c or '') for c in r[:2]] for r in ws.iter_rows(min_row=2, values_only=True)]
print(json.dumps({'rows': [r for r in rows if r[1].strip() == sys.argv[2].strip()]}, ensure_ascii=False))
`;
    const parsed = JSON.parse(execFileSync('python3', ['-c', py, xlsxPath, campName], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
    if (parsed.error) throw new Error(parsed.error);
    // 이름이 같은 다른 캠페인(재신청)이 있을 수 있어 생성일(앞 10자리)까지 맞는 행만 센다.
    const sameDay = parsed.rows.filter((r) => r[0].slice(0, 10) === createdIso.slice(0, 10));
    return { byName: parsed.rows.length, byNameAndDate: sameDay.length };
}

async function trace(recordId, xlsxPath) {
    const record = await base(CAMPAIGN).find(recordId);
    const f = record.fields;
    const name = f['숙소 이름을 적어주세요.'] || '(이름 없음)';
    const ok = (cond) => (cond ? '✅' : '❌');
    console.log(`\n${recordId}  ${name}  (생성 ${String(f['Created'] || '').slice(0, 10)}${f['프렌들리'] ? ' · 프렌들리' : ''})`);

    console.log('\n① 입금 기록');
    console.log(`  ${ok(f['입금내역 확인'])} 입금 체크`);
    console.log(`  ${f['프렌들리'] ? '➖' : ok(typeof f['입금액'] === 'number')} 입금액 ${won(f['입금액'])} / 필요 ${won(f['실입금 필요 금액'])}${f['프렌들리'] ? ' (프렌들리 — 게이트 예외)' : ''}`);
    console.log(`  ${f['입금자명'] ? '✅' : '⚠️'} 입금자명 ${f['입금자명'] || '(비어 있음 — 대조용, 게이트엔 영향 없음)'}`);
    console.log(`  ${ok(f['입금 게이트 통과'] === 1)} 입금 게이트 통과`);

    console.log('\n② 정산 시트 전송');
    console.log(`  ${ok(f['정산 시트 전송됨'])} 정산 시트 전송됨`);
    if (xlsxPath) {
        const { byName, byNameAndDate } = countSheetRows(xlsxPath, name, String(f['Created'] || ''));
        console.log(`  ${byNameAndDate === 1 ? '✅' : '❌'} 시트 『캠핑장 정산_raw』 행 ${byNameAndDate}건 (이름만 같은 행 ${byName}건) — 정확히 1이어야 정상`);
    } else {
        console.log('  ➖ 시트 행 수는 .xlsx 경로를 2번째 인자로 주면 대조');
    }
    console.log('  👀 메일: 캠지기 수신함에 "[캠핏] 프리미엄 협찬 입금 확인 안내" 정확히 1통인지 직접 확인');

    console.log('\n③ 모집 시작');
    console.log(`  ${ok(f['입금 확인일'])} 입금 확인일 ${f['입금 확인일'] || ''}`);
    console.log(`  ${ok(f['모집 시작일'])} 모집 시작일 ${f['모집 시작일'] || ''}${f['모집 시작일'] > todayKst() ? ' (미래 — 그날부터 노출)' : ''}`);

    console.log('\n④ 포털 노출');
    const exposed = f['포털 노출'] === 1;
    console.log(`  ${exposed ? '✅' : '⏸️'} 포털 노출 = ${f['포털 노출']}`);
    if (!exposed) {
        const why = [];
        if (!f['입금내역 확인']) why.push('입금 미체크');
        if (!f['모집 시작일']) why.push('모집 시작일 없음');
        else if (f['모집 시작일'] > todayKst()) why.push(`모집 시작일 ${f['모집 시작일']} 미도래`);
        if (f['Select'] === '미운영') why.push('미운영');
        if (f['쿠폰이벤트희망'] && f['🎟️ 발행 상태'] !== '전체성공') why.push(`쿠폰 발행 상태 '${f['🎟️ 발행 상태'] || '없음'}'`);
        console.log(`     막힌 이유: ${why.join(' · ') || '알 수 없음 — 수식 재확인'}`);
    }
    console.log('  👀 포털 로그인 후 목록에 카드가 보이는지 확인 (노출=1이면 보여야 정상)');

    console.log('\n⑤ 신청');
    const applications = await base(APPLICATION).select({
        fields: ['크리에이터 채널명', '크리에이터 채널명(프리미엄 협찬 신청)', '숙소 이름 (유료 오퍼)', '예약 취소/변경', '신청 날짜']
    }).all();
    // Link 필드는 filterByFormula로 레코드 ID를 못 거른다(0건) — ID 배열로 JS에서 거른다.
    const mine = applications.filter((a) => (a.get('숙소 이름 (유료 오퍼)') || []).includes(recordId));
    const active = mine.filter((a) => a.get('예약 취소/변경') !== '취소');
    console.log(`  신청 ${mine.length}건 (활성 ${active.length} · 취소 ${mine.length - active.length}) / 총 모집 ${f['총 모집 인원'] ?? '?'}`);
    console.log(`  등급별 신청 가능 인원 ⭐️${f['⭐️ 신청 가능 인원'] ?? '-'} ✔️${f['✔️ 신청 가능 인원'] ?? '-'} 🔥${f['🔥 신청 가능 인원'] ?? '-'}`);
    const seen = new Map();
    for (const a of active) {
        const creatorId = (a.get('크리에이터 채널명(프리미엄 협찬 신청)') || [])[0] || a.get('크리에이터 채널명');
        seen.set(creatorId, (seen.get(creatorId) || 0) + 1);
    }
    const duplicated = [...seen].filter(([, n]) => n > 1);
    console.log(`  ${duplicated.length ? '❌' : '✅'} 같은 크리에이터 중복 신청 ${duplicated.length}건`);

    const problems = diagnose(f);
    console.log(problems.length ? '\n종합 경고:' : '\n종합: 경고 없음');
    for (const p of problems) console.log(`  ${p.level} ${p.text}`);
}

(async () => {
    const [recordId, xlsxPath] = process.argv.slice(2);
    try {
        if (recordId) {
            if (!/^rec[A-Za-z0-9]{14}$/.test(recordId)) {
                console.error('사용법: node tools/premium-deposit/check.cjs [recXXXXXXXXXXXXXX] [정산시트.xlsx]');
                process.exit(1);
            }
            await trace(recordId, xlsxPath);
        } else {
            await scanAll();
        }
    } catch (error) {
        console.error('점검 실패:', error.message);
        process.exit(1);
    }
})();
