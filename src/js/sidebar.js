/**
 * Sidebar Navigation Component
 * Renders a consistent navigation bar across all pages
 */

// Get current page filename
function getCurrentPage() {
  return window.location.pathname.split('/').pop() || 'index.html'
}

// Map pages to their button image base names
const pageButtonMap = {
  'yourListings.html': 'yourListings',
  'market.html': 'market',
  'artisan_alley.html': 'artisan_alley',
  'legs_list.html': 'legs_list',
  'crookedColiseum.html': 'crookedColiseum'
}

// Helper function to get the appropriate image source
function getButtonImageSrc(page) {
  const currentPage = getCurrentPage()
  const isCurrentPage = page === currentPage
  const baseName = pageButtonMap[page]
  return isCurrentPage ? `./images/navigation/${baseName}_color.png` : `./images/navigation/${baseName}.png`
}

// Attach hover listeners to button images
function attachButtonHoverListeners() {
  const topbar = document.querySelector('.topbar')
  if (!topbar) return

  topbar.addEventListener('mouseover', (e) => {
    const img = e.target
    if (img.tagName === 'IMG' && img.parentElement.classList.contains('topbar-image-link')) {
      const src = img.src
      // Switch to color version if not already on it
      if (!src.includes('_color.png')) {
        const colorSrc = src.replace('.png', '_color.png')
        img.src = colorSrc
      }
    }
  })

  topbar.addEventListener('mouseout', (e) => {
    const img = e.target
    if (img.tagName === 'IMG' && img.parentElement.classList.contains('topbar-image-link')) {
      const href = img.parentElement.href
      const page = href.split('/').pop()
      const isCurrentPage = page === getCurrentPage()
      
      // Only revert if not on the current page
      if (!isCurrentPage) {
        const src = img.src
        const baseSrc = src.replace('_color.png', '.png')
        img.src = baseSrc
      }
    }
  })
}

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
        <img src="${getButtonImageSrc('yourListings.html')}" alt="Manage Your Listings">
      </a>
    </div>
    <div class="topbar-title">
      <a href="market.html" class="topbar-image-link">
        <img src="${getButtonImageSrc('market.html')}" alt="Black Wing Market">
      </a>
    </div>
    <div class="topbar-title">
      <a href="artisan_alley.html" class="topbar-image-link">
        <img src="${getButtonImageSrc('artisan_alley.html')}" alt="Artisan Alley">
      </a>
    </div>
    <div class="topbar-title tbd">
      <a href="#" class="topbar-image-link">
        <img src="${getButtonImageSrc('legs_list.html')}" alt="Legs List">
      </a>
    </div>
    <div class="topbar-title">
      <a href="crookedColiseum.html" class="topbar-image-link">
        <img src="${getButtonImageSrc('crookedColiseum.html')}" alt="Crooked Coliseum">
      </a>
    </div>
    <div class="topbar-server-filter">
      <label for="server-filter">Server</label>
      <select id="server-filter">
        <option value="">All Servers</option>
        <option>Arisetsu</option>
        <option>Dreva</option>
        <option>Laeth</option>
        <option>Miraverre</option>
        <option>Strekios</option>
      </select>
    </div>
    <div id="user-auth-slot">
      <button class="action-btn" data-action="open-auth">Sign In</button>
    </div>
  `

  // Clear and populate the topbar
  topbar.innerHTML = sidebarHTML
  
  // Attach hover listeners for color variant switching
  attachButtonHoverListeners()
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
        <img src="${getButtonImageSrc('artisan_alley.html')}" alt="Artisan Alley">
      </a>
    </div>
    <div class="topbar-title tbd">
      <a href="#" class="topbar-image-link">
        <img src="${getButtonImageSrc('legs_list.html')}" alt="Legs List">
      </a>
    </div>
    <div class="topbar-title">
      <a href="crookedColiseum.html" class="topbar-image-link">
        <img src="${getButtonImageSrc('crookedColiseum.html')}" alt="Crooked Coliseum">
      </a>
    </div>
    <div class="topbar-server-filter">
      <label for="server-filter">Server</label>
      <select id="server-filter">
        <option value="">All Servers</option>
        <option>Arisetsu</option>
        <option>Dreva</option>
        <option>Laeth</option>
        <option>Miraverre</option>
        <option>Strekios</option>
      </select>
    </div>
    <div id="user-auth-slot">
      <button class="action-btn" data-action="open-auth">Sign In</button>
    </div>
  `

  topbar.innerHTML = sidebarHTML
  
  // Attach hover listeners for color variant switching
  attachButtonHoverListeners()
}

export function renderOrderSidebar() {
  const topbar = document.querySelector('.topbar')
  
  if (!topbar) {
    console.warn('No .topbar element found to render sidebar into')
    return
  }
  
  // Order page sidebar
  const sidebarHTML = `
    <div class="topbar-title">
      <a href="yourListings.html" class="topbar-image-link">
        <img src="${getButtonImageSrc('yourListings.html')}" alt="Manage Your Listings">
      </a>
    </div>
    <div class="topbar-title">
      <a href="market.html" class="topbar-image-link">
        <img src="${getButtonImageSrc('market.html')}" alt="Black Wing Market">
      </a>
    </div>
    <div class="topbar-title">
      <a href="artisan_alley.html" class="topbar-image-link">
        <img src="${getButtonImageSrc('artisan_alley.html')}" alt="Artisan Alley">
      </a>
    </div>
    <div class="topbar-title tbd">
      <a href="#" class="topbar-image-link">
        <img src="${getButtonImageSrc('legs_list.html')}" alt="Legs List">
      </a>
    </div>
    <div class="topbar-title">
      <a href="crookedColiseum.html" class="topbar-image-link">
        <img src="${getButtonImageSrc('crookedColiseum.html')}" alt="Crooked Coliseum">
      </a>
    </div>
    <div class="topbar-server-filter">
      <label for="server-filter">Server</label>
      <select id="server-filter">
        <option value="">All Servers</option>
        <option>Arisetsu</option>
        <option>Dreva</option>
        <option>Laeth</option>
        <option>Miraverre</option>
        <option>Strekios</option>
      </select>
    </div>
    <div id="user-auth-slot">
      <button class="action-btn" data-action="open-auth">Sign In</button>
    </div>
  `
  
  topbar.innerHTML = sidebarHTML
  
  // Attach hover listeners for color variant switching
  attachButtonHoverListeners()
}
