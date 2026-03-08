/**
 * Listings Manager Module
 * Handles creating, editing, and managing crafter listings for the current user
 */

import { getFirestore, getAuth } from './firebase.js'
import { escapeHtml, PROFESSION_EMOJI, setStatus } from './utils.js'

let userListings = []

/**
 * Fetch all unique ingredients for a profession
 */
async function getIngredientsForProfession(profession) {
  try {
    const response = await fetch('https://cdn.projectgorgon.com/v461/data/recipes.json')
    if (!response.ok) throw new Error('Failed to fetch recipes')
    
    const allRecipes = await response.json()
    
    // Also fetch items data to resolve ItemCode to names and get IconId
    const itemsResponse = await fetch('https://cdn.projectgorgon.com/v461/data/items.json')
    const itemsData = itemsResponse.ok ? await itemsResponse.json() : {}
    
    const ingredientMap = {} // Map to deduplicate ingredients
    
    Object.entries(allRecipes).forEach(([recipeId, recipe]) => {
      if ((recipe.Skill || '').toLowerCase() === profession.toLowerCase()) {
        const ingredients = recipe.Ingredients || []
        ingredients.forEach(ing => {
          let desc = ing.Desc
          let itemKey = null
          let iconId = null
          let iconUrl = null
          
          // Case 1: Ingredient with Desc field (variable ingredients like "Any Bone")
          if (desc) {
            const key = desc.toLowerCase()
            if (!ingredientMap[key]) {
              // Try to find icon by looking up first ItemKey in items' Keywords
              if (ing.ItemKeys && ing.ItemKeys.length > 0) {
                const firstItemKey = ing.ItemKeys[0]
                
                // Search through all items to find one with this keyword
                for (let [itemDatabaseKey, itemData] of Object.entries(itemsData)) {
                  if (itemData && itemData.Keywords && Array.isArray(itemData.Keywords)) {
                    if (itemData.Keywords.includes(firstItemKey) && itemData.IconId) {
                      iconId = itemData.IconId
                      iconUrl = `https://cdn.projectgorgon.com/v461/icons/icon_${iconId}.png`
                      break
                    }
                  }
                }
              }
              
              ingredientMap[key] = {
                desc: desc,
                itemKeys: ing.ItemKeys || [],
                stackSize: ing.StackSize || 1,
                iconId: iconId,
                iconUrl: iconUrl
              }
            }
          }
          // Case 2: Ingredient with ItemCode (fixed ingredients)
          else if (ing.ItemCode !== undefined) {
            const itemKey = `item_${ing.ItemCode}`
            const item = itemsData[itemKey]
            if (item && item.Name) {
              const key = item.Name.toLowerCase()
              if (!ingredientMap[key]) {
                iconId = item.IconId
                if (iconId) {
                  iconUrl = `https://cdn.projectgorgon.com/v461/icons/icon_${iconId}.png`
                }
                ingredientMap[key] = {
                  desc: item.Name,
                  itemCode: ing.ItemCode,
                  stackSize: ing.StackSize || 1,
                  iconId: iconId,
                  iconUrl: iconUrl
                }
              }
            } else {
              // Fallback if item not found
              const key = `item_${ing.ItemCode}`.toLowerCase()
              if (!ingredientMap[key]) {
                ingredientMap[key] = {
                  desc: `Item #${ing.ItemCode}`,
                  itemCode: ing.ItemCode,
                  stackSize: ing.StackSize || 1,
                  iconId: null,
                  iconUrl: null
                }
              }
            }
          } else {
            console.warn('Ingredient missing both Desc and ItemCode in recipe', recipeId, ':', ing)
          }
        })
      }
    })
    
    // Convert to sorted array
    return Object.values(ingredientMap).sort((a, b) => a.desc.localeCompare(b.desc))
  } catch (error) {
    console.error('Error fetching ingredients:', error)
    return []
  }
}

/**
 * Initialize the listings manager page
 */
export async function initListingsManager() {
  const craftingArea = document.getElementById('crafting-area')
  const status = document.getElementById('status')
  
  if (!craftingArea) return

  const auth = getAuth()
  if (!auth.currentUser) {
    if (status) {
      status.textContent = 'You must be signed in to manage listings'
      status.className = 'status-bar error'
    }
    return
  }

  // Show the crafting area
  craftingArea.style.display = 'block'
  if (status) status.style.display = 'block'
  
  // Wait for listings to load
  await loadUserListings(auth.currentUser.uid)
}

/**
 * Load user's listings from Firestore
 */
async function loadUserListings(uid) {
  const db = getFirestore()
  const status = document.getElementById('status')
  
  if (!db) {
    if (status) setStatus('status', 'Database not initialized', 'error')
    return
  }

  try {
    if (status) {
      status.style.display = 'block'
      setStatus('status', 'Loading your listings…', 'loading')
    }

    const snap = await db.collection('listings')
      .where('uid', '==', uid)
      .get()

    userListings = snap.docs.sort((a, b) => {
      const timeA = a.data().createdAt?.toMillis?.() || 0
      const timeB = b.data().createdAt?.toMillis?.() || 0
      return timeB - timeA
    })

    renderListingsManager(userListings)
    
    // Hide status on success
    if (status) {
      status.style.display = 'none'
    }
  } catch (error) {
    console.error('Error loading user listings:', error)
    if (status) {
      setStatus('status', 'Error loading listings: ' + error.message, 'error')
    }
  }
}

