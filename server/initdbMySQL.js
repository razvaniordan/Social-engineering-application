const { sequelize, User } = require('./modelsMySQL');

async function initializeDatabase() {
  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');
    // Sync all defined models to the DB.
    await sequelize.sync({ force: true });
    await User.create({ username: 'razvan', password: 'razvan' });
    console.log('Database & tables created!');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
}

initializeDatabase();
