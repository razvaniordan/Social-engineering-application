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
            // This is the name of the template => the value transmitted in this "page" field must match the "name" variable from the emailTemplates.json file
            // Also the "id" value from the emailTemplates.json file must match the name of the folder from frontend/LandingPages/template (in this case the id value should be "template")
            // These requirements are case sensitive
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

