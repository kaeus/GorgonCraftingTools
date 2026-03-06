# CraftingCorner - Vite + Vanilla JS Refactoring

This project has been refactored from a static HTML application into a modern Vite + Vanilla JavaScript structure while maintaining static HTML output compatible with GitHub Pages.

## Project Structure

```
CraftingCorner/
├── src/
│   ├── pages/
│   │   ├── index.html
│   │   ├── market.html
│   │   ├── order.html
│   │   ├── order-view.html
│   │   ├── craftingOrders.html
│   │   ├── admin.html
│   ├── js/
│   │   ├── main.js           # Entry point with module exports
│   │   ├── firebase.js       # Firebase initialization & auth
│   │   ├── auth.js           # User authentication UI
│   │   ├── listings.js       # Crafter listings management
│   │   ├── orders.js         # Order management
│   │   ├── utils.js          # Utility functions
│   ├── css/
│   │   ├── global.css        # Consolidated styles (all pages)
│   ├── components/           # Shared HTML components (future)
├── images/                   # Static images
├── firebase-config.js        # Firebase config
├── cdn.js                    # CDN utilities
├── vite.config.js            # Vite configuration
├── package.json              # Dependencies
├── .gitignore
└── dist/                     # Build output (generated)
```

## Key Changes

### Before (Old Structure)
- Inline CSS in each HTML file (duplicated)
- Inline JavaScript in each HTML file (duplicated)
- No module system
- Monolithic code per page

### After (New Structure)
- **Consolidated CSS**: All styles in `src/css/global.css`
- **Modular JavaScript**: Separate modules for auth, Firebase, listings, orders, utils
- **ES Modules**: All JS uses `import`/`export` syntax
- **Component System**: Foundation for reusable UI components
- **Vite Build Tool**: Optimized bundling and GitHub Pages deployment

## Installation & Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Firebase**
   Update `firebase-config.js` with your Firebase project credentials:
   ```javascript
   const FIREBASE_CONFIG = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_AUTH_DOMAIN",
     projectId: "YOUR_PROJECT_ID",
     // ... other config
   }
   ```

## Development

Start the development server:
```bash
npm run dev
```

This opens the app in your browser with hot module replacement (HMR).

## Building

Create a production build:
```bash
npm run build
```

Output files are generated in the `dist/` directory, ready for GitHub Pages deployment.

## Preview

Test the production build locally:
```bash
npm run preview
```

## Deployment to GitHub Pages

1. **Build the project**
   ```bash
   npm run build
   ```

2. **Push `dist/` to your GitHub Pages branch**
   ```bash
   git add dist/
   git commit -m "Build: production release"
   git push origin main
   ```

   Or use a deployment script to automate this process.

3. **Update GitHub Pages settings**
   Go to repository Settings → Pages → Source: Select "gh-pages" branch

## Module Documentation

### `firebase.js`
Handles Firebase initialization and auth state management.

**Exports:**
- `initializeFirebase(config)` - Initialize Firebase
- `getFirestore()` - Get Firestore instance
- `getAuth()` - Get Auth instance
- `onAuthStateChanged(callback)` - Listen to auth changes
- `signInWithGoogle()` - Google sign-in
- `signInWithEmail(email, password)` - Email sign-in
- `createUserWithEmail(email, password, displayName)` - Register
- `signOutUser()` - Sign out

### `auth.js`
Manages authentication UI and modal interactions.

**Exports:**
- `openAuthModal()` - Show auth modal
- `closeAuthModal()` - Hide auth modal
- `switchTab(tab)` - Switch between Google/Email
- `toggleEmailMode()` - Switch signin/register
- `signInGoogle()` - Trigger Google signin
- `signInEmail()` - Trigger email signin
- `signOut()` - Sign out user
- `renderUserAuth(user)` - Render user chip or signin button

### `listings.js`
Handles loading, filtering, and rendering crafter listings.

**Exports:**
- `loadListings()` - Fetch and render all listings
- `applyFilter()` - Filter by server
- `renderListings(docs)` - Render listing cards
- `getListingById(id)` - Fetch single listing
- `searchListings(query)` - Search by query

### `orders.js`
Manages order creation and tracking.

**Exports:**
- `subscribeMyOrders(uid, callback)` - Listen to user's orders
- `renderMyOrders(docs)` - Render order table
- `createOrder(listing)` - Create new order
- `cancelOrder(orderId)` - Cancel pending order
- `deleteOrder(orderId)` - Delete order
- `getOrderById(id)` - Fetch order details
- `updateOrderStatus(orderId, status)` - Update status (admin)

### `utils.js`
Common utility functions.

**Exports:**
- `escapeHtml(str)` - XSS protection
- `setStatus(elementId, msg, type)` - Status messages
- `formatDate(timestamp)` - Format Firestore timestamps
- `PROFESSION_EMOJI` - Profession emoji mapping
- `debounce(func, wait)` - Debounce functions
- `showModalError(id, msg)` - Show error in modal
- `clearModalError(id)` - Clear error message

### `main.js`
Entry point that orchestrates all modules.

- Loads global CSS automatically
- Exports all module functions to `window` for HTML onclick handlers
- Initializes Firebase when available
- Sets up auth state listener

## HTML Page Structure

Each page imports `main.js` which loads all modules and global CSS:

```html
<script type="module" src="../../src/js/main.js"></script>
```

Pages can then use functions like:
- `openAuthModal()`
- `loadListings()`
- `applyFilter()`
- `signOut()`
- etc.

These are exposed on the `window` object for onclick handlers.

## Styling

All CSS is now in `src/css/global.css`. Pages automatically load it via the `main.js` import.

Key CSS classes:
- `.topbar` - Sidebar navigation
- `.page` - Main content area
- `.listings-grid` - Grid of crafter cards
- `.listing-card` - Individual crafter card
- `.modal-backdrop` - Auth modal overlay
- `.status-bar` - Status messages
- `.action-btn` - Primary buttons

## Browser Support

- Modern browsers with ES Module support
- Chrome, Firefox, Safari, Edge (latest versions)

## Future Enhancements

- [ ] Create reusable HTML components in `src/components/`
- [ ] Implement component loader for shared UI
- [ ] Add TypeScript support
- [ ] Create build script for automated GitHub Pages deployment
- [ ] Add error boundary components
- [ ] Implement service worker for offline support
- [ ] Add CSS preprocessing (SCSS/PostCSS)

## Troubleshooting

### Firebase not configured error
Make sure `firebase-config.js` has valid credentials and is imported before Firebase SDKs.

### Module import errors
Ensure `src/js/` files are not accessed directly from HTML. Use `<script type="module" src="../../src/js/main.js"></script>` instead.

### GitHub Pages shows 404
Ensure `vite.config.js` has correct `base` path for your repository name.

## Contributors

Generated from CraftingCorner static HTML project.

## License

See LICENSE file in repository.
