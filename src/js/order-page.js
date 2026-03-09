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
let gemSkillMapping = null // Cache for gem/crystal skill mappings
let selectedSkills = {} // Track selected skills for enchanted recipes {primarySkill: string, secondarySkill: string}

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
 * Load gem/crystal to skill mappings
 */
async function getGemSkillMapping() {
  if (gemSkillMapping) return gemSkillMapping
  
  try {
    const response = await fetch('/gem_skill_mapping.json')
    if (!response.ok) throw new Error('Failed to fetch gem skill mapping')
    gemSkillMapping = await response.json()
    return gemSkillMapping
  } catch (error) {
    console.error('Error loading gem skill mapping:', error)
    return { gems: {} }
  }
}

/**
 * Check if an ingredient is a crystal/gem and return its Primary Skill
 * @param {string} ingredientName - The name of the ingredient
 * @returns {object|null} - { gem_name, primary_skill, secondary_skill, icon_id } or null
 */
async function getGemCrystalInfo(ingredientName) {
  const mapping = await getGemSkillMapping()
  const gems = mapping.gems || {}
  
  // Normalize ingredient name for comparison
  const normalizedName = ingredientName.toLowerCase().trim()
  
  // Check if this ingredient is a gem (exact match or partial)
  for (const [gemName, gemData] of Object.entries(gems)) {
    if (gemName.toLowerCase() === normalizedName || 
        ingredientName.toLowerCase().includes(gemName.toLowerCase())) {
      return {
        gem_name: gemName,
        primary_skill: gemData.primary_skill,
        secondary_skill: gemData.secondary_skill,
        icon_id: gemData.icon_id,
        keywords: gemData.keywords
      }
    }
  }
  
  return null
}

/**
 * Check if an ingredient should be classified as "Crystal/Gem" (Primary or Auxiliary)
 * @param {string} ingredientName - The name of the ingredient
 * @returns {boolean}
 */
