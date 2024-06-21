const bcrypt = require('bcryptjs');
const { Sequelize, DataTypes } = require('sequelize');

// set up the database connection
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './sqlite/userdatabase.sqlite'
});

// define the User model
const User = sequelize.define('User', {
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  // Here we use hooks and bcrypt in order to crypt the password and to have a stronger security to the passwords stored in the database
    hooks: {
        beforeCreate(user) {
            user.password = bcrypt.hashSync(user.password, 8);
        },
        beforeUpdate(user) {
            if (user.changed('password')) {
                user.password = bcrypt.hashSync(user.password, 8);
            }
        }
    }
});

// set up the database connection for the refresh token
const sequelizeToken = new Sequelize({
  dialect: 'sqlite',
  storage: './sqlite/refreshtokendatabase.sqlite'
});

// define the RefreshToken model
const RefreshToken = sequelizeToken.define('RefreshToken', {
  token: {
    type: Sequelize.STRING,
    allowNull: false
  },
  username: {
    type: Sequelize.STRING,
    allowNull: false
  }
});

const sequelizeEmployee = new Sequelize({
  dialect: 'sqlite',
  storage: './sqlite/employeedatabase.sqlite'
});

const Employee = sequelizeEmployee.define('Employee', {
  firstName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  token: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  }
});

const Group = sequelizeEmployee.define('Group', {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  normalized_name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [0, 30] // Limits the description to 50 characters
    }
  } 
});

Employee.belongsTo(Group);
Group.hasMany(Employee);

const SendingProfile = sequelizeEmployee.define('SendingProfile', {
  name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
  },
  normalized_name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
  },
  smtpHost: {
      type: DataTypes.STRING,
      allowNull: false
  },
  smtpPort: {
      type: DataTypes.INTEGER,
      allowNull: false
  },
  username: {
      type: DataTypes.STRING,
      allowNull: false
  },
  password: {
      type: DataTypes.STRING,
      allowNull: false
  },
  secure: {
    type: DataTypes.BOOLEAN, // true for TLS/SSL, false for no encryption
    defaultValue: false
  }
});

const sequelizeCampaigns = new Sequelize({
  dialect: 'sqlite',
  storage: './sqlite/campaignsdatabase.sqlite'
});

const Campaign = sequelizeCampaigns.define('Campaign', {
  name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
  },
  normalized_name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
  },
  template: {
      type: DataTypes.STRING,
      allowNull: false
  },
  date: {
      type: DataTypes.DATE,
      allowNull: false
  },
  profile: {
      type: DataTypes.STRING,
      allowNull: false
  },
  status: {
    type: DataTypes.ENUM('Scheduled', 'Sending..', 'Sent', 'Failed'),
    allowNull: false,
    defaultValue: 'Scheduled'
  }
});

const ClickLog = sequelizeCampaigns.define('ClickLog', {
  uniqueUrl: {
      type: DataTypes.STRING,
      allowNull: false
  },
  clickedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW // Automatically set to the current time
  },
  ipAddress: {
      type: DataTypes.STRING,
      allowNull: true // IP address might not always be available
  },
  referrer: {
      type: DataTypes.STRING,
      allowNull: true // Referrer might not always be available
  }
});

ClickLog.belongsTo(Campaign);
Campaign.hasMany(ClickLog);
// ClickLog.belongsTo(Employee, { foreignKey: 'employeeId' });
// Employee.hasMany(ClickLog, { foreignKey: 'employeeId' });

const InformationData = sequelizeCampaigns.define('InformationData', {
  username: {
      type: DataTypes.STRING,
      allowNull: false
  },
  password: {
      type: DataTypes.STRING,
      allowNull: false
  },
  page: {
      type: DataTypes.STRING,
      allowNull: false
  },
  sentAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW // Automatically set to the current time
  },
  token: {
    type: DataTypes.STRING,
    allowNull: false,
  }
});

const CampaingEmployee = sequelizeCampaigns.define('CampaignEmployee', {
  campaignId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  employeeToken: {
    type: DataTypes.STRING,
    allowNull: false
  },
  employeeFirstName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  employeeLastName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  groupId: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
});

const EmailOpen = sequelizeCampaigns.define('EmailOpen', {
  employeeUniqueUrl: {
      type: DataTypes.STRING,
      allowNull: false
  },
  openedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
  }
});

EmailOpen.belongsTo(Campaign);
Campaign.hasMany(EmailOpen);


InformationData.belongsTo(Campaign);
Campaign.hasOne(InformationData);


module.exports = { sequelize, User, sequelizeToken, RefreshToken, sequelizeEmployee, Employee, Group, SendingProfile, sequelizeCampaigns, InformationData, Campaign, ClickLog, EmailOpen, CampaingEmployee};
