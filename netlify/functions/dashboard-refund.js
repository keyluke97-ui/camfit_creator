// dashboard-refund.js - 환불 요청 (전체 모집 완료 전에만 가능)

import { verifyToken, extractToken, buildCorsHeaders, checkRateLimit, rateLimitResponse } from './jwt-utils.js' // CHANGED: sanitizeForFormula 제거 (오퍼 테이블 쿼리 삭제)

// CHANGED: S-2 - CORS 헤더를 buildCorsHeaders로 교체 (ALLOWED_ORIGIN 환경변수 지원)
const CORS_HEADERS = buildCorsHeaders('POST, OPTIONS')

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS_HEADERS })
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
    // CHANGED: 환불 요청 시 계좌 정보 필드 추가 수신
    const { reason, bankName, accountNumber, accountHolder } = await request.json()

    if (!reason || reason.trim().length === 0) {
      return jsonResponse({ error: '환불 사유를 입력해주세요.' }, 400)
    }

    if (!bankName || !accountNumber || !accountHolder) {
      return jsonResponse({ error: '환불 계좌 정보(은행, 계좌번호, 예금주명)를 모두 입력해주세요.' }, 400)
    }

    const formRecordUrl = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(FORM_TABLE)}/${recordId}`

    const formResponse = await fetch(formRecordUrl, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    })

    if (!formResponse.ok) {
      return jsonResponse({ error: '신청 정보를 찾을 수 없습니다.' }, 404)
    }

    const formRecord = await formResponse.json()
    const formFields = formRecord.fields

    const totalRequested =
      (formFields['⭐️ 모집 희망 인원'] || 0) +
      (formFields['✔️ 모집 인원'] || 0) +
      (formFields['🔥 모집 인원'] || 0)

    const totalAssigned =
      (formFields['아이콘 크리에이터 신청 수'] || 0) +
      (formFields['파트너 크리에이터 신청 수'] || 0) +
      (formFields['라이징 크리에이터 신청 수'] || 0)

    const isFullyRecruited = totalAssigned >= totalRequested && totalRequested > 0
    if (isFullyRecruited) {
      return jsonResponse(
        { error: '모든 크리에이터가 배정 완료되어 환불이 불가능합니다.' },
        400
      )
    }

    const existingRefundDate = formFields['환불 요청일']
    if (existingRefundDate) {
      return jsonResponse(
        { error: '이미 환불 요청이 접수되어 있습니다. 담당자 확인 후 안내드리겠습니다.' },
        409
      )
    }

    const currentNotes = formFields['비고'] || ''
    const now = new Date()
    const timestamp = now.toISOString().slice(0, 16).replace('T', ' ')
    const refundNote = `[환불요청 ${timestamp}] ${reason.trim()}`
    const updatedNotes = currentNotes
      ? `${currentNotes}\n${refundNote}`
      : refundNote

    const updateResponse = await fetch(formRecordUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          '비고': updatedNotes,
          '환불 은행': bankName,
          '계좌번호': accountNumber,
          '예금주명': accountHolder,
          '환불 요청일': now.toISOString(),
        },
      }),
    })

    if (!updateResponse.ok) {
      return jsonResponse({ error: '환불 요청 저장에 실패했습니다.' }, 500)
    }

    return jsonResponse({
      success: true,
      message: '환불 요청이 접수되었습니다. 담당자가 확인 후 연락드리겠습니다.',
      refundNote,
      totalRequested,
      totalAssigned,
    })
  } catch (error) {
    return jsonResponse({ error: error.message }, 500)
  }
}

export const config = {
  path: '/api/dashboard/refund',
}
