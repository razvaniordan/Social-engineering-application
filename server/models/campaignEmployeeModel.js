module.exports = (sequelize, DataTypes) => {
    const CampaignEmployee = sequelize.define('CampaignEmployee', {
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

    return CampaignEmployee;
};