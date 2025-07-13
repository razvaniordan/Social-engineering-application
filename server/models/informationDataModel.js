module.exports = (sequelize, DataTypes) => {
    const InformationData = sequelize.define('InformationData', {
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

    return InformationData;
};

