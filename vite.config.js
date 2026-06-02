import { defineConfig } from 'vite';
import fs from 'node:fs/promises';
import path from 'node:path';

const imageDir = path.resolve(process.cwd(), 'public/imgs');

function backgroundImagesApi() {
  return {
    name: 'background-images-api',
    configureServer(server) {
      server.middlewares.use('/api/background-images', async (req, res) => {
        try {
          const entries = await fs.readdir(imageDir, { withFileTypes: true });
          const images = entries
            .filter((entry) => entry.isFile())
            .map((entry) => entry.name)
            .filter((fileName) => /\.(jpe?g|png|webp)$/i.test(fileName))
            .sort((a, b) => a.localeCompare(b));

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ images }));
        } catch (error) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Failed to load background images.' }));
        }
      });
    },
  };
}

export default defineConfig({
  
  root: './public', 
  plugins: [backgroundImagesApi()],

  server: {
    watch: {
      usePolling: true,
    },
    
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