/**
 * Render the listings manager interface
 */
function renderListingsManager(docs) {
  const craftingArea = document.getElementById('crafting-area')
  if (!craftingArea) return

  const rowsHtml = docs.map(doc => {
    const d = doc.data()
    const emoji = PROFESSION_EMOJI[d.profession] || '🔨'
    const statusBadge = d.active ? '<span class="badge active">Active</span>' : '<span class="badge inactive">Inactive</span>'
    
    return `
      <tr>
        <td><strong>${emoji} ${escapeHtml(d.profession)}</strong></td>
        <td>${escapeHtml(d.crafterName)}</td>
        <td>${escapeHtml(d.server || '—')}</td>
        <td>${statusBadge}</td>
        <td style="text-align:right;">
          <button class="action-btn ghost" onclick="window.editListing('${doc.id}')">Edit</button>
          <button class="delete-btn" onclick="window.deleteListing('${doc.id}')">Delete</button>
        </td>
      </tr>
    `
  }).join('')

  if (docs.length === 0) {
    craftingArea.innerHTML = `
      <div class="empty-state" style="padding:2rem 0;">
        You haven't created any listings yet.
        <br><br>
        <button class="action-btn" onclick="window.createNewListing()">Create Your First Listing</button>
      </div>
    `
    return
  }

  craftingArea.innerHTML = `
    <div style="margin-bottom:1rem;">
      <button class="action-btn" onclick="window.createNewListing()">+ Create New Listing</button>
    </div>
    <table class="listings-table">
      <thead>
        <tr>
          <th>Profession</th>
          <th>Crafter Name</th>
          <th>Server</th>
          <th>Status</th>
          <th style="text-align:right;">Actions</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  `
}

/**
 * Delete a listing
 */
export async function deleteListing(listingId) {
  const db = getFirestore()
  if (!db) return

  if (!confirm('Are you sure you want to delete this listing?')) return

  try {
    setStatus('status', 'Deleting listing…', 'loading')
    await db.collection('listings').doc(listingId).delete()
    
    // Reload listings
    const auth = getAuth()
    if (auth.currentUser) {
      await loadUserListings(auth.currentUser.uid)
    }
    setStatus('status', 'Listing deleted successfully', 'ok')
  } catch (error) {
    console.error('Error deleting listing:', error)
    setStatus('status', 'Error deleting listing: ' + error.message, 'error')
  }
}

/**
 * Show create listing type selection modal
 */
export function createNewListing() {
  const modal = document.getElementById('listing-type-modal')
  if (modal) {
    modal.classList.add('open')
  }
}

/**
 * Handle listing type selection
 */
export function selectListingType(type) {
  const listingTypeModal = document.getElementById('listing-type-modal')
  if (listingTypeModal) {
    listingTypeModal.classList.remove('open')
  }

  if (type === 'crafted') {
    showListingForm(null)
  } else if (type === 'item') {
    showItemListingForm()
  } else if (type === 'service') {
    showServiceListingModal()
  }
}

/**
 * Show item listing form in crafting area
 */
