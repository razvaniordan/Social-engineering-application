const Queue = require('bull');
const sendEmail = require('./emailUtils'); 

const sendEmailQueue = new Queue('sendEmail', 'redis://127.0.0.1:6379');

sendEmailQueue.process(async (job, done) => {
    const { email, subject, content, profileId } = job.data;
    try {
        console.log("profile ID: ", profileId)
        await sendEmail(email, subject, content, profileId);
        done();
    } catch (error) {
        console.error('Failed to send email: ', error);
        done(new Error('Failed to send email'));
    }
});

// Handle unhandled Promise rejections
process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
    process.exit(1); // Exit process with failure
});

console.log('Email worker started');

module.exports = sendEmailQueue;