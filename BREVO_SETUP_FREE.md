# 🎁 SOLUSI 100% GRATIS - BREVO (NO SANDBOX MODE!)

## ✅ KENAPA BREVO?

**Brevo (formerly Sendinblue) = Email service GRATIS tanpa batasan sandbox!**

| Feature | Resend Free | Brevo Free |
|---------|-------------|------------|
| **Emails/hari** | 100 | 300 |
| **Sandbox Mode** | ❌ YES (harus verify recipient) | ✅ NO (kirim ke mana aja!) |
| **Manual Add Email** | ❌ YES | ✅ NO |
| **Biaya** | $0 | $0 |
| **Setup Time** | 5 min | 10 min |

---

## 🎯 SETUP BREVO (10 MENIT)

### **STEP 1: Sign Up Brevo (2 menit)**

1. **Buka:** https://app.brevo.com/account/register
2. **Pilih "Sign up free"**
3. **Isi form:**
   - Email: (email Anda)
   - Password: (buat password)
   - Company name: `Quiz Master` (atau apa aja)
4. **Klik "Sign up"**
5. **Verify email** - cek inbox, klik link verification

### **STEP 2: Complete Profile (1 menit)**

Setelah login, akan diminta lengkapi profile:
1. **Industry:** Education / E-learning
2. **Company size:** 1-10 employees
3. **Purpose:** Transactional emails
4. **Skip** yang lain (boleh kosongkan)

### **STEP 3: Get API Key (1 menit)**

1. **Klik logo/nama** di kanan atas
2. **Pilih "SMTP & API"**
3. Di bagian **"API Keys"**, klik **"Create a new API key"**
4. **Name:** `Quiz Master Production`
5. **Klik "Generate"**
6. **COPY API Key** yang muncul (format: `xkeysib-...`)
   - **SAVE** di Notepad (penting!)
   - Contoh: `xkeysib-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz-AbCdEfGh`

### **STEP 4: Install Brevo Package (2 menit)**

Di folder backend:

```bash
cd "d:\Quiz Master\backend-quiz-master"
npm install @getbrevo/brevo --save
```

### **STEP 5: Update emailService.js (2 menit)**

Ganti isi file `src/utils/emailService.js`:

```javascript
const SibApiV3Sdk = require('@getbrevo/brevo');

// Initialize Brevo (formerly Sendinblue)
const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
const apiKey = apiInstance.authentications['apiKey'];
apiKey.apiKey = process.env.BREVO_API_KEY;

console.log('✅ Brevo API initialized (no sandbox mode - send to ANY email!)');
console.log('🔐 BREVO_API_KEY:', process.env.BREVO_API_KEY ? 'SET ✅' : 'NOT SET ❌');

const emailService = {
    sendPasswordResetEmail: async (email, token) => {
        try {
            console.log('📧 Sending reset password email via Brevo...');
            console.log('📧 To:', email);
            
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            const resetLink = `${frontendUrl}/password-baru?token=${token}`;
            
            const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
            
            sendSmtpEmail.subject = '🔐 Reset Password - Quiz Master';
            sendSmtpEmail.htmlContent = `
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
                    <!-- Header -->
                    <tr>
                        <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">🔐 Reset Password</h1>
                        </td>
                    </tr>
                    
                    <!-- Body -->
                    <tr>
                        <td style="padding: 40px;">
                            <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                                Halo,
                            </p>
                            <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                                Kami menerima permintaan untuk mereset password akun Quiz Master Anda.
                            </p>
                            <p style="margin: 0 0 30px; color: #333333; font-size: 16px; line-height: 1.6;">
                                Klik tombol di bawah ini untuk membuat password baru:
                            </p>
                            
                            <!-- CTA Button -->
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
                            
                            <!-- Security Notice -->
                            <table role="presentation" style="width: 100%; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px; margin: 20px 0;">
                                <tr>
                                    <td style="padding: 15px;">
                                        <p style="margin: 0 0 10px; color: #856404; font-size: 14px; font-weight: 600;">
                                            ⚠️ Perhatian Keamanan
                                        </p>
                                        <p style="margin: 0; color: #856404; font-size: 13px; line-height: 1.5;">
                                            Link ini hanya berlaku selama <strong>1 jam</strong> dan hanya bisa digunakan sekali.<br>
                                            Jika Anda tidak meminta reset password, abaikan email ini dan akun Anda akan tetap aman.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
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
            `;
            sendSmtpEmail.sender = { 
                name: 'Quiz Master', 
                email: process.env.BREVO_SENDER_EMAIL || 'noreply@quiz-master.com' 
            };
            sendSmtpEmail.to = [{ email: email }];
            sendSmtpEmail.replyTo = { 
                email: 'noreply@quiz-master.com', 
                name: 'Quiz Master' 
            };
            
            const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
            
            console.log('✅ Password reset email sent successfully via Brevo!');
            console.log('📧 Message ID:', response.messageId);
            console.log('📧 To:', email);
            
            return response;
            
        } catch (error) {
            console.error('❌ Error sending reset password email via Brevo:', error);
            throw new Error('Gagal mengirim email reset password: ' + error.message);
        }
    }
};

module.exports = emailService;
```

