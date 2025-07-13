module.exports = (sequelize, DataTypes) => {
    const ClickLog = sequelize.define('ClickLog', {
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

    return ClickLog;
};

