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
 * Load all listings (including inactive ones) for admin view
 */
export async function loadAllListings() {
  const db = getFirestore()
  if (!db) {
    console.error('Firestore not initialized')
    return
  }

  try {
    setStatus('status', 'Loading all listings…', 'loading')
    
    // Load ALL listings without filtering by active status
    const snap = await db.collection('listings').get()

    // Sort by createdAt descending
    allListingDocs = snap.docs.sort((a, b) => {
      const timeA = a.data().createdAt?.toMillis?.() || 0
      const timeB = b.data().createdAt?.toMillis?.() || 0
      return timeB - timeA
    })

    applyAdminFilter()
    setStatus('status', '', 'ok')
  } catch (error) {
    console.error('Error loading listings:', error)
    setStatus('status', 'Error loading listings', 'error')
  }
}

/**
 * Filter admin listings by status (active, inactive, or all)
 */
export function applyAdminFilter() {
  const statusFilter = document.getElementById('status-filter')
  if (!statusFilter) return

  const status = statusFilter.value
  
  let filtered = allListingDocs
  if (status === 'active') {
    filtered = allListingDocs.filter(doc => doc.data().active === true)
  } else if (status === 'inactive') {
    filtered = allListingDocs.filter(doc => doc.data().active !== true)
  }

  renderAdminListings(filtered)
}

/**
 * Render listings in admin table format
 */
