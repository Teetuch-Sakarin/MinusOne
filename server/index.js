import { createApp } from './app.js';
const isProduction = process.env.NODE_ENV === 'production';
const accessPassword = process.env.DEMO_ACCESS_PASSWORD;
if (isProduction && (!accessPassword || accessPassword.length < 16)) {
  throw new Error(
    'Production demo hosting requires DEMO_ACCESS_PASSWORD of at least 16 characters. Configure it securely in your hosting dashboard.',
  );
}
const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS || 0);
if (!Number.isInteger(trustProxyHops) || trustProxyHops < 0 || trustProxyHops > 3) {
  throw new Error('TRUST_PROXY_HOPS must be an integer from 0 to 3.');
}
const { app, store } = createApp({
  dataDir: process.env.DATA_DIR || 'data',
  ...(process.env.DB_PATH ? { dbPath: process.env.DB_PATH } : {}),
  accessPassword,
  trustProxyHops,
});
const server = app.listen(Number(process.env.PORT || 3001), process.env.HOST || '127.0.0.1', () =>
  console.log(`MinusOne demo listening on port ${process.env.PORT || 3001}`),
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () =>
    server.close(() => {
      store.db.close();
      process.exit(0);
    }),
  );
