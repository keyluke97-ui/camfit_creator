#!/usr/bin/env python3
"""크리에이터 쿠폰 주간 리포트 — HTML 생성 (RUNBOOK §C 구현체).

기준일(--date, 기본=오늘 KST)로 기간 라벨·출력 파일명을 계산한다.
입력: out/match_results.json (match.py 산출)
출력: out/creator-coupon-report-{date}.html
브랜드 토큰·폰트·KPI 단위는 report-template.html에 직접 반영돼 있어 사후 치환을 하지 않는다.
"""
import argparse
import datetime
import json
import os
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
TEMPLATE = os.path.join(HERE, "report-template.html")
KST = datetime.timezone(datetime.timedelta(hours=9))
WD = ['월','화','수','목','금','토','일']


def kdate(ms):
    if ms is None: return None
    return datetime.datetime.fromtimestamp(ms/1000, KST).date()

def fmtdate(ms):
    d=kdate(ms)
    if d is None: return '-'
    return f"{d.isoformat()}({WD[d.weekday()]})"

def fmtdate_d(d):
    return f"{d.isoformat()}({WD[d.weekday()]})"

def won(n):
    return f"{n:,}원"

def esc(s):
    if s is None: return ''
    return str(s).replace('&','&amp;').replace('<','&lt;').replace('>','&gt;').strip()


