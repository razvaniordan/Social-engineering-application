const { sequelizeEmployee, sequelizeCampaigns, sequelizeToken, sequelize, ClickLog, LandingPage, EmployeeGroup } = require('./models');

async function dropDatabase() {
    await sequelizeEmployee.drop();
    await sequelizeCampaigns.drop();
    await sequelizeToken.drop();
    await sequelize.drop();
    await ClickLog.drop();

}

dropDatabase();