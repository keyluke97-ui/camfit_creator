// RecruitmentProgress.jsx - 등급별 크리에이터 모집 진행률 카드

import { motion } from 'framer-motion'
// CHANGED: Item 4 - 인라인 토큰 제거, 공통 designTokens에서 import
import { BRAND_GREEN, CARD_BACKGROUND, BORDER_COLOR, TEXT_MUTED } from '../../../constants/designTokens'

/** 등급 설정 */
const GRADE_CONFIG = [
  { key: 'icon', emoji: '⭐️', label: '아이콘' },
  { key: 'partner', emoji: '✔️', label: '파트너' },
  { key: 'rising', emoji: '🔥', label: '라이징' },
]

/** 진행률 퍼센트 계산 (0–100) */
function calculatePercent(assigned, requested) {
  if (!requested || requested <= 0) return 0
  return Math.min(Math.round((assigned / requested) * 100), 100)
}

/** 단일 등급 진행률 행 */
function GradeProgressRow({ emoji, label, assigned, requested }) {
  const percent = calculatePercent(assigned, requested)
  const isComplete = assigned >= requested && requested > 0

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm text-white">
          {emoji} {label}
        </span>
        <span
          className="text-sm font-medium"
          style={{ color: isComplete ? BRAND_GREEN : '#FFFFFF' }}
        >
          {assigned}/{requested}명
          {isComplete && (
            <span className="ml-1 text-xs" style={{ color: BRAND_GREEN }}>완료</span>
          )}
        </span>
      </div>

      {/* 프로그레스 바 */}
      <div
        className="w-full h-2 rounded-full overflow-hidden"
        style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{
            backgroundColor: isComplete ? BRAND_GREEN : '#FFFFFF',
            opacity: isComplete ? 1 : 0.6,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

export default function RecruitmentProgress({ recruitment, totalRequested, totalAssigned }) {
  if (!recruitment) return null

  const totalPercent = calculatePercent(totalAssigned, totalRequested)
  const isFullyRecruited = totalAssigned >= totalRequested && totalRequested > 0

  return (
    <motion.div
      className="rounded-2xl p-5"
      style={{
        backgroundColor: CARD_BACKGROUND,
        border: `1px solid ${BORDER_COLOR}`,
      }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
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
                d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
                stroke={BRAND_GREEN}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h2 className="text-base font-bold text-white">모집 현황</h2>
        </div>

        {/* 전체 진행률 뱃지 */}
        <div
          className="px-3 py-1 rounded-full text-xs font-medium"
          style={{
            backgroundColor: isFullyRecruited ? `${BRAND_GREEN}20` : 'rgba(255,255,255,0.06)',
            color: isFullyRecruited ? BRAND_GREEN : TEXT_MUTED,
          }}
        >
          {isFullyRecruited ? '모집 완료' : `${totalPercent}% 진행`}
        </div>
      </div>

      {/* 전체 요약 */}
      <div
        className="rounded-xl px-4 py-3 mb-4 flex justify-between items-center"
        style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
      >
        <span className="text-sm" style={{ color: TEXT_MUTED }}>전체 배정</span>
        <span className="text-sm font-bold text-white">
          {totalAssigned} / {totalRequested}명
        </span>
      </div>

      {/* 등급별 프로그레스 */}
      <div className="space-y-4">
        {GRADE_CONFIG.map(({ key, emoji, label }) => {
          const gradeData = recruitment[key]
          if (!gradeData || gradeData.requested <= 0) return null
          return (
            <GradeProgressRow
              key={key}
              emoji={emoji}
              label={label}
              assigned={gradeData.assigned}
              requested={gradeData.requested}
            />
          )
        })}
      </div>
    </motion.div>
  )
}
