#!/usr/bin/env python3
"""크리에이터 쿠폰 주간 리포트 — 콘텐츠 결정적 매칭 (RUNBOOK §B 구현체).

기준일(--date, 기본=오늘 KST)로 모든 시간 경계를 코드에서 계산한다.
입출력은 스크립트 위치 기준 out/ 하위:
  입력: out/activity.json, out/checkwin.json, out/content.json
  출력: out/match_results.json
매칭 로직(정규화·KST 캘린더 날짜 비교·판정 임계값)은 드라이런과 동일하게 보존한다.
"""
import argparse
import datetime
import json
import os
import re
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
KST = datetime.timezone(datetime.timedelta(hours=9))


def kst_midnight_ms(d):
    """date d의 KST 자정(00:00 +09:00) epoch ms."""
    dt = datetime.datetime(d.year, d.month, d.day, 0, 0, 0, tzinfo=KST)
    return int(dt.timestamp() * 1000)


# ---------- normalization ----------
def normHandle(s):
    if not s: return ""
    s = s.lower()
    for ch in [" ", "'", "’", ".", "_"]:
        s = s.replace(ch, "")
    return s

SUFFIXES = ['오토캠핑장','관광농원','풀빌라','야영장','글램핑','캠핑장','펜션','캠프']  # longest-first
REGIONS = ['여수','가평','영월','평창','산청','포천','문경','괴산','충주','울진','봉화','양평','춘천',
           '강화','경주','연천','양주','양양','청도','여주','강릉','속초','단양','홍천','횡성','인제',
           '정선','태백','삼척','동해','보령','당진','서산','태안','부여','청양','진천','음성','제천',
           '영동','옥천','보은','괴산','증평','담양','곡성','구례','고흥','보성','화순','장흥','강진',
           '해남','영암','무안','함평','영광','장성','완도','진도','신안','남원','순창','임실','무주',
           '진안','장수','고창','부안','김제','정읍','경주','포항','경산','영천','상주','문경','예천',
           '봉화','울진','영양','청송','영덕','의성','군위','고령','성주','칠곡','김천','구미','안동',
           '거제','통영','사천','밀양','양산','함안','창녕','고성','남해','하동','산청','함양','거창',
           '합천','의령']

def normCamp(s):
    if not s: return ""
    s = s.replace(" ", "").lower()
    # suffix removal (loop until none removed)
    changed=True
    while changed:
        changed=False
        for suf in SUFFIXES:
            sl=suf.lower()
            if s.endswith(sl) and len(s)>len(sl):
                s=s[:-len(sl)]; changed=True; break
    # leading region token removal (single pass; cancel if empties)
    for reg in REGIONS:
        rl=reg.lower()
        if s.startswith(rl) and len(s)>len(rl):
            s=s[len(rl):]
            break
    return s

def bigrams(s):
    return set(s[i:i+2] for i in range(len(s)-1)) if len(s)>=2 else ({s} if s else set())

def sim(a,b):
    A,B=bigrams(a),bigrams(b)
    if not A or not B: return 0.0
    inter=len(A&B); union=len(A|B)
    return inter/union if union else 0.0

def extract_handle(couponName):
    m=re.search(r'\(([^)]+)\)', couponName)
    if m: return m.group(1).strip().strip("'’")
    # unclosed paren -> take everything after first (
    idx=couponName.find('(')
    if idx>=0:
        return couponName[idx+1:].strip().strip("'’")
    return couponName.strip()


# precompute content rows
def content_handle_strings(c):
    out=[]
    for k in ['채널명','크리에이터 채널명 (from 크리에이터 명단)']:
        v=c.get(k)
        if isinstance(v,list):
            out.extend([str(x) for x in v])
        elif v:
            out.append(str(v))
    return out

def content_camp_strings(c):
    v=c.get('캠핑장명 (from 캠핑장 이름 OR 캠핑 용품 이름)')
    if isinstance(v,list): return [str(x) for x in v]
    return [str(v)] if v else []

def content_has_content(c):
    return any(c.get(k) for k in ['콘텐츠 링크','콘텐츠2','콘텐츠3','콘텐츠4'])

def content_date_ord(c):
    # 업로드 날짜 (없으면 Created) → KST 캘린더 날짜의 ordinal(일 단위).
    # 날짜축 비교는 '업로드날짜 >= 퇴실-2일'이라는 캘린더 날짜 단위 비교이므로
    # 시각 성분을 KST 자정으로 절삭해 날짜 ordinal로만 비교한다(타임존 절단 오차 제거).
    for k in ['업로드 날짜','Created']:
        v=c.get(k)
        if v:
            try:
                vs=str(v)
                if 'T' in vs:
                    dt=datetime.datetime.fromisoformat(vs.replace('Z','+00:00'))
                    # convert to KST date
                    kst=dt.astimezone(KST)
                    return kst.date().toordinal()
                else:
                    # date-only string = 이미 KST 캘린더 날짜로 간주
                    return datetime.date.fromisoformat(vs).toordinal()
            except Exception:
                continue
    return None

def checkout_floor_ord(checkoutMs):
    # 퇴실 KST 캘린더 날짜 - 2일의 ordinal
    if checkoutMs is None: return None
    kst=datetime.datetime.fromtimestamp(checkoutMs/1000, KST)
    return kst.date().toordinal()-2

