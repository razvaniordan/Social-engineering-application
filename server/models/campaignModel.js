module.exports = (sequelize, DataTypes) => {
    const Campaign = sequelize.define('Campaign', {
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        normalized_name: { // this is the field "name" in lowercase used in order to compare the content no matter the case of characters
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

  return Campaign;
};