const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
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

    return User;
};