def handle_match(nh, ch):
    if not nh or not ch: return False
    return nh==ch or nh in ch or ch in nh

def judge(couponName, campName, checkoutMs, CPREP):
    """Return (status, detail) where status in ✅/⚠️/❌"""
    H=extract_handle(couponName)
    nH=normHandle(H)
    nC=normCamp(campName)
    D=checkoutMs
    date_floor = checkout_floor_ord(D)  # KST 캘린더 날짜 ordinal - 2일
    # handle candidate set
    cand=[c for c in CPREP if any(handle_match(nH,ch) for ch in c['handles'])]
    if not cand:
        return ('❌', {'handle':H,'reason':'핸들후보 0'})
    best_sim=0.0; best_camp=''
    camp_ok=False; ambiguous=False; date_ok_any=False; content_ok_any=False
    for c in cand:
        for ccnorm,ccraw in zip(c['camps'],c['camps_raw']):
            if not ccnorm: continue
            contains = (nC and (nC in ccnorm or ccnorm in nC))
            s=sim(nC,ccnorm)
            if s>best_sim:
                best_sim=s; best_camp=ccraw
            this_camp_ok = contains or s>=0.6
            this_camp_ambig = (not contains) and (0.4<=s<0.6)
            if this_camp_ok:
                # also need date + content for ✅
                dok = (date_floor is None) or (c['date_ord'] is not None and c['date_ord']>=date_floor)
                if dok and c['has']:
                    return ('✅', {'handle':H,'camp':ccraw,'sim':round(s,3),'contains':contains})
                camp_ok=True
            if this_camp_ambig:
                ambiguous=True
    # no full ✅ match
    if ambiguous:
        return ('⚠️', {'handle':H,'best_camp':best_camp,'best_sim':round(best_sim,3)})
    # handle found but camp sim < 0.4 (or camp_ok but missing date/content)
    if best_sim<0.4:
        return ('❌', {'handle':H,'best_camp':best_camp,'best_sim':round(best_sim,3),'reason':'핸들✓ 캠핑장 sim<0.4'})
    # camp ok-ish but date/content failed -> treat as ❌ (not submitted yet) but flag
    return ('❌', {'handle':H,'best_camp':best_camp,'best_sim':round(best_sim,3),'reason':'캠핑장 일치하나 날짜/콘텐츠 미충족'})


def main():
    ap=argparse.ArgumentParser(description="크리에이터 쿠폰 리포트 콘텐츠 매칭")
    ap.add_argument('--date', help='기준일 YYYY-MM-DD (기본=오늘 KST)')
    args=ap.parse_args()

    if args.date:
        base=datetime.date.fromisoformat(args.date)
    else:
        base=datetime.datetime.now(KST).date()

    # 기준일로부터 모든 경계 계산
    NOW_KST_MS=kst_midnight_ms(base)                                   # D+경과/유예 경계
    GRACE_CUTOFF_MS=kst_midnight_ms(base - datetime.timedelta(days=14))  # 퇴실+14: 이 값 초과면 유예중
    # (WEEK_START_MS / CHECK_LOOKBACK_MS 는 §A 쿼리 단계에서 데이터 수집 시 사용 — 여기선 입력 JSON이 이미 필터됨)

    # ---------- load data ----------
    activity=json.load(open(os.path.join(OUT,"activity.json")))
    checkwin=json.load(open(os.path.join(OUT,"checkwin.json")))
    content=json.load(open(os.path.join(OUT,"content.json")))

    CPREP=[]
    for c in content:
        CPREP.append({
            'handles':[normHandle(h) for h in content_handle_strings(c) if h],
            'camps':[normCamp(x) for x in content_camp_strings(c) if x],
            'camps_raw':content_camp_strings(c),
            'has':content_has_content(c),
            'date_ord':content_date_ord(c),
        })

    # ---------- activity window ----------
    act_results=[]
    for r in activity:
        co=r['checkoutTimestamp']
        if r['bookingStatus']=='cancelled':
            st='취소'
            det={}
        elif co and co>GRACE_CUTOFF_MS:
            st='유예중'
            det={}
        else:
            st,det=judge(r['couponName'], r['campName'], co, CPREP)
        act_results.append({**r,'handle':extract_handle(r['couponName']),'contentStatus':st,'detail':det})

    # ---------- check window ----------
    chk_results=[]
    for r in checkwin:
        st,det=judge(r['couponName'], r['campName'], r['checkoutTimestamp'], CPREP)
        chk_results.append({**r,'handle':extract_handle(r['couponName']),'contentStatus':st,'detail':det})

    # ---------- summary (간결) ----------
    act_cc=Counter(r['contentStatus'] for r in act_results)
    chk_cc=Counter(r['contentStatus'] for r in chk_results)
    print(f"[match] 기준일={base.isoformat()} 활동창={len(act_results)} {dict(act_cc)}")
    print(f"[match] 점검창={len(chk_results)} {dict(chk_cc)}")

    json.dump({'activity':act_results,'checkwin':chk_results},
              open(os.path.join(OUT,'match_results.json'),'w'),
              ensure_ascii=False, indent=1)
    print(f"[match] saved {os.path.join('out','match_results.json')}")


if __name__=='__main__':
    main()