async function showItemListingForm() {
  const craftingArea = document.getElementById('crafting-area')
  if (!craftingArea) return

  const formHtml = `
    <div style="margin-bottom:2rem; padding:1.5rem; background:#0a0a0a; border:1px solid #505050; border-radius:5px;">
      <h3 style="margin-bottom:1.5rem; font-size:1.1rem;">Fence an Item</h3>
      <p style="color:#a8a8a8; font-size:0.9rem; margin-bottom:1rem;">List items you want to sell on the Black Wing Market.</p>
      <div id="item-form-container">
        <div style="display:grid; gap:1rem;">
          <!-- Character Name -->
          <div>
            <label style="display:block; font-size:0.75rem; color:#b0b0b0; text-transform:uppercase; margin-bottom:0.35rem;">Character Name *</label>
            <input type="text" id="item-character-name" placeholder="Your character name" style="width:100%; padding:0.75rem; border:1px solid #505050; border-radius:5px; background:#1a1a1a; color:#e8e8e8;">
          </div>
          
          <!-- Server -->
          <div>
            <label style="display:block; font-size:0.75rem; color:#b0b0b0; text-transform:uppercase; margin-bottom:0.35rem;">Server *</label>
            <select id="item-server" style="width:100%; padding:0.75rem; border:1px solid #505050; border-radius:5px; background:#1a1a1a; color:#e8e8e8;">
              <option value="">Select a server</option>
              <option value="Arisetsu">Arisetsu</option>
              <option value="Dreva">Dreva</option>
              <option value="Laeth">Laeth</option>
              <option value="Miraverre">Miraverre</option>
              <option value="Strekios">Strekios</option>
            </select>
          </div>
          
          <!-- PST Availability -->
          <div>
            <label style="display:block; font-size:0.75rem; color:#b0b0b0; text-transform:uppercase; margin-bottom:0.35rem;">PST Availability</label>
            <input type="text" id="item-pst" placeholder="e.g. 6 PM - 10 PM" style="width:100%; padding:0.75rem; border:1px solid #505050; border-radius:5px; background:#1a1a1a; color:#e8e8e8;">
          </div>
          
          <!-- Item Search -->
          <div>
            <label style="display:block; font-size:0.75rem; color:#b0b0b0; text-transform:uppercase; margin-bottom:0.35rem;">Item *</label>
            <div style="position:relative;">
              <input type="text" id="item-search" placeholder="Search items..." style="width:100%; padding:0.75rem; border:1px solid #505050; border-radius:5px; background:#1a1a1a; color:#e8e8e8;" autocomplete="off">
              <div id="item-search-results" style="position:absolute; top:100%; left:0; right:0; background:#1a1a1a; border:1px solid #505050; border-top:none; border-radius:0 0 5px 5px; max-height:200px; overflow-y:auto; display:none; z-index:100;"></div>
            </div>
            <input type="hidden" id="item-id">
            <div id="item-selected" style="margin-top:0.35rem; color:#7cb342; font-size:0.85rem; display:none;"></div>
            <div id="item-search-status" style="margin-top:0.35rem; font-size:0.75rem; color:#a8a8a8; display:none;"></div>
          </div>
          
          <!-- Amount -->
          <div>
            <label style="display:block; font-size:0.75rem; color:#b0b0b0; text-transform:uppercase; margin-bottom:0.35rem;">Amount *</label>
            <input type="number" id="item-amount" placeholder="Quantity available" min="1" style="width:100%; padding:0.75rem; border:1px solid #505050; border-radius:5px; background:#1a1a1a; color:#e8e8e8;">
          </div>
          
          <!-- Price Per Unit -->
          <div>
            <label style="display:block; font-size:0.75rem; color:#b0b0b0; text-transform:uppercase; margin-bottom:0.35rem;">Council per Unit *</label>
            <input type="number" id="item-price" placeholder="Price per unit" min="1" style="width:100%; padding:0.75rem; border:1px solid #505050; border-radius:5px; background:#1a1a1a; color:#e8e8e8;">
          </div>
          
          <!-- Notes -->
          <div>
            <label style="display:block; font-size:0.75rem; color:#b0b0b0; text-transform:uppercase; margin-bottom:0.35rem;">Notes (Optional)</label>
            <textarea id="item-notes" placeholder="Add any notes about this listing..." style="width:100%; padding:0.75rem; border:1px solid #505050; border-radius:5px; background:#1a1a1a; color:#e8e8e8; min-height:80px; font-family:inherit; resize:vertical;"></textarea>
          </div>
          
          <!-- Error Message -->
          <div id="item-form-error" style="color:#ff6b6b; background:#2a1a1a; border:1px solid #4a3030; border-radius:4px; padding:0.6rem; display:none;"></div>
          
          <!-- Buttons -->
          <div style="display:flex; gap:1rem;">
            <button class="action-btn" id="item-submit-btn" onclick="window.saveItemListing()" disabled style="opacity:0.5; cursor:not-allowed;">Create Listing</button>
            <button class="action-btn ghost" onclick="window.cancelItemListingForm()">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  `

  craftingArea.innerHTML = formHtml
  
  // Reset search initialization flag
  const searchInput = document.getElementById('item-search')
  if (searchInput) {
    searchInput.dataset.initialized = 'false'
  }
  
  // Initialize the form
  await initItemListingForm()
}

/**
 * Show service listing modal
 */
function showServiceListingModal() {
  const modal = document.getElementById('service-listing-modal')
  if (modal) {
    modal.classList.add('open')
  }
}

/**
 * Edit a listing
 */
export function editListing(listingId) {
  const listing = userListings.find(doc => doc.id === listingId)
  if (listing) {
    showListingForm(listing)
  }
}

/**
 * Show listing form (create or edit)
 */
