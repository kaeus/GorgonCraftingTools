/**
 * Orders Module
 * Handles creating, viewing, and managing orders
 */

import { getFirestore, getAuth } from './firebase.js'
import { escapeHtml, formatDate } from './utils.js'

/**
 * Subscribe to user's orders
 */
export function subscribeMyOrders(uid, callback) {
  const db = getFirestore()
  if (!db) {
    console.error('Firestore not initialized')
    return null
  }

  return db.collection('orders')
    .where('customerUid', '==', uid)
    .onSnapshot(snap => {
      const userOrders = snap.docs.sort((a, b) => {
        const timeA = a.data().createdAt?.toMillis?.() || 0
        const timeB = b.data().createdAt?.toMillis?.() || 0
        return timeB - timeA
      })

      callback(userOrders)
    })
}

/**
 * Render orders table
 */
export function renderMyOrders(docs) {
  const container = document.getElementById('my-orders-container')
  const section = document.getElementById('my-orders-section')
  
  if (!container) return

  if (docs.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding:1.5rem 0;">You haven\'t placed any orders yet.</div>'
    if (section) section.classList.add('section-hidden')
    return
  }

  if (section) section.classList.remove('section-hidden')

  const rows = docs.map(doc => {
    const d = doc.data()
    const canCancel = d.status === 'pending'
    const cancelBtn = canCancel
      ? `<button class="cancel-btn" onclick="cancelOrder('${doc.id}')">Cancel</button>`
      : ''
    const date = formatDate(d.createdAt)

    return `
      <tr>
        <td style="max-width:150px;"><strong>${escapeHtml(d.crafterName)}</strong></td>
        <td>${escapeHtml(d.itemName || d.profession)}</td>
        <td><span class="badge ${d.status}">${d.status}</span></td>
        <td>${date}</td>
        <td>${cancelBtn}</td>
        <td><button class="delete-order-btn" onclick="deleteOrder('${doc.id}')">Delete</button></td>
        <td><a href="order-view.html?id=${doc.id}" class="action-btn" style="padding:0.3rem 0.75rem; font-size:0.8rem;">View</a></td>
      </tr>
    `
  }).join('')

  container.innerHTML = `
    <table class="orders-table">
      <thead>
        <tr>
          <th>Crafter</th>
          <th>Item</th>
          <th>Status</th>
          <th>Date</th>
          <th></th>
          <th></th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `
}

/**
 * Cancel an order
 */
export async function cancelOrder(orderId) {
  const db = getFirestore()
  if (!db) return

  try {
    await db.collection('orders').doc(orderId).update({
      status: 'cancelled',
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    })
  } catch (error) {
    console.error('Error cancelling order:', error)
    alert('Failed to cancel order: ' + error.message)
  }
}

/**
 * Delete an order
 */
export async function deleteOrder(orderId) {
  const db = getFirestore()
  if (!db) return

  if (!confirm('Are you sure you want to delete this order?')) return

  try {
    await db.collection('orders').doc(orderId).delete()
  } catch (error) {
    console.error('Error deleting order:', error)
    alert('Failed to delete order: ' + error.message)
  }
}

/**
 * Create a new order
 */
