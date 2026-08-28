#!/usr/bin/env python3
"""일회성: 2026-03-01 이후 쿠폰 사용 코호트 중 '점검대상'(약 141건)에 대한
사람 검수용 매칭 감사 표(HTML)를 생성한다.

match.py의 순수 매칭 함수(normHandle/normCamp/sim/extract_handle + judge 임계값)를
그대로 재사용한다. 표는 쿠폰 사용건 기준 1행으로, 각 예약이 어떤 콘텐츠에 매칭됐고
무엇이 의심되는지를 보여준다.

각 예약별로 핸들 후보 콘텐츠를 모으고, judge()와 동일한 캠핑장 sim/포함/날짜/콘텐츠
규칙으로 '베스트 콘텐츠'를 고른 뒤 최종 상태(✅/⚠️/❌)를 산정한다.
베스트콘텐츠로 재산정한 상태가 match.judge()의 최종상태와 일치하는지도 검증한다.

출력: out/match-audit-0301.html
"""
import sys, os, json, datetime, html
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))          # .../out
TOOLROOT = os.path.dirname(HERE)                            # .../creator-coupon-report
sys.path.insert(0, TOOLROOT)

import match as M  # 순수 함수/판정 로직 재사용 (수정 없음)

OUT = HERE
KST = M.KST
GRACE_CUTOFF_MS = 1780239600000  # 2026-06-01 00:00 KST (task 명시)

cohort = json.load(open(os.path.join(OUT, "since0301.json")))
content = json.load(open(os.path.join(OUT, "content_wide.json")))


def content_date_display(c):
    """업로드 날짜||Created 를 KST date 문자열로. 없으면 None."""
    for k in ['업로드 날짜', 'Created']:
        v = c.get(k)
        if v:
            try:
                vs = str(v)
                if 'T' in vs:
                    dt = datetime.datetime.fromisoformat(vs.replace('Z', '+00:00'))
                    return dt.astimezone(KST).date().isoformat()
                return datetime.date.fromisoformat(vs).isoformat()
            except Exception:
                continue
    return None


# content 후보 전처리 — match.py / analyze_0301.py와 동일 구조.
# 단, raw 채널명/raw 캠핑장명/링크유무/업로드일(표시용) 도 함께 보존한다.
CPREP = []
for c in content:
    handles_raw = M.content_handle_strings(c)
    camps_raw = M.content_camp_strings(c)
    CPREP.append({
        'handles': [M.normHandle(h) for h in handles_raw if h],
        'handles_raw': handles_raw,
        'camps': [M.normCamp(x) for x in camps_raw if x],
        'camps_raw': camps_raw,
        'has': M.content_has_content(c),
        'date_ord': M.content_date_ord(c),
        'date_disp': content_date_display(c),
    })


def checkout_floor_ord(co):
    return M.checkout_floor_ord(co)