function showListingForm(docSnapshot = null) {
  const craftingArea = document.getElementById('crafting-area')
  if (!craftingArea) return

  const isEditing = docSnapshot !== null
  const d = docSnapshot?.data?.() || {}

  const formHtml = `
    <div style="margin-bottom:2rem; padding:1.5rem; background:#0a0a0a; border:1px solid #505050; border-radius:5px;">
      <h3 style="margin-bottom:1.5rem; font-size:1.1rem;">${isEditing ? 'Edit Listing' : 'Create New Listing'}</h3>
      
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:1rem;">
        <div>
          <label style="display:block; font-size:0.75rem; color:#b0b0b0; text-transform:uppercase; margin-bottom:0.35rem;">Crafter Name *</label>
          <input type="text" id="form-crafter-name" value="${escapeHtml(d.crafterName || '')}" placeholder="Your character name" style="width:100%; padding:0.75rem; border:1px solid #505050; border-radius:5px; background:#1a1a1a; color:#e8e8e8;">
        </div>
        <div>
          <label style="display:block; font-size:0.75rem; color:#b0b0b0; text-transform:uppercase; margin-bottom:0.35rem;">Profession *${isEditing ? ' <span style="color:#a8a8a8; font-weight:400; text-transform:none;">(locked — delete and recreate to change)</span>' : ''}</label>
          <select id="form-profession" ${isEditing ? 'disabled' : ''} style="width:100%; padding:0.75rem; border:1px solid #505050; border-radius:5px; background:#1a1a1a; color:#e8e8e8; ${isEditing ? 'opacity:0.6; cursor:not-allowed;' : ''}">
            <option value="">Select a profession</option>
            <option value="Weaponcrafting" ${d.profession === 'Weaponcrafting' ? 'selected' : ''}>Weaponcrafting</option>
            <option value="Armorsmithing" ${d.profession === 'Armorsmithing' ? 'selected' : ''}>Armorsmithing</option>
            <option value="Tailoring" ${d.profession === 'Tailoring' ? 'selected' : ''}>Tailoring</option>
            <option value="Carpentry" ${d.profession === 'Carpentry' ? 'selected' : ''}>Carpentry</option>
            <option value="Jewelcrafting" ${d.profession === 'Jewelcrafting' ? 'selected' : ''}>Jewelcrafting</option>
            <option value="Alchemy" ${d.profession === 'Alchemy' ? 'selected' : ''}>Alchemy</option>
            <option value="Cooking" ${d.profession === 'Cooking' ? 'selected' : ''}>Cooking</option>
            <option value="Engraving" ${d.profession === 'Engraving' ? 'selected' : ''}>Engraving</option>
            <option value="Scribing" ${d.profession === 'Scribing' ? 'selected' : ''}>Scribing</option>
            <option value="Toolcrafting" ${d.profession === 'Toolcrafting' ? 'selected' : ''}>Toolcrafting</option>
          </select>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:1rem;">
        <div>
          <label style="display:block; font-size:0.75rem; color:#b0b0b0; text-transform:uppercase; margin-bottom:0.35rem;">Server</label>
          <select id="form-server" style="width:100%; padding:0.75rem; border:1px solid #505050; border-radius:5px; background:#1a1a1a; color:#e8e8e8;">
            <option value="">Select a server</option>
            <option value="Arisetsu" ${d.server === 'Arisetsu' ? 'selected' : ''}>Arisetsu</option>
            <option value="Dreva" ${d.server === 'Dreva' ? 'selected' : ''}>Dreva</option>
            <option value="Laeth" ${d.server === 'Laeth' ? 'selected' : ''}>Laeth</option>
            <option value="Miraverre" ${d.server === 'Miraverre' ? 'selected' : ''}>Miraverre</option>
            <option value="Strekios" ${d.server === 'Strekios' ? 'selected' : ''}>Strekios</option>
          </select>
        </div>
        <div>
          <label style="display:block; font-size:0.75rem; color:#b0b0b0; text-transform:uppercase; margin-bottom:0.35rem;">Crafter Level</label>
          <input type="number" id="form-level" value="${d.crafterLevel || ''}" placeholder="e.g. 45" style="width:100%; padding:0.75rem; border:1px solid #505050; border-radius:5px; background:#1a1a1a; color:#e8e8e8;">
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:1rem;">
        <div>
          <label style="display:block; font-size:0.75rem; color:#b0b0b0; text-transform:uppercase; margin-bottom:0.35rem;">PST Availability</label>
          <input type="text" id="form-pst" value="${escapeHtml(d.pstAvailability || '')}" placeholder="e.g. 6 PM - 10 PM" style="width:100%; padding:0.75rem; border:1px solid #505050; border-radius:5px; background:#1a1a1a; color:#e8e8e8;">
        </div>
        <div>
          <label style="display:block; font-size:0.75rem; color:#b0b0b0; text-transform:uppercase; margin-bottom:0.35rem;">Commission Rate *</label>
          <input type="text" id="form-commission" value="${escapeHtml(d.commissionRate || '50%')}" placeholder="e.g. 50%" style="width:100%; padding:0.75rem; border:1px solid #505050; border-radius:5px; background:#1a1a1a; color:#e8e8e8;">
        </div>
      </div>

      <div style="margin-bottom:1rem;">
        <label style="display:block; font-size:0.75rem; color:#b0b0b0; text-transform:uppercase; margin-bottom:0.35rem;">Description</label>
        <textarea id="form-description" placeholder="Details about your crafting services..." style="width:100%; padding:0.75rem; border:1px solid #505050; border-radius:5px; background:#1a1a1a; color:#e8e8e8; min-height:100px; font-family:inherit;">${escapeHtml(d.description || '')}</textarea>
      </div>

      <div style="margin-bottom:1rem;">
        <label style="display:block; font-size:0.75rem; color:#b0b0b0; text-transform:uppercase; margin-bottom:0.35rem;">Ingredient Prices *</label>
        <input type="text" id="ingredient-filter-fixed" placeholder="Filter ingredients..." style="width:100%; padding:0.5rem; border:1px solid #505050; border-radius:5px; background:#1a1a1a; color:#e8e8e8; margin-bottom:0.5rem; box-sizing:border-box;">
        <div id="ingredient-pricing-fixed" style="border:1px solid #505050; border-radius:5px; padding:1rem; background:#1a1a1a; max-height:400px; overflow-y:auto;">
          <div style="color:#a8a8a8; text-align:center; padding:2rem;">Select a profession above to load ingredients</div>
        </div>
      </div>

      <div style="margin-bottom:1.5rem;">
        <label style="display:flex; align-items:center; gap:0.5rem; font-size:0.75rem; color:#b0b0b0; text-transform:uppercase; margin-bottom:0.35rem;">
          Variable Ingredient Prices *
          <span class="info-icon" title="Some recipe ingredient requirements can be met via varying ingredients (e.g. elf skull vs human skull). Consider your cheapest option in the category (even zero if it is an existing item to be modified)." style="display:inline-flex; align-items:center; justify-content:center; width:1.2rem; height:1.2rem; background:#505050; border-radius:50%; font-size:0.7rem; cursor:help; text-transform:none;">?</span>
        </label>
        <input type="text" id="ingredient-filter-variable" placeholder="Filter ingredients..." style="width:100%; padding:0.5rem; border:1px solid #505050; border-radius:5px; background:#1a1a1a; color:#e8e8e8; margin-bottom:0.5rem; box-sizing:border-box;">
        <div id="ingredient-pricing-variable" style="border:1px solid #505050; border-radius:5px; padding:1rem; background:#1a1a1a; max-height:400px; overflow-y:auto;">
          <div style="color:#a8a8a8; text-align:center; padding:2rem;">Select a profession above to load ingredients</div>
        </div>
      </div>

      <div style="margin-bottom:1.5rem;">
        <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
          <input type="checkbox" id="form-active" ${d.active !== false ? 'checked' : ''} style="cursor:pointer;">
          <span style="font-size:0.85rem;">Active (visible to customers)</span>
        </label>
      </div>

      <div id="form-error" style="color:#ff6b6b; background:#2a1a1a; border:1px solid #4a3030; border-radius:4px; padding:0.6rem; margin-bottom:1rem; display:none;"></div>

      <div style="display:flex; gap:1rem;">
        <button class="action-btn" id="submit-listing-btn" onclick="window.saveNewListing('${isEditing ? docSnapshot.id : ''}')" disabled style="opacity:0.5; cursor:not-allowed;">
          ${isEditing ? 'Update' : 'Create'} Listing
        </button>
        <button class="action-btn ghost" onclick="window.cancelListingForm()">Cancel</button>
      </div>
    </div>
  `

  craftingArea.innerHTML = formHtml

  // Set up event listeners for validation
  const formId = isEditing ? docSnapshot.id : 'new'
  setupFormValidation(formId, d.ingredientPrices || {})
  
  // Initialize button state
  validateForm(formId)
}

