# Email Integration Checklist — Google Workspace (Business Suite)

Use this checklist when talking to the college IT / placement officer. The goal is to enable automated email notifications from the Ellixr placement platform using the college's existing Google Workspace account.

---

## 1. Sender Identity

| # | Item | Why we need it | Example |
|---|------|----------------|---------|
| 1 | **Dedicated sender email address** | All system emails should come from one official address so students trust them and so replies are routed correctly. | `placements@sfscollege.in` |
| 2 | **Display name** | The "From" name students see in their inbox. | `SFS College Placements` |
| 3 | **Reply-to address** | Where replies from students should go if they hit "Reply". Can be the same as sender or a shared mailbox. | `placements@sfscollege.in` |
| 4 | **Bounce / no-reply handling** | A mailbox that receives delivery failures (bounces) and out-of-office replies. | `placements@sfscollege.in` |

> **Recommendation:** Create a shared mailbox or Google Group (e.g., `placements@sfscollege.in`) rather than tying it to one person's account.

---

## 2. Google Workspace SMTP / API Access

Choose **one** of the two methods below. SMTP is faster to set up; the Gmail API is more robust for high volume.

### Option A — SMTP Relay (recommended for quick start)

| # | Item | Details |
|---|------|---------|
| 5 | **SMTP host** | `smtp.gmail.com` |
| 6 | **SMTP port** | `587` (STARTTLS) or `465` (SSL/TLS) — prefer `587` |
| 7 | **Authentication method** | Username + App Password **or** OAuth2 |
| 8 | **Username** | The full sender email address |
| 9 | **App Password** | 16-character app password generated in Google Account settings |
| 10 | **2-Step Verification** | Must be enabled on the sender account to create an App Password |
| 11 | **"Less secure app access"** | Should be **OFF**; use App Password or OAuth2 instead |

### Option B — Gmail API (recommended for production scale)

| # | Item | Details |
|---|------|---------|
| 12 | **Google Cloud project** | A project in the college's Google Cloud console |
| 13 | **Gmail API enabled** | Enable the Gmail API for that project |
| 14 | **Service account** | Create a service account and download the JSON key |
| 15 | **Domain-wide delegation** | In Google Admin console, authorize the service account client ID with these OAuth scopes:<br>`https://www.googleapis.com/auth/gmail.send`<br>`https://www.googleapis.com/auth/gmail.modify` (if you need to read bounces) |
| 16 | **Admin approval** | A Google Workspace super-admin must approve domain-wide delegation |

---

## 3. Deliverability — DNS Records

These prevent system emails from landing in Spam/Junk.

| # | Item | What to ask IT for | Typical value |
|---|------|--------------------|---------------|
| 17 | **SPF record** | Include Google’s servers in the SPF TXT record. | `v=spf1 include:_spf.google.com ~all` |
| 18 | **DKIM signing** | Enable DKIM in Google Admin console and provide the DKIM selector/domain. | `google._domainkey` |
| 19 | **DMARC record** | Publish a DMARC TXT record (can start in report-only mode). | `v=DMARC1; p=none; rua=mailto:dmarc@sfscollege.in` |
| 20 | **Custom FROM domain verification** | If sending from a subdomain, verify ownership in Google Workspace. | — |

---

## 4. Volume & Rate Limits

Google Workspace has sending limits. Make sure they fit the college size.

| # | Item | Google Workspace limit (typical) |
|---|------|----------------------------------|
| 21 | **Daily send limit** | 2,000 emails per user per day (Workspace); 500 per day for consumer Gmail |
| 22 | **Per-recipient limit** | 2,000 external recipients per day |
| 23 | **Rate limit** | ~100 emails per minute is safe; burst sending can trigger limits |
| 24 | **Expected notification volume** | Ask the college how many students/officers will receive emails daily. | e.g., 1,000 students × 2 emails/day = 2,000/day |

> **Heads up:** If the college has 1,000+ students and sends multiple notifications per day, Google Workspace may hit its daily cap. In that case we should add a fallback transactional provider (SendGrid, AWS SES, Resend, etc.) or use a Google Group for broadcast emails.

---

## 5. Notification Use-Cases to Confirm

Decide **which events** trigger an email. Not every event needs to be emailed on day one.

| # | Event | Recipient | Priority |
|---|-------|-----------|----------|
| 25 | Student registered / account created | Student | High |
| 26 | Password reset / temporary password | Student | High |
| 27 | New job published | Eligible students | High |
| 28 | Application submitted confirmation | Student | Medium |
| 29 | Application stage changed (shortlisted, rejected, etc.) | Student | Medium |
| 30 | Interview scheduled / updated | Student | High |
| 31 | Offer released / accepted / joined | Student | High |
| 32 | Profile verification status changed | Student | Medium |
| 33 | Bulk announcements from placement officer | Students / groups | Low |
| 34 | Officer alerts (new application, profile submitted) | Placement officer | Medium |

---

## 6. Content & Branding

| # | Item | Why it matters |
|---|------|----------------|
| 35 | **College logo URL** | For email header/branding |
| 36 | **Primary brand color** | Buttons/links styling |
| 37 | **Email signature block** | Legal name, address, contact info |
| 38 | **Privacy / opt-out text** | Required for bulk/notification emails |
| 39 | **Preferred language** | English, or local language? |
| 40 | **HTML email template approval** | Who signs off on the design? |

---

## 7. Compliance & Security

| # | Item | Action |
|---|------|--------|
| 41 | **Data processing consent** | Confirm the college has consent to email students |
| 42 | **Unsubscribe handling** | Provide a way for students to opt out of non-essential emails |
| 43 | **Email content restrictions** | Avoid sending sensitive info (passwords) in plain text; use reset links |
| 44 | **Credential storage** | SMTP password/API key must be stored as environment variables, never in code |
| 45 | **Access audit** | Limit who can access the sender mailbox and cloud credentials |

---

## 8. Testing Before Go-Live

| # | Item | How |
|---|------|-----|
| 46 | **Test mailbox** | A few internal email addresses (student + officer) for dry runs |
| 47 | **Spam folder check** | Send test emails to Gmail, Outlook, college domain |
| 48 | **DKIM/SPF validation** | Use tools like [MxToolbox](https://mxtoolbox.com/) or Google Admin toolbox |
| 49 | **Rate limit dry run** | Send a batch of 50–100 test emails and monitor for bounces/throttling |
| 50 | **Bounce handling test** | Send to a known bad address and confirm bounces land in the bounce mailbox |

---

## Quick One-Liner for the Placement Officer

> “We need a dedicated `placements@college.edu` Google Workspace mailbox, its SMTP credentials (App Password or a service-account key with Gmail API access), and the college’s IT team to confirm SPF/DKIM/DMARC records. Then we can automate job alerts, interview invites, and application updates.”

---

## Next Steps After the Checklist

1. Collect the items above from the college.
2. Add the chosen credentials to the deployment environment variables.
3. Implement the email service adapter in `packages/` (Nodemailer for SMTP or `@googleapis/gmail` for API).
4. Wire the adapter into the notification events selected in section 5.
5. Run the go-live tests in section 8.
