let isClient = typeof window !== 'undefined';
let isServer = typeof module !== 'undefined';

// In Electron app, both are true
// if (isClient && isServer)
// 	throw new Error('Can not be client and server at the same time.');

export { isClient, isServer };
