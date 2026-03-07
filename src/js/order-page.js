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
let crafterIngredients = {} // Ingredient quantities/costs from crafter's sheet {itemName: {qty: number, cost: number}}
let selectedItemRecipe = null // Full recipe data for selected item
let itemsCache = null // Cache for items data (ItemCode -> Name mapping)

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
 * Fetch and cache items data for mapping ItemCode to item names
 */
async function getItemsData() {
  if (itemsCache) {
    return itemsCache
  }
  
  try {
    const response = await fetch('https://cdn.projectgorgon.com/v461/data/items.json')
    if (!response.ok) {
      throw new Error('Failed to fetch items')
    }
    
    const itemsData = await response.json()
    itemsCache = itemsData
    return itemsData
  } catch (error) {
    console.error('Error fetching items:', error)
    return {}
  }
}

/**
 * Get item name from ItemCode
 */
async function getItemName(itemCode) {
  const itemsData = await getItemsData()
  const itemKey = `item_${itemCode}`
  return itemsData[itemKey]?.Name || `Item #${itemCode}`
}
async function fetchRecipesForProfession(profession) {
  try {
    const response = await fetch('https://cdn.projectgorgon.com/v461/data/recipes.json')
    if (!response.ok) {
      throw new Error('Failed to fetch recipes')
    }
    
    const allRecipes = await response.json()
    console.log('Fetched recipes, total count:', Object.keys(allRecipes).length)
    console.log('Looking for profession:', profession)
    
    // Log first few recipe structures to debug
    const firstRecipes = Object.entries(allRecipes).slice(0, 3)
    console.log('Sample recipes:', firstRecipes)
    
    // Filter recipes by profession/skill (case-insensitive, match against Skill field)
    const professionLower = profession.toLowerCase()
    const filtered = Object.entries(allRecipes)
      .filter(([id, recipe]) => {
        // API uses "Skill" field, not "Profession"
        const recipeSkill = (recipe.Skill || '').toLowerCase()
        const matches = recipeSkill === professionLower && recipe.Name
        if (matches) {
          console.log('Found matching recipe:', recipe.Name, 'Skill:', recipe.Skill)
        }
        return matches
      })
      .map(([id, recipe]) => ({
        id: id,
        name: recipe.Name,
        basePrice: 0,
        profession: recipe.Skill,
        ingredients: recipe.Ingredients || [], // Array of {ItemCode: number, StackSize: number}
        resultItems: recipe.ResultItems || [], // Array of {ItemCode: number, StackSize: number}
        skillReward: recipe.RewardSkill,
        recipe: recipe // Store full recipe
      }))
    
    console.log('Filtered recipes count for profession "' + profession + '":', filtered.length)
    
    return filtered
  } catch (error) {
    console.error('Error fetching recipes:', error)
    return []
  }
}

/**
 * Parse CSV data from Google Sheet into ingredient data
 * Intelligently finds columns with "ingredient" and "price" headers
 */
function parseSheetIngredients(csvData) {
  const ingredients = {}
  const lines = csvData.split('\n')
  
  if (lines.length < 2) {
    console.warn('Sheet has no data or only headers')
    return ingredients
  }
  
  // Parse header row to find ingredient and price columns
  const headerCells = lines[0].split(',').map(cell => cell.trim().replace(/^"|"$/g, ''))
  console.log('=== Sheet Headers ===')
  headerCells.forEach((h, i) => console.log(`Column ${i}: "${h}"`))
  
  // Find column indices for ingredient and price (more specific matching)
  let ingredientColIndex = -1
  let priceColIndex = -1
  
  for (let i = 0; i < headerCells.length; i++) {
    const header = headerCells[i].toLowerCase().trim()
    
    // Look for ingredient/item column (exact or close match)
    if (header === 'ingredient' || header === 'item' || header === 'item name' || 
        header === 'name' || header === 'item_name' || header === 'ingredient_name') {
      ingredientColIndex = i
      console.log('✓ Found ingredient column at index', i, ':', headerCells[i])
    }
    
    // Look for price/cost column
    if (header === 'price' || header === 'cost' || header === 'value' || 
        header === 'cost_per_unit' || header === 'price_per_unit' ||
        header === 'unit cost' || header === 'unit price') {
      priceColIndex = i
      console.log('✓ Found price column at index', i, ':', headerCells[i])
    }
  }
  
  if (ingredientColIndex === -1) {
    console.error('❌ Could not find ingredient column. Headers:', headerCells)
    return ingredients
  }
  
  if (priceColIndex === -1) {
    console.error('❌ Could not find price column. Headers:', headerCells)
    return ingredients
  }
  
  // Parse data rows
  console.log('=== Parsing Ingredients ===')
  console.log('Ingredient col:', ingredientColIndex, 'Price col:', priceColIndex)
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    
    const cells = line.split(',').map(cell => cell.trim().replace(/^"|"$/g, ''))
    
    if (cells.length > Math.max(ingredientColIndex, priceColIndex)) {
      const itemName = cells[ingredientColIndex]?.trim() || ''
      const costStr = cells[priceColIndex]?.trim() || ''
      const costPerUnit = parseFloat(costStr)
      
      // Skip empty rows or rows with invalid prices
      if (!itemName || isNaN(costPerUnit)) {
        console.log(`Skipping row ${i}: item="${itemName}" cost="${costStr}"`)
        continue
      }
      
      // Skip rows that look like they contain skill arrays or special formatting
      if (itemName.includes('[') && itemName.includes(']')) {
        console.log(`Skipping row ${i}: appears to be skills array: "${itemName}"`)
        continue
      }
      
      const key = itemName.toLowerCase()
      ingredients[key] = {
        displayName: itemName,
        qty: 1,
        cost: costPerUnit
      }
      console.log(`✓ Parsed: "${itemName}" = ${costPerUnit} councils`)
    }
  }
  
  console.log('=== Total ingredients parsed: ' + Object.keys(ingredients).length)
  Object.entries(ingredients).forEach(([key, data]) => {
    console.log(`  "${key}" -> "${data.displayName}": ${data.cost}`)
  })
  
  return ingredients
}