def pick_best(couponName, campName, co):
    """핸들 후보 콘텐츠 중 judge()와 동일 로직으로 베스트 콘텐츠와 최종상태를 산정.

    반환: dict(status, handle, best_content_channel(raw), best_content_camp(raw),
              best_sim, contains, has, date_disp, reason, has_handle_cand)
    """
    H = M.extract_handle(couponName)
    nH = M.normHandle(H)
    nC = M.normCamp(campName)
    date_floor = checkout_floor_ord(co)  # KST 캘린더 날짜 ordinal - 2일

    # 핸들 후보 = normHandle(쿠폰핸들)이 콘텐츠 채널명과 일치/포함되는 콘텐츠 행
    cand = [c for c in CPREP if any(M.handle_match(nH, ch) for ch in c['handles'])]

    if not cand:
        return {
            'status': '❌', 'handle': H, 'has_handle_cand': False,
            'channel': None, 'camp_raw': None, 'best_sim': None,
            'contains': False, 'has': None, 'date_disp': None,
            'reason': '핸들후보 0 → 미제출',
        }

    # 모든 (콘텐츠, 캠핑장) 쌍을 평가해서 베스트 1개 선정.
    # 우선순위: 캠핑장 sim 최대 → 동률시 contains 우선 → 콘텐츠있음 → 업로드일 최신.
    best = None  # (sort_key, payload)
    for c in cand:
        # 콘텐츠에 캠핑장명이 비어있으면 sim=0, contains=False로 그 콘텐츠 자체는 후보로 둠
        pairs = list(zip(c['camps'], c['camps_raw'])) or [('', '')]
        for ccnorm, ccraw in pairs:
            contains = bool(nC and ccnorm and (nC in ccnorm or ccnorm in nC))
            s = M.sim(nC, ccnorm) if (nC and ccnorm) else 0.0
            date_ord = c['date_ord']
            date_rank = date_ord if date_ord is not None else -10**9
            # 정렬키: sim ↓, contains ↓, has ↓, 업로드일 ↓
            key = (s, 1 if contains else 0, 1 if c['has'] else 0, date_rank)
            payload = {
                'channel': (c['handles_raw'][0] if c['handles_raw'] else None),
                'camp_raw': ccraw or None,
                'sim': s,
                'contains': contains,
                'has': c['has'],
                'date_disp': c['date_disp'],
                'date_ord': date_ord,
            }
            if best is None or key > best[0]:
                best = (key, payload)

    p = best[1]
    s = p['sim']; contains = p['contains']; date_ord = p['date_ord']
    # 최종 상태 산정 — judge()의 임계값 그대로 적용.
    # 베스트가 camp_ok(✅ 후보)인지: contains or s>=0.6, 그리고 날짜+콘텐츠 충족
    camp_ok = contains or s >= 0.6
    camp_ambig = (not contains) and (0.4 <= s < 0.6)
    dok = (date_floor is None) or (date_ord is not None and date_ord >= date_floor)

    if camp_ok and dok and p['has']:
        status = '✅'
        if contains:
            sim_txt = '캠핑장 포함'
        else:
            sim_txt = f'캠핑장 sim{s:.2f}'
        reason = f'핸들✓·{sim_txt}·콘텐츠✓ → 제출'
    elif camp_ok and not (dok and p['has']):
        status = '❌'
        miss = []
        if not p['has']:
            miss.append('콘텐츠 링크 없음')
        if not dok:
            miss.append('업로드일 퇴실-2일 이전')
        reason = '핸들✓·캠핑장 일치하나 ' + '/'.join(miss) + ' → 미제출'
    elif camp_ambig:
        status = '⚠️'
        reason = f'핸들✓·캠핑장 sim{s:.2f} 모호(0.4~0.6) → 확인필요'
    elif s < 0.4:
        status = '❌'
        reason = f'핸들✓·최유사 {s:.2f} → 미제출'
    else:
        # s in [0.4,0.6) 인데 contains True 가 아닌 경우는 위 ambig에서 잡힘.
        # 도달 시 보수적으로 미제출.
        status = '❌'
        reason = f'핸들✓·캠핑장 sim{s:.2f} → 미제출'

    return {
        'status': status, 'handle': H, 'has_handle_cand': True,
        'channel': p['channel'], 'camp_raw': p['camp_raw'],
        'best_sim': s, 'contains': contains, 'has': p['has'],
        'date_disp': p['date_disp'], 'reason': reason,
    }


def kst_date(ms):
    if ms is None:
        return '-'
    return datetime.datetime.fromtimestamp(ms / 1000, KST).date().isoformat()


# ---------- 점검대상 추출 + 매칭 ----------
rows = []
mismatch = []  # 베스트콘텐츠 산정 status != match.judge() status
for r in cohort:
    co = r.get('checkoutTimestamp')
    status = r.get('bookingStatus')
    if status == 'cancelled':
        continue
    if co is not None and co > GRACE_CUTOFF_MS:
        continue
    # 점검대상
    best = pick_best(r['couponName'], r.get('campName', ''), co)

    # judge() 최종상태와 교차검증 (CPREP는 match.judge가 기대하는 키 포함)
    jstatus, _ = M.judge(r['couponName'], r.get('campName', ''), co, CPREP)
    if jstatus != best['status']:
        mismatch.append({
            'code': r.get('bookingCode'), 'handle': best['handle'],
            'judge': jstatus, 'best': best['status'],
            'camp': r.get('campName', ''),
        })

    rows.append({
        'status': best['status'],
        'couponName': r.get('couponName', ''),
        'handle': best['handle'],
        'campName': r.get('campName', ''),
        'checkout': kst_date(co),
        'code': r.get('bookingCode', ''),
        'm_channel': best['channel'],
        'm_camp': best['camp_raw'],
        'best_sim': best['best_sim'],
        'contains': best['contains'],
        'has': best['has'],
        'date_disp': best['date_disp'],
        'reason': best['reason'],
        'has_handle_cand': best['has_handle_cand'],
    })

