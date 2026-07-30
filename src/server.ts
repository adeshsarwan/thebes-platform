import { startServer } from './app/start-server.js';

startServer().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown startup failure';

  console.error(
    JSON.stringify({
      level: 'fatal',
      message: 'Thebes Platform service failed to start',
      error: message,
    }),
  );
  process.exit(1);
});
