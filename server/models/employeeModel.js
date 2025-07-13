module.exports = (sequelize, DataTypes) => {
    const Employee = sequelize.define('Employee', {
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

  return Employee;
};