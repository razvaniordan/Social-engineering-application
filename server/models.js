const bcrypt = require('bcryptjs');
const { Sequelize, DataTypes } = require('sequelize');

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
  description: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [0, 30] // Limits the description to 50 characters
    }
  } 
});

Employee.belongsToMany(Group, { through: 'EmployeeGroup' });
Group.belongsToMany(Employee, { through: 'EmployeeGroup' });

const EmployeeGroup = sequelizeEmployee.define('EmployeeGroup', {
  employeeId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  groupId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  addedDate: DataTypes.DATE
});

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

const ClickLog = sequelizeEmployee.define('ClickLog', {
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

const SendingProfile = sequelizeEmployee.define('SendingProfile', {
  name: {
      type: DataTypes.STRING,
      allowNull: false
  },
  smtpFrom: {
      type: DataTypes.STRING,
      allowNull: false
  },
  host: {
      type: DataTypes.STRING,
      allowNull: false
  },
  username: {
      type: DataTypes.STRING,
      allowNull: false
  },
  password: {
      type: DataTypes.STRING,
      allowNull: false
  }
});



module.exports = { sequelize, User, sequelizeToken, RefreshToken, sequelizeEmployee, Employee, EmployeeGroup, Group, ClickLog, SendingProfile };