export async function createOrder(orderData) {
  const db = getFirestore()
  const auth = getAuth()
  
  if (!db || !auth || !auth.currentUser) {
    console.error('Not authenticated or Firestore not initialized')
    return null
  }

  try {
    const orderRef = await db.collection('orders').add({
      customerUid: auth.currentUser.uid,
      customerEmail: auth.currentUser.email,
      listingId: orderData.id,
      crafterName: orderData.crafterName,
      crafterUid: orderData.uid,
      profession: orderData.profession,
      // Order details
      itemId: orderData.itemId,
      itemName: orderData.itemName,
      quantity: orderData.quantity,
      characterName: orderData.characterName,
      notes: orderData.notes || '',
      ingredients: orderData.ingredients || {},
      craftCostTotal: orderData.craftCostTotal || 0,
      commissionRate: orderData.commissionRate || '50%',
      commissionCost: orderData.commissionCost || 0,
      finalTotal: orderData.finalTotal || 0,
      selectedSkills: orderData.selectedSkills || { primarySkill: null, secondarySkill: null },
      status: 'pending',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    
    return orderRef.id
  } catch (error) {
    console.error('Error creating order:', error)
    throw error
  }
}

/**
 * Get order details
 */
export async function getOrderById(orderId) {
  const db = getFirestore()
  if (!db) return null

  try {
    const doc = await db.collection('orders').doc(orderId).get()
    return doc.exists ? { id: doc.id, ...doc.data() } : null
  } catch (error) {
    console.error('Error fetching order:', error)
    return null
  }
}

/**
 * Render order details on the order-view page
 */
export async function renderOrderDetails(order, currentUser = null) {
  const statusDiv = document.getElementById('status')
  const detailsDiv = document.getElementById('order-details')
  
  if (!order || !detailsDiv) {
    if (statusDiv) {
      statusDiv.textContent = 'Order not found'
      statusDiv.className = 'status-bar error'
    }
    return
  }

  // Fetch items data to get icon for the ordered item + build name→icon map for ingredients
  let itemIconUrl = null
  const ingredientIconMap = {}
  let gemMapping = null
  
  try {
    const response = await fetch('https://cdn.projectgorgon.com/v461/data/items.json')
    if (response.ok) {
      const itemsData = await response.json()
      for (const [, item] of Object.entries(itemsData)) {
        if (item.Name && item.IconId) {
          ingredientIconMap[item.Name.toLowerCase()] = `https://cdn.projectgorgon.com/v461/icons/icon_${item.IconId}.png`
        }
        if (item.Name === order.itemName && item.IconId) {
          itemIconUrl = `https://cdn.projectgorgon.com/v461/icons/icon_${item.IconId}.png`
        }
      }
    }
  } catch (error) {
    console.error('Error fetching items data:', error)
  }
  
  // Load gem skill mapping
  try {
    const response = await fetch('./public/gem_skill_mapping.json')
    if (response.ok) {
      gemMapping = await response.json()
    }
  } catch (error) {
    console.error('Error fetching gem mapping:', error)
  }

  // Format the date
  const createdDate = order.createdAt?.toDate?.()
    ? new Date(order.createdAt.toDate()).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : '—'

  // Render status badge
  const statusBadge = `
    <span style="
      background: rgba(245, 158, 11, 0.15);
      color: #f59e0b;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
    ">${escapeHtml(order.status || 'pending').toUpperCase()}</span>
  `

  // Build ingredients sections (crystal and regular)
  let crystalsHtml = ''
  let regularIngredientsHtml = ''
  
  if (order.ingredients && Object.keys(order.ingredients).length > 0) {
    const gems = gemMapping?.gems || {}
    const crystalIngredients = {}
    const regularIngredients = {}
    
    // Separate ingredients into crystal and regular
    for (const [name, data] of Object.entries(order.ingredients)) {
      const isCrystalSlot = name.toLowerCase().includes('primary crystal') || 
                            name.toLowerCase().includes('auxiliary crystal')
      if (isCrystalSlot) {
        crystalIngredients[name] = data
      } else {
        regularIngredients[name] = data
      }
    }
    
    // Build crystal ingredients table
    if (Object.keys(crystalIngredients).length > 0) {
      const crystalRows = Object.entries(crystalIngredients).sort(([a], [b]) => a.localeCompare(b)).map(([name, data]) => {
        let displayName = name
        let displayIcon = ingredientIconMap[name.toLowerCase()]
        
        // For Primary/Auxiliary crystals with selected skills, show gem name and icon
        if (order.selectedSkills && (order.selectedSkills.primarySkill || order.selectedSkills.secondarySkill)) {
          const isPrimaryCrystal = name.toLowerCase().includes('primary crystal')
          const isAuxiliaryCrystal = name.toLowerCase().includes('auxiliary crystal')
          
          if (isPrimaryCrystal && order.selectedSkills.primarySkill) {
            // Find gem for primary skill
            for (const [gemName, gemData] of Object.entries(gems)) {
              if (gemData.primary_skill === order.selectedSkills.primarySkill) {
                displayName = `Primary Crystal (${gemName})`
                displayIcon = { iconUrl: `https://cdn.projectgorgon.com/v461/icons/icon_${gemData.icon_id}.png` }
                break
              }
            }
          } else if (isAuxiliaryCrystal && order.selectedSkills.secondarySkill) {
            // Find gem for secondary skill
            for (const [gemName, gemData] of Object.entries(gems)) {
              if (gemData.primary_skill === order.selectedSkills.secondarySkill) {
                displayName = `Auxiliary Crystal (${gemName})`
                displayIcon = { iconUrl: `https://cdn.projectgorgon.com/v461/icons/icon_${gemData.icon_id}.png` }
                break
              }
            }
          }
        }
        
        const iconUrl = displayIcon?.iconUrl || displayIcon
        const iconHtml = iconUrl
          ? `<img src="${iconUrl}" alt="" style="width:32px; height:32px; border:1px solid #505050; border-radius:3px; vertical-align:middle; margin-right:6px; object-fit:contain;" onerror="this.style.display='none'">`
          : ''
        const isUnpriced = data.unpriced || (data.costPerUnit || 0) === 0
        const unpricedNote = isUnpriced
          ? ` <span style="font-size:10px; color:#f59e0b; opacity:0.8;">(unpriced)</span>`
          : ''
        const costStyle = isUnpriced ? 'color:#a8a8a8; font-style:italic;' : ''
        const totalCost = data.totalCost || 0
        
        return `
          <tr style="height: 36px; border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
            <td style="padding: 0 1rem; text-align: left; width: 50%;">${iconHtml}${escapeHtml(displayName)}${unpricedNote}</td>
            <td style="padding: 0 1rem; text-align: right; width: 15%;">${(data.finalQuantity || 0).toFixed(0)}</td>
            <td style="padding: 0 1rem; text-align: right; width: 15%; ${costStyle}">${(data.costPerUnit || 0).toFixed(0)}</td>
            <td style="padding: 0 1rem; text-align: right; width: 20%; font-weight: 500; ${costStyle}">${totalCost.toFixed(0)}</td>
          </tr>
        `
      }).join('')
      
      crystalsHtml = `
        <div style="margin-bottom: 20px;">
          <div style="
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            opacity: 0.6;
            color: #a8a8a8;
            margin-bottom: 12px;
          ">💎 Primary / Auxiliary Crystals</div>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr>
                <th style="text-align: right; padding: 0 1rem; height: 36px; font-size: 11px; color: #a8a8a8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; opacity: 0.6; width: 15%;">Qty</th>
                <th style="text-align: right; padding: 0 1rem; height: 36px; font-size: 11px; color: #a8a8a8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; opacity: 0.6; width: 15%;">Cost/Unit</th>
                <th style="text-align: right; padding: 0 1rem; height: 36px; font-size: 11px; color: #a8a8a8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; opacity: 0.6; width: 20%;">Total</th>
              </tr>
            </thead>
            <tbody>${crystalRows}</tbody>
          </table>
        </div>
      `
    }
    
    // Build regular ingredients table
    if (Object.keys(regularIngredients).length > 0) {
      const regularRows = Object.entries(regularIngredients).sort(([a], [b]) => a.localeCompare(b)).map(([name, data]) => {
        const totalCost = data.totalCost || 0
        const iconUrl = ingredientIconMap[name.toLowerCase()]
        const iconHtml = iconUrl
          ? `<img src="${iconUrl}" alt="" style="width:32px; height:32px; border:1px solid #505050; border-radius:3px; vertical-align:middle; margin-right:6px; object-fit:contain;" onerror="this.style.display='none'">`
          : ''
        const isUnpriced = data.unpriced || (data.costPerUnit || 0) === 0
        const unpricedNote = isUnpriced
          ? ` <span style="font-size:10px; color:#f59e0b; opacity:0.8;">(unpriced)</span>`
          : ''
        const costStyle = isUnpriced ? 'color:#a8a8a8; font-style:italic;' : ''
        return `
          <tr style="height: 36px; border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
            <td style="padding: 0 1rem; text-align: left; width: 50%;">${iconHtml}${escapeHtml(name)}${unpricedNote}</td>
            <td style="padding: 0 1rem; text-align: right; width: 15%;">${(data.finalQuantity || 0).toFixed(0)}</td>
            <td style="padding: 0 1rem; text-align: right; width: 15%; ${costStyle}">${(data.costPerUnit || 0).toFixed(0)}</td>
            <td style="padding: 0 1rem; text-align: right; width: 20%; font-weight: 500; ${costStyle}">${totalCost.toFixed(0)}</td>
          </tr>
        `
      }).join('')
      
      regularIngredientsHtml = `
        <div style="margin-bottom: 20px;">
          <div style="
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            opacity: 0.6;
            color: #a8a8a8;
            margin-bottom: 12px;
          ">Ingredients</div>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr>
                <th style="text-align: right; padding: 0 1rem; height: 36px; font-size: 11px; color: #a8a8a8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; opacity: 0.6; width: 15%;">Qty</th>
                <th style="text-align: right; padding: 0 1rem; height: 36px; font-size: 11px; color: #a8a8a8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; opacity: 0.6; width: 15%;">Cost/Unit</th>
                <th style="text-align: right; padding: 0 1rem; height: 36px; font-size: 11px; color: #a8a8a8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; opacity: 0.6; width: 20%;">Total</th>
              </tr>
            </thead>
            <tbody>${regularRows}</tbody>
          </table>
        </div>
      `
    }
  }

  // Item display with icon
  const itemDisplay = itemIconUrl
    ? `
      <div style="display: flex; align-items: center; gap: 12px;">
        <img src="${itemIconUrl}" alt="${escapeHtml(order.itemName || '')}" style="
          width: 40px;
          height: 40px;
          border: 1px solid #505050;
          border-radius: 4px;
          object-fit: contain;
          background: rgba(0, 0, 0, 0.3);
        " onerror="this.style.opacity='0.3'">
        <span style="font-size: 15px; font-weight: 500; color: #e8e8e8;">${escapeHtml(order.itemName || '—')}</span>
      </div>
    `
    : `<span style="font-size: 15px; font-weight: 500; color: #e8e8e8;">${escapeHtml(order.itemName || '—')}</span>`

  // Build the single card layout
  detailsDiv.innerHTML = `
    <div style="
      background: #0a0a0a;
      border: 1px solid #505050;
      border-radius: 5px;
      padding: 24px;
    ">
      <!-- HEADER SECTION -->
      <div style="
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 0;
      ">
        <div style="
          font-size: 18px;
          font-weight: bold;
          font-family: monospace;
          color: #e8e8e8;
        ">Order #${escapeHtml(order.id.substring(0, 12))}</div>
        <span style="color: #666; margin: 0 4px;">•</span>
        <div style="
          font-size: 13px;
          color: #a8a8a8;
        ">${createdDate}</div>
        <div style="margin-left: auto;">
          ${statusBadge}
        </div>
      </div>

      <!-- DIVIDER -->
      <div style="
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        margin: 20px 0;
      "></div>

      <!-- ORDER INFO SECTION -->
      <div style="
        display: grid;
        grid-template-columns: 2fr 1fr 1fr;
        gap: 24px;
        margin-bottom: 20px;
      ">
        <div>
          <div style="
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            opacity: 0.6;
            color: #a8a8a8;
            margin-bottom: 4px;
          ">Item</div>
          ${itemDisplay}
        </div>
        <div>
          <div style="
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            opacity: 0.6;
            color: #a8a8a8;
            margin-bottom: 4px;
          ">Quantity</div>
          <div style="
            font-size: 15px;
            font-weight: 500;
            color: #e8e8e8;
          ">${order.quantity || 1}</div>
        </div>
        <div>
          <div style="
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            opacity: 0.6;
            color: #a8a8a8;
            margin-bottom: 4px;
          ">Crafter</div>
          <div style="
            font-size: 15px;
            font-weight: 500;
            color: #e8e8e8;
          ">${escapeHtml(order.crafterName || '—')}</div>
        </div>
      </div>

      <!-- NOTES SECTION (if present) -->
      ${order.notes ? `
        <div style="margin-bottom: 20px;">
          <div style="
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            opacity: 0.6;
            color: #a8a8a8;
            margin-bottom: 4px;
          ">Notes</div>
          <div style="
            font-size: 14px;
            opacity: 0.9;
            color: #e8e8e8;
          ">${escapeHtml(order.notes)}</div>
        </div>
      ` : ''}

      <!-- DIVIDER -->
      <div style="
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        margin: 20px 0;
      "></div>

      <!-- INGREDIENTS SECTION -->
      ${crystalsHtml}
      ${regularIngredientsHtml}
      ${!crystalsHtml && !regularIngredientsHtml ? `
        <div style="
          color: #a8a8a8;
          font-size: 14px;
          margin-bottom: 20px;
        ">No ingredients recorded</div>
      ` : ''}

      <!-- DIVIDER -->
      <div style="
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        margin: 20px 0;
      "></div>

      <!-- COST SUMMARY SECTION -->
      <div style="
        max-width: 260px;
        margin-left: auto;
        text-align: right;
      ">
        <div style="
          display: flex;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 6px;
          font-size: 13px;
        ">
          <span style="color: #a8a8a8;">Craft Cost</span>
          <span style="color: #e8e8e8;">${(order.craftCostTotal || 0).toFixed(0)}</span>
        </div>
        <div style="
          display: flex;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 12px;
          font-size: 13px;
        ">
          <span style="color: #a8a8a8;">Commission</span>
          <span style="color: #e8e8e8;">${(order.commissionCost || 0).toFixed(0)}</span>
        </div>
        <div style="
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          padding-top: 10px;
          display: flex;
          justify-content: space-between;
          gap: 16px;
          font-size: 20px;
          font-weight: 700;
          color: #7bd88f;
        ">
          <span>Total</span>
          <span>${(order.finalTotal || 0).toFixed(0)}</span>
        </div>
      </div>

      ${(() => {
        if (!currentUser) return ''
        const isCustomer = order.customerUid === currentUser.uid
        const isCrafter = order.crafterUid === currentUser.uid
        const buttons = []

        if (isCustomer && order.status === 'pending') {
          buttons.push(`<button class="cancel-btn" onclick="cancelOrderAndReload('${order.id}')">Cancel Order</button>`)
        }
        if (isCrafter && order.status === 'pending') {
          buttons.push(`<button class="action-btn" onclick="markOrderInProgress('${order.id}')">Mark In Progress</button>`)
        }
        if (isCrafter && order.status === 'in_progress') {
          buttons.push(`<button class="action-btn" onclick="markOrderComplete('${order.id}')">Mark Complete</button>`)
        }
        if (isCustomer || isCrafter) {
          buttons.push(`<button class="delete-order-btn" onclick="deleteOrderAndRedirect('${order.id}')">Delete</button>`)
        }

        if (buttons.length === 0) return ''
        return `
          <div style="
            border-top: 1px solid rgba(255, 255, 255, 0.08);
            margin-top: 20px;
            padding-top: 16px;
            display: flex;
            gap: 12px;
            justify-content: flex-end;
          ">
            ${buttons.join('')}
          </div>
        `
      })()}
    </div>
  `

  // Hide status, show details
  if (statusDiv) {
    statusDiv.style.display = 'none'
  }
  detailsDiv.style.display = 'block'
}

/**
 * Subscribe to orders placed with the current user (as a crafter)
 */
export function subscribeCrafterOrders(uid, callback) {
  const db = getFirestore()
  if (!db) {
    console.error('Firestore not initialized')
    return null
  }

  return db.collection('orders')
    .where('crafterUid', '==', uid)
    .onSnapshot(snap => {
      const crafterOrders = snap.docs.sort((a, b) => {
        const timeA = a.data().createdAt?.toMillis?.() || 0
        const timeB = b.data().createdAt?.toMillis?.() || 0
        return timeB - timeA
      })

      callback(crafterOrders)
    })
}

/**
 * Render incoming orders table (crafter view)
 */
export function renderIncomingOrders(docs) {
  const container = document.getElementById('incoming-orders-container')
  const section = document.getElementById('incoming-orders-section')

  if (!container) return

  if (docs.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding:1.5rem 0;">No orders have been placed with you yet.</div>'
    if (section) section.classList.remove('section-hidden')
    return
  }

  if (section) section.classList.remove('section-hidden')

  const rows = docs.map(doc => {
    const d = doc.data()
    const date = formatDate(d.createdAt)

    return `
      <tr>
        <td style="max-width:150px;"><strong>${escapeHtml(d.characterName || d.customerEmail || '—')}</strong></td>
        <td>${escapeHtml(d.itemName || '—')}</td>
        <td>${d.quantity || 1}</td>
        <td><span class="badge ${d.status}">${d.status}</span></td>
        <td>${date}</td>
        <td><a href="order-view.html?id=${doc.id}" class="action-btn" style="padding:0.3rem 0.75rem; font-size:0.8rem;">View</a></td>
      </tr>
    `
  }).join('')

  container.innerHTML = `
    <table class="orders-table">
      <thead>
        <tr>
          <th>Customer</th>
          <th>Item</th>
          <th>Qty</th>
          <th>Status</th>
          <th>Date</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `
}

/**
 * Mark an order as in-progress (crafter action)
 */
export async function markOrderInProgress(orderId) {
  const db = getFirestore()
  if (!db) return
  try {
    await db.collection('orders').doc(orderId).update({
      status: 'in_progress',
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    window.location.reload()
  } catch (error) {
    console.error('Error updating order:', error)
    alert('Failed to update order: ' + error.message)
  }
}

/**
 * Mark an order as complete (crafter action)
 */
export async function markOrderComplete(orderId) {
  const db = getFirestore()
  if (!db) return
  try {
    await db.collection('orders').doc(orderId).update({
      status: 'done',
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    window.location.reload()
  } catch (error) {
    console.error('Error updating order:', error)
    alert('Failed to update order: ' + error.message)
  }
}

/**
 * Cancel order and reload to show updated status
 */
export async function cancelOrderAndReload(orderId) {
  const db = getFirestore()
  if (!db) return
  try {
    await db.collection('orders').doc(orderId).update({
      status: 'cancelled',
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    window.location.reload()
  } catch (error) {
    console.error('Error cancelling order:', error)
    alert('Failed to cancel order: ' + error.message)
  }
}

/**
 * Delete order and redirect back
 */
export async function deleteOrderAndRedirect(orderId) {
  const db = getFirestore()
  if (!db) return
  if (!confirm('Are you sure you want to delete this order?')) return
  try {
    await db.collection('orders').doc(orderId).delete()
    window.history.back()
  } catch (error) {
    console.error('Error deleting order:', error)
    alert('Failed to delete order: ' + error.message)
  }
}

/**
 * Update order status (admin only)
 */
export async function updateOrderStatus(orderId, status) {
  const db = getFirestore()
  if (!db) return false

  try {
    await db.collection('orders').doc(orderId).update({
      status: status
    })
    return true
  } catch (error) {
    console.error('Error updating order:', error)
    return false
  }
}
