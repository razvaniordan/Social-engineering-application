const { sequelize, User, sequelizeToken, RefreshToken, sequelizeEmployee, Employee, sequelizeClickLog, ClickLog, LandingPage, sequelizeCampaigns, SendingProfile, Group } = require('./models');

async function initializeDatabase() {
  // Initialize User database and table
  await sequelize.sync({ force: false });
  //await User.create({ username: 'razvan', password: 'razvan' });
  
  // Initialize RefreshToken database and table
  await sequelizeToken.sync({ force: false });
  
  await sequelizeEmployee.sync({ force: true });

  await sequelizeCampaigns.sync({ force: false });

  console.log('Database & tables created!');

}

initializeDatabase();
