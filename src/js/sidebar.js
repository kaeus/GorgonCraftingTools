/**
 * Sidebar Navigation Component
 * Renders a consistent navigation bar across all pages
 */

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
  const baseName = pageButtonMap[page]
  return `./images/navigation/${baseName}_color.png`
}

export function renderSidebar() {
  const topbar = document.querySelector('.topbar')
  
  if (!topbar) {
    console.warn('No .topbar element found to render sidebar into')
    return
  }
  
  // Define the standard sidebar structure
  const sidebarHTML = `
    <img class="sidebar-banner-cap sidebar-banner-cap--top" src="./images/ui/sidebar/banner_top.png" alt="">
    <div class="sidebar-content">
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
      <div id="fantasy-server-dropdown" class="sidebar-dropdown-instance"></div>
      <div id="user-auth-slot">
        <button class="action-btn" data-action="open-auth">Sign In</button>
      </div>
    </div>
    <img class="sidebar-banner-cap" src="./images/ui/sidebar/banner_bottom.png" alt="">
  `

  // Clear and populate the topbar
  topbar.innerHTML = sidebarHTML
  // Initialize fantasy dropdown
    import('../components/FantasyDropdown.js').then(({ FantasyDropdown }) => {
    const serverOptions = [
      { value: '', label: 'All Servers' },
      { value: 'Arisetsu', label: 'Arisetsu' },
      { value: 'Dreva', label: 'Dreva' },
      { value: 'Laeth', label: 'Laeth' },
      { value: 'Miraverre', label: 'Miraverre' },
      { value: 'Strekios', label: 'Strekios' }
    ];
    // Remove duplicate blank/All Servers entries if present (should only be first)
    for (let i = serverOptions.length - 1; i > 0; i--) {
      if (serverOptions[i].value === '' && serverOptions[i].label === 'All Servers') {
        serverOptions.splice(i, 1);
      }
    }
    let selectedServer = '';
    new FantasyDropdown({
      container: document.getElementById('fantasy-server-dropdown'),
      options: serverOptions,
      value: selectedServer,
      onChange: v => {
        selectedServer = v;
        // TODO: trigger server filter logic here
      },
      placeholder: 'Server',
      dropdownClass: '',
      optionClass: '',
    });
  });
}

export function renderAdminSidebar() {
  const topbar = document.querySelector('.topbar')
  
  if (!topbar) {
    console.warn('No .topbar element found to render sidebar into')
    return
  }
  
  // Admin-specific sidebar
  const sidebarHTML = `
    <img class="sidebar-banner-cap sidebar-banner-cap--top" src="./images/ui/sidebar/banner_top.png" alt="">
    <div class="sidebar-content">
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
      <div id="fantasy-server-dropdown" class="sidebar-dropdown-instance"></div>
      <div id="user-auth-slot">
        <button class="action-btn" data-action="open-auth">Sign In</button>
      </div>
    </div>
    <img class="sidebar-banner-cap" src="./images/ui/sidebar/banner_bottom.png" alt="">
  `

  topbar.innerHTML = sidebarHTML
  
  // Initialize fantasy dropdown
  import('../components/FantasyDropdown.js').then(({ FantasyDropdown }) => {
    const serverOptions = [
      { value: '', label: 'All Servers' },
      { value: 'Arisetsu', label: 'Arisetsu' },
      { value: 'Dreva', label: 'Dreva' },
      { value: 'Laeth', label: 'Laeth' },
      { value: 'Miraverre', label: 'Miraverre' },
      { value: 'Strekios', label: 'Strekios' }
    ];
    // Remove duplicate blank/All Servers entries if present (should only be first)
    for (let i = serverOptions.length - 1; i > 0; i--) {
      if (serverOptions[i].value === '' && serverOptions[i].label === 'All Servers') {
        serverOptions.splice(i, 1);
      }
    }
    let selectedServer = '';
    new FantasyDropdown({
      container: document.getElementById('fantasy-server-dropdown'),
      options: serverOptions,
      value: selectedServer,
      onChange: v => {
        selectedServer = v;
        // TODO: trigger server filter logic here
      },
      placeholder: 'Server',
      dropdownClass: '',
      optionClass: '',
    });
  });
}

export function renderOrderSidebar() {
  const topbar = document.querySelector('.topbar')
  
  if (!topbar) {
    console.warn('No .topbar element found to render sidebar into')
    return
  }
  
  // Order page sidebar
  const sidebarHTML = `
    <img class="sidebar-banner-cap sidebar-banner-cap--top" src="./images/ui/sidebar/banner_top.png" alt="">
    <div class="sidebar-content">
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
      <div id="fantasy-server-dropdown" class="sidebar-dropdown-instance"></div>
      <div id="user-auth-slot">
        <button class="action-btn" data-action="open-auth">Sign In</button>
      </div>
    </div>
    <img class="sidebar-banner-cap" src="./images/ui/sidebar/banner_bottom.png" alt="">
  `
  
  // Clear and populate the topbar
  topbar.innerHTML = sidebarHTML
  
  // Initialize fantasy dropdown
  import('../components/FantasyDropdown.js').then(({ FantasyDropdown }) => {
    const serverOptions = [
      { value: '', label: 'All Servers' },
      { value: 'Arisetsu', label: 'Arisetsu' },
      { value: 'Dreva', label: 'Dreva' },
      { value: 'Laeth', label: 'Laeth' },
      { value: 'Miraverre', label: 'Miraverre' },
      { value: 'Strekios', label: 'Strekios' }
    ];
    // Remove duplicate blank/All Servers entries if present (should only be first)
    for (let i = serverOptions.length - 1; i > 0; i--) {
      if (serverOptions[i].value === '' && serverOptions[i].label === 'All Servers') {
        serverOptions.splice(i, 1);
      }
    }
    let selectedServer = '';
    new FantasyDropdown({
      container: document.getElementById('fantasy-server-dropdown'),
      options: serverOptions,
      value: selectedServer,
      onChange: v => {
        selectedServer = v;
        // TODO: trigger server filter logic here
      },
      placeholder: 'Server',
      dropdownClass: '',
      optionClass: '',
    });
  });
}
