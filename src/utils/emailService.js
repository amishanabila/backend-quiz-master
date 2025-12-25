const nodemailer = require('nodemailer');

let transporter;

try {
    // Use explicit SMTP config instead of 'service: gmail' to avoid Railway network issues
    transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587, // Use 587 (TLS) instead of 465 (SSL) - better for Railway
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        },
        tls: {
            rejectUnauthorized: false // Allow self-signed certificates (Railway compatibility)
        },
        connectionTimeout: 10000, // 10 seconds
        greetingTimeout: 10000,
        socketTimeout: 10000,
        debug: true, // Enable debug logs
        logger: true
    });
    console.log('✅ Email transporter created successfully with SMTP config');
} catch (error) {
    console.error('❌ Error creating email transporter:', error);
}

const emailService = {
    sendVerificationEmail: async (email, token) => {
        try {
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            const verificationLink = `${frontendUrl}/verify-email?token=${token}`;
            
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Verifikasi Email QuizMaster',
                html: `
                    <h1>Selamat Datang di QuizMaster!</h1>
                    <p>Silakan klik link di bawah ini untuk memverifikasi email Anda:</p>
                    <a href="${verificationLink}">${verificationLink}</a>
                    <p>Link ini akan kadaluarsa dalam 24 jam.</p>
                `
            };

            await transporter.sendMail(mailOptions);
            console.log('Verification email sent to:', email);
        } catch (error) {
            console.error('Error sending verification email:', error);
            throw new Error('Gagal mengirim email verifikasi: ' + error.message);
        }
    },

    sendPasswordResetEmail: async (email, token) => {
        try {
            console.log('📧 Preparing to send password reset email...');
            console.log('📧 To:', email);
            console.log('📧 From:', process.env.EMAIL_USER);
            
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            const resetLink = `${frontendUrl}/password-baru?token=${token}`;
            
            console.log('🔗 Reset link:', resetLink);
            
            const mailOptions = {
                from: `"IPPL Quiz Master" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: 'Reset Password - IPPL Quiz Master',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #333;">Reset Password</h2>
                        <p>Anda telah meminta untuk mereset password akun Anda di IPPL Quiz Master.</p>
                        <p>Silakan klik link di bawah ini untuk membuat password baru:</p>
                        <div style="margin: 20px 0;">
                            <a href="${resetLink}" style="background-color: #ff9900; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                                Reset Password
                            </a>
                        </div>
                        <p style="color: #666; font-size: 12px;">Atau copy link ini ke browser Anda:</p>
                        <p style="background-color: #f0f0f0; padding: 10px; border-radius: 5px; word-break: break-all;">
                            ${resetLink}
                        </p>
                        <p style="color: #999; font-size: 12px;">
                            <strong>Penting:</strong> Link ini akan kadaluarsa dalam 1 jam.<br>
                            Jika Anda tidak meminta reset password, abaikan email ini.
                        </p>
                    </div>
                `
            };

            console.log('📤 Sending email via SMTP...');
            
            // Verify connection first
            await transporter.verify();
            console.log('✅ SMTP connection verified');
            
            // Send email with retry
            let lastError;
            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    console.log(`📧 Attempt ${attempt} to send email...`);
                    const info = await transporter.sendMail(mailOptions);
                    console.log('✅ Password reset email sent successfully!');
                    console.log('📧 Message ID:', info.messageId);
                    console.log('📧 Response:', info.response);
                    return; // Success!
                } catch (sendError) {
                    console.error(`❌ Attempt ${attempt} failed:`, sendError.message);
                    lastError = sendError;
                    if (attempt < 3) {
                        console.log(`⏳ Waiting 2 seconds before retry...`);
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                }
            }
            
            // All attempts failed
            throw lastError;
            
        } catch (error) {
            console.error('❌ Error sending reset password email:', error);
            console.error('❌ Error code:', error.code);
            console.error('❌ Error command:', error.command);
            throw new Error('Gagal mengirim email reset password: ' + error.message);
        }
    }
};

module.exports = emailService;