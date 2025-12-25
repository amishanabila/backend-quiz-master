const nodemailer = require('nodemailer');

let transporter;

try {
    // Use port 465 (SSL) as Railway might block port 587
    transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465, // Use 465 (SSL) - more reliable for Railway
        secure: true, // true for 465
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        },
        tls: {
            rejectUnauthorized: false
        },
        connectionTimeout: 15000, // 15 seconds
        greetingTimeout: 15000,
        socketTimeout: 15000,
        pool: true, // Use pooled connections
        maxConnections: 5,
        maxMessages: 10,
        debug: true,
        logger: true
    });
    console.log('✅ Email transporter created with SSL port 465');
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
            console.log('🔐 EMAIL_USER:', process.env.EMAIL_USER);
            console.log('🔐 EMAIL_PASSWORD length:', process.env.EMAIL_PASSWORD ? process.env.EMAIL_PASSWORD.length : 0);
            
            // Skip verification, send directly (Railway firewall might block verification)
            console.log('⚠️ Skipping SMTP verification due to Railway network restrictions');
            console.log('📧 Sending email directly...');
            
            // Send email with extended retry and better error handling
            let lastError;
            for (let attempt = 1; attempt <= 5; attempt++) {
                try {
                    console.log(`📧 Attempt ${attempt}/5 to send email...`);
                    const info = await transporter.sendMail(mailOptions);
                    console.log('✅ Password reset email sent successfully!');
                    console.log('📧 Message ID:', info.messageId);
                    console.log('📧 Response:', info.response);
                    console.log('📧 Accepted:', info.accepted);
                    console.log('📧 Rejected:', info.rejected);
                    return; // Success!
                } catch (sendError) {
                    console.error(`❌ Attempt ${attempt} failed:`, sendError.message);
                    console.error(`❌ Error code:`, sendError.code);
                    console.error(`❌ Error command:`, sendError.command);
                    lastError = sendError;
                    
                    if (attempt < 5) {
                        const waitTime = attempt * 3000; // Progressive backoff: 3s, 6s, 9s, 12s
                        console.log(`⏳ Waiting ${waitTime/1000} seconds before retry...`);
                        await new Promise(resolve => setTimeout(resolve, waitTime));
                    }
                }
            }
            
            // All attempts failed
            console.error('❌ All 5 attempts failed to send email');
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