/**
 * Save listing to Firestore
 */
export async function saveNewListing(listingId) {
  const db = getFirestore()
  const auth = getAuth()
  
  if (!db || !auth?.currentUser) return

  const crafterName = document.getElementById('form-crafter-name').value.trim()
  const profession = document.getElementById('form-profession').value.trim()
  const commissionRate = document.getElementById('form-commission').value.trim()
  const ingredientPrices = getIngredientPrices()

  if (!crafterName || !profession || !commissionRate) {
    document.getElementById('form-error').textContent = 'Please fill in all required fields (marked with *)'
    document.getElementById('form-error').style.display = 'block'
    return
  }

  if (Object.keys(ingredientPrices).length === 0) {
    document.getElementById('form-error').textContent = 'Please set prices for at least one ingredient'
    document.getElementById('form-error').style.display = 'block'
    return
  }

  try {
    const listingData = {
      type: 'crafting',
      crafterName,
      profession,
      server: document.getElementById('form-server').value.trim() || null,
      crafterLevel: parseInt(document.getElementById('form-level').value) || null,
      pstAvailability: document.getElementById('form-pst').value.trim() || null,
      commissionRate,
      description: document.getElementById('form-description').value.trim() || null,
      ingredientPrices,
      active: document.getElementById('form-active').checked,
      uid: auth.currentUser.uid,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }

    if (listingId) {
      // Update existing listing
      setStatus('status', 'Updating listing…', 'loading')
      await db.collection('listings').doc(listingId).update(listingData)
    } else {
      // Create new listing
      setStatus('status', 'Creating listing…', 'loading')
      listingData.createdAt = firebase.firestore.FieldValue.serverTimestamp()
      await db.collection('listings').add(listingData)
    }

    // Reload listings manager
    await loadUserListings(auth.currentUser.uid)
    setStatus('status', listingId ? 'Listing updated successfully' : 'Listing created successfully', 'ok')
  } catch (error) {
    console.error('Error saving listing:', error)
    document.getElementById('form-error').textContent = 'Error: ' + error.message
    document.getElementById('form-error').style.display = 'block'
  }
}

/**
 * Set up real-time validation for form inputs
 */
function setupFormValidation(formId, savedIngredientPrices = {}) {
  const professionSelect = document.getElementById('form-profession')

  if (professionSelect) {
    professionSelect.addEventListener('change', async (e) => {
      await loadAndRenderIngredients(e.target.value)
      validateForm(formId)
    })

    // Load ingredients if editing existing listing with profession
    const currentProfession = professionSelect.value
    if (currentProfession) {
      loadAndRenderIngredients(currentProfession, savedIngredientPrices)
    }
  }
  
  const inputs = [
    'form-crafter-name',
    'form-commission',
    'form-server',
    'form-level',
    'form-pst',
    'form-description'
  ]

  inputs.forEach(inputId => {
    const input = document.getElementById(inputId)
    if (input) {
      input.addEventListener('input', () => validateForm(formId))
      input.addEventListener('change', () => validateForm(formId))
    }
  })

  const activeCheckbox = document.getElementById('form-active')
  if (activeCheckbox) {
    activeCheckbox.addEventListener('change', () => validateForm(formId))
  }
}

/**
 * Load and render ingredients for selected profession
 */