export function renderAdminListings(docs) {
  const tableWrap = document.getElementById('table-wrap')
  if (!tableWrap) return

  if (docs.length === 0) {
    tableWrap.innerHTML = '<div class="empty-state">No listings found</div>'
    return
  }

  tableWrap.innerHTML = `
    <table class="listings-table">
      <thead>
        <tr>
          <th>Crafter</th>
          <th>Profession</th>
          <th>Server</th>
          <th>Availability</th>
          <th>Rate</th>
          <th>Status</th>
          <th>Created</th>
        </tr>
      </thead>
      <tbody>
        ${docs.map(doc => {
          const d = doc.data()
          const status = d.active ? 'Active' : 'Inactive'
          const emoji = PROFESSION_EMOJI[d.profession] || '🔨'
          const createdDate = d.createdAt?.toDate?.()?.toLocaleDateString?.() || 'N/A'
          return `
            <tr>
              <td>${escapeHtml(d.crafterName)}</td>
              <td>${emoji} ${escapeHtml(d.profession)}</td>
              <td>${escapeHtml(d.server || 'N/A')}</td>
              <td>${escapeHtml(d.pstAvailability || 'N/A')}</td>
              <td>${escapeHtml(d.commissionRate)}</td>
              <td><span class="status-${status.toLowerCase()}">${status}</span></td>
              <td>${createdDate}</td>
            </tr>
          `
        }).join('')}
      </tbody>
    </table>
  `
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
 * Load user's own listings for crafting interface
 */
export async function loadUserListings(uid) {
  const db = getFirestore()
  if (!db) {
    console.error('Firestore not initialized')
    return
  }

  try {
    setStatus('status', 'Loading your listings…', 'loading')
    
    // Load user's listings
    const snap = await db.collection('listings').where('createdBy', '==', uid).get()

    allListingDocs = snap.docs.sort((a, b) => {
      const timeA = a.data().createdAt?.toMillis?.() || 0
      const timeB = b.data().createdAt?.toMillis?.() || 0
      return timeB - timeA
    })

    renderCraftingInterface(allListingDocs)
    setStatus('status', '', 'ok')
  } catch (error) {
    console.error('Error loading user listings:', error)
    setStatus('status', 'Error loading your listings', 'error')
  }
}

/**
 * Render crafting interface with user's listings
 */
export function renderCraftingInterface(docs) {
  const craftingArea = document.getElementById('crafting-area')
  if (!craftingArea) return

  // Show the crafting area
  craftingArea.style.display = 'block'

  // Create form for new listing
  const newListingForm = `
    <div class="section-header">
      <h2>Create New Listing</h2>
    </div>
    <form id="new-listing-form" style="margin-bottom:2rem; padding:1rem; background:#0a0a0a; border-radius:5px; border:1px solid #505050;">
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:1rem;">
        <div>
          <label for="listing-name">Your Crafter Name *</label>
          <input type="text" id="listing-name" placeholder="e.g., Silkweaver" required style="width:100%; padding:0.75rem; border:1px solid #505050; border-radius:5px; background:#0a0a0a; color:#e8e8e8; font-family:inherit;">
        </div>
        <div>
          <label for="listing-profession">Profession *</label>
          <select id="listing-profession" required style="width:100%; padding:0.75rem; border:1px solid #505050; border-radius:5px; background:#0a0a0a; color:#e8e8e8; font-family:inherit;">
            <option value="">— Select profession —</option>
            <option>Alchemy</option>
            <option>Blacksmithing</option>
            <option>Carpentry</option>
            <option>Dye Making</option>
            <option>Dyer</option>
            <option>Fletching</option>
            <option>Gem Cutting</option>
            <option>Tailoring</option>
            <option>Tinkering</option>
            <option>Treasure Hunting</option>
            <option>Weaving</option>
          </select>
        </div>
      </div>
      
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:1rem;">
        <div>
          <label for="listing-server">Server *</label>
          <select id="listing-server" required style="width:100%; padding:0.75rem; border:1px solid #505050; border-radius:5px; background:#0a0a0a; color:#e8e8e8; font-family:inherit;">
            <option value="">— Select server —</option>
            <option>Arisetsu</option>
            <option>Dreva</option>
            <option>Laeth</option>
            <option>Miraverre</option>
            <option>Strekios</option>
          </select>
        </div>
        <div>
          <label for="listing-level">Crafting Level</label>
          <input type="number" id="listing-level" placeholder="e.g., 85" min="1" max="100" style="width:100%; padding:0.75rem; border:1px solid #505050; border-radius:5px; background:#0a0a0a; color:#e8e8e8; font-family:inherit;">
        </div>
      </div>
      
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:1rem;">
        <div>
          <label for="listing-commission">Commission Rate *</label>
          <input type="text" id="listing-commission" placeholder="e.g., 50%" required style="width:100%; padding:0.75rem; border:1px solid #505050; border-radius:5px; background:#0a0a0a; color:#e8e8e8; font-family:inherit;">
        </div>
        <div>
          <label for="listing-pst">Availability (PST)</label>
          <input type="text" id="listing-pst" placeholder="e.g., Mon-Fri 6-10pm" style="width:100%; padding:0.75rem; border:1px solid #505050; border-radius:5px; background:#0a0a0a; color:#e8e8e8; font-family:inherit;">
        </div>
      </div>
      
      <div style="margin-bottom:1rem;">
        <label for="listing-description">Description</label>
        <textarea id="listing-description" placeholder="Tell crafters about what you offer..." style="width:100%; padding:0.75rem; border:1px solid #505050; border-radius:5px; background:#0a0a0a; color:#e8e8e8; min-height:80px; font-family:inherit;"></textarea>
      </div>
      
      <button type="submit" class="action-btn" style="width:100%;">Create Listing</button>
    </form>
  `

  // Create table of existing listings
  const listingsTable = docs.length > 0 ? `
    <div class="section-header">
      <h2>Your Listings</h2>
    </div>
    <div id="listings-table-wrap">
      <table class="listings-table" style="width:100%; border-collapse:collapse;">
        <thead>
          <tr style="border-bottom:2px solid #505050;">
            <th style="text-align:left; padding:0.75rem;">Profession</th>
            <th style="text-align:left; padding:0.75rem;">Server</th>
            <th style="text-align:left; padding:0.75rem;">Commission</th>
            <th style="text-align:left; padding:0.75rem;">Status</th>
            <th style="text-align:left; padding:0.75rem;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${docs.map(doc => {
            const d = doc.data()
            const status = d.active ? '✓ Active' : '✗ Inactive'
            const emoji = PROFESSION_EMOJI[d.profession] || '🔨'
            return `
              <tr style="border-bottom:1px solid #505050;">
                <td style="padding:0.75rem;">${emoji} ${escapeHtml(d.profession)}</td>
                <td style="padding:0.75rem;">${escapeHtml(d.server || '—')}</td>
                <td style="padding:0.75rem;">${escapeHtml(d.commissionRate)}</td>
                <td style="padding:0.75rem;">${status}</td>
                <td style="padding:0.75rem;">
                  <button data-action="edit-listing" data-listing-id="${doc.id}" class="action-btn" style="padding:0.5rem 1rem; margin-right:0.5rem;">Edit</button>
                  <button data-action="delete-listing" data-listing-id="${doc.id}" class="cancel-btn" style="padding:0.5rem 1rem;">Delete</button>
                </td>
              </tr>
            `
          }).join('')}
        </tbody>
      </table>
    </div>
  ` : ''

  craftingArea.innerHTML = newListingForm + listingsTable
}

/**
 * Save a listing (new or existing)
 */
export async function saveListing(listingData, listingId = null) {
  const db = getFirestore()
  if (!db) {
    console.error('Firestore not initialized')
    return false
  }

  try {
    const timestamp = new Date()
    const data = {
      crafterName: listingData.crafterName,
      profession: listingData.profession,
      server: listingData.server,
      crafterLevel: listingData.crafterLevel || null,
      commissionRate: listingData.commissionRate,
      pstAvailability: listingData.pstAvailability || null,
      description: listingData.description || null,
      active: true,
      updatedAt: timestamp
    }

    if (listingId) {
      // Update existing listing
      await db.collection('listings').doc(listingId).update(data)
      console.log('Listing updated:', listingId)
    } else {
      // Create new listing
      data.createdAt = timestamp
      // createdBy should be set by the caller
      const docRef = await db.collection('listings').add(data)
      console.log('Listing created:', docRef.id)
    }
    return true
  } catch (error) {
    console.error('Error saving listing:', error)
    return false
  }
}

/**
 * Delete a listing
 */
export async function deleteListing(listingId) {
  const db = getFirestore()
  if (!db) {
    console.error('Firestore not initialized')
    return false
  }

  try {
    await db.collection('listings').doc(listingId).delete()
    console.log('Listing deleted:', listingId)
    return true
  } catch (error) {
    console.error('Error deleting listing:', error)
    return false
  }
}
