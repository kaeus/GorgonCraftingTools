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
 */
export const PROFESSION_EMOJI = {
  'Weaponcrafting': '⚔️',
  'Armorsmithing': '🛡️',
  'Tailoring': '👗',
  'Carpentry': '🪚',
  'Jewelcrafting': '💎',
  'Alchemy': '🧪',
  'Cooking': '🍳',
  'Engraving': '✏️',
  'Scribing': '📜'
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
