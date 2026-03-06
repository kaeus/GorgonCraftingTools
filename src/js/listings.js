/**
 * Listings Module
 * Handles loading, filtering, and rendering craft listings
 */

import { getFirestore } from './firebase.js'
import { escapeHtml, PROFESSION_EMOJI, setStatus } from './utils.js'

let allListingDocs = []

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

    // Filter for active listings and sort by createdAt descending
    allListingDocs = snap.docs
      .filter(doc => doc.data().active === true)
      .sort((a, b) => {
        const timeA = a.data().createdAt?.toMillis?.() || 0
        const timeB = b.data().createdAt?.toMillis?.() || 0
        return timeB - timeA
      })

    renderListings(allListingDocs)
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
  
  const filtered = server
    ? allListingDocs.filter(doc => doc.data().server === server)
    : allListingDocs

  renderListings(filtered)
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

  grid.innerHTML = docs.map(doc => {
    const d = doc.data()
    const emoji = PROFESSION_EMOJI[d.profession] || '🔨'
    const serverLine = d.server ? `<div class="server">🌐 ${escapeHtml(d.server)}</div>` : ''
    const pstLine = d.pstAvailability ? `<div class="pst">🕒 ${escapeHtml(d.pstAvailability)}</div>` : ''
    const levelLine = d.crafterLevel ? ` - Lvl ${d.crafterLevel}` : ''
    const descLine = d.description 
      ? `<div class="description">${escapeHtml(d.description.length > 100 ? d.description.substring(0, 100) + '...' : d.description)}</div>` 
      : ''

    return `
      <div class="listing-card">
        <div class="profession">${emoji} ${escapeHtml(d.profession)}</div>
        <div class="crafter-name">${escapeHtml(d.crafterName)}${levelLine}</div>
        <div class="commission">${escapeHtml(d.commissionRate)}</div>
        ${serverLine}
        ${pstLine}
        ${descLine}
        <div class="card-footer">
          <a href="order.html?id=${encodeURIComponent(doc.id)}" class="order-link">Place Order</a>
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
