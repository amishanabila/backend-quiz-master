const { Resend } = require('resend');

// Initialize Resend API
const resend = new Resend(process.env.RESEND_API_KEY);

console.log('✅ Resend API initialized');
console.log('🔐 RESEND_API_KEY:', process.env.RESEND_API_KEY ? 'SET ✅' : 'NOT SET ❌');
console.log('ℹ️  Note: Free tier requires recipient email verification at https://resend.com/audiences');

const emailService = {
    sendPasswordResetEmail: async (email, token) => {
        try {
            console.log('📧 Sending reset password email via Resend...');
            console.log('📧 To:', email);
            
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            const resetLink = `${frontendUrl}/password-baru?token=${token}`;
            
            console.log('🔗 Reset link:', resetLink);
            
            const { data, error } = await resend.emails.send({
                from: 'Quiz Master <onboarding@resend.dev>',
                to: [email],
                subject: '🔐 Reset Password - Quiz Master',
                html: `
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Password Quiz Master</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: 'Segoe UI', Arial, sans-serif;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td style="padding: 40px 0; text-align: center;">
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">🔐 Reset Password</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px;">
                            <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">Halo,</p>
                            <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                                Kami menerima permintaan untuk mereset password akun Quiz Master Anda.
                            </p>
                            <p style="margin: 0 0 30px; color: #333333; font-size: 16px; line-height: 1.6;">
                                Klik tombol di bawah ini untuk membuat password baru:
                            </p>
                            <table role="presentation" style="margin: 0 auto;">
                                <tr>
                                    <td style="border-radius: 6px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                                        <a href="${resetLink}" style="display: inline-block; padding: 16px 40px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 6px;">
                                            Reset Password Sekarang
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            <p style="margin: 30px 0 20px; color: #666666; font-size: 14px; line-height: 1.6;">
                                Atau copy dan paste link berikut ke browser Anda:
                            </p>
                            <p style="margin: 0 0 30px; padding: 15px; background-color: #f8f9fa; border-left: 4px solid #667eea; color: #333333; font-size: 13px; word-break: break-all; border-radius: 4px;">
                                ${resetLink}
                            </p>
                            <table role="presentation" style="width: 100%; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px; margin: 20px 0;">
                                <tr>
                                    <td style="padding: 15px;">
                                        <p style="margin: 0 0 10px; color: #856404; font-size: 14px; font-weight: 600;">⚠️ Perhatian Keamanan</p>
                                        <p style="margin: 0; color: #856404; font-size: 13px; line-height: 1.5;">
                                            Link ini hanya berlaku selama <strong>1 jam</strong> dan hanya bisa digunakan sekali.<br>
                                            Jika Anda tidak meminta reset password, abaikan email ini dan akun Anda akan tetap aman.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; border-top: 1px solid #e9ecef;">
                            <p style="margin: 0 0 10px; color: #6c757d; font-size: 13px; line-height: 1.6; text-align: center;">
                                Email ini dikirim secara otomatis oleh sistem Quiz Master.
                            </p>
                            <p style="margin: 0; color: #6c757d; font-size: 12px; text-align: center;">
                                © 2025 Quiz Master. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
                `
            });
            
            if (error) {
                console.error('❌ Resend API error:', error);
                if (error.message && error.message.includes('not found')) {
                    throw new Error('Email ' + email + ' belum diverifikasi di Resend. Silakan tambahkan email di https://resend.com/audiences');
                }
                throw new Error('Resend API error: ' + error.message);
            }
            
            console.log('✅ Password reset email sent successfully!');
            console.log('📧 Email ID:', data.id);
            return data;
            
        } catch (error) {
            console.error('❌ Error sending reset password email:', error);
            throw new Error('Gagal mengirim email reset password: ' + error.message);
        }
    }
};

module.exports = emailService;
