// dashboard-data.js - 대시보드 데이터 조회 (신청 상태 + 크리에이터 배정 현황)

import { verifyToken, extractToken, buildCorsHeaders, sanitizeForFormula } from './jwt-utils.js' // CHANGED: sanitizeForFormula 복구 (크리에이터 목록 구현)

// CHANGED: S-2 - CORS 헤더를 buildCorsHeaders로 교체 (ALLOWED_ORIGIN 환경변수 지원)
const CORS_HEADERS = buildCorsHeaders('GET, OPTIONS')

// 유료 오퍼 신청 건 테이블명
const OFFER_TABLE = '유료 오퍼 신청 건'

// 등급화 숫자 → 등급 정보 매핑 (3=아이콘⭐️, 2=파트너✔️, 1=라이징🔥)
const GRADE_INFO = {
  3: { emoji: '⭐️', label: '아이콘' },
  2: { emoji: '✔️', label: '파트너' },
  1: { emoji: '🔥', label: '라이징' },
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS_HEADERS })
}

/** 유료 오퍼 레코드 1건을 크리에이터 객체로 변환 */
function mapOfferToCreator(record) {
  const fields = record.fields

  // multipleLookupValues 타입은 배열로 반환되므로 첫 번째 요소 추출
  const gradeRaw = fields['등급화 (from 크리에이터 채널명 (크리에이터 명단)) (from 크리에이터 채널명(프리미엄 협찬 신청))']
  const gradeNumber = Array.isArray(gradeRaw) ? gradeRaw[0] ?? null : gradeRaw ?? null

  const channelUrlRaw = fields['채널 URL']
  const channelUrl = Array.isArray(channelUrlRaw) ? (channelUrlRaw[0] || null) : (channelUrlRaw || null)

  const gradeInfo = GRADE_INFO[gradeNumber] || null

  return {
    offerId: record.id,
    channelName: fields['크리에이터 채널명'] || '채널명 없음',
    channelUrl,
    grade: gradeNumber,
    gradeEmoji: gradeInfo?.emoji || '',
    gradeLabel: gradeInfo?.label || '미분류',
    checkInDate: fields['입실일'] || null,
    site: fields['입실 사이트'] || null,
    contentLink: null,
  }
}

