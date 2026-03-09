/**
 * Listings Module
 * Handles loading, filtering, and rendering craft listings
 */

import { getFirestore } from './firebase.js'
import { escapeHtml, PROFESSION_EMOJI, setStatus } from './utils.js'

let allListingDocs = []
let marketItemsDatabase = null // Cache for CDN items

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

  grid.innerHTML = docs.map(doc => {
    const d = doc.data()
    const emoji = isMarketPage ? '📦' : (PROFESSION_EMOJI[d.profession] || '🔨')

    if (isMarketPage) {
      return `
        <div class="listing-item-card">
          <div class="item-name"><strong>${escapeHtml(d.itemName || 'Item')}</strong></div>
          <div class="item-details">${d.amount} available @ ${d.pricePerUnit} council each</div>
          ${d.server ? `<div class="server">🌐 <span class="card-label">Server</span>${escapeHtml(d.server)}</div>` : ''}
          <div class="card-footer">
            <a href="/order.html?id=${encodeURIComponent(doc.id)}" class="order-link">Place Order</a>
          </div>
        </div>
      `
    }

    // Crafter card (new design)
    const levelBadge = d.crafterLevel ? `<div class="profession-badge">${d.crafterLevel}</div>` : ''
    const levelRow = d.crafterLevel
      ? `<div class="stat-row"><span class="stat-label">Level</span><span class="stat-value level">${escapeHtml(String(d.crafterLevel))}</span></div>`
      : ''
    const hoursRow = d.pstAvailability
      ? `<div class="stat-row"><span class="stat-label">Availability</span><span class="stat-value">${escapeHtml(d.pstAvailability)}</span></div>`
      : ''
    const noteBlock = d.description ? `
      <div class="note-row">
        <div class="note-label">Note</div>
        <div class="tooltip-wrapper">
          <div class="note-text">${escapeHtml(d.description)}</div>
          <div class="tooltip-bubble">${escapeHtml(d.description)}</div>
        </div>
      </div>` : ''

    return `
      <div class="listing-crafting-card">
        <div class="card-header">
          <div class="profession-icon">
            ${emoji}
            ${levelBadge}
          </div>
          <div class="header-text">
            <div class="crafter-name">${escapeHtml(d.crafterName)}</div>
            <div class="profession-label">${escapeHtml(d.profession)}</div>
          </div>
        </div>
        <div class="card-body">
          ${levelRow}
          <div class="stat-row"><span class="stat-label">Commission</span><span class="stat-value commission">${formatCommission(d.commissionRate)}</span></div>
          ${hoursRow}
          ${noteBlock}
        </div>
        <div class="card-footer">
          ${d.server ? `<div class="server-tag">${escapeHtml(d.server)}</div>` : '<div></div>'}
          <a href="/order.html?id=${encodeURIComponent(doc.id)}" class="place-order-btn">Place Order</a>
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

/**
 * Load items database from CDN
 */
async function loadMarketItemsDatabase() {
  if (marketItemsDatabase) return marketItemsDatabase

  try {
    const response = await fetch('https://cdn.projectgorgon.com/v461/data/items.json')
    if (!response.ok) throw new Error('Failed to load items')
    const data = await response.json()

    // Handle various response structures
    if (Array.isArray(data)) {
      marketItemsDatabase = data
    } else if (data.items && Array.isArray(data.items)) {
      marketItemsDatabase = data.items
    } else if (data.data && Array.isArray(data.data)) {
      marketItemsDatabase = data.data
    } else {
      // If it's an object with string keys, convert to array
      const entries = Object.entries(data)
      if (entries.length > 0) {
        marketItemsDatabase = entries.map(([key, value]) => ({ key, ...value }))
      } else {
        console.error('Unexpected items database structure:', data)
        return []
      }
    }

    return marketItemsDatabase
  } catch (error) {
    console.error('Error loading item database:', error)
    return []
  }
}

/**
 * Initialize market item search
 */
export async function initMarketItemSearch() {
  const searchInput = document.getElementById('market-item-search')
  const suggestionsDiv = document.getElementById('item-search-suggestions')
  if (!searchInput || !suggestionsDiv) return

  // Load items database
  const items = await loadMarketItemsDatabase()
  if (!items || items.length === 0) {
    searchInput.placeholder = '✗ Failed to load items'
    return
  }

  let searchTimeout
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout)
    const query = e.target.value.toLowerCase().trim()

    if (query.length < 2) {
      suggestionsDiv.style.display = 'none'
      return
    }

    searchTimeout = setTimeout(() => {
      showMarketItemSuggestions(query, items)
    }, 100)
  })

  // Hide suggestions when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#item-search-wrapper')) {
      hideMarketItemSuggestions()
    }
  })

  // Show items when input is focused
  searchInput.addEventListener('focus', () => {
    if (searchInput.value.length >= 2) {
      showMarketItemSuggestions(searchInput.value.toLowerCase(), items)
    }
  })
}

/**
 * Show market item suggestions dropdown
 */
function showMarketItemSuggestions(searchTerm, items) {
  const suggestionsDiv = document.getElementById('item-search-suggestions')
  if (!suggestionsDiv) return

  const term = searchTerm.toLowerCase().trim()
  const filtered = items.filter(item =>
    item.Name && item.Name.toLowerCase().includes(term)
  ).slice(0, 20)

  if (filtered.length === 0) {
    suggestionsDiv.innerHTML = '<div style="padding:0.75rem; color:#a8a8a8;">No items found</div>'
  } else {
    suggestionsDiv.innerHTML = filtered.map(item => {
      const iconHtml = item.IconId
        ? `<img src="https://cdn.projectgorgon.com/v461/icons/icon_${item.IconId}.png" alt="${escapeHtml(item.Name)}" style="width:32px; height:32px; margin-right:0.5rem; vertical-align:middle; border:1px solid #505050; border-radius:3px;" onerror="this.style.opacity='0.3'">`
        : ''
      return `
        <div class="market-item-suggestion" data-item-name="${escapeHtml(item.Name)}" style="
          padding: 0.75rem;
          border-bottom: 1px solid #505050;
          cursor: pointer;
          transition: background 0.2s;
          display: flex;
          align-items: center;
        " onmouseover="this.style.background='#1a1a1a'" onmouseout="this.style.background='transparent'">
          ${iconHtml}
          <div style="font-weight:bold;">${escapeHtml(item.Name)}</div>
        </div>
      `
    }).join('')

    // Add click listeners to suggestions
    suggestionsDiv.querySelectorAll('.market-item-suggestion').forEach(el => {
      el.addEventListener('click', () => {
        selectMarketItem(el.dataset.itemName)
      })
    })
  }

  suggestionsDiv.style.display = 'block'
}

/**
 * Hide market item suggestions dropdown
 */
function hideMarketItemSuggestions() {
  const suggestionsDiv = document.getElementById('item-search-suggestions')
  if (suggestionsDiv) {
    suggestionsDiv.style.display = 'none'
  }
}

/**
 * Select a market item and filter listings
 */
function selectMarketItem(itemName) {
  const searchInput = document.getElementById('market-item-search')
  if (searchInput) {
    searchInput.value = itemName
  }
  hideMarketItemSuggestions()

  // Filter and render listings for selected item
  const filtered = allListingDocs.filter(doc =>
    doc.data().itemName === itemName
  )
  renderListings(filtered)
}

/**
 * Clear market item search and show all listings
 */
export function clearMarketItemSearch() {
  const searchInput = document.getElementById('market-item-search')
  if (searchInput) {
    searchInput.value = ''
  }
  hideMarketItemSuggestions()
  renderListings(allListingDocs)
}

