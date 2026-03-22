/**
 * Item Fence Page Module
 * Handles the item listing form for fencing items
 */

import * as Firebase from './firebase.js'
import * as Auth from './auth.js'
import { escapeHtml, setStatus } from './utils.js'

let itemsWithIcons = null
let selectedItemId = null

/**
 * Initialize the fence item page
 */
export function initItemFencePage() {
  console.log('[ItemFence] Initializing item fence page...')
  
  // Set up auth state listener
  Firebase.onAuthStateChanged(user => {
    console.log('[ItemFence] Auth state changed, user:', user ? user.email : 'none')
    Auth.renderUserAuth(user)
    
    // Hide loading overlay when done
    setTimeout(() => {
      const overlay = document.getElementById('global-loading-overlay')
      if (overlay) overlay.style.display = 'none'
      document.body.style.visibility = 'visible'
    }, 200)
  })

  // Set up form listeners
  setupFormListeners()
}

/**
 * Set up event listeners for the form
 */
function setupFormListeners() {
  const form = document.getElementById('item-listing-form')
  const searchInput = document.getElementById('item-search')
  const charNameInput = document.getElementById('item-character-name')
  const serverInput = document.getElementById('item-server')
  const amountInput = document.getElementById('item-amount')
  const priceInput = document.getElementById('item-price')
  const submitBtn = document.getElementById('item-submit-btn')

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      await saveItemListing()
    })
  }

  if (searchInput) {
    searchInput.addEventListener('input', async (e) => {
      await handleItemSearch(e.target.value)
    })
    
    searchInput.addEventListener('focus', async (e) => {
      if (e.target.value.length >= 2) {
        await handleItemSearch(e.target.value)
      }
    })
  }

  // Update button state on input changes
  const inputs = [charNameInput, serverInput, amountInput, priceInput, searchInput]
  inputs.forEach(input => {
    if (input) {
      input.addEventListener('input', validateForm)
      input.addEventListener('change', validateForm)
    }
  })

  // Close search results when clicking outside
  document.addEventListener('click', (e) => {
    const searchResults = document.getElementById('item-search-results')
    if (searchResults && !e.target.closest('#item-search') && !e.target.closest('#item-search-results')) {
      searchResults.style.display = 'none'
    }
  })
}

/**
 * Handle item search
 */
async function handleItemSearch(query) {
  const resultsDiv = document.getElementById('item-search-results')
  
  if (!query || query.length < 2) {
    resultsDiv.style.display = 'none'
    return
  }

  // Load items if not already loaded
  if (!itemsWithIcons) {
    const statusEl = document.getElementById('item-search-status')
    statusEl.textContent = 'Loading items...'
    statusEl.style.display = 'block'
    
    try {
      itemsWithIcons = await loadItemsWithIcons()
    } catch (err) {
      console.error('Error loading items:', err)
      statusEl.textContent = 'Error loading items'
      return
    }
  }

  // Filter items
  const lowerQuery = query.toLowerCase()
  const matches = Object.entries(itemsWithIcons)
    .filter(([key, item]) => item.name.toLowerCase().includes(lowerQuery))
    .slice(0, 10) // Limit to 10 results

  // Display results
  resultsDiv.innerHTML = matches
    .map(([key, item]) => `
      <div onclick="window.selectItem('${key}', ${escapeHtml(JSON.stringify(item.name))})" style="padding: 0.5rem 0.75rem; cursor: pointer; border-bottom: 1px solid #d4c5b0; display: flex; align-items: center; gap: 0.5rem;">
        <img src="${item.iconUrl || ''}" style="width: 24px; height: 24px; object-fit: contain;" alt="">
        <span>${escapeHtml(item.name)}</span>
      </div>
    `)
    .join('')

  resultsDiv.style.display = matches.length > 0 ? 'block' : 'none'
  
  const statusEl = document.getElementById('item-search-status')
  if (matches.length === 0 && query.length >= 2) {
    statusEl.textContent = 'No items found'
    statusEl.style.display = 'block'
  } else {
    statusEl.style.display = 'none'
  }
}

/**
 * Load items from CDN
 */