export default async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('', { status: 200, headers: CORS_HEADERS })
  }

  if (request.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const API_KEY = process.env.AIRTABLE_API_KEY
  const BASE_ID = process.env.AIRTABLE_BASE_ID
  const JWT_SECRET = process.env.JWT_SECRET
  const FORM_TABLE = process.env.AIRTABLE_TABLE_ID || '캠지기 모집 폼'

  if (!API_KEY || !BASE_ID || !JWT_SECRET) {
    return jsonResponse({ error: '서버 환경변수가 설정되지 않았습니다.' }, 500)
  }

  // JWT 인증
  const token = extractToken(request) // CHANGED: M-1 - 로컬 extractToken 제거, 공통 유틸 사용
  if (!token) {
    return jsonResponse({ error: '인증 토큰이 필요합니다.' }, 401)
  }

  const verification = verifyToken(token, JWT_SECRET)
  if (!verification.valid) {
    return jsonResponse({ error: verification.error }, 401)
  }

  const { recordId, accommodationName } = verification.payload

  try {
    // 캠지기 모집 폼 단건 조회 URL
    const formRecordUrl = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(FORM_TABLE)}/${recordId}`

    // CHANGED: 크리에이터 목록 구현 — 유료 오퍼 신청 건 조회 URL 구성
    // 필터: 숙소명 일치 AND 취소된 오퍼 제외
    const safeName = sanitizeForFormula(accommodationName)
    // 숙소명 필드가 multipleLookupValues(배열)이므로 FIND+ARRAYJOIN으로 안전하게 매칭
    const offerFilter = encodeURIComponent(
      `AND(FIND('${safeName}',ARRAYJOIN({숙소 이름을 적어주세요. (from 숙소 이름 (유료 오퍼ㅏ))})),{예약 취소/변경}!='취소')`
    )
    const offerFieldsQuery = [
      '크리에이터 채널명',
      '등급화 (from 크리에이터 채널명 (크리에이터 명단)) (from 크리에이터 채널명(프리미엄 협찬 신청))',
      '채널 URL',
      '입실일',
      '입실 사이트',
    ].map(f => 'fields%5B%5D=' + encodeURIComponent(f)).join('&')

    const offerUrl =
      `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(OFFER_TABLE)}` +
      `?filterByFormula=${offerFilter}&${offerFieldsQuery}&maxRecords=100`

    // 두 테이블 병렬 조회
    const [formResponse, offerResponse] = await Promise.all([
      fetch(formRecordUrl, { headers: { Authorization: `Bearer ${API_KEY}` } }),
      fetch(offerUrl, { headers: { Authorization: `Bearer ${API_KEY}` } }),
    ])

    if (!formResponse.ok) {
      return jsonResponse({ error: '신청 정보를 찾을 수 없습니다.' }, 404)
    }

    const formRecord = await formResponse.json()
    const formFields = formRecord.fields

    // 신청 상태 데이터 구성
    const applicationData = {
      accommodationName: formFields['숙소 이름을 적어주세요.'] || accommodationName,
      selectedBudget: formFields['선택 예산'] || '',
      selectedPlan: formFields['선택플랜'] || '',
      region: formFields['숙소 위치'] || '',
      representativeName: formFields['대표자명'] || '',
      phone: formFields['연락처'] || '',
      email: formFields['캠지기님 이메일'] || '',
      // CHANGED: 입금 확인 여부 및 실입금 필요 금액 추가
      paymentConfirmed: formFields['입금내역 확인'] === true,
      requiredPaymentAmount: formFields['실입금 필요 금액'] || null,
      crew: {
        icon: {
          requested: formFields['⭐️ 모집 희망 인원'] || 0,
          unitPrice: formFields['아이콘 크리에이터 협찬 제안 금액'] || 300000,
        },
        partner: {
          requested: formFields['✔️ 모집 인원'] || 0,
          unitPrice: formFields['파트너 크리에이터 협찬 제안 금액'] || 100000,
        },
        rising: {
          requested: formFields['🔥 모집 인원'] || 0,
          unitPrice: formFields['라이징 협찬 제안 금액'] || 50000,
        },
      },
      notes: formFields['비고'] || '',
    }

    // CHANGED: 배정 인원을 캠지기 모집 폼의 카운트 필드에서 직접 읽음 (유료 오퍼 테이블 조회 제거)
    const assignedByGrade = {
      icon: formFields['아이콘 크리에이터 신청 수'] || 0,
      partner: formFields['파트너 크리에이터 신청 수'] || 0,
      rising: formFields['라이징 크리에이터 신청 수'] || 0,
    }

    const recruitment = {
      icon: {
        requested: applicationData.crew.icon.requested,
        assigned: assignedByGrade.icon,
      },
      partner: {
        requested: applicationData.crew.partner.requested,
        assigned: assignedByGrade.partner,
      },
      rising: {
        requested: applicationData.crew.rising.requested,
        assigned: assignedByGrade.rising,
      },
    }

    const totalRequested =
      recruitment.icon.requested +
      recruitment.partner.requested +
      recruitment.rising.requested
    const totalAssigned =
      recruitment.icon.assigned +
      recruitment.partner.assigned +
      recruitment.rising.assigned

    // 환불 가능 여부: 전체 모집 완료 전에만 가능
    const isFullyRecruited = totalAssigned >= totalRequested && totalRequested > 0
    const canRefund = !isFullyRecruited

    // CHANGED: 크리에이터 목록 구현 — 유료 오퍼 응답 처리 (조회 실패 시 빈 배열로 graceful degradation)
    let creators = []
    if (offerResponse.ok) {
      const offerData = await offerResponse.json()
      creators = (offerData.records || []).map(mapOfferToCreator)
    }

    return jsonResponse({
      success: true,
      application: applicationData,
      recruitment,
      totalRequested,
      totalAssigned,
      creators,
      canRefund,
      isFullyRecruited,
    })
  } catch (error) {
    return jsonResponse({ error: error.message }, 500)
  }
}

export const config = {
  path: '/api/dashboard/data',
}
