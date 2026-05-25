import { defineConfig } from 'vite';

export default defineConfig({
  
  root: './public', 

  server: {
    
    proxy: {
      '/api': {
        target: 'https://rpg.davidchen.me',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'https://rpg.davidchen.me',
        changeOrigin: true,
        ws: true,
      }
    }
  }
});
