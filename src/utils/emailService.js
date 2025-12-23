const nodemailer = require('nodemailer');

let transporter;

try {
    transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        }
    });
} catch (error) {
    console.error('Error creating email transporter:', error);
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
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            const resetLink = `${frontendUrl}/password-baru?token=${token}`;
            
            const mailOptions = {
                from: process.env.EMAIL_USER,
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

            await transporter.sendMail(mailOptions);
            console.log('Password reset email sent to:', email);
        } catch (error) {
            console.error('Error sending reset password email:', error);
            throw new Error('Gagal mengirim email reset password: ' + error.message);
        }
    }
};

module.exports = emailService;