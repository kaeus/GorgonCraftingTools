import { defineConfig } from 'vite'
import { glob } from 'glob'
import path from 'path'

export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/GorgonCraftingTools/' : '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: path.resolve(__dirname, 'src/pages/index.html'),
        market: path.resolve(__dirname, 'src/pages/market.html'),
        order: path.resolve(__dirname, 'src/pages/order.html'),
        'order-view': path.resolve(__dirname, 'src/pages/order-view.html'),
        'craftingOrders': path.resolve(__dirname, 'src/pages/craftingOrders.html'),
        admin: path.resolve(__dirname, 'src/pages/admin.html')
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
    open: '/src/pages/market.html'
  }
})