# ---------- 정렬: ❌ → ⚠️ → ✅, 그 안에서 핸들 가나다순 ----------
order = {'❌': 0, '⚠️': 1, '✅': 2}
rows.sort(key=lambda x: (order.get(x['status'], 9), (x['handle'] or '').lower()))

cc = Counter(x['status'] for x in rows)
n_ok = cc.get('✅', 0); n_warn = cc.get('⚠️', 0); n_miss = cc.get('❌', 0)
total = len(rows)
rate = (n_ok / total * 100) if total else 0.0


# ---------- HTML 빌드 ----------
def esc(v):
    return html.escape(str(v)) if v is not None else ''


def sim_cell(row):
    if not row['has_handle_cand']:
        return '<span class="sub">-</span>'
    if row['contains']:
        return '포함(1.0)'
    s = row['best_sim']
    if s is None:
        return '<span class="sub">-</span>'
    return f'{s:.2f}'


def status_badge(s):
    if s == '✅':
        return '<span class="badge ok">✅ 제출</span>'
    if s == '⚠️':
        return '<span class="badge warn">⚠️ 확인필요</span>'
    return '<span class="badge miss">❌ 미제출</span>'


tr_html = []
for r in rows:
    if not r['has_handle_cand']:
        m_channel = '<span class="sub">— (핸들 매칭 콘텐츠 없음)</span>'
        m_camp = '<span class="sub">—</span>'
        content_yn = '<span class="sub">-</span>'
        upload = '<span class="sub">-</span>'
    else:
        m_channel = esc(r['m_channel']) if r['m_channel'] else '<span class="sub">-</span>'
        m_camp = esc(r['m_camp']) if r['m_camp'] else '<span class="sub">-</span>'
        content_yn = '<span class="ok">✅</span>' if r['has'] else '<span class="miss">❌</span>'
        upload = esc(r['date_disp']) if r['date_disp'] else '<span class="sub">-</span>'
    tr_html.append(
        '<tr>'
        f'<td>{status_badge(r["status"])}</td>'
        f'<td>{esc(r["couponName"])}</td>'
        f'<td class="mono">{esc(r["handle"])}</td>'
        f'<td>{esc(r["campName"])}</td>'
        f'<td class="mono">{esc(r["checkout"])}</td>'
        f'<td class="mono sub">{esc(r["code"])}</td>'
        f'<td>{m_channel}</td>'
        f'<td>{m_camp}</td>'
        f'<td class="mono">{sim_cell(r)}</td>'
        f'<td>{content_yn}</td>'
        f'<td class="mono">{upload}</td>'
        f'<td class="sub reason">{esc(r["reason"])}</td>'
        '</tr>'
    )
rows_html = '\n'.join(tr_html)

gen_ts = datetime.datetime.now(KST).strftime('%Y-%m-%d %H:%M KST')

