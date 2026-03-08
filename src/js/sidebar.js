/**
 * Sidebar Navigation Component
 * Renders a consistent navigation bar across all pages
 */

export function renderSidebar() {
  const topbar = document.querySelector('.topbar')
  
  if (!topbar) {
    console.warn('No .topbar element found to render sidebar into')
    return
  }
  
  // Define the standard sidebar structure
  const sidebarHTML = `
    <div class="topbar-title">
      <a href="yourListings.html" class="topbar-image-link" id="post-listing-btn">
        <img src="./images/manage_listings.png" alt="Manage Your Listings">
      </a>
    </div>
    <div class="topbar-title tbd">
      <a href="market.html" class="topbar-image-link">
        <img src="./images/black_wing_rectangle.png" alt="Black Wing Market">
      </a>
    </div>
    <div class="topbar-title">
      <a href="artisan_alley.html" class="topbar-image-link">
        <img src="./images/artisan_alley.png" alt="Artisan Alley">
      </a>
    </div>
    <div class="topbar-title tbd">
      <a href="#" class="topbar-image-link">
        <img src="./images/legs_list.png" alt="Legs List">
      </a>
    </div>
    <div class="topbar-title">
      <a href="crookedColiseum.html" class="topbar-image-link">
        <img src="./images/crooked_coliseum_card.png" alt="Crooked Coliseum">
      </a>
    </div>
    <div id="user-auth-slot">
      <button class="action-btn" data-action="open-auth">Sign In</button>
    </div>
  `

  // Clear and populate the topbar
  topbar.innerHTML = sidebarHTML
}

export function renderAdminSidebar() {
  const topbar = document.querySelector('.topbar')
  
  if (!topbar) {
    console.warn('No .topbar element found to render sidebar into')
    return
  }
  
  // Admin-specific sidebar
  const sidebarHTML = `
    <div class="topbar-title">Gorgon Crafting <span>Admin</span></div>
    <div class="topbar-title">
      <a href="artisan_alley.html" class="topbar-image-link">
        <img src="./images/artisan_alley.png" alt="Artisan Alley">
      </a>
    </div>
    <div class="topbar-title tbd">
      <a href="#" class="topbar-image-link">
        <img src="./images/legs_list.png" alt="Legs List">
      </a>
    </div>
    <div class="topbar-title tbd">
      <a href="#" class="topbar-image-link">
        <img src="./images/crooked_coliseum_card.png" alt="Crooked Coliseum">
      </a>
    </div>
    <div id="user-auth-slot">
      <button class="action-btn" data-action="open-auth">Sign In</button>
    </div>
  `

  topbar.innerHTML = sidebarHTML
}

export function renderOrderSidebar() {
  const topbar = document.querySelector('.topbar')
  
  if (!topbar) {
    console.warn('No .topbar element found to render sidebar into')
    return
  }
  
  // Order page sidebar
  const sidebarHTML = `
    <div class="topbar-title tbd">
      <a href="market.html" class="topbar-image-link">
        <img src="./images/black_wing_rectangle.png" alt="Black Wing Market">
      </a>
    </div>
    <div class="topbar-title">
      <a href="yourListings.html" class="topbar-image-link">
        <img src="./images/manage_listings.png" alt="Manage Your Listings">
      </a>
    </div>
    <div class="topbar-title">
      <a href="artisan_alley.html" class="topbar-image-link">
        <img src="./images/artisan_alley.png" alt="Artisan Alley">
      </a>
    </div>
    <div class="topbar-title tbd">
      <a href="#" class="topbar-image-link">
        <img src="./images/legs_list.png" alt="Legs List">
      </a>
    </div>
    <div class="topbar-title tbd">
      <a href="#" class="topbar-image-link">
        <img src="./images/crooked_coliseum_card.png" alt="Crooked Coliseum">
      </a>
    </div>
    <div id="user-auth-slot">
      <button class="action-btn" data-action="open-auth">Sign In</button>
    </div>
  `
  
  topbar.innerHTML = sidebarHTML
}
