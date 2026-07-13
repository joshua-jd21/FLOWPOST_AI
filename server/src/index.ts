import { config } from './config/index.js';
import { connectDatabase } from './config/database.js';
import { logger } from './middleware/logger.js';
import app from './app.js';

async function main() {
  // Connect to MongoDB
  await connectDatabase();

  // Start server
  app.listen(config.port, () => {
    logger.info(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
  });
}

main().catch((error) => {
  logger.error(error, 'Failed to start server');
  process.exit(1);
});