def main():
    ap=argparse.ArgumentParser(description="크리에이터 쿠폰 리포트 HTML 생성")
    ap.add_argument('--date', help='기준일 YYYY-MM-DD (기본=오늘 KST)')
    ap.add_argument('--admin-url-template', default='',
                    help='어드민 예약 URL 템플릿. {code} 치환. 빈값이면 예약코드 텍스트만 노출.')
    args=ap.parse_args()

    if args.date:
        base=datetime.date.fromisoformat(args.date)
    else:
        base=datetime.datetime.now(KST).date()

    NOW_KST_DATE=base
    PERIOD_START=fmtdate_d(base - datetime.timedelta(days=7))
    PERIOD_END=fmtdate_d(base)
    REPORT_DATE=fmtdate_d(base)
    admin_tpl=args.admin_url_template

    def dplus(ms):
        return (NOW_KST_DATE - kdate(ms)).days

    def admin_cell(code):
        # admin_tpl 있으면 <a>, 없으면 예약코드 텍스트만
        if admin_tpl:
            href=admin_tpl.replace('{code}', esc(code))
            return f'<a href="{href}" target="_blank" rel="noopener noreferrer">{esc(code)}</a>'
        return f'<code>{esc(code)}</code>'

    mr=json.load(open(os.path.join(OUT,'match_results.json')))
    act=mr['activity']; chk=mr['checkwin']

    # KPIs
    KPI_USED=len(act)
    real_cost=sum(r['couponDiscount'] for r in act if r['bookingStatus']!='cancelled')
    total_cost=sum(r['couponDiscount'] for r in act)
    KPI_CANCEL=sum(1 for r in act if r['bookingStatus']=='cancelled')
    KPI_CREATORS=len(set(r['handle'] for r in act))
    KPI_MISSING=sum(1 for r in chk if r['contentStatus']=='❌')
    warn_count=sum(1 for r in chk if r['contentStatus']=='⚠️')

    # ROWS_MISSING : 점검창 ❌/⚠️, D+경과 desc
    miss=[r for r in chk if r['contentStatus'] in ('❌','⚠️')]
    miss.sort(key=lambda r: dplus(r['checkoutTimestamp']), reverse=True)
    rows_missing=[]
    for r in miss:
        if r['contentStatus']=='❌':
            stcell='<span class="miss">미제출</span>'
        else:
            stcell='<span class="warn">확인필요</span>'
        period=f"{fmtdate(r['checkInTimestamp'])} ~ {fmtdate(r['checkoutTimestamp'])}"
        rows_missing.append(
            f"<tr><td>{esc(r['handle'])}</td><td>{esc(r['campName'])}</td>"
            f"<td>{period}</td><td>D+{dplus(r['checkoutTimestamp'])}</td>"
            f"<td>{stcell}</td><td>{admin_cell(r['bookingCode'])}</td></tr>")
    ROWS_MISSING="\n".join(rows_missing)

    # ROWS_CANCEL : 활동창 cancelled
    cancels=[r for r in act if r['bookingStatus']=='cancelled']
    rows_cancel=[]
    for r in cancels:
        period=f"{fmtdate(r['checkInTimestamp'])} ~ {fmtdate(r['checkoutTimestamp'])}"
        rows_cancel.append(
            f"<tr><td>{esc(r['handle'])}</td><td>{esc(r['campName'])}</td>"
            f"<td>{period}</td><td>{won(r['couponDiscount'])}</td>"
            f"<td>{admin_cell(r['bookingCode'])}</td></tr>")
    ROWS_CANCEL="\n".join(rows_cancel) if rows_cancel else '<tr><td colspan="5" style="color:var(--sub)">취소 건 없음</td></tr>'

    # ROWS_ALL : 활동창 전 행, 사용일 desc
    allrows=sorted(act, key=lambda r: r['usedTimestamp'], reverse=True)
    def content_cell(r):
        st=r['contentStatus']
        if st=='✅': return '<span class="ok">완료</span>'
        if st=='⚠️': return '<span class="warn">확인필요</span>'
        if st=='❌': return '<span class="miss">미제출</span>'
        if st=='취소': return '<span class="miss">취소</span>'
        return '<span class="sub">유예중</span>'
    rows_all=[]
    for r in allrows:
        period=f"{fmtdate(r['checkInTimestamp'])} ~ {fmtdate(r['checkoutTimestamp'])}"
        rows_all.append(
            f"<tr><td>{fmtdate(r['usedTimestamp'])}</td><td>{esc(r['handle'])}</td>"
            f"<td>{esc(r['campName'])}</td><td>{period}</td>"
            f"<td>{esc(r['couponName'])}</td><td>{won(r['couponDiscount'])}</td>"
            f"<td>{content_cell(r)}</td><td>{admin_cell(r['bookingCode'])}</td></tr>")
    ROWS_ALL="\n".join(rows_all)

    # ROWS_REUSE : 점검 lookback 핸들별 집계 desc
    by_handle=defaultdict(lambda:{'count':0,'discount':0,'miss':0})
    for r in chk:
        h=r['handle']
        by_handle[h]['count']+=1
        by_handle[h]['discount']+=r['couponDiscount']
        if r['contentStatus']=='❌':
            by_handle[h]['miss']+=1
    reuse=sorted(by_handle.items(), key=lambda kv:(-kv[1]['count'], -kv[1]['discount']))
    rows_reuse=[]
    for h,v in reuse:
        missdisp=f'<span class="miss">{v["miss"]}</span>' if v['miss'] else '0'
        rows_reuse.append(
            f"<tr><td>{esc(h)}</td><td>{v['count']}</td><td>{won(v['discount'])}</td><td>{missdisp}</td></tr>")
    ROWS_REUSE="\n".join(rows_reuse)

    # ROWS_CAMP : campName 별 집계 desc
    by_camp=defaultdict(lambda:{'count':0,'discount':0})
    for r in chk:
        c=r['campName'].strip()
        by_camp[c]['count']+=1
        by_camp[c]['discount']+=r['couponDiscount']
    camps=sorted(by_camp.items(), key=lambda kv:(-kv[1]['count'], -kv[1]['discount']))
    rows_camp=[]
    for c,v in camps:
        rows_camp.append(f"<tr><td>{esc(c)}</td><td>{v['count']}</td><td>{won(v['discount'])}</td></tr>")
    ROWS_CAMP="\n".join(rows_camp)

    # KPI 셀: 단위 포함 완성 HTML (템플릿은 placeholder만 가짐)
    KPI_USED_CELL=f"{KPI_USED}건"
    KPI_COST_CELL=(f"{won(real_cost)}"
              f"<div style='font-size:11px;color:var(--sub);font-weight:400;margin-top:4px'>"
              f"실협찬비(취소제외) {won(real_cost)} · 총액(취소포함) {won(total_cost)}</div>")
    KPI_MISSING_CELL=(f"{KPI_MISSING}건"
              f"<div style='font-size:11px;color:var(--sub);font-weight:400;margin-top:4px'>"
              f"확인필요 {warn_count}건 별도</div>")
    KPI_CANCEL_CELL=f"{KPI_CANCEL}건"
    KPI_CREATORS_CELL=f"{KPI_CREATORS}명"

    repl={
     '{{REPORT_DATE}}':REPORT_DATE,
     '{{PERIOD_START}}':PERIOD_START,
     '{{PERIOD_END}}':PERIOD_END,
     '{{KPI_USED}}':KPI_USED_CELL,
     '{{KPI_COST}}':KPI_COST_CELL,
     '{{KPI_MISSING}}':KPI_MISSING_CELL,
     '{{KPI_CANCEL}}':KPI_CANCEL_CELL,
     '{{KPI_CREATORS}}':KPI_CREATORS_CELL,
     '{{ROWS_MISSING}}':ROWS_MISSING,
     '{{ROWS_CANCEL}}':ROWS_CANCEL,
     '{{ROWS_ALL}}':ROWS_ALL,
     '{{ROWS_REUSE}}':ROWS_REUSE,
     '{{ROWS_CAMP}}':ROWS_CAMP,
    }

    out=open(TEMPLATE, encoding='utf-8').read()
    for k,v in repl.items():
        out=out.replace(k,v)

    outpath=os.path.join(OUT, f"creator-coupon-report-{base.isoformat()}.html")
    open(outpath,'w',encoding='utf-8').write(out)

    import re
    left=re.findall(r'\{\{[^}]+\}\}', out)
    print(f"[gen] WROTE {os.path.join('out', os.path.basename(outpath))} ({len(out)} bytes)")
    print(f"[gen] KPI_USED={KPI_USED} real_cost={real_cost} total_cost={total_cost} "
          f"cancel={KPI_CANCEL} creators={KPI_CREATORS} missing={KPI_MISSING} warn={warn_count}")
    print(f"[gen] leftover placeholders: {left}")


if __name__=='__main__':
    main()