async function loadAndRenderIngredients(profession, savedPrices = {}) {
  const fixedContainer = document.getElementById('ingredient-pricing-fixed')
  const variableContainer = document.getElementById('ingredient-pricing-variable')
  
  if (!fixedContainer || !variableContainer) return
  
  if (!profession) {
    fixedContainer.innerHTML = '<div style="color:#a8a8a8; text-align:center; padding:2rem;">Select a profession above to load ingredients</div>'
    variableContainer.innerHTML = '<div style="color:#a8a8a8; text-align:center; padding:2rem;">Select a profession above to load ingredients</div>'
    return
  }
  
  fixedContainer.innerHTML = '<div style="color:#a8a8a8; text-align:center; padding:2rem;">Loading ingredients…</div>'
  variableContainer.innerHTML = '<div style="color:#a8a8a8; text-align:center; padding:2rem;">Loading ingredients…</div>'
  
  const ingredients = await getIngredientsForProfession(profession)
  
  if (ingredients.length === 0) {
    fixedContainer.innerHTML = '<div style="color:#a8a8a8; text-align:center; padding:2rem;">No ingredients found for this profession</div>'
    variableContainer.innerHTML = '<div style="color:#a8a8a8; text-align:center; padding:2rem;">No ingredients found for this profession</div>'
    return
  }
  
  // Separate ingredients into fixed and variable
  const fixedIngredients = ingredients.filter(ing => ing.itemCode !== undefined)
  const variableIngredients = ingredients.filter(ing => ing.itemKeys && ing.itemKeys.length > 0)
  
  // Render fixed ingredients
  if (fixedIngredients.length > 0) {
    const fixedHtml = fixedIngredients.map((ing, idx) => {
      const inputId = `fixed-ing-${idx}`
      return `
        <div style="display:flex; align-items:center; gap:1rem; margin-bottom:1rem; padding-bottom:1rem; border-bottom:1px solid #404040;">
          ${ing.iconUrl ? `<img src="${ing.iconUrl}" alt="${escapeHtml(ing.desc)}" style="width:32px; height:32px; object-fit:contain; flex-shrink:0;">` : '<div style="width:32px; height:32px; background:#404040; border-radius:4px; flex-shrink:0;"></div>'}
          <label for="${inputId}" style="font-size:0.85rem; color:#e8e8e8; min-width:200px; flex-shrink:0;">
            <strong>${escapeHtml(ing.desc)}</strong>
          </label>
          <input 
            type="number"
            id="${inputId}"
            name="ingredient_fixed_${idx}"
            class="ingredient-price-input"
            data-ingredient="${escapeHtml(ing.desc)}"
            placeholder="Price"
            min="0"
            step="1"
            style="flex:1; padding:0.5rem; border:1px solid #505050; border-radius:4px; background:#0a0a0a; color:#e8e8e8; font-size:0.9rem;"
          >
        </div>
      `
    }).join('')
    fixedContainer.innerHTML = fixedHtml
  } else {
    fixedContainer.innerHTML = '<div style="color:#a8a8a8; text-align:center; padding:2rem;">No fixed ingredients for this profession</div>'
  }
  
  // Render variable ingredients
  if (variableIngredients.length > 0) {
    const variableHtml = variableIngredients.map((ing, idx) => {
      const inputId = `variable-ing-${idx}`
      console.log(`Variable ingredient: ${ing.desc}, iconUrl: ${ing.iconUrl}, itemKeys: ${ing.itemKeys.join(', ')}`)
      return `
        <div style="display:flex; align-items:center; gap:1rem; margin-bottom:1rem; padding-bottom:1rem; border-bottom:1px solid #404040;">
          ${ing.iconUrl ? `<img src="${ing.iconUrl}" alt="${escapeHtml(ing.desc)}" style="width:32px; height:32px; object-fit:contain; flex-shrink:0;">` : '<div style="width:32px; height:32px; background:#404040; border-radius:4px; flex-shrink:0;"></div>'}
          <label for="${inputId}" style="font-size:0.85rem; color:#e8e8e8; min-width:200px; flex-shrink:0;">
            <strong>${escapeHtml(ing.desc)}</strong>
          </label>
          <input 
            type="number"
            id="${inputId}"
            name="ingredient_variable_${idx}"
            class="ingredient-price-input"
            data-ingredient="${escapeHtml(ing.desc)}"
            placeholder="Price"
            min="0"
            step="1"
            style="flex:1; padding:0.5rem; border:1px solid #505050; border-radius:4px; background:#0a0a0a; color:#e8e8e8; font-size:0.9rem;"
          >
        </div>
      `
    }).join('')
    variableContainer.innerHTML = variableHtml
  } else {
    variableContainer.innerHTML = '<div style="color:#a8a8a8; text-align:center; padding:2rem;">No variable ingredients for this profession</div>'
  }
  
  // Add event listeners to ingredient inputs and restore saved prices
  document.querySelectorAll('.ingredient-price-input').forEach(input => {
    const saved = savedPrices[input.dataset.ingredient]
    if (saved !== undefined) input.value = saved
    input.addEventListener('input', () => validateForm(''))
    input.addEventListener('change', () => validateForm(''))
  })
  // Re-validate now that saved prices are restored in the DOM
  validateForm('')

  // Wire up filter inputs
  function applyFilter(container, query) {
    const q = query.toLowerCase()
    Array.from(container.children).forEach(row => {
      const ing = row.querySelector('[data-ingredient]')
      if (!ing) return
      row.style.display = ing.dataset.ingredient.toLowerCase().includes(q) ? 'flex' : 'none'
    })
  }

  const filterFixed = document.getElementById('ingredient-filter-fixed')
  const filterVariable = document.getElementById('ingredient-filter-variable')

  if (filterFixed) {
    filterFixed.addEventListener('input', () => applyFilter(fixedContainer, filterFixed.value))
    applyFilter(fixedContainer, filterFixed.value)
  }
  if (filterVariable) {
    filterVariable.addEventListener('input', () => applyFilter(variableContainer, filterVariable.value))
    applyFilter(variableContainer, filterVariable.value)
  }
}

