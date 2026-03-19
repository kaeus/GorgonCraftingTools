/**
 * Utility Functions Module
 * Common helper functions used across the application
 */

/**
 * Escape HTML special characters to prevent XSS
 */
export function escapeHtml(str) {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

/**
 * Get or set status/feedback message
 */
export function setStatus(elementId, message, type = 'loading') {
  const el = document.getElementById(elementId)
  if (!el) return

  if (type === 'ok') {
    // Replace ok status with SVG divider in dedicated container
    const dividerContainer = document.getElementById('divider-container')
    if (!dividerContainer) return
    
    const currentPage = window.location.pathname
    let svgHtml = ''
    
    if (currentPage.includes('market.html')) {
      // Fantasy Curved Divider for market
      svgHtml = `<div class="divider ornate">
        <svg viewBox="0 0 400 40" preserveAspectRatio="none">
          <path d="M10 20 
                   H140 
                   Q170 5 200 20 
                   Q230 35 260 20 
                   H390" />
          <circle cx="200" cy="20" r="2.5" />
        </svg>
      </div>`
    } else if (currentPage.includes('artisan_alley.html')) {
      // Winged Divider for artisan alley
      svgHtml = `<div class="divider winged">
        <svg viewBox="0 0 500 40" preserveAspectRatio="none">
          <path d="M20 20 
                   Q60 5 100 20 
                   T180 20 
                   H320 
                   Q360 5 400 20 
                   T480 20" />
          <circle cx="250" cy="20" r="3" />
        </svg>
      </div>`
    } else if (currentPage.includes('yourListings.html')) {
      // Layered Divider for your listings
      svgHtml = `<div class="divider layered">
        <svg viewBox="0 0 400 20" preserveAspectRatio="none">
          <path class="back" d="M0 10 H400" />
          <path class="front" d="M0 10 H400" />
        </svg>
      </div>`
    } else {
      // Minimal Elegant Divider for other pages
      svgHtml = `<div class="divider">
        <svg viewBox="0 0 400 20" preserveAspectRatio="none">
          <path d="M0 10 H160 Q200 10 240 10 H400" />
        </svg>
      </div>`
    }
    
    dividerContainer.innerHTML = svgHtml
    dividerContainer.style.display = 'block'
    el.style.display = 'none'
  } else {
    el.textContent = message
    el.className = `status-bar ${type}`
    el.style.display = 'block'
  }
}

/**
 * Profession emoji mapping
 * Generated from Project Gorgon recipes.json
 */
export const PROFESSION_EMOJI = {
  'Alchemy': '🧪',
  'AncillaryArmorAugmentBrewing': '🧪',
  'Angling': '🎣',
  'ArmorAugmentBrewing': '🧪',
  'ArmorPatching': '🛡️',
  'Armorsmithing': '🛡️',
  'Artistry': '🎨',
  'Blacksmithing': '🔨',
  'Bladesmithing': '⚔️',
  'Bowyery': '🏹',
  'Brewing': '🧪',
  'BuckleArtistry': '🎨',
  'Butchering': '🔪',
  'Calligraphy': '✏️',
  'CandleMaking': '🕯️',
  'Carpentry': '🪚',
  'Cheesemaking': '🧀',
  'Cooking': '🍳',
  'DyeMaking': '🎨',
  'FireMagic': '🔥',
  'FirstAid': '⚕️',
  'Fishing': '🎣',
  'Fletching': '🏹',
  'FlowerArrangement': '🌸',
  'Foraging': '🍃',
  'Gadgeteering': '⚙️',
  'Gardening': '🌱',
  'Geology': '🪨',
  'Glassblowing': '🔥',
  'Hoplology': '🛡️',
  'IceConjuration': '❄️',
  'IceMagic': '❄️',
  'JewelryAugmentBrewing': '🧪',
  'JewelryCrafting': '💎',
  'Leatherworking': '🥾',
  'Lore': '📚',
  'Meditation': '🧘',
  'MushroomFarming': '🍄',
  'Mycology': '🍄',
  'Necromancy': '💀',
  'NonfictionWriting': '📖',
  'Paleontology': '🦴',
  'Phrenology': '🧠',
  'Phrenology_Elves': '👰',
  'Phrenology_Fae': '🧚',
  'Phrenology_Giants': '👹',
  'Phrenology_Goblins': '👹',
  'Phrenology_Humans': '👤',
  'Phrenology_Orcs': '👹',
  'Phrenology_Rakshasa': '👹',
  'Race_Fae': '🧚',
  'Racing': '🏇',
  'Saddlery': '🐴',
  'ShamanicInfusion': '🪶',
  'SigilScripting': '✨',
  'Surveying': '🗺️',
  'SushiPreparation': '🍣',
  'Tailoring': '👗',
  'Tanning': '🥾',
  'Teleportation': '✨',
  'Textiles': '🧵',
  'Toolcrafting': '🔨',
  'Transmutation': '✨',
  'TreasureCartography': '🗺️',
  'Vampirism': '🦇',
  'WeaponAugmentBrewing': '🧪',
  'WeatherWitching': '⛈️',
  'Whittling': '🪚',
}

/**
 * Get all available professions in sorted order
 */
export function getProfessions() {
  return Object.keys(PROFESSION_EMOJI).sort()
}

/**
 * Format a Firestore timestamp to readable date
 */
export function formatDate(timestamp) {
  if (!timestamp) return '—'
  return new Date(timestamp.toMillis()).toLocaleDateString()
}

/**
 * Debounce function for performance
 */
export function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

/**
 * Show error message in modal form
 */
export function showModalError(elementId, message) {
  const el = document.getElementById(elementId)
  if (!el) return
  el.textContent = message
  el.style.display = 'block'
}

/**
 * Clear error message
 */
export function clearModalError(elementId) {
  const el = document.getElementById(elementId)
  if (!el) return
  el.textContent = ''
  el.style.display = 'none'
}

// Re-export scroll edge utilities from their dedicated module
export { generateRandomClipPath, generateDenseClipPath, getRandomNail, getNailPositionStyle, getRandomParchmentPosition, getCardDishevelStyle } from './scroll-edge.js'