page = f"""<!DOCTYPE html>
<html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>크리에이터 쿠폰 ↔ 콘텐츠 매칭 감사표 (2026-03-01~)</title>
<style>
  :root{{--bg:#0F1115;--card:#1A1D23;--line:#2A2E37;--txt:#F5F6F7;--sub:#9AA1AC;--accent:#61d377;--red:#ff3d00;--amber:#feb01a;}}
  *{{box-sizing:border-box}}
  body{{margin:0;background:var(--bg);color:var(--txt);font-family:'Pretendard',-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Noto Sans KR',system-ui,sans-serif;padding:24px;max-width:1400px;margin:0 auto}}
  .mono{{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}}
  h1{{font-size:20px;margin:0 0 6px}}
  .meta{{color:var(--sub);font-size:13px;margin-bottom:6px}}
  .summary{{font-size:14px;margin:14px 0 6px}}
  .summary b{{font-weight:700}}
  .summary .ok{{color:var(--accent)}} .summary .warn{{color:var(--amber)}} .summary .miss{{color:var(--red)}}
  .warnbox{{background:rgba(254,176,26,.08);border:1px solid rgba(254,176,26,.4);color:var(--amber);
           border-radius:10px;padding:10px 14px;font-size:12.5px;margin:12px 0 18px;line-height:1.5}}
  table{{width:100%;border-collapse:collapse;font-size:12.5px}}
  th,td{{text-align:left;padding:7px 9px;border-bottom:1px solid var(--line);vertical-align:top}}
  thead th{{position:sticky;top:0;background:var(--card);color:var(--sub);font-weight:600;font-size:12px;
           border-bottom:1px solid var(--line);z-index:1}}
  tbody tr:hover{{background:rgba(255,255,255,.025)}}
  .sub{{color:var(--sub)}} .ok{{color:var(--accent)}} .miss{{color:var(--red)}} .warn{{color:var(--amber)}}
  .reason{{font-size:12px;max-width:260px}}
  .badge{{display:inline-block;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:600;white-space:nowrap}}
  .badge.ok{{background:rgba(97,211,119,.14);color:var(--accent);border:1px solid rgba(97,211,119,.35)}}
  .badge.warn{{background:rgba(254,176,26,.14);color:var(--amber);border:1px solid rgba(254,176,26,.35)}}
  .badge.miss{{background:rgba(255,61,0,.14);color:var(--red);border:1px solid rgba(255,61,0,.35)}}
</style></head><body>
<h1>🔎 크리에이터 쿠폰 ↔ 콘텐츠 매칭 감사표</h1>
<div class="meta">2026-03-01 이후 쿠폰 사용 코호트 · 점검대상(취소·유예 제외) · 생성 {gen_ts}</div>
<div class="summary">
  점검대상 <b>{total}</b>건 ·
  <span class="ok">✅ {n_ok}</span> /
  <span class="warn">⚠️ {n_warn}</span> /
  <span class="miss">❌ {n_miss}</span> ·
  제출률 <b>{rate:.1f}%</b> <span class="sub">(✅ / 점검대상)</span>
</div>
<div class="warnbox">
  ⚠️ 핸들 채널명 표기 불일치로 false ❌가 섞일 수 있습니다. 의심 행(❌·⚠️)은
  "매칭 콘텐츠 채널명"을 보고 사람이 직접 확정하세요. 베스트 콘텐츠는 핸들 후보 중
  캠핑장 유사도가 가장 높은 콘텐츠이며, 캠핑장이 일치해도 콘텐츠 링크/업로드일 조건을
  못 채우면 미제출로 분류됩니다.
</div>
<table>
<thead><tr>
  <th>상태</th><th>쿠폰명</th><th>핸들</th><th>예약 캠핑장</th><th>퇴실일</th><th>예약코드</th>
  <th>매칭 콘텐츠 채널명</th><th>매칭 콘텐츠 캠핑장명</th><th>캠핑장 sim</th>
  <th>콘텐츠유무</th><th>업로드일</th><th>판정 근거</th>
</tr></thead>
<tbody>
{rows_html}
</tbody>
</table>
</body></html>
"""

out_path = os.path.join(OUT, "match-audit-0301.html")
with open(out_path, "w", encoding="utf-8") as f:
    f.write(page)

print(f"[audit] saved {os.path.relpath(out_path, TOOLROOT)}")
print(f"[audit] rows={total}  ✅{n_ok}  ⚠️{n_warn}  ❌{n_miss}  제출률={rate:.1f}%")
if mismatch:
    print(f"[audit] judge()와 베스트콘텐츠 상태 불일치 {len(mismatch)}건:")
    for m in mismatch:
        print(f"   - {m['code']} handle={m['handle']} judge={m['judge']} best={m['best']} camp={m['camp']}")
else:
    print("[audit] judge() 최종상태와 베스트콘텐츠 산정상태: 전건 일치")
