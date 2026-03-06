/**
 * Order Page Module
 * Handles the order placement page functionality
 */

import * as Firebase from './firebase.js'
import * as Auth from './auth.js'
import * as Listings from './listings.js'
import * as Orders from './orders.js'
import { escapeHtml, PROFESSION_EMOJI } from './utils.js'

let currentListing = null
let selectedItem = null
let craftItems = [] // List of items that can be crafted

/**
 * Initialize order page
 */
export function initOrderPage() {
  // Get listing ID from URL
  const urlParams = new URLSearchParams(window.location.search)
  const listingId = urlParams.get('id') || urlParams.get('listing')

  if (listingId) {
    loadListingDetails(listingId)
  }

  // Set up event listeners for this page
  setupOrderPageListeners()

  // Set up auth state listener
  Firebase.onAuthStateChanged(user => {
    Auth.renderUserAuth(user)
  })
}

/**
 * Set up order page-specific event listeners
 */
function setupOrderPageListeners() {
  const itemInput = document.getElementById('order-item')
  const quantityInput = document.getElementById('order-quantity')
  const charNameInput = document.getElementById('character-name')
  
  if (itemInput) {
    itemInput.addEventListener('input', (e) => {
      handleItemSearch(e.target.value)
    })
    itemInput.addEventListener('focus', () => {
      // Show dropdown when focused
      showItemSuggestions(itemInput.value)
    })
    itemInput.addEventListener('blur', () => {
      // Delay hiding to allow click on suggestions
      setTimeout(() => {
        hideItemSuggestions()
      }, 200)
    })
  }
  
  if (quantityInput) {
    quantityInput.addEventListener('change', () => {
      updatePricingDisplay()
    })
  }
  
  if (charNameInput) {
    charNameInput.addEventListener('input', () => {
      updateSubmitButton()
    })
  }
}

/**
 * Load mock craft items (in real app, would fetch from Firestore)
 */
function loadMockCraftItems() {
  craftItems = [
    { id: 'silk_robes', name: 'Silk Robes', basePrice: 50 },
    { id: 'leather_armor', name: 'Leather Armor', basePrice: 75 },
    { id: 'wool_shirt', name: 'Wool Shirt', basePrice: 25 },
    { id: 'dyed_fabric', name: 'Dyed Fabric', basePrice: 40 },
    { id: 'linen_wrap', name: 'Linen Wrap', basePrice: 30 },
    { id: 'silk_border', name: 'Silk Border', basePrice: 35 },
  ]
}

/**
 * Handle item search - show matching suggestions
 */
function handleItemSearch(searchTerm) {
  showItemSuggestions(searchTerm)
  updateSubmitButton()
}

/**
 * Show item suggestions dropdown
 */
function showItemSuggestions(searchTerm) {
  let suggestionsDiv = document.getElementById('item-suggestions')
  const itemInputWrapper = document.getElementById('item-input-wrapper')
  
  // Create suggestions div if it doesn't exist
  if (!suggestionsDiv) {
    suggestionsDiv = document.createElement('div')
    suggestionsDiv.id = 'item-suggestions'
    suggestionsDiv.style.cssText = `
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: #0a0a0a;
      border: 1px solid #505050;
      border-top: none;
      border-radius: 0 0 5px 5px;
      max-height: 250px;
      overflow-y: auto;
      z-index: 1000;
      margin-top: 0;
    `
    itemInputWrapper.appendChild(suggestionsDiv)
  }
  
  // Filter items matching search term
  const term = searchTerm.toLowerCase().trim()
  let matches = craftItems
  
  if (term) {
    matches = craftItems.filter(item => 
      item.name.toLowerCase().includes(term)
    )
  }
  
  // Build suggestions HTML
  if (matches.length === 0 && term) {
    suggestionsDiv.innerHTML = '<div style="padding:0.75rem; color:#a8a8a8;">No items found</div>'
  } else {
    suggestionsDiv.innerHTML = matches.map(item => `
      <div class="item-suggestion" data-item-id="${item.id}" style="
        padding: 0.75rem;
        border-bottom: 1px solid #505050;
        cursor: pointer;
        transition: background 0.2s;
      " onmouseover="this.style.background='#1a1a1a'" onmouseout="this.style.background='transparent'">
        <div style="font-weight:bold;">${escapeHtml(item.name)}</div>
        <div style="font-size:0.85rem; color:#a8a8a8;">${item.basePrice} gold base price</div>
      </div>
    `).join('')
    
    // Add click listeners to suggestions
    suggestionsDiv.querySelectorAll('.item-suggestion').forEach(el => {
      el.addEventListener('click', () => {
        selectItemById(el.dataset.itemId)
      })
    })
  }
  
  suggestionsDiv.style.display = 'block'
}

/**
 * Hide item suggestions dropdown
 */
function hideItemSuggestions() {
  const suggestionsDiv = document.getElementById('item-suggestions')
  if (suggestionsDiv) {
    suggestionsDiv.style.display = 'none'
  }
}

/**
 * Select item by ID
 */
function selectItemById(itemId) {
  const item = craftItems.find(i => i.id === itemId)
  if (item) {
    selectedItem = item
    document.getElementById('order-item').value = item.name
    hideItemSuggestions()
    updatePricingDisplay()
  }
}

