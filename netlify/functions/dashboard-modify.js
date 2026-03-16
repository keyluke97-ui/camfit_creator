// dashboard-modify.js - 미배정 슬롯의 등급 간 인원 변경 + 가격 재계산

import { verifyToken, extractToken, buildCorsHeaders, checkRateLimit, rateLimitResponse } from './jwt-utils.js' // CHANGED: Item 8 - Rate Limiting 추가

// CHANGED: S-2 - CORS 헤더를 buildCorsHeaders로 교체 (ALLOWED_ORIGIN 환경변수 지원)
const CORS_HEADERS = buildCorsHeaders('POST, OPTIONS')

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS_HEADERS })
}

/** 등급별 기본 단가 (VAT 별도) — Airtable 필드에 값이 없을 때의 fallback */
const DEFAULT_UNIT_PRICES = {
  icon: 300000,
  partner: 100000,
  rising: 50000,
}

/** VAT 포함 총액 계산 */
function calculateTotal(crew, unitPrices) {
  const subtotal =
    crew.icon * unitPrices.icon +
    crew.partner * unitPrices.partner +
    crew.rising * unitPrices.rising
  return Math.round(subtotal * 1.1)
}

export default async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('', { status: 200, headers: CORS_HEADERS })
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  // CHANGED: Item 8 - Rate Limiting 검사
  const rateCheck = checkRateLimit(request)
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.retryAfterSeconds, CORS_HEADERS)
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

  const { recordId } = verification.payload

  try {
    const { newCrew } = await request.json()

    // newCrew 검증: { icon: number, partner: number, rising: number }
    if (
      !newCrew ||
      typeof newCrew.icon !== 'number' ||
      typeof newCrew.partner !== 'number' ||
      typeof newCrew.rising !== 'number'
    ) {
      return jsonResponse(
        { error: '변경할 인원 정보가 올바르지 않습니다. { icon, partner, rising } 형식이어야 합니다.' },
        400
      )
    }

    if (newCrew.icon < 0 || newCrew.partner < 0 || newCrew.rising < 0) {
      return jsonResponse({ error: '모집 인원은 0 이상이어야 합니다.' }, 400)
    }

    // CHANGED: Item 7 - 등급별 최대 인원 제한 (서버사이드 검증)
    const MAX_CREW_PER_GRADE = 20
    if (newCrew.icon > MAX_CREW_PER_GRADE || newCrew.partner > MAX_CREW_PER_GRADE || newCrew.rising > MAX_CREW_PER_GRADE) {
      return jsonResponse({ error: `등급별 최대 모집 인원은 ${MAX_CREW_PER_GRADE}명입니다.` }, 400)
    }

    // CHANGED: C-3 - 총 인원 0 허용 방지: 합계가 0이면 거부
    const totalNewCrew = newCrew.icon + newCrew.partner + newCrew.rising
    if (totalNewCrew === 0) {
      return jsonResponse({ error: '총 모집 인원은 1명 이상이어야 합니다.' }, 400)
    }

    // CHANGED: 오퍼 테이블 조회 제거 → 모집 폼의 '신청 가능 인원' 수식 필드로 배정 상태 판단
    const formRecordUrl = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(FORM_TABLE)}/${recordId}`

    const formResponse = await fetch(formRecordUrl, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    })

    if (!formResponse.ok) {
      return jsonResponse({ error: '신청 정보를 찾을 수 없습니다.' }, 404)
    }

    const formRecord = await formResponse.json()
    const formFields = formRecord.fields

    const currentCrew = {
      icon: formFields['⭐️ 모집 희망 인원'] || 0,
      partner: formFields['✔️ 모집 인원'] || 0,
      rising: formFields['🔥 모집 인원'] || 0,
    }

    // CHANGED: Item 6 - Airtable 레코드의 단가 필드를 우선 사용, 없으면 기본값 fallback
    const unitPrices = {
      icon: formFields['아이콘 크리에이터 협찬 제안 금액'] || DEFAULT_UNIT_PRICES.icon,
      partner: formFields['파트너 크리에이터 협찬 제안 금액'] || DEFAULT_UNIT_PRICES.partner,
      rising: formFields['라이징 협찬 제안 금액'] || DEFAULT_UNIT_PRICES.rising,
    }

    // CHANGED: 신청 가능 인원 수식 필드에서 배정 인원 역산
    const availableSlots = {
      icon: formFields['⭐️ 신청 가능 인원'] ?? null,
      partner: formFields['✔️ 신청 가능 인원'] ?? null,
      rising: formFields['🔥 신청 가능 인원'] ?? null,
    }

    /** 등급별 배정 인원 계산 (엣지케이스 포함) */
    function getAssignedCount(crewCount, available) {
      if (crewCount === 0) return 0
      if (available === null || available === undefined) return crewCount
      const assigned = crewCount - available
      return Math.max(0, assigned)
    }

    const assignedByGrade = {
      icon: getAssignedCount(currentCrew.icon, availableSlots.icon),
      partner: getAssignedCount(currentCrew.partner, availableSlots.partner),
      rising: getAssignedCount(currentCrew.rising, availableSlots.rising),
    }

    if (newCrew.icon < assignedByGrade.icon) {
      return jsonResponse(
        { error: `아이콘 등급은 이미 ${assignedByGrade.icon}명이 배정되어 ${assignedByGrade.icon}명 미만으로 줄일 수 없습니다.` },
        400
      )
    }
    if (newCrew.partner < assignedByGrade.partner) {
      return jsonResponse(
        { error: `파트너 등급은 이미 ${assignedByGrade.partner}명이 배정되어 ${assignedByGrade.partner}명 미만으로 줄일 수 없습니다.` },
        400
      )
    }
    if (newCrew.rising < assignedByGrade.rising) {
      return jsonResponse(
        { error: `라이징 등급은 이미 ${assignedByGrade.rising}명이 배정되어 ${assignedByGrade.rising}명 미만으로 줄일 수 없습니다.` },
        400
      )
    }

    const oldTotal = calculateTotal(currentCrew, unitPrices)
    const newTotal = calculateTotal(newCrew, unitPrices)
    const priceDifference = newTotal - oldTotal

    const updatePayload = {
      fields: {
        '⭐️ 모집 희망 인원': newCrew.icon,
        '✔️ 모집 인원': newCrew.partner,
        '🔥 모집 인원': newCrew.rising,
        '아이콘 크리에이터 협찬 제안 금액': unitPrices.icon,
        '파트너 크리에이터 협찬 제안 금액': unitPrices.partner,
        '라이징 협찬 제안 금액': unitPrices.rising,
      },
    }

    const updateResponse = await fetch(formRecordUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatePayload),
    })

    if (!updateResponse.ok) {
      return jsonResponse({ error: '인원 변경 저장에 실패했습니다.' }, 500)
    }

    return jsonResponse({
      success: true,
      previousCrew: currentCrew,
      newCrew,
      previousTotal: oldTotal,
      newTotal,
      priceDifference,
      needsAdditionalPayment: priceDifference > 0,
      bankInfo: priceDifference > 0
        ? {
            bank: '하나은행',
            account: '225-910068-71204',
            holder: '(주) 넥스트에디션',
            amount: priceDifference,
          }
        : null,
    })
  } catch (error) {
    return jsonResponse({ error: error.message }, 500)
  }
}

export const config = {
  path: '/api/dashboard/modify',
}
