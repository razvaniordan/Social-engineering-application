const { Sequelize, DataTypes } = require('sequelize');
const requireEnv = require('../../utils/requireEnv.js');
const path = require('path');
const fs = require('fs');

const sequelize = new Sequelize(
  requireEnv('DB_NAME'), 
  requireEnv('DB_USER'), 
  requireEnv('DB_PASS'), 
  {
    host: requireEnv('DB_HOST'),
    port: requireEnv('DB_PORT'),
    dialect: 'mysql',
    logging: console.log,
    define: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_general_ci'
    }
  }
);

const db = {};

const files = fs.readdirSync(__dirname)
                .filter(file => file.endsWith('Model.js'));

for (const file of files) {
  const modelDefiner = require(path.join(__dirname, file));
  const model = modelDefiner(sequelize, DataTypes);
  db[model.name] = model;
}                

const {
  Employee,
  Group,
  Campaign,
  ClickLog,
  InformationData,
  EmailOpen
} = db;

Employee.belongsTo(Group);
Group.hasMany(Employee);

ClickLog.belongsTo(Campaign);
Campaign.hasMany(ClickLog);

EmailOpen.belongsTo(Campaign);
Campaign.hasMany(EmailOpen);

InformationData.belongsTo(Campaign);
Campaign.hasOne(InformationData);

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;