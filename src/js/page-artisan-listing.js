/**
 * Artisan Listing Page Module
 * Handles the form for creating artisan/crafter listings
 */

import * as Firebase from './firebase.js'
import * as Auth from './auth.js'
import { escapeHtml, getProfessions, setStatus } from './utils.js'
import { getRandomNail, getNailPositionStyle } from './scroll-edge.js'

/**
 * Initialize the artisan listing page
 */
export function initArtisanListingPage() {
  console.log('[ArtisanListing] Initializing artisan listing page...')
  
  // Wait a tick for Firebase to be initialized
  setTimeout(() => {
    setupPageInitialization()
  }, 50)
}

function setupPageInitialization() {
  // Set up auth state listener
  Firebase.onAuthStateChanged(user => {
    console.log('[ArtisanListing] Auth state changed, user:', user ? user.email : 'none')
    Auth.renderUserAuth(user)
    
    // Auto-populate form fields from account settings
    if (user) {
      populateFromAccountSettings()
    }
    
    // Hide loading overlay when done
    setTimeout(() => {
      const overlay = document.getElementById('global-loading-overlay')
      if (overlay) overlay.style.display = 'none'
      
      const statusBar = document.getElementById('status')
      if (statusBar) statusBar.style.display = 'none'
      
      document.body.style.visibility = 'visible'
      
      // Create nail image only when page is ready to display
      createNail()
    }, 200)
  })

  // Set up form listeners
  setupFormListeners()
  
  // Populate profession dropdown
  populateProfessions()
}

/**
 * Populate profession dropdown
 */
function populateProfessions() {
  const professionSelect = document.getElementById('artisan-profession')
  if (!professionSelect) return
  
  const professions = getProfessions()
  const options = professions.map(prof => `<option value="${prof}">${prof}</option>`).join('')
  professionSelect.innerHTML = `<option value="">Select a profession</option>${options}`
  
  // Set up profession change listener
  professionSelect.addEventListener('change', async (e) => {
    await loadAndRenderIngredients(e.target.value)
    validateForm()
  })
}

/**
 * Set up event listeners for the form
 */
function setupFormListeners() {
  const form = document.getElementById('artisan-listing-form')
  const crafterNameInput = document.getElementById('artisan-crafter-name')
  const professionInput = document.getElementById('artisan-profession')
  const commissionInput = document.getElementById('artisan-commission')
  const submitBtn = document.getElementById('artisan-submit-btn')

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      await saveArtisanListing()
    })
  }

  // Update button state on input changes
  const inputs = [crafterNameInput, professionInput, commissionInput]
  inputs.forEach(input => {
    if (input) {
      input.addEventListener('input', validateForm)
      input.addEventListener('change', validateForm)
    }
  })

  // Initial validation
  validateForm()
}

/**
 * Load and populate form fields from account settings
 */
async function populateFromAccountSettings() {
  try {
    const user = Firebase.getAuth()?.currentUser
    if (!user) return

    const db = Firebase.getFirestore()
    if (!db) return

    const userDoc = await db.collection('users').doc(user.uid).get()
    if (!userDoc.exists) return

    const data = userDoc.data()
    
    // Populate Crafter Name if not already filled
    const crafterNameInput = document.getElementById('artisan-crafter-name')
    if (crafterNameInput && !crafterNameInput.value && data.primaryCharacterName) {
      crafterNameInput.value = data.primaryCharacterName
    }
    
    // Populate Availability if not already filled
    const availabilityInput = document.getElementById('artisan-availability')
    if (availabilityInput && !availabilityInput.value && data.primaryAvailability) {
      availabilityInput.value = data.primaryAvailability
    }
    
    // Revalidate form after population
    validateForm()
  } catch (error) {
    console.warn('[ArtisanListing] Error loading account settings:', error)
  }
}

/**
 * Validate form and enable/disable submit button
 */
function validateForm() {
  const crafterName = document.getElementById('artisan-crafter-name').value.trim()
  const profession = document.getElementById('artisan-profession').value.trim()
  const commission = document.getElementById('artisan-commission').value.trim()
  
  const submitBtn = document.getElementById('artisan-submit-btn')
  const isValid = crafterName && profession && commission
  
  if (submitBtn) {
    submitBtn.disabled = !isValid
    submitBtn.style.opacity = isValid ? '1' : '0.5'
    submitBtn.style.cursor = isValid ? 'pointer' : 'not-allowed'
  }
}

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
                ingredientMap[key] = {
                  desc: item.Name,
                  itemCode: ing.ItemCode,
                  iconId: item.IconId,
                  iconUrl: item.IconId ? `https://cdn.projectgorgon.com/v461/icons/icon_${item.IconId}.png` : null
                }
              }
            }
          }
        })
      }
    })
    
    return Object.values(ingredientMap)
  } catch (error) {
    console.error('[ArtisanListing] Error fetching ingredients:', error)
    return []
  }
}