async function loadItemsWithIcons() {
  try {
    const response = await fetch('https://cdn.projectgorgon.com/v461/data/items.json')
    if (!response.ok) throw new Error('Failed to fetch items')
    
    const itemsData = await response.json()
    const itemsMap = {}

    Object.entries(itemsData).forEach(([key, item]) => {
      if (item && item.Name) {
        itemsMap[key] = {
          name: item.Name,
          iconUrl: item.IconId ? `https://cdn.projectgorgon.com/v461/icons/icon_${item.IconId}.png` : null
        }
      }
    })

    return itemsMap
  } catch (err) {
    console.error('Error loading items:', err)
    throw err
  }
}

/**
 * Select an item from search results
 */
window.selectItem = function(itemKey, itemName) {
  document.getElementById('item-search').value = itemName
  document.getElementById('item-id').value = itemKey
  document.getElementById('item-search-results').style.display = 'none'
  
  const selectedEl = document.getElementById('item-selected')
  selectedEl.textContent = `✓ ${itemName} selected`
  selectedEl.style.display = 'block'
  
  validateForm()
}

/**
 * Validate form and enable/disable submit button
 */
function validateForm() {
  const charName = document.getElementById('item-character-name').value.trim()
  const server = document.getElementById('item-server').value.trim()
  const itemId = document.getElementById('item-id').value.trim()
  const amount = document.getElementById('item-amount').value.trim()
  const price = document.getElementById('item-price').value.trim()
  
  const submitBtn = document.getElementById('item-submit-btn')
  const isValid = charName && server && itemId && amount && price
  
  if (submitBtn) {
    submitBtn.disabled = !isValid
    submitBtn.style.opacity = isValid ? '1' : '0.5'
    submitBtn.style.cursor = isValid ? 'pointer' : 'not-allowed'
  }
}

/**
 * Save item listing to Firestore
 */
async function saveItemListing() {
  const db = Firebase.getFirestore()
  const auth = Firebase.getAuth()
  const errorEl = document.getElementById('item-form-error')
  
  if (!db || !auth?.currentUser) {
    errorEl.textContent = 'You must be signed in'
    errorEl.style.display = 'block'
    return
  }

  errorEl.style.display = 'none'

  const characterName = document.getElementById('item-character-name')?.value.trim() || ''
  const server = document.getElementById('item-server')?.value.trim() || ''
  const pstAvailability = document.getElementById('item-pst')?.value.trim() || ''
  const itemId = document.getElementById('item-id')?.value.trim() || ''
  const itemName = document.getElementById('item-search')?.value.trim() || ''
  const amount = parseInt(document.getElementById('item-amount')?.value) || 0
  const pricePerUnit = parseInt(document.getElementById('item-price')?.value) || 0
  const notes = document.getElementById('item-notes')?.value.trim() || ''

  if (!characterName || !server || !itemId || !amount || !pricePerUnit) {
    errorEl.textContent = 'Please fill in all required fields (marked with *)'
    errorEl.style.display = 'block'
    return
  }

  if (amount <= 0 || pricePerUnit <= 0) {
    errorEl.textContent = 'Amount and price must be greater than 0'
    errorEl.style.display = 'block'
    return
  }

  try {
    setStatus('status', 'Creating item listing…', 'loading')

    // Look up item data to get icon ID
    let iconId = null
    try {
      const response = await fetch('https://cdn.projectgorgon.com/v461/data/items.json')
      if (response.ok) {
        const itemsData = await response.json()
        
        for (const [key, item] of Object.entries(itemsData)) {
          if (item && item.Name === itemName && item.IconId) {
            iconId = item.IconId
            console.log('Found icon ID for item:', itemName, 'iconId:', iconId)
            break
          }
        }
      }
    } catch (err) {
      console.warn('Could not fetch item data for icon:', err)
    }

    const listingData = {
      type: 'item',
      sellerName: characterName,
      server,
      pstAvailability: pstAvailability || null,
      itemId,
      itemName,
      amount,
      pricePerUnit,
      iconId: iconId || null,
      notes: notes || null,
      uid: auth.currentUser.uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      active: true
    }

    await db.collection('listings').add(listingData)
    
    setStatus('status', 'Item listing created successfully!', 'ok')
    
    // Reset form
    document.getElementById('item-listing-form').reset()
    document.getElementById('item-selected').style.display = 'none'
    document.getElementById('item-id').value = ''
    
    setTimeout(() => {
      window.location.href = 'yourListings.html'
    }, 1500)
  } catch (error) {
    console.error('Error saving item listing:', error)
    errorEl.textContent = 'Error: ' + error.message
    errorEl.style.display = 'block'
    setStatus('status', 'Error creating listing', 'error')
  }
}

// Initialize when page loads
initItemFencePage()