async function isCrystalOrGem(ingredientName) {
  const gemInfo = await getGemCrystalInfo(ingredientName)
  return gemInfo !== null
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

    // Strategy 1: Try Desc directly (most likely, as crafters enter what they see)
    if (desc) {
      const descLower = desc.toLowerCase()
      console.log('Strategy 1 - Trying desc:', descLower)
      ingredientData = crafterIngredients[descLower]
      if (ingredientData) console.log('✓ Found using Desc')
    }

    // Strategy 1.5: Fuzzy match - find crafter ingredient that shares main words with desc
    // E.g., "Basic Spider Silk" could match "Spider Silk"
    if (!ingredientData && desc) {
      const descWords = desc.toLowerCase().split(/\s+/).filter(w => w.length > 2)
      console.log('Strategy 1.5 - Fuzzy matching with words:', descWords)

      for (const [crafterKey, crafterData] of Object.entries(crafterIngredients)) {
        const crafterWords = crafterKey.split(/\s+/)
        const matchCount = descWords.filter(word => crafterWords.some(cw => cw.includes(word) || word.includes(cw))).length
        if (matchCount >= Math.max(1, descWords.length - 1)) {
          console.log(`✓ Found fuzzy match: "${desc}" -> "${crafterData.displayName}"`)
          ingredientData = crafterData
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
        if (ingredientData) console.log('✓ Found using ItemCode → Item Name')
      }
    }

    // Strategy 3: Try resolved item name
    if (!ingredientData && itemName) {
      const nameLower = itemName.toLowerCase()
      console.log('Strategy 3 - Trying resolved name:', nameLower)
      ingredientData = crafterIngredients[nameLower]
      if (ingredientData) console.log('✓ Found using resolved name')
    }

    // Strategy 4: Try ItemKey directly
    if (!ingredientData && itemKey) {
      const keyLower = itemKey.toLowerCase()
      console.log('Strategy 4 - Trying itemKey:', keyLower)
      ingredientData = crafterIngredients[keyLower]
      if (ingredientData) console.log('✓ Found using itemKey')
    }

    // Strategy 5: Search for items with this ItemKey in their Keywords
    if (!ingredientData && itemKey) {
      console.log('Strategy 5 - Searching items with ItemKey:', itemKey)

      const itemsResponse = await fetch('https://cdn.projectgorgon.com/v461/data/items.json')
      const itemsData = itemsResponse.ok ? await itemsResponse.json() : {}

      const matchingItems = []
      for (let [, itemData] of Object.entries(itemsData)) {
        if (itemData && itemData.Keywords && Array.isArray(itemData.Keywords)) {
          if (itemData.Keywords.includes(itemKey) && itemData.Name) {
            matchingItems.push(itemData)
          }
        }
      }

      console.log(`Found ${matchingItems.length} items with ItemKey "${itemKey}":`, matchingItems.map(i => i.Name))

      for (let item of matchingItems) {
        const itemNameLower = item.Name.toLowerCase()
        if (crafterIngredients[itemNameLower]) {
          ingredientData = crafterIngredients[itemNameLower]
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
    }

    const costPerUnit = ingredientData?.cost || 0
    const unpriced = !ingredientData

    // Calculate final quantity: recipe qty × craft qty
    const finalQuantity = recipeQuantity * craftQuantity

    // Calculate cost: final qty × cost per unit
    const ingredientCost = finalQuantity * costPerUnit

    const displayName = ingredientData?.displayName || desc || itemKey || 'Unknown Ingredient'
    ingredients[displayName] = {
      itemName: itemName,
      itemKey: itemKey,
      desc: desc,
      recipeQuantity: recipeQuantity,
      craftQuantity: craftQuantity,
      finalQuantity: finalQuantity,
      costPerUnit: costPerUnit,
      totalCost: ingredientCost,
      unpriced: unpriced
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
        ? `<img src="${item.iconUrl}" alt="${escapeHtml(item.name)}" style="width:32px; height:32px; margin-right:0.5rem; vertical-align:middle; border:1px solid #505050; border-radius:3px;" onerror="this.style.opacity='0.3'">`
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

function selectItemById(itemId) {
  const item = craftItems.find(i => i.id === itemId)
  
  if (!item) return
  
  // Reset selected skills for new item
  selectedSkills = {}
  
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
    const isEnchanted = recipe.full.Name.includes('Enchanted')
    console.log(recipe)
    const ingredients = recipe.ingredients.length > 0 
      ? recipe.ingredients.map((ing, i) => {
          const desc = ing.desc || ing.itemName || ing.itemKey || 'Unknown ingredient'
          const qty = ing.stackSize >= 1 ? ` x${ing.stackSize}` : ''
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
        <div style="font-weight:bold; margin-bottom:0.5rem;">Recipe: ${recipe.full.Name || index+1}</div>
        ${ingredients}
        ${isEnchanted ? '<div style="font-size:0.75rem; color:#fbbf24; margin-top:0.5rem;">✨ Enchanted Recipe</div>' : ''}
      </button>
    `
  }).join('')
  
  modal.innerHTML = `
    <div style="background:#0a0a0a; border:2px solid #505050; border-radius:8px; padding:2rem; max-width:600px; width:90%; max-height:90vh; overflow-y:auto;">
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
    btn.addEventListener('click', async () => {
      const recipeIndex = parseInt(btn.getAttribute('data-recipe-index'))
      const selectedRecipe = item.recipes[recipeIndex]
      
      // Check if recipe is enchanted
      if (selectedRecipe.full.Name.includes('Enchanted')) {
        // Show skill selection modal
        await showEnchantedSkillSelectionModal(item, selectedRecipe)
      } else {
        selectItemWithRecipe(item, selectedRecipe)
      }
      modal.style.display = 'none'
    })
  })
}

/**
 * Show skill selection modal for Enchanted recipes
 */
async function showEnchantedSkillSelectionModal(item, recipe) {
  const gemMapping = await getGemSkillMapping()
  const gems = gemMapping.gems || {}
  
  // Check if recipe has Primary Crystal ingredient
  const hasPrimaryCrystal = recipe.ingredients.some(ing => 
    ing.desc && ing.desc.toLowerCase().includes('primary crystal')
  )
  
  // Check if recipe has Auxiliary Crystal ingredient
  const hasAuxiliaryCrystal = recipe.ingredients.some(ing => 
    ing.desc && ing.desc.toLowerCase().includes('auxiliary crystal')
  )
  
  // Build unique list of all gem primary skills (used for both Primary and Secondary skill dropdowns)
  const allSkills = new Set()
  
  Object.values(gems).forEach(gem => {
    if (gem.primary_skill) allSkills.add(gem.primary_skill)
  })
  
  const skillsList = Array.from(allSkills).sort()
  
  // Create skill selection modal
  let skillModal = document.getElementById('enchanted-skill-modal')
  if (!skillModal) {
    skillModal = document.createElement('div')
    skillModal.id = 'enchanted-skill-modal'
    skillModal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 2001;
    `
    document.body.appendChild(skillModal)
  }
  
  // Build gem grid for a given skill type (primary or secondary)
  const buildGemSelect = (selectionType) => {
    // Create a mapping of skill -> first icon_id for that skill
    const skillToIcon = {}
    Object.entries(gems).forEach(([name, gem]) => {
      if (gem.primary_skill && !skillToIcon[gem.primary_skill] && !name.includes('Massive')) {
        skillToIcon[gem.primary_skill] = gem.icon_id
      }
    })
    
    const optionsHtml = skillsList.map(skill => {
      const iconId = skillToIcon[skill]
      const iconUrl = iconId ? `https://cdn.projectgorgon.com/v461/icons/icon_${iconId}.png` : ''
      return `<option value="${skill}" data-icon="${iconUrl}">${skill}</option>`
    }).join('')
    
    return `
      <select id="${selectionType}-skill-select" class="skill-select" data-selection-type="${selectionType}" style="width:100%; padding:0.5rem 0.5rem 0.5rem 2.5rem; background:url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 10 10%22><path fill=%22%23e8e8e8%22 d=%22M2 4l3 3 3-3%22/></svg>') no-repeat right 0.5rem center; background-size:12px; background-color:#1a1a1a; color:#e8e8e8; border:1px solid #505050; border-radius:4px; padding-right:1.5rem; appearance:none;">
        <option value="">-- Select ${selectionType === 'primary' ? 'Primary' : 'Auxiliary'} Crystal Skill --</option>
        ${optionsHtml}
      </select>
    `
  }
  
  // Build secondary skill field HTML (only show if hasAuxiliaryCrystal)
  const secondarySkillHtml = hasAuxiliaryCrystal ? `
    <div style="margin-bottom:1.5rem;">
      <label style="display:block; font-weight:bold; margin-bottom:0.5rem; color:#e8e8e8;">Auxiliary Crystal Skill</label>
      <div style="position:relative;">
        ${buildGemSelect('secondary')}
        <img id="secondary-skill-icon" src="" alt="" style="position:absolute; left:0.3rem; top:50%; transform:translateY(-50%); width:32px; height:32px; object-fit:contain; pointer-events:none;" />
      </div>
    </div>
  ` : ''
  
  // Build primary skill field HTML (only show if hasPrimaryCrystal)
  const primarySkillHtml = hasPrimaryCrystal ? `
    <div style="margin-bottom:1.5rem;">
      <label style="display:block; font-weight:bold; margin-bottom:0.5rem; color:#e8e8e8;">Primary Crystal Skill</label>
      <div style="position:relative;">
        ${buildGemSelect('primary')}
        <img id="primary-skill-icon" src="" alt="" style="position:absolute; left:0.3rem; top:50%; transform:translateY(-50%); width:32px; height:32px; object-fit:contain; pointer-events:none;" />
      </div>
    </div>
  ` : ''
  
  skillModal.innerHTML = `
    <div style="background:#0a0a0a; border:2px solid #505050; border-radius:8px; padding:2rem; max-width:500px; width:90%;">
      <h3 style="margin-bottom:1rem; color:#e8e8e8;">Enchanted Recipe Skills</h3>
      <p style="color:#a8a8a8; margin-bottom:1.5rem;">Select the crystal skills for this enchantment:</p>
      
      ${primarySkillHtml}
      
      ${secondarySkillHtml}
      
      <div style="display:flex; gap:1rem;">
        <button id="confirm-skills-btn" style="
          flex:1;
          padding:0.75rem;
          background:#8dc745;
          border:1px solid #8dc745;
          border-radius:5px;
          color:#000;
          font-weight:bold;
          cursor:pointer;
          font-size:1rem;
        " onmouseover="this.style.background='#a5e860';" onmouseout="this.style.background='#8dc745';">
          Confirm Skills
        </button>
        <button style="
          flex:1;
          padding:0.75rem;
          background:#505050;
          border:1px solid #505050;
          border-radius:5px;
          color:#e8e8e8;
          cursor:pointer;
          font-size:1rem;
        " onmouseover="this.style.background='#606060';" onmouseout="this.style.background='#505050';" onclick="document.getElementById('enchanted-skill-modal').style.display='none';">
          Cancel
        </button>
      </div>
    </div>
  `
  
  skillModal.style.display = 'flex'
  
  // Handle skill dropdown changes
  const skillSelects = skillModal.querySelectorAll('.skill-select')
  skillSelects.forEach(select => {
    select.addEventListener('change', (e) => {
      const selectionType = select.getAttribute('data-selection-type')
      const selectedOption = select.options[select.selectedIndex]
      const iconUrl = selectedOption.getAttribute('data-icon')
      const iconImg = document.getElementById(`${selectionType}-skill-icon`)
      
      if (iconUrl) {
        iconImg.src = iconUrl
        iconImg.style.display = 'block'
      } else {
        iconImg.style.display = 'none'
      }
    })
  })
  
  // Handle confirmation
  const confirmBtn = document.getElementById('confirm-skills-btn')
  const primarySelectElem = document.getElementById('primary-skill-select')
  const secondarySelectElem = document.getElementById('secondary-skill-select')
  
  confirmBtn.addEventListener('click', () => {
    // Validate Primary Skill only if hasPrimaryCrystal
    if (hasPrimaryCrystal) {
      const primarySkill = primarySelectElem.value
      if (!primarySkill) {
        alert('Please select a Primary Crystal Skill')
        return
      }
    }
    
    // Validate Secondary Skill only if hasAuxiliaryCrystal
    if (hasAuxiliaryCrystal) {
      const secondarySkill = secondarySelectElem.value
      if (!secondarySkill) {
        alert('Please select an Auxiliary Crystal Skill')
        return
      }
      selectedSkills = {
        primarySkill: hasPrimaryCrystal ? primarySelectElem.value : null,
        secondarySkill: secondarySkill
      }
    } else {
      selectedSkills = {
        primarySkill: hasPrimaryCrystal ? primarySelectElem.value : null,
        secondarySkill: null
      }
    }
    
    selectItemWithRecipe(item, recipe)
    skillModal.style.display = 'none'
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
    
    // Separate ingredients into crystals/gems and regular ingredients
    const iconsMap = await loadItemsWithIcons()
    const crystalIngredients = {}
    const regularIngredients = {}
    
    for (const [itemName, data] of Object.entries(ingredients)) {
      // Check if this is a Primary or Auxiliary Crystal slot
      const isCrystalSlot = itemName.toLowerCase().includes('primary crystal') || 
                            itemName.toLowerCase().includes('auxiliary crystal')
      
      if (isCrystalSlot) {
        // Crystal slots always go in crystalIngredients section
        crystalIngredients[itemName] = data
      } else {
        // Check if other items are gems
        const gemInfo = await getGemCrystalInfo(itemName)
        if (gemInfo) {
          crystalIngredients[itemName] = { ...data, gemInfo }
        } else {
          regularIngredients[itemName] = data
        }
      }
    }
    
    // Build HTML for crystal/gem section (appears at top)
    let crystalsHtml = ''
    if (Object.keys(crystalIngredients).length > 0) {
      // Get gem mapping for crystal label updates
      const gemMapping = await getGemSkillMapping()
      const gems = gemMapping.gems || {}
      
      const crystalRows = Object.entries(crystalIngredients).sort(([a], [b]) => a.localeCompare(b)).map(([itemName, data]) => {
        let displayName = itemName
        let displayIcon = iconsMap[itemName.toLowerCase()]
        
        // For enchanted recipes, handle Primary/Auxiliary crystals specially
        if (selectedItemRecipe.full.Name.includes('Enchanted') && (selectedSkills.primarySkill || selectedSkills.secondarySkill)) {
          // Check if this is Primary Crystal or Auxiliary Crystal
          const isPrimaryCrystal = itemName.toLowerCase().includes('primary crystal')
          const isAuxiliaryCrystal = itemName.toLowerCase().includes('auxiliary crystal')
          
          if (isPrimaryCrystal && selectedSkills.primarySkill) {
            // Find gem for primary skill
            for (const [gemName, gemData] of Object.entries(gems)) {
              if (gemData.primary_skill === selectedSkills.primarySkill) {
                displayName = `Primary Crystal (${gemName})`
                displayIcon = {
                  iconUrl: `https://cdn.projectgorgon.com/v461/icons/icon_${gemData.icon_id}.png`
                }
                break
              }
            }
          } else if (isAuxiliaryCrystal && selectedSkills.secondarySkill) {
            // Find gem for secondary skill
            for (const [gemName, gemData] of Object.entries(gems)) {
              if (gemData.primary_skill === selectedSkills.secondarySkill) {
                displayName = `Auxiliary Crystal (${gemName})`
                displayIcon = {
                  iconUrl: `https://cdn.projectgorgon.com/v461/icons/icon_${gemData.icon_id}.png`
                }
                break
              }
            }
          }
        }
        
        const iconHtml = displayIcon
          ? `<img src="${displayIcon.iconUrl}" alt="" style="width:32px; height:32px; border:1px solid #505050; border-radius:3px; vertical-align:middle; margin-right:6px; object-fit:contain;" onerror="this.style.display='none'">`
          : ''
        const unpricedNote = data.unpriced
          ? ` <span style="font-size:10px; color:#f59e0b; opacity:0.8;">(unpriced)</span>`
          : ''
        const costStyle = data.unpriced ? 'color:#a8a8a8; font-style:italic;' : ''
        return `
          <tr style="height:36px; border-bottom:1px solid rgba(255,255,255,0.06);">
            <td style="padding:0 1rem; text-align:left; width:50%;">${iconHtml}${escapeHtml(displayName)}${unpricedNote}</td>
            <td style="padding:0 1rem; text-align:right; width:15%;">${data.finalQuantity.toFixed(0)}</td>
            <td style="padding:0 1rem; text-align:right; width:15%; ${costStyle}">${data.costPerUnit.toFixed(0)}</td>
            <td style="padding:0 1rem; text-align:right; width:20%; font-weight:500; ${costStyle}">${data.totalCost.toFixed(0)}</td>
          </tr>
        `
      }).join('')
      
      crystalsHtml = `
        <div style="margin-bottom:1rem;">
          <div style="font-size:11px; text-transform:uppercase; letter-spacing:0.08em; color:#a8a8a8; opacity:0.6; margin-bottom:12px;">💎 Primary / Auxiliary Crystals</div>
          <table style="width:100%; border-collapse:collapse;">
            <thead>
              <tr>
                <th style="text-align:right; padding:0 1rem; height:36px; font-size:11px; color:#a8a8a8; font-weight:600; text-transform:uppercase; letter-spacing:0.08em; opacity:0.6; width:15%;">Qty</th>
                <th style="text-align:right; padding:0 1rem; height:36px; font-size:11px; color:#a8a8a8; font-weight:600; text-transform:uppercase; letter-spacing:0.08em; opacity:0.6; width:15%;">Cost/Unit</th>
                <th style="text-align:right; padding:0 1rem; height:36px; font-size:11px; color:#a8a8a8; font-weight:600; text-transform:uppercase; letter-spacing:0.08em; opacity:0.6; width:20%;">Total</th>
              </tr>
            </thead>
            <tbody>${crystalRows}</tbody>
          </table>
        </div>
      `
    }
    
    // Build HTML for regular ingredients section (appears after crystals)
    let regularIngredientsHtml = ''
    if (Object.keys(regularIngredients).length > 0) {
      const rows = Object.entries(regularIngredients).sort(([a], [b]) => a.localeCompare(b)).map(([itemName, data]) => {
        const iconData = iconsMap[itemName.toLowerCase()]
        const iconHtml = iconData
          ? `<img src="${iconData.iconUrl}" alt="" style="width:32px; height:32px; border:1px solid #505050; border-radius:3px; vertical-align:middle; margin-right:6px; object-fit:contain;" onerror="this.style.display='none'">`
          : ''
        const unpricedNote = data.unpriced
          ? ` <span style="font-size:10px; color:#f59e0b; opacity:0.8;">(unpriced)</span>`
          : ''
        const costStyle = data.unpriced ? 'color:#a8a8a8; font-style:italic;' : ''
        return `
          <tr style="height:36px; border-bottom:1px solid rgba(255,255,255,0.06);">
            <td style="padding:0 1rem; text-align:left; width:50%;">${iconHtml}${escapeHtml(itemName)}${unpricedNote}</td>
            <td style="padding:0 1rem; text-align:right; width:15%;">${data.finalQuantity.toFixed(0)}</td>
            <td style="padding:0 1rem; text-align:right; width:15%; ${costStyle}">${data.costPerUnit.toFixed(0)}</td>
            <td style="padding:0 1rem; text-align:right; width:20%; font-weight:500; ${costStyle}">${data.totalCost.toFixed(0)}</td>
          </tr>
        `
      }).join('')

      regularIngredientsHtml = `
        <div style="margin-bottom:1rem;">
          <div style="font-size:11px; text-transform:uppercase; letter-spacing:0.08em; color:#a8a8a8; opacity:0.6; margin-bottom:12px;">Ingredients</div>
          <table style="width:100%; border-collapse:collapse;">
            <thead>
              <tr>
                <th style="text-align:right; padding:0 1rem; height:36px; font-size:11px; color:#a8a8a8; font-weight:600; text-transform:uppercase; letter-spacing:0.08em; opacity:0.6; width:15%;">Qty</th>
                <th style="text-align:right; padding:0 1rem; height:36px; font-size:11px; color:#a8a8a8; font-weight:600; text-transform:uppercase; letter-spacing:0.08em; opacity:0.6; width:15%;">Cost/Unit</th>
                <th style="text-align:right; padding:0 1rem; height:36px; font-size:11px; color:#a8a8a8; font-weight:600; text-transform:uppercase; letter-spacing:0.08em; opacity:0.6; width:20%;">Total</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `
    }
    
    // Rebuild pricing div with new layout
    pricingDiv.innerHTML = `
      ${crystalsHtml}
      ${regularIngredientsHtml}
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
      selectedSkills: selectedSkills,
    }
    
    const orderId = await Orders.createOrder(orderData)
    window.location.href = `order-view.html?id=${orderId}`
  } catch (error) {
    alert('Error creating order: ' + error.message)
  }
}
