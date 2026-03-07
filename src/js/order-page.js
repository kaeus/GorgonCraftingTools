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
let itemsWithIcons = null // Cache for items with icon URLs
let itemKeyToNameMap = {} // Map of ItemKey (string) -> Item Name for ingredient resolution

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
 * Also builds ItemKey -> Name mapping for ingredient resolution
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
    
    // Build ItemKey -> Name mapping for ingredients
    Object.entries(itemsData).forEach(([key, item]) => {
      if (item.InternalName && item.Name) {
        itemKeyToNameMap[item.InternalName] = item.Name
      }
    })
    
    console.log('Built ItemKey->Name map with', Object.keys(itemKeyToNameMap).length, 'entries')
    
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

/**
 * Load items with icon URLs
 */
async function loadItemsWithIcons() {
  if (itemsWithIcons) return itemsWithIcons
  
  try {
    const response = await fetch('https://cdn.projectgorgon.com/v461/data/items.json')
    if (!response.ok) throw new Error('Failed to load items')
    
    const data = await response.json()
    let items = []
    
    // Handle various response structures
    if (Array.isArray(data)) {
      items = data
    } else if (data.items && Array.isArray(data.items)) {
      items = data.items
    } else if (data.data && Array.isArray(data.data)) {
      items = data.data
    } else {
      const entries = Object.entries(data)
      if (entries.length > 0) {
        items = entries.map(([key, value]) => ({ key, ...value }))
      }
    }
    
    // Create a map of items with icon URLs
    itemsWithIcons = {}
    items.forEach(item => {
      if (item.Name && item.IconId) {
        itemsWithIcons[item.Name.toLowerCase()] = {
          name: item.Name,
          iconUrl: `https://cdn.projectgorgon.com/v461/icons/icon_${item.IconId}.png`
        }
      }
    })
    
    return itemsWithIcons
  } catch (error) {
    console.error('Error loading items with icons:', error)
    return {}
  }
}
async function fetchRecipesForProfession(profession) {
  try {
    const response = await fetch('https://cdn.projectgorgon.com/v461/data/recipes.json')
    if (!response.ok) {
      throw new Error('Failed to fetch recipes')
    }
    
    const allRecipes = await response.json()
    const itemsData = await getItemsData()
    
    console.log('Fetched recipes, total count:', Object.keys(allRecipes).length)
    console.log('Looking for profession:', profession)
    
    // Map to track all recipes per item
    const itemRecipesMap = {}
    
    Object.entries(allRecipes).forEach(([recipeId, recipe]) => {
      const recipeSkill = (recipe.Skill || '').toLowerCase()
      
      if (recipeSkill === profession.toLowerCase()) {
        // Extract items from ResultItems or ProtoResultItems
        const resultItemsList = (recipe.ResultItems && recipe.ResultItems.length > 0) ? recipe.ResultItems : (recipe.ProtoResultItems || [])
        
        resultItemsList.forEach(resultItem => {
          const itemCode = resultItem.ItemCode
          // Handle both item_### format and direct reference
          const itemKey = typeof itemCode === 'number' ? `item_${itemCode}` : itemCode
          const item = itemsData[itemKey]
          
          if (item && item.Name) {
            // Initialize array for this item if it doesn't exist
            if (!itemRecipesMap[item.Name]) {
              itemRecipesMap[item.Name] = {
                name: item.Name,
                basePrice: 0,
                profession: recipe.Skill,
                iconId: item.IconId,
                iconUrl: item.IconId ? `https://cdn.projectgorgon.com/v461/icons/icon_${item.IconId}.png` : null,
                recipes: []
              }
            }
            
            // Resolve ingredients - the Desc field is what appears in crafter sheets
            const resolvedIngredients = (recipe.Ingredients || []).map(ing => {
              // Use Desc as primary identifier since that's what appears in crafter sheets
              // Also try to resolve ItemKey to Name as fallback
              let desc = ing.Desc
              const primaryItemKey = ing.ItemKeys?.[0]
              const resolvedItemName = primaryItemKey ? itemKeyToNameMap[primaryItemKey] : null
              
              // If no Desc, try to get it from ItemCode
              if (!desc && ing.ItemCode !== undefined) {
                const itemKey = `item_${ing.ItemCode}`
                const itemInfo = itemsData[itemKey]
                if (itemInfo && itemInfo.Name) {
                  desc = itemInfo.Name
                }
              }
              
              return {
                desc: desc || 'Unknown Ingredient',
                itemName: resolvedItemName, // Resolved name for reference
                itemKey: primaryItemKey,
                itemCode: ing.ItemCode,
                stackSize: ing.StackSize || 1,
                alternativeKeys: ing.ItemKeys || []
              }
            })
            
            // Add this recipe to the item's recipe list
            itemRecipesMap[item.Name].recipes.push({
              id: recipeId,
              ingredients: resolvedIngredients,
              resultItems: recipe.ResultItems || [],
              skillReward: recipe.RewardSkill,
              full: recipe
            })
          }
        })
      }
    })
    
    // Convert to array with unique IDs
    const resultItems = Object.values(itemRecipesMap).map((item, index) => ({
      ...item,
      id: `${item.name.replace(/\s+/g, '_')}_${index}`
    }))
    
    console.log('Result items count for profession "' + profession + '":', resultItems.length)
    return resultItems
  } catch (error) {
    console.error('Error fetching recipes:', error)
    return []
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
  
  // Ensure items data is loaded (builds the ItemKey->Name mapping)
  await getItemsData()
  
  // Debug: Log all available ingredients
  console.log('=== Available ingredient prices from crafter ===')
  console.log(crafterIngredients)
  console.log('Available keys:', Object.keys(crafterIngredients))
  
  for (const ingredient of recipe.ingredients) {
    const recipeQuantity = ingredient.stackSize || 1
    const desc = ingredient.desc  // "Any Bone", "Humanoid Skull", etc.
    const itemKey = ingredient.itemKey  // "Bone", "HumanoidSkull", etc
    const itemName = ingredient.itemName  // Resolved item name if available
    
    console.log('=== Looking for ingredient ===')
    console.log('Desc:', desc)
    console.log('ItemCode:', ingredient.itemCode)
    console.log('ItemKey:', itemKey)
    console.log('Available keys:', Object.keys(crafterIngredients))
    
    // Try to find in crafter's sheet with multiple strategies
    let ingredientData = null
    let usedKey = null
    
    // Strategy 1: Try Desc directly (most likely, as crafters enter what they see)
    if (desc) {
      const descLower = desc.toLowerCase()
      console.log('Strategy 1 - Trying desc:', descLower)
      ingredientData = crafterIngredients[descLower]
      if (ingredientData) {
        usedKey = desc
        console.log('✓ Found using Desc')
      }
    }
    
    // Strategy 1.5: Fuzzy match - find crafter ingredient that shares main words with desc
    // E.g., "Basic Spider Silk" could match "Spider Silk"
    if (!ingredientData && desc) {
      const descWords = desc.toLowerCase().split(/\s+/).filter(w => w.length > 2)
      console.log('Strategy 1.5 - Fuzzy matching with words:', descWords)
      
      for (const [crafterKey, crafterData] of Object.entries(crafterIngredients)) {
        const crafterWords = crafterKey.split(/\s+/)
        // Check if crafter ingredient contains most of the recipe ingredient words
        const matchCount = descWords.filter(word => crafterWords.some(cw => cw.includes(word) || word.includes(cw))).length
        if (matchCount >= Math.max(1, descWords.length - 1)) {
          console.log(`✓ Found fuzzy match: "${desc}" -> "${crafterData.displayName}"`)
          ingredientData = crafterData
          usedKey = `${desc} (fuzzy matched to ${crafterData.displayName})`
          break
        }
      }
    }
    
    // Strategy 2: Try ItemCode → Item Name lookup
    if (!ingredientData && ingredient.itemCode !== undefined) {
      const itemsResponse = await fetch('https://cdn.projectgorgon.com/v461/data/items.json')
      const itemsData = itemsResponse.ok ? await itemsResponse.json() : {}
      const itemKey = `item_${ingredient.itemCode}`
      const itemInfo = itemsData[itemKey]
      if (itemInfo && itemInfo.Name) {
        const itemNameLower = itemInfo.Name.toLowerCase()
        console.log('Strategy 2 - Trying ItemCode → name:', itemNameLower)
        ingredientData = crafterIngredients[itemNameLower]
        if (ingredientData) {
          usedKey = itemInfo.Name
          console.log('✓ Found using ItemCode → Item Name')
        }
      }
    }
    
    // Strategy 3: Try resolved item name
    if (!ingredientData && itemName) {
      const nameLower = itemName.toLowerCase()
      console.log('Strategy 3 - Trying resolved name:', nameLower)
      ingredientData = crafterIngredients[nameLower]
      if (ingredientData) {
        usedKey = itemName
        console.log('✓ Found using resolved name')
      }
    }
    
    // Strategy 4: Try ItemKey directly
    if (!ingredientData && itemKey) {
      const keyLower = itemKey.toLowerCase()
      console.log('Strategy 4 - Trying itemKey:', keyLower)
      ingredientData = crafterIngredients[keyLower]
      if (ingredientData) {
        usedKey = itemKey
        console.log('✓ Found using itemKey')
      }
    }
    
    // Strategy 5: Search for items with this ItemKey in their Keywords
    if (!ingredientData && itemKey) {
      console.log('Strategy 5 - Searching items with ItemKey:', itemKey)
      
      // Fetch items data to find items with this keyword
      const itemsResponse = await fetch('https://cdn.projectgorgon.com/v461/data/items.json')
      const itemsData = itemsResponse.ok ? await itemsResponse.json() : {}
      
      // Find all items that have this ItemKey in their Keywords
      const matchingItems = []
      for (let [itemDatabaseKey, itemData] of Object.entries(itemsData)) {
        if (itemData && itemData.Keywords && Array.isArray(itemData.Keywords)) {
          if (itemData.Keywords.includes(itemKey) && itemData.Name) {
            matchingItems.push(itemData)
          }
        }
      }
      
      console.log(`Found ${matchingItems.length} items with ItemKey "${itemKey}":`, matchingItems.map(i => i.Name))
      
      // Check if the crafter has priced any of these items
      for (let item of matchingItems) {
        const itemNameLower = item.Name.toLowerCase()
        if (crafterIngredients[itemNameLower]) {
          ingredientData = crafterIngredients[itemNameLower]
          usedKey = `${item.Name} (matches ${itemKey})`
          console.log(`✓ Found crafter price for matching item: ${item.Name}`)
          break
        }
      }
      
      if (!ingredientData && matchingItems.length > 0) {
        console.warn(`No crafter price for items with ItemKey "${itemKey}". Available items:`, matchingItems.map(i => i.Name))
      }
    }
    
    if (!ingredientData) {
      console.warn('❌ Ingredient not found in ANY strategy:', { desc, itemKey, itemName })
      console.log('Crafter ingredient prices:')
      Object.entries(crafterIngredients).forEach(([key, data]) => {
        console.log(`  "${key}" -> ${data.displayName} (cost: ${data.cost})`)
      })
      continue // Skip this ingredient if not priced by crafter
    }
    
    console.log('✓ Found ingredient in crafter pricing using:', usedKey, '→', ingredientData)
    
    const costPerUnit = ingredientData?.cost || 0
    
    // Calculate final quantity: recipe qty × craft qty
    const finalQuantity = recipeQuantity * craftQuantity
    
    // Calculate cost: final qty × cost per unit
    const ingredientCost = finalQuantity * costPerUnit
    
    const displayName = ingredientData.displayName || usedKey || desc
    ingredients[displayName] = {
      itemName: itemName,
      itemKey: itemKey,
      desc: desc,
      recipeQuantity: recipeQuantity,
      craftQuantity: craftQuantity,
      finalQuantity: finalQuantity,
      costPerUnit: costPerUnit,
      totalCost: ingredientCost
    }
    
    craftCostTotal += ingredientCost
    console.log('Calculated ingredient:', displayName, 'qty:', finalQuantity, 'cost/unit:', costPerUnit, 'total:', ingredientCost)
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
async function handleItemSearch(searchTerm) {
  await showItemSuggestions(searchTerm)
  updateSubmitButton()
}

/**
 * Show item suggestions dropdown
 */
async function showItemSuggestions(searchTerm) {
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
    suggestionsDiv.innerHTML = matches.map(item => {
      const iconHtml = item.iconUrl
        ? `<img src="${item.iconUrl}" alt="${escapeHtml(item.name)}" style="width:24px; height:24px; margin-right:0.5rem; vertical-align:middle; border:1px solid #505050; border-radius:3px;" onerror="this.style.opacity='0.3'">`
        : ''
      return `
        <div class="item-suggestion" data-item-id="${item.id}" style="
          padding: 0.75rem;
          border-bottom: 1px solid #505050;
          cursor: pointer;
          transition: background 0.2s;
          display: flex;
          align-items: center;
        " onmouseover="this.style.background='#1a1a1a'" onmouseout="this.style.background='transparent'">
          ${iconHtml}
          <div>
            <div style="font-weight:bold;">${escapeHtml(item.name)}</div>
            <div style="font-size:0.85rem; color:#a8a8a8;">${item.basePrice} gold base price</div>
          </div>
        </div>
      `
    }).join('')
    
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
  
  if (!item) return
  
  // If item has multiple recipes, show recipe selection modal
  if (item.recipes && item.recipes.length > 1) {
    showRecipeSelectionModal(item)
  } else if (item.recipes && item.recipes.length === 1) {
    // Single recipe, use it directly
    selectItemWithRecipe(item, item.recipes[0])
  } else if (item.recipe) {
    // Fallback for old structure
    selectedItem = item
    selectedItemRecipe = item.recipe
    document.getElementById('order-item').value = item.name
    hideItemSuggestions()
    updatePricingDisplay()
  }
}

/**
 * Show modal to select which recipe to use for an item
 */
function showRecipeSelectionModal(item) {
  // Create modal if it doesn't exist
  let modal = document.getElementById('recipe-selection-modal')
  
  if (!modal) {
    modal = document.createElement('div')
    modal.id = 'recipe-selection-modal'
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 2000;
    `
    document.body.appendChild(modal)
  }
  
  // Build recipe options
  const recipeOptionsHtml = item.recipes.map((recipe, index) => {
    const ingredients = recipe.ingredients.length > 0 
      ? recipe.ingredients.slice(0, 3).map((ing, i) => {
          const desc = ing.desc || ing.itemName || ing.itemKey || 'Unknown ingredient'
          const qty = ing.stackSize > 1 ? ` x${ing.stackSize}` : ''
          return `<div style="font-size:0.8rem; color:#a8a8a8;">Ingredient ${i+1}: ${desc}${qty}</div>`
        }).join('')
      : '<div style="font-size:0.8rem; color:#a8a8a8;">No ingredients listed</div>'
    
    return `
      <button class="recipe-option-btn" data-recipe-index="${index}" style="
        display: block;
        width: 100%;
        padding: 1rem;
        margin-bottom: 0.5rem;
        background: #1a1a1a;
        border: 1px solid #505050;
        border-radius: 5px;
        color: #e8e8e8;
        cursor: pointer;
        text-align: left;
        transition: all 0.2s;
      " onmouseover="this.style.background='#252525'; this.style.borderColor='#7cb342';" onmouseout="this.style.background='#1a1a1a'; this.style.borderColor='#505050';">
        <div style="font-weight:bold; margin-bottom:0.5rem;">Recipe ${index + 1}</div>
        ${ingredients}
      </button>
    `
  }).join('')
  
  modal.innerHTML = `
    <div style="background:#0a0a0a; border:2px solid #505050; border-radius:8px; padding:2rem; max-width:500px; width:90%;">
      <h3 style="margin-bottom:1rem; color:#e8e8e8;">Multiple recipes found for ${escapeHtml(item.name)}</h3>
      <p style="color:#a8a8a8; margin-bottom:1.5rem;">Select which ingredient list you want to use:</p>
      <div style="max-height:400px; overflow-y:auto; margin-bottom:1.5rem;">
        ${recipeOptionsHtml}
      </div>
      <button style="
        padding:0.75rem 1.5rem;
        background:#505050;
        border:1px solid #505050;
        border-radius:5px;
        color:#e8e8e8;
        cursor:pointer;
        font-size:1rem;
      " onmouseover="this.style.background='#606060';" onmouseout="this.style.background='#505050';" onclick="document.getElementById('recipe-selection-modal').style.display='none';">
        Cancel
      </button>
    </div>
  `
  
  modal.style.display = 'flex'
  
  // Add click handlers to recipe options
  modal.querySelectorAll('.recipe-option-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const recipeIndex = parseInt(btn.getAttribute('data-recipe-index'))
      selectItemWithRecipe(item, item.recipes[recipeIndex])
      modal.style.display = 'none'
    })
  })
}

/**
 * Select item with a specific recipe
 */
function selectItemWithRecipe(item, recipe) {
  selectedItem = item
  selectedItemRecipe = recipe
  document.getElementById('order-item').value = item.name
  hideItemSuggestions()
  updatePricingDisplay()
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
      // Convert ingredientPrices from listing into crafterIngredients format
      if (listing.ingredientPrices) {
        console.log('Converting ingredient prices from listing:', listing.ingredientPrices)
        Object.entries(listing.ingredientPrices).forEach(([ingredientDesc, price]) => {
          const key = ingredientDesc.toLowerCase()
          crafterIngredients[key] = {
            displayName: ingredientDesc,
            qty: 1,
            cost: parseFloat(price) || 0
          }
        })
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
    const { ingredients, craftCostTotal } = await calculateOrderIngredients(selectedItemRecipe, quantity)
    
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
    const { ingredients, craftCostTotal } = await calculateOrderIngredients(selectedItemRecipe, quantity)
    
    // Clean ingredients: remove undefined values for Firestore compatibility
    const cleanedIngredients = {}
    for (const [name, data] of Object.entries(ingredients)) {
      cleanedIngredients[name] = {}
      // Only include defined values
      if (data.desc !== undefined) cleanedIngredients[name].desc = data.desc
      if (data.recipeQuantity !== undefined) cleanedIngredients[name].recipeQuantity = data.recipeQuantity
      if (data.craftQuantity !== undefined) cleanedIngredients[name].craftQuantity = data.craftQuantity
      if (data.finalQuantity !== undefined) cleanedIngredients[name].finalQuantity = data.finalQuantity
      if (data.costPerUnit !== undefined) cleanedIngredients[name].costPerUnit = data.costPerUnit
      if (data.totalCost !== undefined) cleanedIngredients[name].totalCost = data.totalCost
    }
    
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
      ingredients: cleanedIngredients,
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
