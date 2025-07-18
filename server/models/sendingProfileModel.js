module.exports = (sequelize, DataTypes) => {
    const SendingProfile = sequelize.define('SendingProfile', {
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
    
    return SendingProfile;
};