/**
 * Get all ingredient prices from form
 */
function getIngredientPrices() {
  const ingredients = {}
  document.querySelectorAll('.ingredient-price-input').forEach(input => {
    const ingredientName = input.getAttribute('data-ingredient')
    const price = parseFloat(input.value) || 0
    if (ingredientName && price > 0) {
      ingredients[ingredientName] = price
    }
  })
  return ingredients
}

/**
 * Validate form and update button state
 */
function validateForm(formId) {
  const crafterName = document.getElementById('form-crafter-name')?.value.trim() || ''
  const profession = document.getElementById('form-profession')?.value.trim() || ''
  const commissionRate = document.getElementById('form-commission')?.value.trim() || ''
  const submitBtn = document.getElementById('submit-listing-btn')

  if (!submitBtn) return

  // Check if all required fields are filled
  const isValid = crafterName && profession && commissionRate

  // Update button state
  submitBtn.disabled = !isValid
  submitBtn.style.opacity = isValid ? '1' : '0.5'
  submitBtn.style.cursor = isValid ? 'pointer' : 'not-allowed'
}

/**
 * Cancel form and go back to listings
 */
export async function cancelListingForm() {
  const auth = getAuth()
  if (auth?.currentUser) {
    await loadUserListings(auth.currentUser.uid)
  }
}

/**
 * Cancel item listing form and go back to listings
 */
export async function cancelItemListingForm() {
  const auth = getAuth()
  if (auth?.currentUser) {
    await loadUserListings(auth.currentUser.uid)
  }
}

/**
 * Global item database cache
 */
let itemsDatabase = null
let itemSearchInitialized = false

/**
 * Load items from CDN and set up search
 */
async function loadItemDatabase() {
  if (itemsDatabase) return itemsDatabase
  
  try {
    console.log('Fetching items database...')
    const response = await fetch('https://cdn.projectgorgon.com/v461/data/items.json')
    if (!response.ok) throw new Error('Failed to load items')
    const data = await response.json()
    
    console.log('Raw response:', data)
    console.log('Response type:', typeof data)
    console.log('Is array:', Array.isArray(data))
    console.log('Response keys:', Object.keys(data).slice(0, 10))
    
    // Handle various response structures
    if (Array.isArray(data)) {
      itemsDatabase = data
    } else if (data.items && Array.isArray(data.items)) {
      itemsDatabase = data.items
    } else if (data.data && Array.isArray(data.data)) {
      itemsDatabase = data.data
    } else {
      // If it's an object with string keys that might be items, convert to array
      const entries = Object.entries(data)
      if (entries.length > 0) {
        itemsDatabase = entries.map(([key, value]) => ({ key, ...value }))
      } else {
        console.error('Unexpected items database structure:', data)
        return []
      }
    }
    
    console.log('Items database loaded:', itemsDatabase.length, 'items')
    return itemsDatabase
  } catch (error) {
    console.error('Error loading item database:', error)
    return []
  }
}

/**
 * Handle item search when modal opens
 */
export async function initItemListingForm() {
  const searchInput = document.getElementById('item-search')
  const results = document.getElementById('item-search-results')
  const statusDiv = document.getElementById('item-search-status')
  
  if (!searchInput || !results) {
    console.warn('Search input or results container not found')
    return
  }
  
  // Check if already initialized
  if (searchInput.dataset.initialized === 'true') {
    console.log('Item search already initialized')
    return
  }
  
  // Show loading state
  searchInput.style.opacity = '0.5'
  searchInput.placeholder = '⏳ Loading items...'
  searchInput.disabled = true
  
  if (statusDiv) {
    statusDiv.textContent = '⏳ Loading item database...'
    statusDiv.style.display = 'block'
  }
  
  // Load items database
  const items = await loadItemDatabase()
  console.log('Items loaded in form init:', items.length)
  
  if (!items || items.length === 0) {
    searchInput.placeholder = '✗ Failed to load items'
    if (statusDiv) {
      statusDiv.textContent = '✗ Failed to load item database'
      statusDiv.style.color = '#ff6b6b'
    }
    return
  }
  
  // Restore normal state
  searchInput.style.opacity = '1'
  searchInput.placeholder = 'Search items...'
  searchInput.disabled = false
  
  if (statusDiv) {
    statusDiv.textContent = '✓ Ready to search items'
    statusDiv.style.color = '#7cb342'
    // Clear status after a moment
    setTimeout(() => {
      if (statusDiv.style.display !== 'none') {
        statusDiv.style.display = 'none'
      }
    }, 2000)
  }
  
  // Handle search input with debounce
  let searchTimeout
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout)
    const query = e.target.value.toLowerCase().trim()
    
    if (query.length < 2) {
      results.style.display = 'none'
      return
    }
    
    searchTimeout = setTimeout(() => {
      const filtered = items.filter(item => 
        item.Name && item.Name.toLowerCase().includes(query)
      ).slice(0, 20)
      
      console.log('Search query:', query, 'Results:', filtered.length)
      
      if (filtered.length === 0) {
        results.innerHTML = '<div style="padding:0.75rem; color:#a8a8a8; font-size:0.9rem;">No items found</div>'
        results.style.display = 'block'
        return
      }
      
      results.innerHTML = filtered.map((item) => {
        const escapedName = (item.Name || '').replace(/'/g, '&#39;').replace(/"/g, '&quot;')
        const iconHtml = item.IconId
          ? `<img src="https://cdn.projectgorgon.com/v461/icons/icon_${item.IconId}.png" alt="${escapeHtml(item.Name)}" style="width:24px; height:24px; margin-right:0.5rem; vertical-align:middle; border:1px solid #505050; border-radius:3px;" onerror="this.style.opacity='0.3'">`
          : ''
        return `
          <div class="item-result" data-item-id="${item.id}" data-item-name="${escapedName}" style="padding:0.75rem; cursor:pointer; border-bottom:1px solid #303030; color:#e8e8e8; font-size:0.9rem; transition:background 0.2s; display:flex; align-items:center;">
            ${iconHtml}
            <span>${escapeHtml(item.Name)}</span>
          </div>
        `
      }).join('')
      
      // Add event listeners to result items
      results.querySelectorAll('.item-result').forEach(el => {
        el.addEventListener('click', () => {
          const itemId = el.getAttribute('data-item-id')
          const itemName = el.getAttribute('data-item-name')
          selectItem(itemId, itemName)
        })
        el.addEventListener('mouseover', () => {
          el.style.background = '#252525'
        })
        el.addEventListener('mouseout', () => {
          el.style.background = 'transparent'
        })
      })
      
      results.style.display = 'block'
    }, 100)
  })
  
  // Close results when clicking outside
  const closeResults = (e) => {
    if (e.target !== searchInput && !results.contains(e.target)) {
      results.style.display = 'none'
    }
  }
  document.addEventListener('click', closeResults)
  
  // Set up validation
  setupItemFormValidation()
  
  // Mark as initialized
  searchInput.dataset.initialized = 'true'
}

