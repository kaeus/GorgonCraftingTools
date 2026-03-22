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

  // BOTTOM EDGE (Y = 95-100%) - Bites UPWARD with same roughness as sides
  for (let i = 0; i < pointsPerEdge; i++) {
    const x = 100 - ((i / pointsPerEdge) * 100)
    const profile = edgeProfile(i, pointsPerEdge)
    const tear = deepTear(i)
    const variation = Math.max(0, profile + tear)
    const yOffset = Math.max(0, Math.min(5, variation))
    const y = Math.max(95, 100 - yOffset)
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
 * Uses 240 points per edge (~960 total) — 6× the standard density
 * for larger surfaces like full-page parchment containers.
 * @returns {string} CSS clip-path polygon string
 */
export function generateDenseClipPath() {
  return buildClipPath(240)
}

/**
 * Randomly select a nail image for the card
 */
export function getRandomNail() {
  const nails = ['nail_1.png', 'nail_2.png', 'nail_3.png', 'nail_4.png', 'nail_5.png', 'nail_6.png', 'nail_7.png', 'nail_8.png']
  const randomNail = nails[Math.floor(Math.random() * nails.length)]
  return `./images/nails/${randomNail}`
}

/**
 * Generate random horizontal position and rotation for nail
 */
export function getNailPositionStyle() {
  const leftPosition = 45 + Math.random() * 10 // 45% to 55% from left (almost center)
  const rotation = (Math.random() * 150) - 75 // -75 to +75 degrees
  return `left: ${leftPosition}%; top: 1%; transform: translateX(-50%) rotate(${rotation}deg);`
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
    style: `left: ${leftPosition}%; top: 1%; transform: translateX(-50%) rotate(${rotation}deg);`
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
/**
 * Generate a jagged tear clip-path for nail puncture effect
 * Creates organic, torn edges radiating from center (like a bullet hole)
 * @param {number} numPoints - Number of tear points (default 16)
 * @returns {string} CSS clip-path polygon string
 */
export function generateNailTearClipPath(numPoints = 16) {
  const points = []
  const centerX = 50
  const centerY = 50
  const outerRadius = 45 // Outer edge of tear
  const innerRadius = 20 // Inner jagged core
  
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2
    
    // Random variation between inner and outer radius for jagged teeth
    const randomDepth = Math.random() * 0.6 + 0.2 // 20-80% depth variation
    const tearRadius = innerRadius + (outerRadius - innerRadius) * randomDepth
    
    // Add significant variation for deep tears
    const extraTear = Math.random() < 0.15 ? Math.random() * 15 : 0 // 15% chance of extra deep tear
    const finalRadius = Math.max(innerRadius * 0.6, tearRadius - extraTear)
    
    const x = centerX + Math.cos(angle) * finalRadius
    const y = centerY + Math.sin(angle) * finalRadius
    
    points.push(`${x.toFixed(1)}% ${y.toFixed(1)}%`)
  }
  
  return `polygon(${points.join(', ')})`
}

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

/**
 * Generate SVG mask-image for nail tear/hole effect
 * Creates an elliptical tear pattern underneath nail position
 * @returns {string} CSS mask-image data URL
 */
export function generateNailTearMask() {
  const size = 120; // SVG viewBox size
  const centerX = size / 2;
  const centerY = size / 2;
  const numTears = 8 + Math.floor(Math.random() * 4); // 8-11 tear points
  
  let tearPath = `M ${centerX} ${centerY + 30}`; // Start at bottom center
  
  // Generate organic tear edges around the hole perimeter
  for (let i = 0; i < numTears; i++) {
    const angle = (i / numTears) * Math.PI * 2;
    const baseRadius = 25 + Math.random() * 8; // 25-33px radius
    const tearDepth = Math.random() * 12 + 4; // 4-16px deep tears
    const useDeepTear = Math.random() < 0.2; // 20% chance of deep tear
    
    const radius = useDeepTear ? baseRadius - tearDepth : baseRadius;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    
    if (i === 0) {
      tearPath = `M ${x} ${y}`;
    } else {
      // Use quadratic curve for smoother tears
      const controlRadius = baseRadius + (Math.random() * 4 - 2);
      const controlX = centerX + Math.cos(angle - 0.3) * controlRadius;
      const controlY = centerY + Math.sin(angle - 0.3) * controlRadius;
      tearPath += ` Q ${controlX} ${controlY} ${x} ${y}`;
    }
  }
  
  tearPath += ' Z'; // Close path
  
  // Create SVG gradient mask with soft edges
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
      <defs>
        <radialGradient id="tearGradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" style="stop-color:black;stop-opacity:1" />
          <stop offset="75%" style="stop-color:black;stop-opacity:0.7" />
          <stop offset="100%" style="stop-color:black;stop-opacity:0" />
        </radialGradient>
      </defs>
      <rect width="${size}" height="${size}" fill="white"/>
      <path d="${tearPath}" fill="url(#tearGradient)" />
    </svg>
  `;
  
  // Encode as data URL
  const encoded = btoa(svg.trim());
  return `url('data:image/svg+xml;base64,${encoded}')`;
}

/**
 * Generate CSS for nail tear effect with positioned element
 * Creates a masked overlay beneath nail showing torn parchment
 * @returns {string} CSS style string with position and mask
 */
export function getNailTearEffect() {
  const leftPosition = 45 + Math.random() * 10; // Match nail position
  const rotation = (Math.random() * 150) - 75; // Match nail rotation
  const mask = generateNailTearMask();
  
  return `
    left: ${leftPosition}%;
    transform: translateX(-50%) rotate(${rotation}deg);
    mask-image: ${mask};
    -webkit-mask-image: ${mask};
    mask-size: 100% 100%;
    mask-position: center bottom;
    mask-repeat: no-repeat;
  `;
}

/**
 * Generate SVG radial gradient mask with jagged circular hole
 * Creates a transparent center with jagged edges fading to opaque
 * @param {number} holeX - X position percentage (50 = center)
 * @param {number} holeY - Y position percentage (1 = top)
 * @returns {string} CSS mask-image data URL
 */
export function generateJaggedHoleMask(holeX = 50, holeY = 1) {
  const size = 2000; // Large SVG viewBox for precision
  const centerX = (holeX / 100) * size;
  const centerY = (holeY / 100) * size;
  const baseRadius = 150; // Hole radius in SVG units (scales with larger viewBox)
  const numJags = 24; // Number of jagged points around circle
  
  // Generate jagged circle path
  let holePath = '';
  for (let i = 0; i < numJags; i++) {
    const angle = (i / numJags) * Math.PI * 2;
    // Alternate between normal and jagged radius for teeth effect
    const isJag = i % 2 === 0;
    const radius = isJag 
      ? baseRadius + Math.random() * 40  // Jagged points stick out more
      : baseRadius - Math.random() * 30; // Valleys between jags
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    
    if (i === 0) {
      holePath += `M ${x.toFixed(1)} ${y.toFixed(1)}`;
    } else {
      holePath += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
  }
  holePath += ' Z';
  
  // SVG: white background (visible) with black jagged hole (hidden)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="white"/><path d="${holePath}" fill="black"/></svg>`;
  
  // Encode as data URL
  const encoded = btoa(svg);
  return `url('data:image/svg+xml;base64,${encoded}')`;
}
