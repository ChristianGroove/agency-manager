import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.hostinger.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465');
const SMTP_USER = process.env.SMTP_USER || 'support@pixy.com.co';
const SMTP_PASS = process.env.SMTP_PASS;

if (!SMTP_PASS) {
    console.warn('⚠️ SMTP_PASS is missing. Email sending will fail.');
}

export const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465, // true for 465, false for 587
    auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
    },
});

export const SENDER_EMAIL = `"${process.env.SMTP_SENDER_NAME || 'Soporte Pixy'}" <${SMTP_USER}>`;
