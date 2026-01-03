/**
 * Automation Services
 * 
 * Real integrations for workflow execution.
 * 
 * Required Environment Variables:
 * 
 * Email (Resend):
 * - RESEND_API_KEY: Your Resend API key
 * - EMAIL_FROM: Default sender email (e.g., "noreply@yourdomain.com")
 * 
 * SMS (Twilio):
 * - TWILIO_ACCOUNT_SID: Your Twilio account SID
 * - TWILIO_AUTH_TOKEN: Your Twilio auth token
 * - TWILIO_PHONE_NUMBER: Your Twilio phone number (e.g., "+1234567890")
 * 
 * Scheduler (Cron):
 * - CRON_SECRET: Optional secret for cron endpoint authentication
 * - SUPABASE_SERVICE_ROLE_KEY: Required for cron jobs to access DB
 */

export { sendEmail, sendTemplateEmail, isValidEmail } from './email-service';
export { sendSMS, isValidPhoneNumber, getSMSInfo } from './sms-service';
export { executeNode, executeEmailNode, executeSMSNode, executeHTTPNode } from './node-executor';
export {
    scheduleWorkflowResume,
    getPendingJobs,
    completeJob,
    failJob,
    retryJob,
    cancelJob,
    getWorkflowScheduledJobs,
    parseDelayToMinutes,
    formatDuration
} from './scheduler';
