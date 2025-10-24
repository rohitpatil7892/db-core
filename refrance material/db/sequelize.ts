import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import config from '../config/sequelize.config';
import logger from '../config/logger';

dotenv.config();

// Use environment variable to determine which config to use
const env = process.env.NODE_ENV || 'development';
const envConfig = config[env as keyof typeof config];

const sequelize = new Sequelize(
  envConfig.database as string,
  envConfig.username as string,
  envConfig.password as string,
  {
    ...envConfig,
    logging: envConfig.logging === false ? false : (msg: string) => logger.debug(msg)
  }
);

// Test the connection
sequelize.authenticate()
  .then(() => {
    logger.info('Sequelize connection established successfully');
  })
  .catch((err) => {
    logger.error('Unable to connect to the database:', err);
  });

export default sequelize; 