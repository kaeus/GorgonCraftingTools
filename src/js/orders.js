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

  // Load all orders and filter/sort in JavaScript to avoid requiring Firestore indexes
  return db.collection('orders')
    .onSnapshot(snap => {
      const userOrders = snap.docs
        .filter(doc => doc.data().customerId === uid)
        .sort((a, b) => {
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
        <td>${escapeHtml(d.profession)}</td>
        <td><span class="badge ${d.status}">${d.status}</span></td>
        <td>${date}</td>
        <td>${cancelBtn}</td>
        <td><button class="delete-order-btn" onclick="deleteOrder('${doc.id}')">Delete</button></td>
      </tr>
    `
  }).join('')

  container.innerHTML = `
    <table class="orders-table">
      <thead>
        <tr>
          <th>Crafter</th>
          <th>Profession</th>
          <th>Status</th>
          <th>Date</th>
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
      status: 'cancelled'
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
export async function createOrder(listing) {
  const db = getFirestore()
  const auth = getAuth()
  
  if (!db || !auth || !auth.currentUser) {
    console.error('Not authenticated or Firestore not initialized')
    return null
  }

  try {
    const orderRef = await db.collection('orders').add({
      customerId: auth.currentUser.uid,
      customerEmail: auth.currentUser.email,
      listingId: listing.id,
      crafterName: listing.crafterName,
      crafterUid: listing.uid,
      profession: listing.profession,
      status: 'pending',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      details: ''
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