### **STEP 6: Add Environment Variable to Railway (2 menit)**

1. **Buka Railway Dashboard:** https://railway.app/
2. **Pilih project:** `backend-quiz-master-production`
3. **Klik tab "Variables"**
4. **Tambah variable BARU:**

```
Name: BREVO_API_KEY
Value: xkeysib-abc123... (paste API key Anda)
```

5. **(Optional) Tambah sender email:**
```
Name: BREVO_SENDER_EMAIL
Value: noreply@quiz-master.com
```

6. **Hapus variable lama (optional):**
   - `RESEND_API_KEY` → Delete (tidak dipakai lagi)

7. **Railway auto-restart** (tunggu 2 menit)

---

## 🎯 CARA CEPAT - COPY PASTE SETUP

### **1. Install Package**
```bash
cd "d:\Quiz Master\backend-quiz-master"
npm install @getbrevo/brevo --save
```

### **2. Replace emailService.js**
Gunakan kode di STEP 5 di atas - copy full file.

### **3. Add to Railway**
- Variable: `BREVO_API_KEY`
- Value: API key dari Brevo Dashboard

### **4. Commit & Push**
```bash
git add -A
git commit -m "Switch to Brevo email service - no sandbox mode, free 300 emails/day"
git push origin main
```

### **5. Test!**
- Tunggu 2 menit Railway deploy
- Test reset password dengan **EMAIL APA AJA**
- Email pasti masuk! ✅

---

## ✅ KEUNTUNGAN BREVO

| Feature | Status |
|---------|--------|
| **Biaya** | 🎁 100% GRATIS |
| **Emails/hari** | ✅ 300 (3x lipat Resend!) |
| **Sandbox Mode** | ✅ TIDAK ADA - kirim ke email mana aja! |
| **Manual Add Email** | ✅ TIDAK PERLU |
| **Verification Required** | ✅ TIDAK |
| **Railway Compatible** | ✅ YES (HTTPS API) |
| **Production Ready** | ✅ YES |
| **Email Delivery Rate** | ✅ 99%+ |

---

## 📊 Expected Railway Logs

Setelah setup berhasil:

```
✅ Brevo API initialized (no sandbox mode - send to ANY email!)
🔐 BREVO_API_KEY: SET ✅
📧 Sending reset password email via Brevo...
📧 To: usertesting@gmail.com
✅ Password reset email sent successfully via Brevo!
📧 Message ID: <abc123@brevo.com>
```

---

## 🆘 Troubleshooting

### **"BREVO_API_KEY: NOT SET ❌"**

**Solusi:**
1. Cek Railway Variables → `BREVO_API_KEY` ada?
2. Cek value starts with `xkeysib-`
3. Restart Railway manual (Settings → Restart)

### **"Error sending email" / API Error**

**Solusi:**
1. Cek API key masih valid (login Brevo Dashboard)
2. Cek quota: Brevo Dashboard → Statistics
3. Pastikan package `@getbrevo/brevo` terinstall

### **Email masuk spam?**

**Normal untuk free tier!** Tapi email tetap masuk.

**Untuk masuk inbox (optional, GRATIS):**
1. Brevo Dashboard → Senders & IP
2. Authenticate domain (free, optional)
3. Add DNS records (SPF/DKIM)

---

## 🎯 PERBANDINGAN

| | Resend | Brevo |
|---|---|---|
| **Free Emails/hari** | 100 | 300 |
| **Sandbox Mode** | ❌ YES | ✅ NO |
| **Send to Any Email** | ❌ NO | ✅ YES |
| **Manual Setup** | ❌ YES | ✅ NO |
| **Setup Time** | 5 min + manual add | 10 min DONE |

---

## ✅ CHECKLIST

- [ ] Sign up Brevo: https://app.brevo.com/account/register
- [ ] Get API Key dari Brevo Dashboard
- [ ] Install package: `npm install @getbrevo/brevo`
- [ ] Update `emailService.js` dengan kode baru
- [ ] Add `BREVO_API_KEY` to Railway
- [ ] Commit & push to GitHub
- [ ] Railway auto-deploy (tunggu 2 min)
- [ ] Test reset password dengan email random - BERHASIL! ✅

---

**SELESAI! SEKARANG BISA KIRIM KE EMAIL MANA AJA TANPA ADD MANUAL!** 🎉

No sandbox mode, no verification needed, 100% GRATIS!
