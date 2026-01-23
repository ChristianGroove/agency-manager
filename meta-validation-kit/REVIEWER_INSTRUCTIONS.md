# Meta App Review - Reviewer Instructions

## 🎯 Quick Access

**Demo Dashboard URL**: https://pixy-demo.vercel.app  
**Reviewer Email**: meta_reviewer@pixy.test  
**Reviewer Password**: MetaReview2026!Secure

**Language**: English (Auto-set for reviewer mode)

---

## 📋 Test Account Details

### WhatsApp Test Numbers
- Primary: **+1 555 000 0001**
- Secondary: **+1 555 000 0002**

### Meta Business Configuration
- **App ID**: [YOUR_APP_ID]
- **Test WABA ID**: test_waba_123456
- **Test Phone Number ID**: test_phone_123456

### Demo Data Status
✅ Pre-populated with sample clients, conversations, campaigns, and conversions  
✅ ROI metrics showing realistic attribution analytics  
✅ Call logs demonstrating voice functionality  
✅ Flows published and ready to test  

---

## 🎬 Screencast 1: Calling API Management

**Video File**: `screencast-1-calling.mp4`  
**Duration**: ~3 minutes  
**Demonstrates**: whatsapp_business_management permission

### Step-by-Step Reproduction

#### Part 1: Enable Calling (90 seconds)

1. **Log in to Dashboard**
   - Navigate to https://pixy-demo.vercel.app
   - Enter credentials above
   - Dashboard loads in English automatically

2. **Navigate to Calling Settings**
   - Click "Settings" in sidebar
   - Click "Calling API" tab
   - You'll see current status: "Disabled"

3. **Enable Calling**
   - Click blue "Enable Calling" button
   - Observe loading indicator
   - Success notification appears: "Calling API enabled successfully"
   - Status changes to: "Enabled"
   - Icon visibility shows: "Visible"

4. **Verify API Request**
   - Open browser DevTools (F12)
   - Check Network tab
   - See POST request to: `/api/meta/calling/enable`
   - Response: `{ "success": true, "icon_visibility": "DEFAULT" }`

#### Part 2: Verify Icon on WhatsApp (60 seconds)

5. **Check WhatsApp Mobile**
   - Open WhatsApp on test device (+15550000001)
   - Navigate to any chat
   - **OBSERVE**: Call icon appears in chat header (top right)
   - Icon is interactive (can tap to initiate call)

#### Part 3: Disable Calling (45 seconds)

6. **Disable Calling**
   - Return to Pixy dashboard
   - Click red "Disable Calling" button
   - Success notification: "Calling API disabled successfully"
   - Status changes to: "Disabled"
   - Icon visibility shows: "Hidden"

7. **Verify Icon Removal**
   - Return to WhatsApp app
   - **OBSERVE**: Call icon disappears from chat header
   - Change is instant (no app restart required)

### Expected Behavior

✅ Enable/disable toggle works instantly  
✅ API requests complete in < 2 seconds  
✅ Icon visibility changes without app restart  
✅ Status updates reflected in real-time  

---

## 🎬 Screencast 2: Messaging & AI

**Video File**: `screencast-2-messaging-ai.mp4`  
**Duration**: ~5 minutes  
**Demonstrates**: whatsapp_business_messaging permission

### PART A: Voice Permission Flow (2.5 minutes)

#### Step 1-4: Request Permission (60 seconds)

1. **Select Client**
   - Dashboard > Calls > Clients
   - Click on "Acme Corporation" (demo client)
   - View client profile

2. **Request Call Permission**
   - Click "Request Call Permission" button
   - Modal shows HSM template preview
   - Template text: "We'd like to call you about [reason]. Do you approve?"
   - Click "Send Permission Request"

3. **Verify WhatsApp Receipt**
   - Check WhatsApp on +15550000001
   - Message appears with two buttons:
     - ✅ "Approve"
     - ❌ "Deny"

4. **User Approves**
   - Tap "Approve" button in WhatsApp
   - Confirmation message appears

#### Step 5-8: Make Call (90 seconds)

5. **Check Permission Status**
   - Return to Pixy dashboard
   - Client profile now shows: "Permission Granted"
   - "Call Now" button is enabled
   - Shows expiry: "Valid for 72 hours"

6. **Initiate Call**
   - Click "Call Now" button
   - Call dialog appears
   - Shows "Connecting..." status

7. **Observe WebRTC Signaling**
   - DevTools > Console shows:
     - `[Calling] Processing SDP Offer`
     - `[Calling] SDP Answer sent`
     - `[Calling] Call state: RINGING`

8. **Call Connects**
   - Status changes to: "ACCEPTED"
   - Duration timer starts: 00:00, 00:01, 00:02...
   - Audio connection established (if testing with actual devices)
   - Click "End Call" when demonstrated

### PART B: AI Deflection & Flow Launch (2.5 minutes)

