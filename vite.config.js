import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import uploadBillHandler from './api/upload-bill.js';
import sendWhatsAppHandler from './api/send-whatsapp.js';

function apiMiddleware() {
  return {
    name: 'api-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0] || '';
        if (url === '/api/upload-bill') {
          let bodyStr = '';
          req.on('data', (chunk) => {
            bodyStr += chunk;
          });
          req.on('end', async () => {
            try {
              req.body = bodyStr ? JSON.parse(bodyStr) : {};
            } catch {
              req.body = {};
            }
            const customRes = {
              status(code) {
                res.statusCode = code;
                return this;
              },
              json(data) {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
              },
            };
            try {
              await uploadBillHandler(req, customRes);
            } catch (err) {
              customRes.status(500).json({ error: err.message });
            }
          });
          return;
        }

        if (url === '/api/send-whatsapp') {
          let bodyStr = '';
          req.on('data', (chunk) => {
            bodyStr += chunk;
          });
          req.on('end', async () => {
            try {
              req.body = bodyStr ? JSON.parse(bodyStr) : {};
            } catch {
              req.body = {};
            }
            const customRes = {
              status(code) {
                res.statusCode = code;
                return this;
              },
              json(data) {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
              },
            };
            try {
              await sendWhatsAppHandler(req, customRes);
            } catch (err) {
              customRes.status(500).json({ error: err.message });
            }
          });
          return;
        }

        if (url === '/api/download-pdf') {
          let bodyStr = '';
          req.on('data', (chunk) => {
            bodyStr += chunk;
          });
          req.on('end', () => {
            try {
              const { pdfBase64, fileName } = JSON.parse(bodyStr || '{}');
              const buffer = Buffer.from(pdfBase64 || '', 'base64');
              res.setHeader('Content-Type', 'application/pdf');
              res.setHeader(
                'Content-Disposition',
                `attachment; filename="${fileName || 'Bill.pdf'}"`,
              );
              res.end(buffer);
            } catch (err) {
              res.statusCode = 500;
              res.end(err.message);
            }
          });
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), apiMiddleware()],
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
    allowedHosts: true,
  },
});

