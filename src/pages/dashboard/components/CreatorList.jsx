// CreatorList.jsx - 배정된 크리에이터 목록 카드

import { motion } from 'framer-motion'
// CHANGED: Item 4 - 인라인 토큰 제거, 공통 designTokens에서 import
import { BRAND_GREEN, CARD_BACKGROUND, BORDER_COLOR, TEXT_MUTED } from '../../../constants/designTokens'

// CHANGED: 등급화 매핑 기준 수정 (3=아이콘⭐️=골드, 2=파트너✔️=그린, 1=라이징🔥=오렌지)
const GRADE_BADGE_COLORS = {
  3: { background: '#FFD70020', color: '#FFD700' },  // 아이콘 ⭐️
  2: { background: `${BRAND_GREEN}20`, color: BRAND_GREEN }, // 파트너 ✔️
  1: { background: '#FF6B0025', color: '#FF8C00' },  // 라이징 🔥
}

/** 날짜 포맷: YYYY-MM-DD → MM/DD(요일), 없으면 '조율 중' */
function formatDate(dateString) {
  if (!dateString) return null  // null 반환으로 조율 중 상태 구분
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return dateString
    const dayNames = ['일', '월', '화', '수', '목', '금', '토']
    const month = date.getMonth() + 1
    const day = date.getDate()
    const dayOfWeek = dayNames[date.getDay()]
    return `${month}/${day}(${dayOfWeek})`
  } catch {
    return dateString
  }
}

/** 단일 크리에이터 카드 */
function CreatorCard({ creator, index }) {
  // CHANGED: 알 수 없는 등급은 중립색 fallback
  const badgeColor = GRADE_BADGE_COLORS[creator.grade] || { background: 'rgba(255,255,255,0.08)', color: TEXT_MUTED }

  return (
    <motion.div
      className="rounded-xl p-4"
      style={{
        backgroundColor: 'rgba(255,255,255,0.03)',
        border: `1px solid ${BORDER_COLOR}`,
      }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
    >
      {/* 상단: 채널명 + 등급 뱃지 */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0">
          {creator.channelUrl ? (
            <a
              href={creator.channelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium truncate block"
              style={{ color: BRAND_GREEN }}
            >
              {creator.channelName || '채널명 없음'}
              <svg
                className="inline-block ml-1 w-3 h-3"
                viewBox="0 0 24 24"
                fill="none"
                style={{ verticalAlign: 'middle' }}
              >
                <path
                  d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"
                  stroke={BRAND_GREEN}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
          ) : (
            <span className="text-sm font-medium text-white truncate block">
              {creator.channelName || '채널명 없음'}
            </span>
          )}
        </div>

        <span
          className="px-2 py-0.5 rounded-md text-xs font-medium whitespace-nowrap ml-2"
          style={{
            backgroundColor: badgeColor.background,
            color: badgeColor.color,
          }}
        >
          {creator.gradeEmoji} {creator.gradeLabel}
        </span>
      </div>

      {/* 하단: 체크인 / 사이트 / 콘텐츠 */}
      {/* CHANGED: 입실일·사이트가 null이면 '조율 중' 상태로 표시 */}
      <div className="grid grid-cols-2 gap-2">
        <DetailItem label="체크인" value={formatDate(creator.checkInDate)} pending={!creator.checkInDate} />
        <DetailItem label="사이트" value={creator.site || null} pending={!creator.site} />
        {creator.contentLink && (
          <div className="col-span-2">
            <span className="text-xs block mb-1" style={{ color: TEXT_MUTED }}>콘텐츠</span>
            <a
              href={creator.contentLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs truncate block"
              style={{ color: BRAND_GREEN }}
            >
              콘텐츠 보기 →
            </a>
          </div>
        )}
      </div>
    </motion.div>
  )
}

/** 세부 정보 아이템 — pending=true이면 '조율 중' 상태로 표시 */
function DetailItem({ label, value, pending = false }) {
  return (
    <div>
      <span className="text-xs block mb-0.5" style={{ color: TEXT_MUTED }}>{label}</span>
      {pending ? (
        <span className="text-xs" style={{ color: '#FF8C00' }}>조율 중</span>
      ) : (
        <span className="text-xs text-white">{value}</span>
      )}
    </div>
  )
}

export default function CreatorList({ creators }) {
  if (!creators || creators.length === 0) {
    return (
      <motion.div
        className="rounded-2xl p-5"
        style={{
          backgroundColor: CARD_BACKGROUND,
          border: `1px solid ${BORDER_COLOR}`,
        }}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <div className="flex items-center gap-2 mb-4">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${BRAND_GREEN}15` }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M12 7a4 4 0 1 0-8 0 4 4 0 0 0 8 0zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
                stroke={BRAND_GREEN}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h2 className="text-base font-bold text-white">배정 크리에이터</h2>
        </div>

        <div className="text-center py-8">
          <p className="text-sm" style={{ color: TEXT_MUTED }}>
            아직 배정된 크리에이터가 없습니다.
          </p>
          <p className="text-xs mt-1" style={{ color: TEXT_MUTED }}>
            모집이 진행되면 이곳에 표시됩니다.
          </p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      className="rounded-2xl p-5"
      style={{
        backgroundColor: CARD_BACKGROUND,
        border: `1px solid ${BORDER_COLOR}`,
      }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
    >
      {/* 카드 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${BRAND_GREEN}15` }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M12 7a4 4 0 1 0-8 0 4 4 0 0 0 8 0zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
                stroke={BRAND_GREEN}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h2 className="text-base font-bold text-white">배정 크리에이터</h2>
        </div>

        <span
          className="text-xs font-medium px-3 py-1 rounded-full"
          style={{
            backgroundColor: 'rgba(255,255,255,0.06)',
            color: TEXT_MUTED,
          }}
        >
          {creators.length}명
        </span>
      </div>

      {/* 크리에이터 카드 목록 */}
      <div className="space-y-3">
        {creators.map((creator, index) => (
          <CreatorCard
            key={creator.offerId || index}
            creator={creator}
            index={index}
          />
        ))}
      </div>
    </motion.div>
  )
}