#### Step 9-11: Off-Topic Query (60 seconds)

9. **Open AI Chat**
   - Dashboard > AI Assistant
   - Or use WhatsApp chat with Pixy bot number

10. **Send Off-Topic Message**
    - Type: "Write me a poem about flowers"
    - Click Send

11. **Observe Deflection**
    - AI responds within 2 seconds
    - Response text (in English):
      ```
      I'm Pixy AI, specialized in WhatsApp Business API technical 
      assistance. I don't write creative content. Could you ask about 
      API integration, template management, or account health instead?
      ```
    - Note polite, helpful redirect

#### Step 12-15: Commercial Query → Flow Launch (90 seconds)

12. **Send Commercial Message**
    - Type: "I need to schedule an appointment"
    - Click Send

13. **AI Recognizes Intent**
    - AI responds:
      ```
      I can help you schedule an appointment. Let me open the 
      booking form.
      ```

14. **Flow Launches**
    - WhatsApp Flow v5.0 opens automatically
    - Shows "Appointment Booking" screen
    - Demonstrates seamless transition from chat to Flow

15. **Observe Commercial Intent**
    - Dashboard > AI Metrics shows:
      - Commercial Queries: 1
      - Off-Topic Deflections: 1
      - Intent Ratio: 100% (1/1 commercial intent recognized)

### Expected Behavior

✅ Permission request sent via HSM template  
✅ User approval captured via webhook  
✅ Call connects successfully with WebRTC  
✅ AI deflects off-topic politely  
✅ AI launches Flow for commercial intent  
✅ Intent ratio tracked in real-time  

---

## 🎬 Screencast 3: WhatsApp Flows v5.0

**Video File**: `screencast-3-flows.mp4`  
**Duration**: ~4 minutes  
**Demonstrates**: WhatsApp Flows implementation

### Complete Flow Walkthrough

#### Screen 1: Welcome (30 seconds)

1. **Flow Opens**
   - Flow appears in WhatsApp (triggered from previous screencast or via test link)
   - Title: "Book an Appointment"
   - Subtitle: "Select your preferred date and time"

2. **Interaction**
   - Tap "Get Started" button
   - Flow transitions to next screen

#### Screen 2: CalendarPicker (90 seconds)

3. **Calendar Component**
   - **OBSERVE**: CalendarPicker component displays
   - Current month shown (e.g., January 2026)
   - Available dates highlighted
   - **CRITICAL**: Date format shown as **YYYY-MM-DD** (Meta requirement)

4. **Select Date**
   - Tap on date: **January 25, 2026**
   - Date highlights in brand color
   - Selected date displays as: **2026-01-25**
   - ✅ Format verification critical for App Review

5. **Continue**
   - Tap "Next" button
   - Loading indicator shows briefly (encrypted data_exchange call)

#### Screen 3: Time Slot Selection (60 seconds)

6. **Dynamic Time Slots**
   - Screen shows available times for selected date:
     - 9:00 AM
     - 11:00 AM
     - 2:00 PM ← Select this
     - 4:00 PM

7. **Note Encryption**
   - DevTools > Network shows encrypted payload
   - Request to `/api/whatsapp/flows` endpoint
   - Response is encrypted (cannot read in network tab)

8. **Select Time**
   - Tap "2:00 PM"
   - Time slot highlights
   - Tap "Next"

#### Screen 4: Contact Information (45 seconds)

9. **Form Fields**
   - Email field: Enter `reviewer@meta.com`
   - Phone field: Pre-filled with `+15550000001`
   - Note field (optional): "App Review Test"

10. **Submit**
    - Tap "Submit" button
    - Loading indicator appears

#### Screen 5: Terminal Success (45 seconds)

11. **Success Screen**
    - ✅ Checkmark icon appears
    - **Title**: "Appointment Confirmed"
    - **Details**:
      ```
      Date: January 25, 2026
      Time: 2:00 PM
      
      We've sent a confirmation to reviewer@meta.com
      ```

12. **Terminal Behavior**
    - **OBSERVE**: Screen has `"terminal": true` in schema
    - Footer button: "Done"
    - Tap "Done" → Flow closes
    - Returns to WhatsApp chat

13. **Confirmation Message**
    - WhatsApp shows automatic confirmation message
    - Contains appointment details

### Expected Behavior

✅ Flow loads and displays correctly  
✅ CalendarPicker uses YYYY-MM-DD format  
✅ Time slots load dynamically  
✅ Data encrypted during exchange  
✅ Terminal screen shows success  
✅ Flow closes cleanly  

---

## 🎨 Dashboard Visual Validation

### Calling API Controls (Professional UI)

**Location**: Dashboard > Settings > Calling API

**Visual Elements**:
- Clean toggle switches (Enabled/Disabled)
- Status indicators with color coding:
  - 🟢 Green = Enabled/Healthy
  - 🔴 Red = Disabled/Critical
  - 🟡 Yellow = Warning
