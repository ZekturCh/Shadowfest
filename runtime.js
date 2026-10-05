// Firebase Hosting rewrites /api to the server. Demo is deliberately localhost-only.
export const localDemo = ['localhost', '127.0.0.1'].includes(location.hostname);
export const apiEndpoint = '/api';