/**
 * Select item from search
 */
function selectItemFromSearch(itemName) {
  const item = craftItems.find(i => 
    i.name.toLowerCase() === itemName.toLowerCase()
  )
  
  if (item) {
    selectedItem = item
    updatePricingDisplay()
  }
}

/**
 * Load and display listing details
 */
async function loadListingDetails(listingId) {
  try {
    const listing = await Listings.getListingById(listingId)
    currentListing = listing
    
    // Load mock craft items
    loadMockCraftItems()
    
    if (listing) {
      const emoji = PROFESSION_EMOJI[listing.profession] || '🔨'
      
      // Create crafter card with all details
      const card = document.createElement('div')
      card.className = 'listing-card'
      card.innerHTML = `
        <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:1rem; padding:1rem; background:#0a0a0a; border-radius:5px; border:1px solid #505050;">
          <div style="text-align:center;">
            <div style="font-size:0.75rem; color:#a8a8a8; text-transform:uppercase; margin-bottom:0.5rem;">Crafter</div>
            <div style="font-weight:bold;">${escapeHtml(listing.crafterName)}</div>
          </div>
          <div style="text-align:center;">
            <div style="font-size:0.75rem; color:#a8a8a8; text-transform:uppercase; margin-bottom:0.5rem;">Profession</div>
            <div style="font-weight:bold;">${emoji} ${escapeHtml(listing.profession)}</div>
          </div>
          <div style="text-align:center;">
            <div style="font-size:0.75rem; color:#a8a8a8; text-transform:uppercase; margin-bottom:0.5rem;">Crafting Level</div>
            <div style="font-weight:bold;">${listing.crafterLevel || '—'}</div>
          </div>
          <div style="text-align:center;">
            <div style="font-size:0.75rem; color:#a8a8a8; text-transform:uppercase; margin-bottom:0.5rem;">Commission</div>
            <div style="font-weight:bold;">${listing.commissionRate || '50%'}</div>
          </div>
        </div>
      `
      
      document.getElementById('listing-card').innerHTML = card.innerHTML
      document.getElementById('listing-info').style.display = 'block'
      document.getElementById('status').style.display = 'none'
    } else {
      document.getElementById('status').textContent = 'Listing not found'
      document.getElementById('status').className = 'status-bar error'
    }
  } catch (error) {
    console.error('Error loading listing:', error)
    document.getElementById('status').textContent = 'Error loading listing'
    document.getElementById('status').className = 'status-bar error'
  }
}

/**
 * Update pricing display based on selected item and quantity
 */
function updatePricingDisplay() {
  const quantityInput = document.getElementById('order-quantity')
  const pricingDiv = document.getElementById('order-pricing')
  
  if (!selectedItem || !currentListing) {
    pricingDiv.style.display = 'none'
    return
  }
  
  const quantity = parseInt(quantityInput?.value || 1) || 1
  const basePrice = selectedItem.basePrice * quantity
  
  // Parse commission rate (e.g., "50%" -> 0.5)
  const commissionStr = (currentListing.commissionRate || '50%').replace('%', '')
  const commissionRate = parseInt(commissionStr) / 100
  
  const craftCost = basePrice * commissionRate
  const total = basePrice + craftCost
  
  document.getElementById('base-price').textContent = `${basePrice} gold`
  document.getElementById('craft-cost').textContent = `${craftCost.toFixed(2)} gold (${commissionStr}%)`
  document.getElementById('total-price').textContent = `${total.toFixed(2)} gold`
  
  pricingDiv.style.display = 'block'
  updateSubmitButton()
}

/**
 * Update submit button state
 */
function updateSubmitButton() {
  const charName = document.getElementById('character-name').value.trim()
  const submitBtn = document.getElementById('submit-order-btn')
  const statusDiv = document.getElementById('order-submit-status')
  
  if (!charName) {
    submitBtn.disabled = true
    statusDiv.textContent = 'Enter your character name to place an order.'
    statusDiv.style.color = '#a8a8a8'
  } else if (!selectedItem) {
    submitBtn.disabled = true
    statusDiv.textContent = 'Select an item above to place an order.'
    statusDiv.style.color = '#a8a8a8'
  } else {
    submitBtn.disabled = false
    statusDiv.textContent = 'Ready to place order'
    statusDiv.style.color = '#8dc745'
  }
}

/**
 * Submit order
 */
export async function submitOrder() {
  const auth = Firebase.getAuth()
  
  if (!auth?.currentUser) {
    Auth.openAuthModal()
    return
  }

  if (!currentListing || !selectedItem) {
    alert('Please select an item')
    return
  }
  
  const charName = document.getElementById('character-name').value.trim()
  if (!charName) {
    alert('Please enter your character name')
    return
  }

  try {
    const orderData = {
      ...currentListing,
      itemId: selectedItem.id,
      itemName: selectedItem.name,
      quantity: parseInt(document.getElementById('order-quantity').value) || 1,
      characterName: charName,
      notes: document.getElementById('order-notes').value,
      basePrice: selectedItem.basePrice,
    }
    
    const orderId = await Orders.createOrder(orderData)
    window.location.href = `order-view.html?id=${orderId}`
  } catch (error) {
    alert('Error creating order: ' + error.message)
  }
}
