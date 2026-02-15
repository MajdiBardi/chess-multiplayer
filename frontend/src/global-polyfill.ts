/**
 * Polyfill for Node-style "global" (e.g. sockjs-client).
 * Must run before any code that references global.
 */
if (typeof (window as unknown as { global?: unknown }).global === 'undefined') {
  (window as unknown as { global: typeof globalThis }).global = globalThis;
}
