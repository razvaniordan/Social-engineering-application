const { sequelize, User } = require('../models');
const bcrypt = require('bcryptjs');
const requireEnv = require('../../utils/requireEnv.js');

async function initializeDatabase() {
  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');

    const dropDb = requireEnv('DROP_DB') === 'true';
    const dropUserDb = requireEnv('DROP_USER_DB') === 'true';

    // Sync all defined models to the DB.
    await sequelize.sync({ force: dropDb });
    await User.sync({ force: dropUserDb });

    if (dropDb) {
      console.log('Database tables were dropped and recreated.');
    }

    const [admin, created] = await User.findOrCreate({
      where: { username: requireEnv('USERNAME') }, 
      defaults: { password: requireEnv('PASSWORD') },
    });

    const newPassword = requireEnv('PASSWORD');

    const isSame = await bcrypt.compare(newPassword, admin.password);

    if(created) {
      console.log('Admin user created.');
    } else if(isSame) {
      console.log('Admin already exists. Password unchanged.');
    } else {
      await admin.update({ password: requireEnv('PASSWORD') });
      console.log('This username already exists. Admin password updated.');
    }

    console.log('Database & tables created!');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
}

initializeDatabase();