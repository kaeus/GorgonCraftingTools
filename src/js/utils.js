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

  el.textContent = message
  el.className = `status-bar ${type}`
  
  if (type === 'error' || type === 'ok') {
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
