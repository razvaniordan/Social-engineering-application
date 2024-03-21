const { sequelize, User, sequelizeToken, RefreshToken, sequelizeEmployee, Employee } = require('./models');

async function initializeDatabase() {
  // Initialize User database and table
  await sequelize.sync({ force: true }); // This will drop the User table if it already exists
  await User.create({ username: 'razvan', password: 'razvan' }); // You might want to remove or modify this line in production
  
  // Initialize RefreshToken database and table
  await sequelizeToken.sync({ force: true }); // This will drop the RefreshToken table if it already exists
  
  await sequelizeEmployee.sync({ force: true }); // This will drop the Employee table if it already exists

  console.log('Database & tables created!');
}

initializeDatabase();