- Real-time capacity gauge:
  - Shows: 0/1,000 active calls
  - Circular progress indicator
- Call hours configurator with timezone selector
- Quality rating badge (HIGH/MEDIUM/LOW)

### ROI Dashboard (Phase 5 Metrics)

**Location**: Dashboard > Marketing > Analytics

**Visual Elements**:
- **ROI Card** (Large, Prominent):
  - Big number: **619.98%** ROI
  - Trend indicator: ↗️ +45% vs last month
  - Color: Green (positive)

- **CPL Card**:
  - Cost Per Lead: **$11.11**
  - Target: $15.00
  - Status: ✅ Below target

- **Conversions Chart**:
  - Line graph showing daily conversions
  - Leads vs Purchases overlay
  - Interactive tooltips

- **Attribution Table**:
  | Campaign | Clicks | Leads | Purchases | Revenue | ROI |
  |----------|--------|-------|-----------|---------|-----|
  | New Year Promo | 523 | 45 | 12 | $3,599.88 | 619.98% |

- **CTWA Indicator**:
  - Badge showing "CTWA-Originated: 72h Free Window"
  - Countdown timer: "68h 23m remaining"

---

## 🔍 Verification Points for Meta Reviewers

Please confirm during review:

### Technical Functionality
- [ ] Calling API enable/disable works via API call
- [ ] Icon visibility toggles instantly
- [ ] Voice permission flow completes successfully
- [ ] WebRTC call connects and audio works
- [ ] AI deflects off-topic queries appropriately
- [ ] AI launches Flows for commercial intents
- [ ] Intent ratio tracking is accurate

### WhatsApp Flows
- [ ] Flows load in WhatsApp native UI
- [ ] CalendarPicker displays YYYY-MM-DD format
- [ ] Dynamic data loads via encrypted endpoint
- [ ] Terminal screen displays success message
- [ ] Flow closes cleanly on completion

### Data & Privacy
- [ ] Privacy Policy accessible and complete
- [ ] Terms of Service clearly stated
- [ ] Data deletion instructions provided
- [ ] Zero AI training confirmed
- [ ] Data Processor role documented

### UI/UX Quality
- [ ] English translations are professional
- [ ] Dashboard is visually polished
- [ ] Controls are intuitive
- [ ] ROI metrics are clearly presented
- [ ] No broken links or images

---

## 🆘 Troubleshooting

### Issue: Cannot log in
**Solution**: 
- Use exact credentials (case-sensitive)
- Clear browser cache
- Try incognito/private mode
- Contact: review@pixy.com

### Issue: WhatsApp not receiving messages
**Solution**:
- Verify test numbers: +15550000001, +15550000002
- Check WABA subscription includes test numbers
- Verify webhook is configured
- Check Meta Business Manager for test account status

### Issue: Flow doesn't launch
**Solution**:
- Ensure Flow status is "PUBLISHED" (not DRAFT)
- Check Flow ID is configured in environment
- Verify encryption keys are set up
- Test data_exchange endpoint directly

### Issue: Calling doesn't connect
**Solution**:
- Verify Calling API is enabled in Meta Business Manager
- Check VoIP server IP is configured
- Ensure RTP ports (50000-51999) are open
- Test with Meta's sandbox environment first

### Issue: Dashboard shows errors
**Solution**:
- Refresh page (Ctrl+R / Cmd+R)
- Check browser console for errors
- Verify reviewer mode is active
- Contact support with screenshot

---

## 📞 Support Contacts

**Technical Support**  
Email: dev@pixy.com  
Response Time: < 2 hours during business hours

**App Review Questions**  
Email: review@pixy.com  
Response Time: < 24 hours

**Emergency Contact** (Critical Issues During Review)  
Phone: +1 (555) 100-2026  
Available: 24/7 during app review period

---

## 📚 Legal Documentation URLs

**Privacy Policy**  
https://pixy.com/privacy-policy

**Terms of Service**  
https://pixy.com/terms-of-service

**Data Deletion Instructions**  
https://pixy.com/data-deletion

All pages hosted with SSL, publicly accessible.

---

## ✅ Pre-Review Checklist

Before submitting your review, please verify:

- [ ] Logged in successfully with reviewer credentials
- [ ] Viewed screencasts and reproduced all steps
- [ ] Confirmed calling icon visibility toggle
- [ ] Tested voice permission flow
- [ ] Validated AI deflection behavior
- [ ] Completed full Flow walkthrough
- [ ] Verified CalendarPicker date format
- [ ] Checked legal documentation pages
- [ ] Reviewed ROI dashboard metrics
- [ ] Confirmed English UI throughout

---

**Document Version**: 1.0  
**Last Updated**: January 23, 2026  
**Prepared For**: Meta WhatsApp Business Platform App Review  
**Review Batch**: 2026-Q1
