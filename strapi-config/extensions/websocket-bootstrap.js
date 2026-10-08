/**
 * Strapi WebSocket Live Updates Bootstrap
 * Add to src/index.js in the bootstrap({ strapi }) function
 */
const { WebSocketServer, WebSocket } = require('ws');

module.exports = {
  register() {},
  bootstrap({ strapi }) {
    const server = strapi.server.httpServer;
    const wss = new WebSocketServer({ server, path: '/ws' });
    const clients = new Set();

    wss.on('connection', (ws) => {
      clients.add(ws);
      ws.send(JSON.stringify({ type: 'CONNECTED', data: { time: Date.now() } }));
      ws.on('close', () => clients.delete(ws));
    });

    strapi.broadcast = (type, payload) => {
      const msg = JSON.stringify({ type, payload, timestamp: Date.now() });
      for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(msg);
        }
      }
    };

    console.log('⚡ [Strapi WS] WebSocket server mounted on /ws');
  },
};
