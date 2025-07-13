module.exports = function requireEnv(name) {
    if (!process.env[name]) {
        throw new Error(
            `Environment variable ${name} is missing. ` +
            `\nDid you forget to create or load the .env file?`
        );
    }
    return process.env[name];
};