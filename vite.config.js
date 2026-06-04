import { defineConfig } from 'vite';
import fs from 'node:fs/promises';
import path from 'node:path';
import { profile } from 'node:console';

const imageDir = path.resolve(process.cwd(), 'public/imgs');
const backgroundImageDir = path.resolve(process.cwd(), 'public/imgs/background');
const profileImageDir = path.resolve(process.cwd(), 'public/imgs/profile');

function backgroundImagesApi() {
  return {
    name: 'background-images-api',
    configureServer(server) {
      server.middlewares.use('/api/background-images', async (req, res) => {
        try {
          const entries = await fs.readdir(backgroundImageDir, { withFileTypes: true });
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

function profileImagesApi() {
  return {
    name: 'profile-images-api',
    configureServer(server) {
      server.middlewares.use('/api/profile-images', async (req, res) => {
        try {
          const entries = await fs.readdir(profileImageDir, { withFileTypes: true });
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
  plugins: [backgroundImagesApi(), profileImagesApi()],

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
