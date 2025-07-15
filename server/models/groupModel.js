module.exports = (sequelize, DataTypes) => {
    const Group = sequelize.define('Group', {
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
        description: {
            type: DataTypes.STRING,
            allowNull: true,
            validate: {
            len: [0, 100] // Limits the description to 100 characters
            }
        } 
    });

    return Group;
};