/**
 * Select an item from search results
 */
export function selectItem(itemId, itemName) {
  document.getElementById('item-search').value = itemName
  document.getElementById('item-id').value = itemId
  document.getElementById('item-selected').textContent = '✓ ' + itemName
  document.getElementById('item-selected').style.display = 'block'
  document.getElementById('item-search-results').style.display = 'none'
  validateItemForm()
}

/**
 * Reset item listing form for next use
 */
export function resetItemListingForm() {
  // Clear initialization flag
  const searchInput = document.getElementById('item-search')
  if (searchInput) {
    searchInput.dataset.initialized = 'false'
  }
  
  // Clear form fields
  const formElements = {
    'item-character-name': '',
    'item-server': '',
    'item-pst': '',
    'item-search': '',
    'item-id': '',
    'item-amount': '',
    'item-price': '',
    'item-notes': ''
  }
  
  Object.entries(formElements).forEach(([id, value]) => {
    const el = document.getElementById(id)
    if (el) el.value = value
  })
  
  document.getElementById('item-selected').style.display = 'none'
  document.getElementById('item-form-error').style.display = 'none'
  document.getElementById('item-search-results').style.display = 'none'
  
  // Reset submit button
  const submitBtn = document.getElementById('item-submit-btn')
  if (submitBtn) {
    submitBtn.disabled = true
    submitBtn.style.opacity = '0.5'
    submitBtn.style.cursor = 'not-allowed'
  }
}

/**
 * Set up validation for item form inputs
 */
function setupItemFormValidation() {
  const inputs = [
    'item-character-name',
    'item-server',
    'item-id',
    'item-amount',
    'item-price'
  ]
  
  inputs.forEach(inputId => {
    const input = document.getElementById(inputId)
    if (input) {
      input.addEventListener('input', validateItemForm)
      input.addEventListener('change', validateItemForm)
    }
  })
}

/**
 * Validate item form and update button state
 */
function validateItemForm() {
  const characterName = document.getElementById('item-character-name')?.value.trim() || ''
  const server = document.getElementById('item-server')?.value.trim() || ''
  const itemId = document.getElementById('item-id')?.value.trim() || ''
  const amount = document.getElementById('item-amount')?.value.trim() || ''
  const price = document.getElementById('item-price')?.value.trim() || ''
  const submitBtn = document.getElementById('item-submit-btn')
  
  if (!submitBtn) return
  
  const isValid = characterName && server && itemId && amount && price
  
  submitBtn.disabled = !isValid
  submitBtn.style.opacity = isValid ? '1' : '0.5'
  submitBtn.style.cursor = isValid ? 'pointer' : 'not-allowed'
}

/**
 * Save item listing to Firestore
 */
export async function saveItemListing() {
  const db = getFirestore()
  const auth = getAuth()
  const errorEl = document.getElementById('item-form-error')
  
  if (!db || !auth?.currentUser) return
  
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
    
    const listingData = {
      type: 'item',
      characterName,
      server,
      pstAvailability: pstAvailability || null,
      itemId,
      itemName,
      amount,
      pricePerUnit,
      notes: notes || null,
      uid: auth.currentUser.uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      active: true
    }
    
    await db.collection('listings').add(listingData)
    
    // Reload listings
    await loadUserListings(auth.currentUser.uid)
    setStatus('status', 'Item listing created successfully', 'ok')
  } catch (error) {
    console.error('Error saving item listing:', error)
    errorEl.textContent = 'Error: ' + error.message
    errorEl.style.display = 'block'
  }
}
