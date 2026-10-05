const clients = {
  aquasphere: new Set(),
  wadaana: new Set()
};

/**
 * Streams server-sent events for a specific tenant connection.
 */
export function streamEvents(req, res) {
  const tenant = (req.query.tenant || req.cookies?.tenant || 'aquasphere').toLowerCase() === 'wadaana' ? 'wadaana' : 'aquasphere';

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  // Initial connection acknowledgement
  res.write(`event: CONNECTED\ndata: ${JSON.stringify({ tenant, timestamp: Date.now() })}\n\n`);
  if (typeof res.flush === 'function') {
    res.flush();
  }

  clients[tenant].add(res);

  // Heartbeat ping every 25 seconds
  const heartbeatTimer = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
      res.write(`event: PING\ndata: ${JSON.stringify({ timestamp: Date.now() })}\n\n`);
      if (typeof res.flush === 'function') {
        res.flush();
      }
    } catch (_err) {
      clearInterval(heartbeatTimer);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeatTimer);
    clients[tenant].delete(res);
  });
}

/**
 * Broadcasts an event to all connected clients for a given tenant.
 *
 * @param {string} tenant - 'aquasphere' or 'wadaana'
 * @param {string} eventType - e.g. 'INVENTORY_CHANGED', 'ORDER_UPDATED'
 * @param {object} [data] - Event payload
 */
export function broadcastEvent(tenant = 'aquasphere', eventType = 'MESSAGE', data = {}) {
  const t = (tenant || 'aquasphere').toLowerCase() === 'wadaana' ? 'wadaana' : 'aquasphere';
  const payload = `event: ${eventType}\ndata: ${JSON.stringify({ ...data, timestamp: Date.now() })}\n\n`;

  const activeClients = clients[t];
  if (!activeClients || activeClients.size === 0) return;

  for (const client of activeClients) {
    try {
      client.write(payload);
      if (typeof client.flush === 'function') {
        client.flush();
      }
    } catch (_err) {
      activeClients.delete(client);
    }
  }
}
