/**
 * Listings Module
 * Handles loading, filtering, and rendering craft listings
 */

import { getFirestore } from './firebase.js'
import { escapeHtml, PROFESSION_EMOJI, setStatus } from './utils.js'

let allListingDocs = []

function formatCommission(value) {
  if (!value) return '—'
  const num = parseFloat(String(value).replace('%', ''))
  if (isNaN(num)) return escapeHtml(value)
  return `${num}%`
}

/**
 * Load all listings from Firestore
 */
export async function loadListings() {
  const db = getFirestore()
  if (!db) {
    console.error('Firestore not initialized')
    return
  }

  try {
    setStatus('status', 'Loading listings…', 'loading')
    
    // Load all listings and filter/sort in JavaScript to avoid needing Firestore indexes
    const snap = await db.collection('listings').get()

    // Determine which type of listings to show based on current page
    const isMarketPage = window.location.pathname.includes('market.html')
    const requiredType = isMarketPage ? 'item' : 'crafting'

    // Filter for active listings of the correct type and sort by createdAt descending
    allListingDocs = snap.docs
      .filter(doc => {
        const data = doc.data()
        // Show listings that:
        // 1. Are active
        // 2. Match the required type (or have no type field for backward compatibility with crafting)
        return data.active === true && (data.type === requiredType || (!data.type && requiredType === 'crafting'))
      })
      .sort((a, b) => {
        const timeA = a.data().createdAt?.toMillis?.() || 0
        const timeB = b.data().createdAt?.toMillis?.() || 0
        return timeB - timeA
      })

    restoreServerFilter()
    applyFilter()
    setStatus('status', '', 'ok')
  } catch (error) {
    console.error('Error loading listings:', error)
    setStatus('status', 'Error loading listings', 'error')
  }
}

/**
 * Filter listings by server
 */
export function applyFilter() {
  const serverFilter = document.getElementById('server-filter')
  if (!serverFilter) return

  const server = serverFilter.value
  localStorage.setItem('preferred-server', server)

  const filtered = server
    ? allListingDocs.filter(doc => doc.data().server === server)
    : allListingDocs

  renderListings(filtered)
}

/**
 * Restore saved server filter preference
 */
function restoreServerFilter() {
  const saved = localStorage.getItem('preferred-server')
  if (!saved) return
  const serverFilter = document.getElementById('server-filter')
  if (!serverFilter) return
  serverFilter.value = saved
}

/**
 * Render listings to the grid
 */
export function renderListings(docs) {
  const grid = document.getElementById('listings-grid')
  if (!grid) return

  if (docs.length === 0) {
    grid.innerHTML = '<div class="empty-state">No listings found</div>'
    return
  }

  // Determine which card type to render based on current page
  const isMarketPage = window.location.pathname.includes('market.html')
  const cardClass = isMarketPage ? 'listing-item-card' : 'listing-crafting-card'

  grid.innerHTML = docs.map(doc => {
    const d = doc.data()
    const emoji = isMarketPage ? '📦' : (PROFESSION_EMOJI[d.profession] || '🔨')
    const serverLine = d.server ? `<div class="server">🌐 <span class="card-label">Server</span>${escapeHtml(d.server)}</div>` : ''
    const pstLine = d.pstAvailability ? `<div class="pst">🕒 <span class="card-label">Hours</span>${escapeHtml(d.pstAvailability)}</div>` : ''
    const levelLine = !isMarketPage && d.crafterLevel ? ` - Lvl ${d.crafterLevel}` : ''
    const descLine = d.description
      ? `<div class="description">${escapeHtml(d.description.length > 100 ? d.description.substring(0, 100) + '...' : d.description)}</div>`
      : ''

    // For market page, show item name; for artisan alley, show profession
    const titleLine = isMarketPage
      ? `<div class="item-name"><strong>${escapeHtml(d.itemName || 'Item')}</strong></div>`
      : `<div class="profession">${emoji} ${escapeHtml(d.profession)}</div>`

    // For market page, show quantity and price per unit; for artisan alley, show crafter info
    const detailsLine = isMarketPage
      ? `<div class="item-details">${d.amount} available @ ${d.pricePerUnit} council each</div>`
      : `<div class="crafter-name">${escapeHtml(d.crafterName)}${levelLine}</div><div class="commission"><span class="card-label">Commission</span>${formatCommission(d.commissionRate)}</div>`

    return `
      <div class="${cardClass}">
        ${titleLine}
        ${detailsLine}
        ${serverLine}
        ${pstLine}
        ${descLine}
        <div class="card-footer">
          <a href="/order.html?id=${encodeURIComponent(doc.id)}" class="order-link">Place Order</a>
        </div>
      </div>
    `
  }).join('')
}

/**
 * Search listings (if needed)
 */
export function searchListings(query) {
  const lowerQuery = query.toLowerCase()
  const filtered = allListingDocs.filter(doc => {
    const d = doc.data()
    return d.crafterName.toLowerCase().includes(lowerQuery) ||
           d.profession.toLowerCase().includes(lowerQuery) ||
           (d.description && d.description.toLowerCase().includes(lowerQuery))
  })
  renderListings(filtered)
}

/**
 * Get a single listing by ID
 */
export async function getListingById(listingId) {
  const db = getFirestore()
  if (!db) return null

  try {
    const doc = await db.collection('listings').doc(listingId).get()
    return doc.exists ? { id: doc.id, ...doc.data() } : null
  } catch (error) {
    console.error('Error fetching listing:', error)
    return null
  }
}
