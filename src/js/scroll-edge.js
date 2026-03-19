/**
 * Scroll Edge Module
 * Handles tattered parchment edge clip-paths, nail positioning,
 * dishevel transforms, and parchment background randomization.
 */

/**
 * Generate edge profile with calm and rough zones
 * Creates alternating smooth areas and heavily torn areas for realism
 * @param {number} i - Point index along edge
 * @param {number} pointsPerEdge - Total points on this edge
 * @returns {number} Edge variation amount
 */
function edgeProfile(i, pointsPerEdge) {
  const t = i / pointsPerEdge
  const zone = Math.sin(t * Math.PI * 2)

  if (zone > 0.4) {
    // Calm zone (almost straight) - subtle waviness only
    return Math.sin(i * 0.1) * 0.2
  } else {
    // Rough zone (actual tearing) - heavy variation
    return (
      Math.sin(i * 0.08) * 1.2 +
      Math.sin(i * 0.3) * 0.5 +
      (Math.random() * 1.5 - 0.75)
    )
  }
}

/**
 * Generate rare deep tears for missing-material realism
 * 3% chance of creating bold inward chunks
 * @param {number} i - Point index
 * @returns {number} Deep tear amount or 0
 */
function deepTear(i) {
  if (Math.random() < 0.03) {
    return -3 - Math.random() * 2 // Big inward chunk: -3 to -5
  }
  return 0
}

/**
 * Internal helper: build a clip-path polygon with a given number of points per edge.
 * @param {number} pointsPerEdge - How many sample points along each of the 4 edges
 * @returns {string} CSS clip-path polygon string
 */
function buildClipPath(pointsPerEdge) {
  const points = []

  // TOP EDGE (Y = 0-2%) - DAMPENED for flatter appearance
  for (let i = 0; i < pointsPerEdge; i++) {
    const x = (i / pointsPerEdge) * 100
    const profile = edgeProfile(i, pointsPerEdge)
    const tear = deepTear(i)
    const variation = (profile + tear) * 0.6
    const y = Math.max(0, Math.min(3, variation))
    points.push(`${x.toFixed(2)}% ${y.toFixed(2)}%`)
  }

  // RIGHT EDGE (X = 100%)
  for (let i = 0; i < pointsPerEdge; i++) {
    const y = (i / pointsPerEdge) * 100
    const profile = edgeProfile(i, pointsPerEdge)
    const tear = deepTear(i)
    const variation = Math.max(0, profile + tear)
    const xOffset = Math.max(0, Math.min(5, variation))
    const x = 100 - xOffset
    points.push(`${x.toFixed(2)}% ${y.toFixed(2)}%`)
  }

  // BOTTOM EDGE (Y = 99-100%)
  for (let i = 0; i < pointsPerEdge; i++) {
    const x = 100 - ((i / pointsPerEdge) * 100)
    const profile = edgeProfile(i, pointsPerEdge)
    const tear = deepTear(i)
    const variation = Math.max(0, profile + tear)
    const y = Math.max(97, Math.min(101, 100 + variation))
    points.push(`${x.toFixed(2)}% ${y.toFixed(2)}%`)
  }

  // LEFT EDGE (X = 0%)
  for (let i = 0; i < pointsPerEdge; i++) {
    const y = 100 - ((i / pointsPerEdge) * 100)
    const profile = edgeProfile(i, pointsPerEdge)
    const tear = deepTear(i)
    const variation = Math.max(0, profile + tear)
    const xOffset = Math.max(0, Math.min(5, variation))
    points.push(`${xOffset.toFixed(2)}% ${y.toFixed(2)}%`)
  }

  return `polygon(${points.join(', ')})`
}

/**
 * Generate a random tattered edge clip-path polygon with organic variation.
 * Uses 40 points per edge (~160 total) — the standard card-level detail.
 * @returns {string} CSS clip-path polygon string
 */
export function generateRandomClipPath() {
  return buildClipPath(40)
}

/**
 * Generate a high-detail tattered edge clip-path polygon.
 * Uses 120 points per edge (~480 total) — 3× the standard density
 * for larger surfaces like full-page parchment containers.
 * @returns {string} CSS clip-path polygon string
 */
export function generateDenseClipPath() {
  return buildClipPath(120)
}

/**
 * Randomly select a nail image for the card
 */
export function getRandomNail() {
  const nails = ['nail_1.png', 'nail_2.png', 'nail_3.png', 'nail_4.png', 'nail_5.png', 'nail_6.png', 'nail_7.png', 'nail_8.png']
  const randomNail = nails[Math.floor(Math.random() * nails.length)]
  return `/images/nails/${randomNail}`
}

/**
 * Generate random horizontal position and rotation for nail
 */
export function getNailPositionStyle() {
  const leftPosition = 45 + Math.random() * 10 // 45% to 55% from left (almost center)
  const rotation = (Math.random() * 150) - 75 // -75 to +75 degrees
  return `left: ${leftPosition}%; transform: translateX(-50%) rotate(${rotation}deg);`
}

/**
 * Generate nail position data with left % exposed for transform-origin
 */
export function getNailPositionData() {
  const leftPosition = 45 + Math.random() * 10
  const rotation = (Math.random() * 150) - 75
  return {
    leftPosition,
    rotation,
    style: `left: ${leftPosition}%; transform: translateX(-50%) rotate(${rotation}deg);`
  }
}

/**
 * Generate random background-position for weathered parchment image
 */
export function getRandomParchmentPosition() {
  const posX = Math.floor(Math.random() * 100)
  const posY = Math.floor(Math.random() * 100)
  return `${posX}% ${posY}%`
}

/**
 * Generate random offset and rotation for disheveled card appearance
 * @param {boolean} isMarketPage - If true, also randomizes background-position
 * @returns {string} CSS inline style string
 */
export function getCardDishevelStyle(isMarketPage = false) {
  const offsetX = (Math.random() - 0.5) * 8 // -4px to 4px horizontal offset
  const offsetY = (Math.random() - 0.5) * 12 // -6px to 6px vertical offset
  const rotation = (Math.random() - 0.5) * 3 // -1.5deg to 1.5deg rotation
  let transform = `transform: translate(${offsetX}px, ${offsetY}px) rotate(${rotation}deg);`

  if (isMarketPage) {
    const bgPosition = getRandomParchmentPosition()
    return `${transform} background-position: ${bgPosition};`
  }

  return transform
}
