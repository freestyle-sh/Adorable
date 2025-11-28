// scripts/threads.mjs
// ESM-safe worker threads example with Node-compatible base64 encoding
// Interactive bi-directional protocol that can process multiple batches.
// Usage:
//   node scripts/threads.mjs                      -> defaults to one batch: ["some data"], exits
//   node scripts/threads.mjs "hello world"        -> one-shot batch, exits
//   node scripts/threads.mjs foo bar baz          -> one-shot batch with multiple items, exits
//   node scripts/threads.mjs --interactive        -> REPL mode (ping, batch <args...>, quit/exit)

import { Worker, isMainThread, workerData, parentPort } from 'node:worker_threads';
import readline from 'node:readline';

function toBase64(str) {
  return Buffer.from(str, 'utf8').toString('base64');
}

if (isMainThread) {
  const args = process.argv.slice(2);
  const interactive = args.includes('--interactive');
  const messages = args.filter((a) => a !== '--interactive');

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

  // Start mode based on args
  worker.once('online', () => {
    if (interactive) {
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
