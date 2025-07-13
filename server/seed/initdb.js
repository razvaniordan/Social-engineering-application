const { sequelize, User } = require('../models');
const requireEnv = require('../../utils/requireEnv.js');

async function initializeDatabase() {
  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');
    // Sync all defined models to the DB.
    await sequelize.sync({ force: true });
    await User.create({ username: requireEnv('USERNAME'), password: requireEnv('PASSWORD') });
    console.log('Database & tables created!');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
}

initializeDatabase();
