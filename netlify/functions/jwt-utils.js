// jwt-utils.js - Node.js crypto 기반 간이 JWT 유틸. 외부 의존성 없음.
import { createHmac, timingSafeEqual } from 'crypto' // CHANGED: S-5 - timingSafeEqual 추가

const ALGORITHM = 'HS256'
const TOKEN_EXPIRY_HOURS = 24

function base64UrlEncode(buffer) {
  const base64String = typeof buffer === 'string'
    ? Buffer.from(buffer).toString('base64')
    : buffer.toString('base64')
  return base64String.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64UrlDecode(encodedString) {
  const padded = encodedString.replace(/-/g, '+').replace(/_/g, '/') +
    '='.repeat((4 - (encodedString.length % 4)) % 4)
  return Buffer.from(padded, 'base64').toString('utf8')
}

/**
 * JWT 토큰 생성
 * @param {object} payload - 토큰에 담을 데이터 (recordId 등)
 * @param {string} secret - JWT_SECRET 환경변수
 * @returns {string} JWT 토큰
 */
export function signToken(payload, secret) {
  const header = { alg: ALGORITHM, typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)

  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + TOKEN_EXPIRY_HOURS * 3600,
  }

  const headerEncoded = base64UrlEncode(JSON.stringify(header))
  const payloadEncoded = base64UrlEncode(JSON.stringify(fullPayload))
  const signatureInput = `${headerEncoded}.${payloadEncoded}`

  const signature = base64UrlEncode(
    createHmac('sha256', secret).update(signatureInput).digest()
  )

  return `${headerEncoded}.${payloadEncoded}.${signature}`
}

/**
 * JWT 토큰 검증 + 디코드
 * @param {string} token - JWT 토큰 문자열
 * @param {string} secret - JWT_SECRET 환경변수
 * @returns {{ valid: boolean, payload?: object, error?: string }}
 */
export function verifyToken(token, secret) {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      return { valid: false, error: '유효하지 않은 토큰 형식' }
    }

    const [headerEncoded, payloadEncoded, signatureEncoded] = parts

    // CHANGED: S-5 - 타이밍 공격 방지: timingSafeEqual로 서명 비교
    const expectedSignature = base64UrlEncode(
      createHmac('sha256', secret).update(`${headerEncoded}.${payloadEncoded}`).digest()
    )

    const bufferExpected = Buffer.from(expectedSignature)
    const bufferReceived = Buffer.from(signatureEncoded)
    const signatureValid =
      bufferExpected.length === bufferReceived.length &&
      timingSafeEqual(bufferExpected, bufferReceived)

    if (!signatureValid) {
      return { valid: false, error: '토큰 서명이 유효하지 않습니다' }
    }

    // 만료 확인
    const payload = JSON.parse(base64UrlDecode(payloadEncoded))
    const now = Math.floor(Date.now() / 1000)

    if (payload.exp && payload.exp < now) {
      return { valid: false, error: '토큰이 만료되었습니다' }
    }

    return { valid: true, payload }
  } catch (error) {
    return { valid: false, error: `토큰 검증 실패: ${error.message}` }
  }
}

// CHANGED: M-1 - 공통 유틸 추가. 모든 function 파일에서 import해서 사용한다.

/**
 * Authorization 헤더에서 Bearer 토큰 추출
 * @param {Request} request
 * @returns {string|null}
 */
export function extractToken(request) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  return authHeader.slice(7)
}

/**
 * Airtable filterByFormula 인젝션 방지: 작은따옴표 이스케이프
 * @param {string} value
 * @returns {string}
 */
export function sanitizeForFormula(value) {
  return String(value).replace(/'/g, "''")
}

/**
 * CORS 헤더 생성 (ALLOWED_ORIGIN 환경변수 우선 적용)
 * @param {string} methods - 허용할 HTTP 메서드 목록 ex) 'GET, OPTIONS'
 * @returns {object}
 */
export function buildCorsHeaders(methods) {
  const origin = process.env.ALLOWED_ORIGIN || '*'
  // CHANGED: Item 12 - ALLOWED_ORIGIN 미설정 시 콘솔 경고
  if (origin === '*') {
    console.warn('[CORS] ALLOWED_ORIGIN 환경변수가 설정되지 않아 모든 출처를 허용합니다. 프로덕션에서는 반드시 설정하세요.')
  }
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  }
}

// CHANGED: Item 8 - 인메모리 Rate Limiter (Netlify Functions 인스턴스 내 burst 방지)
const rateLimitStore = new Map()
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1분
const RATE_LIMIT_MAX_REQUESTS = 30 // 1분당 최대 요청 수

/**
 * IP 기반 간이 Rate Limiting 검사
 * @param {Request} request
 * @returns {{ allowed: boolean, retryAfterSeconds?: number }}
 */
export function checkRateLimit(request) {
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const now = Date.now()

  const entry = rateLimitStore.get(clientIp)

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(clientIp, { windowStart: now, count: 1 })
    return { allowed: true }
  }

  entry.count += 1

  if (entry.count > RATE_LIMIT_MAX_REQUESTS) {
    const retryAfterSeconds = Math.ceil((entry.windowStart + RATE_LIMIT_WINDOW_MS - now) / 1000)
    return { allowed: false, retryAfterSeconds }
  }

  return { allowed: true }
}

/**
 * Rate Limit 초과 시 429 응답 생성
 * @param {number} retryAfterSeconds
 * @param {object} corsHeaders
 * @returns {Response}
 */
export function rateLimitResponse(retryAfterSeconds, corsHeaders) {
  return new Response(
    JSON.stringify({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' }),
    {
      status: 429,
      headers: { ...corsHeaders, 'Retry-After': String(retryAfterSeconds) },
    }
  )
}
