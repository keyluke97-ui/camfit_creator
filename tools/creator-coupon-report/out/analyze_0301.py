#!/usr/bin/env python3
"""일회성: 2026-03-01 이후 사용된 크리에이터 쿠폰 예약 238건의 콘텐츠 제출률 분석.
match.py의 순수 매칭 함수(normHandle/normCamp/sim/extract_handle + judge 로직)를 그대로 재사용한다.
출력은 콘솔 집계 + out/since0301_classified.json.
"""
import sys, os, json, datetime
from collections import Counter, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))         # .../out
TOOLROOT = os.path.dirname(HERE)                           # .../creator-coupon-report
sys.path.insert(0, TOOLROOT)

# match.py의 순수 함수/판정 로직을 그대로 import (수정 없이 재사용)
import match as M

OUT = HERE
KST = M.KST

# 경계 상수
GRACE_CUTOFF_MS = 1780239600000  # 2026-06-01 00:00 KST = 퇴실+14 유예 경계 (task 명시)

cohort = json.load(open(os.path.join(OUT, "since0301.json")))
content = json.load(open(os.path.join(OUT, "content_wide.json")))

# content 후보 전처리 — match.py와 동일 구조
CPREP = []
for c in content:
    CPREP.append({
        'handles': [M.normHandle(h) for h in M.content_handle_strings(c) if h],
        'camps':   [M.normCamp(x) for x in M.content_camp_strings(c) if x],
        'camps_raw': M.content_camp_strings(c),
        'has':     M.content_has_content(c),
        'date_ord': M.content_date_ord(c),
    })

def checkout_kst_month(ms):
    d = datetime.datetime.fromtimestamp(ms/1000, KST).date()
    return f"{d.year:04d}-{d.month:02d}"

results = []
for r in cohort:
    co = r.get('checkoutTimestamp')
    status = r.get('bookingStatus')
    if status == 'cancelled':
        bucket = '취소'; cstat = None; detail = {}
    elif co and co > GRACE_CUTOFF_MS:
        bucket = '유예중'; cstat = None; detail = {}
    else:
        bucket = '점검대상'
        cstat, detail = M.judge(r['couponName'], r.get('campName',''), co, CPREP)
    results.append({**r,
                    'handle': M.extract_handle(r['couponName']),
                    'bucket': bucket,
                    'contentStatus': cstat,
                    'detail': detail,
                    'coMonth': checkout_kst_month(co) if co else None})

json.dump(results, open(os.path.join(OUT, "since0301_classified.json"), "w"),
          ensure_ascii=False, indent=1)

# ---------------- 집계 ----------------
total = len(results)
buckets = Counter(r['bucket'] for r in results)
inspect = [r for r in results if r['bucket'] == '점검대상']
cs = Counter(r['contentStatus'] for r in inspect)
ok = cs.get('✅', 0); warn = cs.get('⚠️', 0); miss = cs.get('❌', 0)
inspect_total = len(inspect)
rate = (ok / inspect_total * 100) if inspect_total else 0.0

print("="*60)
print("[전체 집계]")
print(f"  코호트 총수      : {total}")
print(f"  취소(분모제외)   : {buckets.get('취소',0)}")
print(f"  유예중(분모제외) : {buckets.get('유예중',0)}")
print(f"  점검대상         : {inspect_total}")
print(f"    ✅ 제출        : {ok}")
print(f"    ⚠️ 확인필요    : {warn}")
print(f"    ❌ 미제출      : {miss}")
print(f"  >> 제출률        : {rate:.1f}%  (✅ / 점검대상)")

print("\n[월별 제출률] (퇴실월 KST 기준, 점검대상만)")
bymonth = defaultdict(lambda: Counter())
for r in inspect:
    bymonth[r['coMonth']][r['contentStatus']] += 1
print(f"  {'월':<9}{'점검대상':>8}{'✅':>6}{'❌':>6}{'⚠️':>6}{'제출률':>9}")
for m in sorted(bymonth):
    c = bymonth[m]
    t = sum(c.values()); o = c.get('✅',0); x = c.get('❌',0); w = c.get('⚠️',0)
    rt = (o/t*100) if t else 0
    print(f"  {m:<9}{t:>8}{o:>6}{x:>6}{w:>6}{rt:>8.1f}%")

print("\n[미제출(❌) 상위 핸들 15]")
missrows = [r for r in inspect if r['contentStatus'] == '❌']
byh = defaultdict(list)
for r in missrows:
    byh[r['handle']].append(r)
ranked = sorted(byh.items(), key=lambda kv: -len(kv[1]))[:15]
print(f"  {'핸들':<22}{'❌건수':>6}  캠핑장예시")
for h, rows in ranked:
    ex = rows[0].get('campName','')
    print(f"  {h:<22}{len(rows):>6}  {ex}")

print("\n[⚠️ 확인필요 전체 목록]")
warnrows = [r for r in inspect if r['contentStatus'] == '⚠️']
for r in warnrows:
    d = r['detail']
    print(f"  핸들={r['handle']} | camp={r.get('campName','')} | "
          f"best_camp={d.get('best_camp','')} sim={d.get('best_sim','')} | code={r.get('bookingCode','')}")
print(f"  (⚠️ 총 {len(warnrows)}건)")
