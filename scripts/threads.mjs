// scripts/threads.mjs
// ESM-safe worker threads example with Node-compatible base64 encoding
// Now supports CLI args and multiple messages via a single worker, with graceful shutdown.
// Usage:
//   node scripts/threads.mjs               -> defaults to "some data"
//   node scripts/threads.mjs "hello world" -> single message
//   node scripts/threads.mjs foo bar baz   -> multiple messages

import { Worker, isMainThread, workerData, parentPort } from 'node:worker_threads';

function toBase64(str) {
  return Buffer.from(str, 'utf8').toString('base64');
}

if (isMainThread) {
  const args = process.argv.slice(2);
  const messages = args.length > 0 ? args : ['some data'];

  // Spawn this same file as a worker via file URL for robust ESM support
  const worker = new Worker(new URL('./threads.mjs', import.meta.url), { workerData: null });

  // Set up a simple request/response protocol: send an array, get an array back
  worker.once('online', () => {
    worker.postMessage({ type: 'batch', payload: messages });
  });

  let gotResults = false;

  worker.on('message', (msg) => {
    if (msg && msg.type === 'batchResult' && Array.isArray(msg.payload)) {
      gotResults = true;
      msg.payload.forEach((item, idx) => {
        console.log(`Reply from Thread [${idx}]:`, item);
      });
      // Ask worker to exit cleanly
      worker.postMessage({ type: 'close' });
    } else if (msg && msg.type === 'error') {
      console.error('Worker error:', msg.error);
      // Ask worker to exit cleanly even on error
      worker.postMessage({ type: 'close' });
    } else {
      // Fallback for legacy single-message behavior
      console.log('Reply from Thread:', msg);
      worker.postMessage({ type: 'close' });
    }
  });

  worker.on('error', (err) => console.error('Worker error:', err));
  worker.on('exit', (code) => {
    if (code !== 0) console.error('Worker stopped with exit code', code);
  });
} else {
  // If workerData provided in older mode, handle single message
  if (typeof workerData === 'string') {
    const output = toBase64(workerData.toUpperCase());
    parentPort.postMessage(output);
  }

  parentPort.on('message', (msg) => {
    try {
      if (msg && msg.type === 'batch' && Array.isArray(msg.payload)) {
        const results = msg.payload.map((s) => toBase64(String(s).toUpperCase()));
        parentPort.postMessage({ type: 'batchResult', payload: results });
      } else if (msg && msg.type === 'close') {
        // Graceful shutdown
        process.exit(0);
      }
    } catch (err) {
      parentPort.postMessage({ type: 'error', error: String(err?.message || err) });
    }
  });
}
