const { sequelize, User } = require('./models');

async function initializeDatabase() {
  await sequelize.sync({ force: true }); // Warning: using 'force: true' will drop the table if it already exists
  await User.create({ username: 'razvan', password: 'razvan' });
  console.log('Database & tables created!');
}

initializeDatabase();
