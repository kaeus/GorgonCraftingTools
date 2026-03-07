import { defineConfig } from 'vite'
import { glob } from 'glob'
import path from 'path'

export default defineConfig({
  root: 'src',
  base: process.env.NODE_ENV === 'production' ? '/GorgonCraftingTools/' : '/',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: path.resolve(__dirname, 'src/index.html'),
        market: path.resolve(__dirname, 'src/market.html'),
        'artisan_alley': path.resolve(__dirname, 'src/artisan_alley.html'),
        'craftingOrders': path.resolve(__dirname, 'src/craftingOrders.html'),
        order: path.resolve(__dirname, 'src/order.html'),
        'order-view': path.resolve(__dirname, 'src/order-view.html'),
        'yourListings': path.resolve(__dirname, 'src/yourListings.html'),
        admin: path.resolve(__dirname, 'src/admin.html')
      },
      output: {
        entryFileNames: 'js/[name].js',
        chunkFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name.endsWith('.css')) {
            return 'css/[name].css'
          }
          return 'assets/[name]-[hash][extname]'
        }
      }
    }
  },
  server: {
    port: 5173,
    open: '/market.html'
  }
})