/**
 * Load and render ingredients for selected profession
 */
async function loadAndRenderIngredients(profession) {
  const fixedContainer = document.getElementById('artisan-ingredient-pricing')
  const variableContainer = document.getElementById('artisan-variable-ingredient-pricing')
  
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
      const inputId = `artisan-fixed-ing-${idx}`
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
            class="artisan-ingredient-price-input"
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
      const inputId = `artisan-variable-ing-${idx}`
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
            class="artisan-ingredient-price-input"
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
  
  // Add event listeners to ingredient inputs
  document.querySelectorAll('.artisan-ingredient-price-input').forEach(input => {
    input.addEventListener('input', validateForm)
    input.addEventListener('change', validateForm)
  })
  
  // Wire up filter inputs
  function applyFilter(container, query) {
    const q = query.toLowerCase()
    Array.from(container.children).forEach(row => {
      const ing = row.querySelector('[data-ingredient]')
      if (!ing) return
      row.style.display = ing.dataset.ingredient.toLowerCase().includes(q) ? 'flex' : 'none'
    })
  }

  const filterFixed = document.getElementById('artisan-ingredient-filter')
  const filterVariable = document.getElementById('artisan-variable-ingredient-filter')

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
function getArtisanIngredientPrices() {
  const ingredients = {}
  document.querySelectorAll('.artisan-ingredient-price-input').forEach(input => {
    const ingredientName = input.getAttribute('data-ingredient')
    const price = parseFloat(input.value) || 0
    if (ingredientName && price > 0) {
      ingredients[ingredientName] = price
    }
  })
  return ingredients
}

/**
 * Save artisan listing to Firestore
 */
async function saveArtisanListing() {
  const db = Firebase.getFirestore()
  const auth = Firebase.getAuth()
  const errorEl = document.getElementById('artisan-form-error')
  
  if (!db || !auth?.currentUser) {
    errorEl.textContent = 'You must be signed in'
    errorEl.style.display = 'block'
    return
  }

  errorEl.style.display = 'none'

  const crafterName = document.getElementById('artisan-crafter-name')?.value.trim() || ''
  const profession = document.getElementById('artisan-profession')?.value.trim() || ''
  const commissionRate = document.getElementById('artisan-commission')?.value.trim() || ''
  const ingredientPrices = getArtisanIngredientPrices()

  if (!crafterName || !profession || !commissionRate) {
    errorEl.textContent = 'Please fill in all required fields (marked with *)'
    errorEl.style.display = 'block'
    return
  }

  if (Object.keys(ingredientPrices).length === 0) {
    errorEl.textContent = 'Please set prices for at least one ingredient'
    errorEl.style.display = 'block'
    return
  }

  try {
    setStatus('status', 'Creating artisan listing…', 'loading')

    const listingData = {
      type: 'crafting',
      crafterName,
      profession,
      server: document.getElementById('artisan-server')?.value.trim() || null,
      crafterLevel: parseInt(document.getElementById('artisan-crafter-level')?.value) || null,
      pstAvailability: document.getElementById('artisan-availability')?.value.trim() || null,
      commissionRate,
      description: document.getElementById('artisan-description')?.value.trim() || null,
      ingredientPrices,
      active: document.getElementById('artisan-active')?.checked ?? true,
      uid: auth.currentUser.uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }

    await db.collection('listings').add(listingData)
    
    setStatus('status', 'Artisan listing created successfully!', 'ok')
    
    // Reset form
    document.getElementById('artisan-listing-form').reset()
    
    setTimeout(() => {
      window.location.href = 'yourListings.html'
    }, 1500)
  } catch (error) {
    console.error('Error saving artisan listing:', error)
    errorEl.textContent = 'Error: ' + error.message
    errorEl.style.display = 'block'
    setStatus('status', 'Error creating listing', 'error')
  }
}

/**
 * Create nail image element
 */
function createNail() {
  const formWrapper = document.getElementById('form-wrapper')
  if (!formWrapper) return
  
  const nailImg = document.createElement('img')
  nailImg.src = getRandomNail()
  nailImg.alt = 'nail'
  nailImg.id = 'form-nail'
  nailImg.className = 'form-nail'
  nailImg.style.cssText = 'width: 5vw; height: 5vw; ' + getNailPositionStyle()
  formWrapper.insertBefore(nailImg, formWrapper.firstChild)
}

// Initialize when page loads
initArtisanListingPage()
