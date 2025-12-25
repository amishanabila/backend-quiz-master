# 🔧 Railway SMTP Connection Fix

## ❌ Problem Detected

**Error from Railway Logs:**
```
Error: Connection timeout
ETIMEDOUT
command: 'CONN'
```

**Root Cause:**
- Railway cannot connect to Gmail SMTP server using default nodemailer `service: 'gmail'` config
- Possible causes:
  1. Railway IP blocked by Gmail
  2. Port 465 (SSL) blocked by Railway firewall
  3. Default Gmail service config not compatible with Railway network

## ✅ Solution Applied

### Changes Made to `emailService.js`:

#### 1. **Explicit SMTP Configuration**
Changed from:
```javascript
service: 'gmail'
```

To:
```javascript
host: 'smtp.gmail.com',
port: 587,  // TLS instead of SSL
secure: false
```

#### 2. **Added Railway Compatibility Settings**
```javascript
tls: {
    rejectUnauthorized: false  // Allow self-signed certs
},
connectionTimeout: 10000,
greetingTimeout: 10000,
socketTimeout: 10000
```

#### 3. **SMTP Connection Verification**
```javascript
await transporter.verify();
console.log('✅ SMTP connection verified');
```

#### 4. **Retry Mechanism (3 attempts)**
```javascript
for (let attempt = 1; attempt <= 3; attempt++) {
    try {
        await transporter.sendMail(mailOptions);
        return; // Success!
    } catch (error) {
        if (attempt < 3) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
}
```

#### 5. **Enhanced Logging**
- Debug mode enabled
- Detailed error logging with error codes
- Connection status logs

## 📋 Testing Checklist

### After Railway Deploy:

1. **Check Deployment Status**
   - Railway Dashboard → Status should be "Running" (green)
   - Deployment time: ~2-3 minutes

2. **Check Logs**
   - Look for: `✅ Email transporter created successfully`
   - Look for: `✅ SMTP connection verified`
   - Should NOT see: `ETIMEDOUT` or `Connection timeout`

3. **Test Reset Password**
   ```bash
   # From terminal
   curl -X POST https://backend-quiz-master-production.up.railway.app/api/auth/reset-password-request \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com"}'
   ```
   
   Expected response:
   ```json
   {
     "status": "success",
     "message": "Email reset password telah dikirim"
   }
   ```

4. **Check Email Inbox**
   - Email should arrive within 10-30 seconds
   - Check spam folder if not in inbox
   - Click reset link to verify redirect works

## 🆘 Troubleshooting

### Still getting "Connection timeout"?

**Solution 1: Try Alternative Port**
Edit `emailService.js`:
```javascript
port: 465,
secure: true  // Use SSL instead of TLS
```

**Solution 2: Use Gmail App Password**
1. Verify 2-Step Verification is enabled
2. Generate new App Password
3. Update `EMAIL_PASSWORD` in Railway
4. Restart Railway service

**Solution 3: Check Railway Network**
```bash
# Test from Railway logs/deployment
nslookup smtp.gmail.com
telnet smtp.gmail.com 587
```

**Solution 4: Use Alternative Email Service**
Consider switching to:
- **SendGrid** (better for production)
- **Resend** (modern, developer-friendly)
- **AWS SES** (scalable)
- **Mailgun** (reliable)

### Email not arriving?

1. **Check Gmail Security:** https://myaccount.google.com/notifications
2. **Check Less Secure Apps:** Should be OFF (use App Password instead)
3. **Check Gmail Limits:** Max 500 emails/day for free accounts
4. **Check Spam Folder:** Gmail might flag automated emails

### Invalid Login Error?

1. Verify `EMAIL_PASSWORD` is App Password (16 digits, no spaces)
2. NOT regular Gmail password
3. Regenerate App Password if needed
4. Update Railway variable and restart

## 📊 Expected Railway Logs After Fix

```
✅ Email transporter created successfully with SMTP config
📧 Preparing to send password reset email...
📧 To: user@example.com
📧 From: ipplquizmaster@gmail.com
🔗 Reset link: https://ippl-quiz-master.vercel.app/password-baru?token=...
📤 Sending email via SMTP...
✅ SMTP connection verified
📧 Attempt 1 to send email...
✅ Password reset email sent successfully!
📧 Message ID: <xxxxx@gmail.com>
📧 Response: 250 2.0.0 OK
```

## 🎯 Success Criteria

- [ ] Railway deployment: **SUCCESS**
- [ ] Railway logs: **No ETIMEDOUT errors**
- [ ] SMTP connection: **Verified**
- [ ] Email sent: **Within 30 seconds**
- [ ] Email received: **In inbox (or spam)**
- [ ] Reset link: **Works correctly**
- [ ] Password reset: **Successful**

## 🚀 Alternative: SendGrid Setup (Recommended for Production)

If Gmail still has issues, use SendGrid:

1. **Sign up:** https://sendgrid.com (Free tier: 100 emails/day)
2. **Get API Key:** Settings → API Keys → Create API Key
3. **Update emailService.js:**
   ```javascript
   const sgMail = require('@sendgrid/mail');
   sgMail.setApiKey(process.env.SENDGRID_API_KEY);
   
   await sgMail.send({
     to: email,
     from: 'noreply@yourdomain.com',
     subject: 'Reset Password',
     html: htmlContent
   });
   ```
4. **Add to Railway:**
   ```
   SENDGRID_API_KEY=your_api_key_here
   ```

---

**Status:** ✅ Fix deployed - waiting for Railway to redeploy
**Last Updated:** December 25, 2025
**Commit:** 40c114f
