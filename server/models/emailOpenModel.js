module.exports = (sequelize, DataTypes) => {
    const EmailOpen = sequelize.define('EmailOpen', {
        employeeUniqueUrl: {
            type: DataTypes.STRING,
            allowNull: false
        },
        openedAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        }
    });

    return EmailOpen;
};