// dashboardApi.js - 캠지기 대시보드 전용 API 클라이언트

const API_BASE = ''

/** 토큰 저장/조회/삭제 */
const TOKEN_KEY = 'camjigi_dashboard_token'
const ACCOMMODATION_KEY = 'camjigi_accommodation_name'

export function saveAuth(token, accommodationName) {
  sessionStorage.setItem(TOKEN_KEY, token)
  sessionStorage.setItem(ACCOMMODATION_KEY, accommodationName)
}

export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY)
}

export function getAccommodationName() {
  return sessionStorage.getItem(ACCOMMODATION_KEY)
}

export function clearAuth() {
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(ACCOMMODATION_KEY)
}

export function isAuthenticated() {
  return !!getToken()
}

/** 인증 헤더 생성 */
function authHeaders() {
  const token = getToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

/** API 응답 공통 처리 */
async function handleResponse(response) {
  const data = await response.json()

  if (response.status === 401) {
    clearAuth()
    throw new Error(data.error || '인증이 만료되었습니다. 다시 로그인해주세요.')
  }

  if (!response.ok) {
    throw new Error(data.error || '요청 처리에 실패했습니다.')
  }

  return data
}

/** 사업자번호로 캠핑장 목록 조회 */
export async function lookupAccommodations(businessNumber) {
  const response = await fetch(`${API_BASE}/api/dashboard/lookup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ businessNumber }),
  })
  return handleResponse(response)
}

/** 로그인 (사업자번호 + 캠핑장 이름 + 연락처 뒷자리 4자리 + recordId) */
// CHANGED: recordId 파라미터 추가 — 중복 신청 시 정확한 레코드로 인증
export async function login(businessNumber, accommodationName, phoneLastFour, recordId) {
  const response = await fetch(`${API_BASE}/api/dashboard/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ businessNumber, accommodationName, phoneLastFour, recordId }),
  })
  const data = await handleResponse(response)

  if (data.success && data.token) {
    saveAuth(data.token, data.accommodationName)
  }

  return data
}

/** 대시보드 데이터 조회 */
export async function fetchDashboardData() {
  const response = await fetch(`${API_BASE}/api/dashboard/data`, {
    method: 'GET',
    headers: authHeaders(),
  })
  return handleResponse(response)
}

// CHANGED: modifyCrew, requestRefund 제거 — 인원 변경/환불은 카카오톡 상담으로 전환
