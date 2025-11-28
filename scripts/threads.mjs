// scripts/threads.mjs
// ESM-safe worker threads example with Node-compatible base64 encoding
// Interactive bi-directional protocol that can process multiple batches, and optional HTTP server mode.
// Usage:
//   node scripts/threads.mjs                               -> one-shot batch: ["some data"], exits
//   node scripts/threads.mjs "hello world"                 -> one-shot batch, exits
//   node scripts/threads.mjs foo bar baz                   -> one-shot batch with multiple items, exits
//   node scripts/threads.mjs --interactive                 -> REPL mode (ping, batch <args...>, quit/exit)
//   PORT=3001 node scripts/threads.mjs --server            -> HTTP server mode

import { Worker, isMainThread, workerData, parentPort } from 'node:worker_threads';
import readline from 'node:readline';
import express from 'express';

function toBase64(str) {
  return Buffer.from(str, 'utf8').toString('base64');
}

if (isMainThread) {
  const args = process.argv.slice(2);
  const interactive = args.includes('--interactive');
  const serverMode = args.includes('--server');
  const messages = args.filter((a) => a !== '--interactive' && a !== '--server');

  // Spawn this same file as a worker via file URL for robust ESM support
  const worker = new Worker(new URL('./threads.mjs', import.meta.url), { workerData: null });

  let nextReqId = 1;
  const pending = new Map(); // reqId -> resolver

  function send(type, payload) {
    const reqId = nextReqId++;
    return new Promise((resolve, reject) => {
      pending.set(reqId, { resolve, reject, type });
      worker.postMessage({ type, reqId, payload });
    });
  }

  worker.on('message', (msg) => {
    if (!msg || typeof msg !== 'object') return;
    if (msg.type === 'pong' && msg.reqId) {
      pending.get(msg.reqId)?.resolve('pong');
      pending.delete(msg.reqId);
      return;
    }
    if (msg.type === 'batchResult' && msg.reqId) {
      pending.get(msg.reqId)?.resolve(msg.payload);
      pending.delete(msg.reqId);
      return;
    }
    if (msg.type === 'error' && msg.reqId) {
      pending.get(msg.reqId)?.reject(new Error(msg.error || 'Worker error'));
      pending.delete(msg.reqId);
      return;
    }
  });

  worker.on('error', (err) => {
    // Reject all pending promises
    for (const [, { reject }] of pending) reject(err);
    pending.clear();
    console.error('Worker error:', err);
  });

  worker.on('exit', (code) => {
    if (code !== 0) console.error('Worker stopped with exit code', code);
    // In server mode, stop the server when worker exits
    if (serverMode && server) server.close();
  });

  async function runOneShotBatch(initialMessages) {
    const batch = initialMessages.length > 0 ? initialMessages : ['some data'];
    const res = await send('batch', batch);
    res.forEach((item, idx) => console.log(`Reply from Thread [${idx}]:`, item));
    await send('close');
  }

  async function runInteractive() {
    console.log('Interactive mode. Commands:');
    console.log('- ping');
    console.log('- batch <args...>');
    console.log('- quit | exit');

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: '> ' });
    rl.prompt();
    rl.on('line', async (line) => {
      const trimmed = line.trim();
      if (!trimmed) return rl.prompt();
      const [cmd, ...rest] = trimmed.split(/\s+/);
      try {
        if (cmd === 'ping') {
          await send('ping');
          console.log('pong');
        } else if (cmd === 'batch') {
          if (rest.length === 0) {
            console.log('Provide at least one item: batch <args...>');
          } else {
            const res = await send('batch', rest);
            res.forEach((item, idx) => console.log(`Reply from Thread [${idx}]:`, item));
          }
        } else if (cmd === 'quit' || cmd === 'exit') {
          await send('close');
          rl.close();
          return; // do not prompt again
        } else {
          console.log('Unknown command. Use: ping | batch <args...> | quit');
        }
      } catch (err) {
        console.error('Error:', err?.message || err);
      }
      rl.prompt();
    });

    rl.on('close', () => {
      // nothing else to do; worker will exit on 'close'
    });
  }

  // Simple HTTP server mode (Express)
  let server = null;
  async function runServer() {
    const port = Number(process.env.PORT || 3001);
    const app = express();
    app.use(express.json());

    // Basic CORS (optional)
    app.use((req, res, next) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      if (req.method === 'OPTIONS') return res.status(204).end();
      next();
    });

    app.get('/ping', async (req, res) => {
      try { await send('ping'); res.json({ status: 'pong' }); }
      catch (err) { res.status(500).json({ error: err?.message || String(err) }); }
    });

    app.post('/batch', async (req, res) => {
      try {
        const items = Array.isArray(req.body?.items) ? req.body.items.map(String) : [];
        if (items.length === 0) return res.status(400).json({ error: 'Body must be JSON: { "items": ["..."] }' });
        const results = await send('batch', items);
        res.json({ results });
      } catch (err) {
        res.status(500).json({ error: err?.message || String(err) });
      }
    });

    app.post('/close', async (req, res) => {
      try {
        await send('close');
        res.json({ status: 'closing' });
        // server will be closed on worker 'exit'
      } catch (err) {
        res.status(500).json({ error: err?.message || String(err) });
      }
    });

    server = app.listen(port, () => {
      console.log(`Worker Express server listening on http://localhost:`);
    });
  }

  // Start mode based on args
  worker.once('online', () => {
    if (serverMode) {
      runServer();
    } else if (interactive) {
      runInteractive();
    } else {
      runOneShotBatch(messages);
    }
  });
} else {
  parentPort.on('message', (msg) => {
    try {
      if (!msg || typeof msg !== 'object') return;
      if (msg.type === 'ping') {
        parentPort.postMessage({ type: 'pong', reqId: msg.reqId });
      } else if (msg.type === 'batch' && Array.isArray(msg.payload)) {
        const results = msg.payload.map((s) => toBase64(String(s).toUpperCase()));
        parentPort.postMessage({ type: 'batchResult', reqId: msg.reqId, payload: results });
      } else if (msg.type === 'close') {
        process.exit(0);
      }
    } catch (err) {
      parentPort.postMessage({ type: 'error', reqId: msg?.reqId, error: String(err?.message || err) });
    }
  });
}