/**
 * Load crafter's Google Sheet and parse ingredients
 */
async function loadCrafterIngredients(sheetUrl) {
  try {
    if (!sheetUrl || !sheetUrl.includes('docs.google.com/spreadsheets')) {
      console.warn('Invalid or missing sheet URL')
      return {}
    }
    
    // Extract sheet ID from URL
    const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/)
    if (!match) {
      console.warn('Could not extract sheet ID from URL:', sheetUrl)
      return {}
    }
    
    const sheetId = match[1]
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`
    
    console.log('Fetching CSV from:', csvUrl)
    const response = await fetch(csvUrl)
    if (!response.ok) {
      throw new Error('Failed to fetch sheet: ' + response.status)
    }
    
    const csvData = await response.text()
    console.log('Fetched CSV data, length:', csvData.length)
    const ingredients = parseSheetIngredients(csvData)
    return ingredients
  } catch (error) {
    console.error('Error loading crafter ingredients:', error)
    return {}
  }
}

/**
 * Calculate final ingredient quantities and costs for an order
 */
async function calculateOrderIngredients(recipe, craftQuantity) {
  const ingredients = {}
  let craftCostTotal = 0
  
  if (!recipe.ingredients || recipe.ingredients.length === 0) {
    console.warn('Recipe has no ingredients')
    return { ingredients: {}, craftCostTotal: 0 }
  }
  
  const itemsData = await getItemsData()
  
  // Debug: Log all available ingredients from sheet
  console.log('=== Available ingredients in sheet ===')
  console.log(crafterIngredients)
  console.log('Available keys:', Object.keys(crafterIngredients))
  
  for (const ingredient of recipe.ingredients) {
    const itemCode = ingredient.ItemCode
    const recipeQuantity = ingredient.StackSize || 1
    const itemKey = `item_${itemCode}`
    const itemName = itemsData[itemKey]?.Name || `Item #${itemCode}`
    const itemNameLower = itemName.toLowerCase()
    
    console.log('=== Looking for ingredient ===')
    console.log('ItemCode:', itemCode)
    console.log('Item name from API:', itemName)
    console.log('Searching for (lowercase):', itemNameLower)
    
    // Get ingredient data from crafter's sheet
    const ingredientData = crafterIngredients[itemNameLower]
    
    if (!ingredientData) {
      console.warn('❌ Ingredient not found:', itemName)
      console.log('Available in sheet:', Object.keys(crafterIngredients).map(k => `"${k}" (original: ${crafterIngredients[k].displayName || 'N/A'})`))
      continue // Skip this ingredient if not in sheet
    }
    
    console.log('✓ Found ingredient in sheet:', ingredientData)
    
    const costPerUnit = ingredientData?.cost || 0
    
    // Calculate final quantity: recipe qty × craft qty
    const finalQuantity = recipeQuantity * craftQuantity
    
    // Calculate cost: final qty × cost per unit
    const ingredientCost = finalQuantity * costPerUnit
    
    ingredients[itemName] = {
      itemCode: itemCode,
      recipeQuantity: recipeQuantity,
      craftQuantity: craftQuantity,
      finalQuantity: finalQuantity,
      costPerUnit: costPerUnit,
      totalCost: ingredientCost
    }
    
    craftCostTotal += ingredientCost
    console.log('Calculated ingredient:', itemName, 'qty:', finalQuantity, 'cost/unit:', costPerUnit, 'total:', ingredientCost)
  }
  
  console.log('Total craft cost:', craftCostTotal)
  return {
    ingredients: ingredients,
    craftCostTotal: craftCostTotal
  }
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
    selectedItemRecipe = item.recipe // Store full recipe for ingredient calculation
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
    
    console.log('Loaded listing:', listing)
    
    if (listing) {
      // Load crafter's ingredients from their Google Sheet
      if (listing.sheetUrl) {
        console.log('Loading crafter ingredients from sheet:', listing.sheetUrl)
        crafterIngredients = await loadCrafterIngredients(listing.sheetUrl)
        console.log('Loaded crafter ingredients:', crafterIngredients)
      }
      
      // Load recipes for this profession
      console.log('Fetching recipes for profession:', listing.profession)
      craftItems = await fetchRecipesForProfession(listing.profession)
      console.log('Final craftItems count:', craftItems.length)
      
      const emoji = PROFESSION_EMOJI[listing.profession] || '🔨'
      
      // Create crafter card with all details
      const card = document.createElement('div')
      card.className = 'listing-crafting-card'
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
async function updatePricingDisplay() {
  const quantityInput = document.getElementById('order-quantity')
  const pricingDiv = document.getElementById('order-pricing')
  
  if (!selectedItem || !currentListing) {
    pricingDiv.style.display = 'none'
    return
  }
  
  const quantity = parseInt(quantityInput?.value || 1) || 1
  
  // Calculate and display ingredients if recipe is available
  if (selectedItemRecipe) {
    const { ingredients, craftCostTotal } = await calculateOrderIngredients(selectedItem, quantity)
    
    // Parse commission rate (e.g., "50%" -> 0.5)
    const commissionStr = (currentListing.commissionRate || '50%').replace('%', '')
    const commissionRate = parseInt(commissionStr) / 100
    
    // Calculate final total with commission
    const commissionCost = craftCostTotal * commissionRate
    const finalTotal = craftCostTotal + commissionCost
    
    // Create ingredients display
    let ingredientsHtml = ''
    if (Object.keys(ingredients).length > 0) {
      ingredientsHtml = '<div style="margin-bottom:1rem;"><div style="font-weight:bold; margin-bottom:0.75rem;">Ingredients Needed:</div>'
      
      Object.entries(ingredients).forEach(([itemName, data]) => {
        const ingredientTotal = data.finalQuantity * data.costPerUnit
        ingredientsHtml += `
          <div style="display:flex; justify-content:space-between; font-size:0.9rem; margin-bottom:0.5rem;">
            <span>${escapeHtml(itemName)} x ${data.finalQuantity.toFixed(2)}</span>
            <span>${(ingredientTotal).toFixed(0)} councils</span>
          </div>
        `
      })
      
      ingredientsHtml += '</div>'
    }
    
    // Rebuild pricing div with new layout
    pricingDiv.innerHTML = `
      ${ingredientsHtml}
      <div style="border-top:1px solid #505050; padding-top:1rem;">
        <div style="display:flex; justify-content:space-between; margin-bottom:0.75rem;">
          <span style="font-weight:bold;">Craft Cost Total:</span>
          <span style="font-weight:bold;">${craftCostTotal.toFixed(0)} councils</span>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:1rem;">
          <span style="color:#a8a8a8;">Commission (${commissionStr}%):</span>
          <span style="color:#a8a8a8;">${commissionCost.toFixed(0)} councils</span>
        </div>
        <div style="display:flex; justify-content:space-between; border-top:1px solid #505050; padding-top:0.75rem; font-weight:bold; font-size:1.1rem;">
          <span>Total:</span>
          <span style="color:#8dc745;">${finalTotal.toFixed(0)} councils</span>
        </div>
      </div>
    `
  }
  
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
    const quantity = parseInt(document.getElementById('order-quantity').value) || 1
    const { ingredients, craftCostTotal } = await calculateOrderIngredients(selectedItem, quantity)
    
    // Calculate commission
    const commissionStr = (currentListing.commissionRate || '50%').replace('%', '')
    const commissionRate = parseInt(commissionStr) / 100
    const commissionCost = craftCostTotal * commissionRate
    const finalTotal = craftCostTotal + commissionCost
    
    const orderData = {
      ...currentListing,
      itemId: selectedItem.id,
      itemName: selectedItem.name,
      quantity: quantity,
      characterName: charName,
      notes: document.getElementById('order-notes').value,
      ingredients: ingredients,
      craftCostTotal: craftCostTotal,
      commissionRate: commissionStr,
      commissionCost: commissionCost,
      finalTotal: finalTotal,
    }
    
    const orderId = await Orders.createOrder(orderData)
    window.location.href = `order-view.html?id=${orderId}`
  } catch (error) {
    alert('Error creating order: ' + error.message)
  }
}
