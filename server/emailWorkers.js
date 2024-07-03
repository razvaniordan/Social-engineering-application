const Queue = require('bull');
const sendEmail = require('./emailUtils'); 
const { Campaign } = require('./modelsMySQL');

const sendEmailQueue = new Queue('sendEmail', 'redis://127.0.0.1:6379');

sendEmailQueue.process(async (job, done) => {
    const { email, subject, content, profileId, campaignId } = job.data;

    try {
        await Campaign.update({ status: 'Sending..' }, { where: { id: campaignId } });
        await sendEmail(email, subject, content, profileId, campaignId);
        done();
    } catch (error) {
        console.error('Failed to send email: ', error);
        await Campaign.update({ status: 'Failed' }, { where: { id: campaignId } });
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