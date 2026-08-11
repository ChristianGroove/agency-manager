import nodemailer from 'nodemailer'

async function testSmtp() {
    console.log("Testing Hostinger SMTP from agency-manager...")
    console.log("Host:", process.env.SMTP_HOST)
    console.log("Port:", process.env.SMTP_PORT)
    console.log("Sender Email:", process.env.RESEND_FROM_EMAIL)

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.hostinger.com',
        port: Number(process.env.SMTP_PORT) || 465,
        secure: true,
        auth: {
            user: process.env.RESEND_FROM_EMAIL || 'contact@pixy.com.co',
            pass: process.env.SMTP_PASS || ''
        }
    })

    try {
        const info = await transporter.sendMail({
            from: `"${process.env.SMTP_SENDER_NAME || 'Soporte Pixy'}" <${process.env.RESEND_FROM_EMAIL || 'contact@pixy.com.co'}>`,
            to: 'gestiondigitaldc@gmail.com',
            subject: 'Test Email via Hostinger SMTP from Pixy Local',
            html: '<h1>Hostinger SMTP Works!</h1><p>Test confirmation email from local dev environment.</p>'
        })
        console.log("✅ SUCCESS! Message sent via Hostinger SMTP. ID:", info.messageId)
    } catch (e: any) {
        console.error("❌ SMTP Error:", e)
    }
}

testSmtp().catch(console.error)
