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
    
    // Load meta-category mapping for metacategory filter
    metaCategoryMapping = await loadMetaCategoryMapping()
    
    // Load market items database for keyword matching
    await loadMarketItemsDatabase()
    
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
 * Filter listings by server, keyword search, and/or metacategory
 */
export function applyFilter() {
  const serverFilter = document.getElementById('server-filter')
  const keywordSearch = document.getElementById('keyword-search')
  const metaCategorySelect = document.getElementById('metacategory-filter')
  
  let filtered = [...allListingDocs]

  // Apply server filter
  if (serverFilter && serverFilter.value) {
    const server = serverFilter.value
    localStorage.setItem('preferred-server', server)
    filtered = filtered.filter(doc => doc.data().server === server)
  }

  // Apply keyword search filter if set
  if (keywordSearch && keywordSearch.value.trim()) {
    const searchKeyword = keywordSearch.value.trim()
    filtered = filtered.filter(doc => {
      const itemName = doc.data().itemName || ''
      const item = findItemInDatabase(itemName)
      if (!item || !item.Keywords || !Array.isArray(item.Keywords)) {
        return false
      }
      return item.Keywords.some(itemKeyword => 
        itemKeyword.toLowerCase().includes(searchKeyword.toLowerCase())
      )
    })
  }

  // Apply metacategory filter if set
  if (metaCategorySelect && metaCategorySelect.value) {
    const metacategory = metaCategorySelect.value
    
    if (metaCategoryMapping && metaCategoryMapping.meta_categories) {
      const categoryData = metaCategoryMapping.meta_categories[metacategory]
      if (categoryData && categoryData.keywords && Array.isArray(categoryData.keywords)) {
        const relevantKeywords = new Set(categoryData.keywords)
        
        filtered = filtered.filter(doc => {
          const itemName = doc.data().itemName || ''
          const item = findItemInDatabase(itemName)
          if (!item || !item.Keywords || !Array.isArray(item.Keywords)) {
            return false
          }
          return item.Keywords.some(itemKeyword => relevantKeywords.has(itemKeyword))
        })
      }
    }
  }

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
 * Load items database from CDN
 */
export async function loadMarketItemsDatabase() {
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
 * Find an item by name in the market database
 */
function findItemInDatabase(itemName) {
  if (!marketItemsDatabase || marketItemsDatabase.length === 0) {
    return null
  }

  const nameLower = itemName.toLowerCase()
  return marketItemsDatabase.find(item => 
    item.Name && item.Name.toLowerCase() === nameLower
  )
}

/**
 * Find the matching keyword for an item using its actual keywords
 */
function findMatchingKeyword(itemName) {
  if (!metaCategoryMapping || !metaCategoryMapping.meta_categories) {
    return null
  }

  // Try to find the item in the database and use its keywords
  const item = findItemInDatabase(itemName)
  if (item && item.Keywords && Array.isArray(item.Keywords)) {
    // Check each of the item's keywords against the meta-categories
    for (const itemKeyword of item.Keywords) {
      for (const categoryData of Object.values(metaCategoryMapping.meta_categories)) {
        if (categoryData.keywords && Array.isArray(categoryData.keywords)) {
          if (categoryData.keywords.includes(itemKeyword)) {
            return itemKeyword
          }
        }
      }
    }
  }

  // Fallback: if no exact keyword match found, return null (don't fuzzy match)
  return null
}

/**
 * Build collapsible keywords HTML for market item card
 */
function buildKeywordsCollapsible(itemName, searchKeyword, selectedMetacategory) {
  const item = findItemInDatabase(itemName)
  
  if (!item || !item.Keywords || !Array.isArray(item.Keywords) || item.Keywords.length === 0) {
    return ''
  }

  const allKeywords = item.Keywords
  const keywordCount = allKeywords.length
  
  // Find which keyword matches the search or metacategory (search takes priority)
  let matchedKeyword = null
  if (searchKeyword && searchKeyword.trim()) {
    const lowerSearch = searchKeyword.toLowerCase()
    matchedKeyword = allKeywords.find(kw => 
      kw.toLowerCase().includes(lowerSearch)
    )
  } else if (selectedMetacategory && metaCategoryMapping && metaCategoryMapping.meta_categories) {
    const categoryData = metaCategoryMapping.meta_categories[selectedMetacategory]
    if (categoryData && categoryData.keywords) {
      const categoryKeywords = new Set(categoryData.keywords)
      matchedKeyword = allKeywords.find(kw => categoryKeywords.has(kw))
    }
  }

  const keywordsList = allKeywords.map(kw => {
    const isMatched = kw === matchedKeyword
    return `<div style="padding: 0.25rem 0; ${isMatched ? 'font-weight: bold;' : ''}">${escapeHtml(kw)}</div>`
  }).join('')

  return `
    <details class="item-keywords-collapsible" style="margin-top: 0.5rem;">
      <summary style="color: #a8a8a8; font-size: 0.85rem; cursor: pointer; user-select: none;">
        tags (${keywordCount})
      </summary>
      <div style="padding: 0.5rem 0.5rem 0 0.5rem; font-size: 0.8rem; color: #a8a8a8; border-left: 2px solid #505050; margin-left: 0.25rem; padding-left: 0.5rem;">
        ${keywordsList}
      </div>
    </details>
  `
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

  // Get currently active filters
  const keywordSearch = document.getElementById('keyword-search')
  const metaCategorySelect = document.getElementById('metacategory-filter')
  const searchKeyword = keywordSearch ? keywordSearch.value : null
  const selectedMetacategory = metaCategorySelect ? metaCategorySelect.value : null

  grid.innerHTML = docs.map(doc => {
    const d = doc.data()
    const emoji = isMarketPage ? '📦' : (PROFESSION_EMOJI[d.profession] || '🔨')

    if (isMarketPage) {
      const keywordDisplay = buildKeywordsCollapsible(d.itemName, searchKeyword, selectedMetacategory)
      
      return `
        <div class="listing-item-card">
          <div class="item-name"><strong>${escapeHtml(d.itemName || 'Item')}</strong></div>
          ${keywordDisplay}
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

let metaCategoryMapping = null

/**
 * Load meta-category mapping from JSON
 */
async function loadMetaCategoryMapping() {
  if (metaCategoryMapping) return metaCategoryMapping

  try {
    const response = await fetch('/keywords_meta_category_mapping.json')
    if (!response.ok) {
      console.warn('Using fallback meta-category mapping')
      return getDefaultMetaCategoryMapping()
    }
    metaCategoryMapping = await response.json()
    return metaCategoryMapping
  } catch (error) {
    console.warn('Failed to load meta-category mapping, using fallback:', error)
    return getDefaultMetaCategoryMapping()
  }
}

/**
 * Get default meta-category mapping
 */
function getDefaultMetaCategoryMapping() {
  return {
    "meta_categories": {
      "Textbooks & Educational Materials": { "description": "Knowledge items, textbooks, learning materials", "keywords": [] },
      "Recipes & Crafting Skills": { "description": "Recipes, crafting instructions", "keywords": [] },
      "Armor Sets by Type": { "description": "Full armor categories by material", "keywords": [] },
      "Armor Pieces by Location": { "description": "Body-specific armor pieces", "keywords": [] },
      "Melee Weapons": { "description": "Swords, daggers, hammers, staffs", "keywords": [] },
      "Ranged Weapons & Projectiles": { "description": "Bows, crossbows, arrows, ammunition", "keywords": [] },
      "Food & Cooking Ingredients": { "description": "Fish, meat, vegetables, cooking components", "keywords": [] },
      "Potions, Drinks & Beverages": { "description": "Potions, poisons, drinks, alcohol", "keywords": [] },
      "Jewelry & Adornments": { "description": "Amulets, rings, necklaces", "keywords": [] },
      "Crafting Materials & Gems": { "description": "Ores, crystals, gems, raw components", "keywords": [] },
      "Books, Scrolls & Documents": { "description": "Books, documents, scrolls, writing", "keywords": [] },
      "Furniture & Containers": { "description": "Chests, chairs, benches, household items", "keywords": [] },
      "Tools & Specialized Equipment": { "description": "First aid kits, chemistry equipment", "keywords": [] },
      "Wearable Gear & Accessories": { "description": "Belts, clothing, saddles, personal gear", "keywords": [] },
      "Treasure, Loot & Quest Items": { "description": "MacGuffins, maps, trophies, valuables", "keywords": [] },
      "Currency & Trade Items": { "description": "Money, coins, trade goods", "keywords": [] },
      "Shields & Protective Gear": { "description": "Shields and shield-like items", "keywords": [] },
      "Racial & Cultural Items": { "description": "Race-specific equipment, cultural artifacts", "keywords": [] },
      "System Tags & Metadata": { "description": "Internal tags, lint warnings, system annotations", "keywords": [] }
    }
  }
}

/**
 * Initialize category filters
 */
export async function initCategoryFilters() {
  const metaCategorySelect = document.getElementById('metacategory-filter')
  if (!metaCategorySelect) return

  const mapping = await loadMetaCategoryMapping()
  if (!mapping || !mapping.meta_categories) return

  const metaCategories = Object.keys(mapping.meta_categories)

  // Populate metacategory dropdown
  metaCategories.forEach(category => {
    const option = document.createElement('option')
    option.value = category
    option.textContent = category
    metaCategorySelect.appendChild(option)
  })

  // Handle metacategory change - apply filter immediately
  metaCategorySelect.addEventListener('change', () => {
    applyFilter()
  })
}

/**
 * Initialize keyword search
 */
export async function initKeywordSearch() {
  const searchInput = document.getElementById('keyword-search')
  const suggestionsDiv = document.getElementById('keyword-search-suggestions')
  if (!searchInput || !suggestionsDiv) return

  // Load items database to get all unique keywords
  const items = await loadMarketItemsDatabase()
  if (!items || items.length === 0) {
    searchInput.placeholder = '✗ Failed to load keywords'
    return
  }

  // Extract all unique keywords from items
  const allKeywords = new Set()
  items.forEach(item => {
    if (item.Keywords && Array.isArray(item.Keywords)) {
      item.Keywords.forEach(kw => allKeywords.add(kw))
    }
  })
  const keywordsList = Array.from(allKeywords).sort()

  let searchTimeout
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout)
    const query = e.target.value.toLowerCase().trim()

    if (query.length === 0) {
      suggestionsDiv.style.display = 'none'
      applyFilter()
      return
    }

    searchTimeout = setTimeout(() => {
      showKeywordSuggestions(query, keywordsList, suggestionsDiv)
      applyFilter()
    }, 100)
  })

  // Hide suggestions when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#keyword-search-wrapper')) {
      hideKeywordSuggestions()
    }
  })

  // Show keywords when input is focused
  searchInput.addEventListener('focus', () => {
    if (searchInput.value.length > 0) {
      showKeywordSuggestions(searchInput.value.toLowerCase(), keywordsList, suggestionsDiv)
    }
  })
}

/**
 * Show keyword suggestions dropdown
 */
function showKeywordSuggestions(searchTerm, keywordsList, suggestionsDiv) {
  const term = searchTerm.toLowerCase().trim()
  const filtered = keywordsList.filter(keyword =>
    keyword.toLowerCase().includes(term)
  ).slice(0, 20)

  if (filtered.length === 0) {
    suggestionsDiv.innerHTML = '<div style="padding:0.75rem; color:#a8a8a8;">No keywords found</div>'
  } else {
    suggestionsDiv.innerHTML = filtered.map(keyword => {
      return `
        <div class="keyword-suggestion" data-keyword="${escapeHtml(keyword)}" style="
          padding: 0.75rem;
          border-bottom: 1px solid #505050;
          cursor: pointer;
          transition: background 0.2s;
        " onmouseover="this.style.background='#1a1a1a'" onmouseout="this.style.background='transparent'">
          <div style="font-weight:bold;">${escapeHtml(keyword)}</div>
        </div>
      `
    }).join('')

    // Add click listeners to suggestions
    suggestionsDiv.querySelectorAll('.keyword-suggestion').forEach(el => {
      el.addEventListener('click', () => {
        selectKeyword(el.dataset.keyword)
      })
    })
  }

  suggestionsDiv.style.display = 'block'
}

/**
 * Hide keyword suggestions dropdown
 */
function hideKeywordSuggestions() {
  const suggestionsDiv = document.getElementById('keyword-search-suggestions')
  if (suggestionsDiv) {
    suggestionsDiv.style.display = 'none'
  }
}

/**
 * Select a keyword and filter listings
 */
function selectKeyword(keyword) {
  const searchInput = document.getElementById('keyword-search')
  if (searchInput) {
    searchInput.value = keyword
  }
  hideKeywordSuggestions()
  applyFilter()
}

/**
 * Clear keyword search and show all listings
 */
export function clearKeywordSearch() {
  const searchInput = document.getElementById('keyword-search')
  if (searchInput) {
    searchInput.value = ''
  }
  hideKeywordSuggestions()
  applyFilter()
}

