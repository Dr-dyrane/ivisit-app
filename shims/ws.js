// Shim for 'ws' module to use native WebSocket
const WebSocket = globalThis.WebSocket;
export default WebSocket;
export { WebSocket };
