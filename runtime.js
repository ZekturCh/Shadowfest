// Production connects directly to Firebase. The isolated demo is localhost-only.
export const localDemo = ['localhost', '127.0.0.1'].includes(location.hostname);
