const { SendingProfile } = require('./models');
const nodemailer = require('nodemailer');

async function getSendingProfile(profileId) {
    return await SendingProfile.findByPk(profileId);
}

async function sendEmail(recipient, subject, content, sendingProfileId) {
    const profile = await getSendingProfile(sendingProfileId);
    console.log('Sending email using profile: ', profile);
    console.log('Host: ', profile.smtpHost);
    console.log('Port: ', profile.smtpPort);
    console.log('Username: ', profile.username);
    console.log('Password: ', profile.password);
    console.log('Secure: ', profile.secure);

    const transporter = nodemailer.createTransport({
        host: profile.smtpHost,
        port: profile.smtpPort,
        secure: false, // true for 465, false for other ports
        auth: {
            user: profile.username,
            pass: profile.password
        },
        tls: {
            rejectUnauthorized: false
        }
    });

    const mailOptions = {
        from: `"John Doe" <${profile.username}>`, // sender address
        to: recipient, // list of receivers
        subject: subject, // Subject line
        html: content // html body
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Email sent successfully');
    } catch (error) {
        console.error('Failed to send email: ', error);
        console.log('Email failed to send');
    }
}

module.exports = sendEmail;