import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite'; // Tailwind v4 dynamic compiler plugin

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // Integrated Tailwind v4 compiler
  ],
  build: {
    chunkSizeWarningLimit: 3000, // Limit ko 3MB kar diya taake faltoo warning na aaye
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Sirf Firebase ko alag file mein rakhein taake cache ho sake
            if (id.includes('firebase') || id.includes('@firebase')) {
              return 'vendor-firebase';
            }
            // Baqi sab Vite khud automatically handle kar lega!
          }
        },
      },
    },
  },
});