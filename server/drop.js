const { sequelizeEmployee, sequelizeCampaigns, sequelizeToken, sequelize, ClickLog, LandingPage, EmployeeGroup } = require('./models');

async function dropDatabase() {

    await sequelizeCampaigns.drop();


}

dropDatabase();