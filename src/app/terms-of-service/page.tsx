import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Terms of Service | Pixy',
    description: 'Terms of Service for Pixy WhatsApp Business Platform',
};

export default function TermsOfServicePage() {
    return (
        <div className="container max-w-4xl py-12">
            <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>

            <p className="text-sm text-muted-foreground mb-8">
                Last Updated: January 23, 2026
            </p>

            <div className="prose prose-slate dark:prose-invert max-w-none">
                <h2>1. Acceptance of Terms</h2>
                <p>
                    By accessing and using Pixy ("the Platform"), you accept and agree to be bound by the
                    terms and provision of this agreement.
                </p>

                <h2>2. Acceptable Use & AI Restrictions</h2>
                <p>Pixy platform may only be used for legitimate business communications.</p>

                <h3>Strict Restriction on General Purpose AI</h3>
                <p>
                    <strong>Prohibited:</strong> It is strictly forbidden to use the Pixy platform to distribute
                    "General Purpose" assistants, open-ended chatbots, or conversational agents without a
                    defined commercial purpose.
                </p>
                <p>
                    <strong>Mandatory Intent Ratio:</strong> Your AI configuration must demonstrate that
                    <strong>&gt;90%</strong> of interactions serve a specific business task (e.g., Appointment Booking,
                    Technical Support, Product Inquiries). Failure to maintain this ratio may result in
                    immediate service suspension to comply with Meta's Integrity Policy.
                </p>

                <h3>Prohibited Activities</h3>
                <p>You may NOT use Pixy for:</p>
                <ul>
                    <li>Spam or unsolicited messages</li>
                    <li>Illegal content or activities</li>
                    <li>Harassment or abuse</li>
                    <li>Rate limit circumvention</li>
                    <li>Training AI models with user data</li>
                </ul>

                <h2>3. Meta WhatsApp Policies</h2>
                <p>You agree to comply with:</p>
                <ul>
                    <li>WhatsApp Business Policy</li>
                    <li>WhatsApp Commerce Policy</li>
                    <li>Meta Business Tools Terms</li>
                    <li>Meta Platform Policies</li>
                </ul>

                <h2>4. Data Responsibility</h2>
                <p>
                    As a customer, <strong>YOU are the Data Controller</strong>. Pixy is the <strong>Data Processor</strong>.
                </p>

                <p>You must:</p>
                <ul>
                    <li>Obtain user consent for data collection</li>
                    <li>Provide your own privacy policy to users</li>
                    <li>Honor user data requests (access, deletion)</li>
                    <li>Not use platform for illegal purposes</li>
                    <li>Comply with GDPR, CCPA, and applicable data protection laws</li>
                </ul>

                <h2>5. Account Security</h2>
                <ul>
                    <li>You are responsible for maintaining the security of your account</li>
                    <li>You must use strong passwords or passkeys</li>
                    <li>You must notify us immediately of any unauthorized access</li>
                    <li>You are liable for all activities under your account</li>
                </ul>

                <h2>6. Usage Limits</h2>
                <p>
                    Your account is subject to usage limits based on your subscription tier:
                </p>
                <ul>
                    <li>WhatsApp messaging limits (per Meta tier)</li>
                    <li>AI message processing limits</li>
                    <li>Email sending limits</li>
                    <li>Concurrent calling capacity</li>
                </ul>

                <p>
                    Exceeding limits may result in additional charges or service suspension.
                </p>

                <h2>7. Service Availability</h2>
                <p>
                    We strive for 99.9% uptime but do not guarantee uninterrupted service. We are not
                    liable for:
                </p>
                <ul>
                    <li>Scheduled maintenance downtime</li>
                    <li>Third-party service outages (Meta, Supabase, etc.)</li>
                    <li>Force majeure events</li>
                </ul>

                <h2>8. Payment Terms</h2>
                <ul>
                    <li>Subscription fees are billed monthly or annually in advance</li>
                    <li>Usage-based charges are billed monthly in arrears</li>
                    <li>All fees are non-refundable unless required by law</li>
                    <li>Failed payments may result in service suspension</li>
                </ul>

                <h2>9. Intellectual Property</h2>
                <p>
                    Pixy retains all rights to the platform, including:
                </p>
                <ul>
                    <li>Source code and software</li>
                    <li>Design and user interface</li>
                    <li>Trademarks and branding</li>
                </ul>

                <p>
                    You retain all rights to your customer data and content.
                </p>

                <h2>10. White Label Licensing</h2>
                <p>
                    Customers on Enterprise or Reseller plans may be granted white label rights, allowing
                    them to rebrand Pixy under their own name. This requires a separate licensing agreement.
                </p>

                <h2>11. Termination</h2>
                <p>
                    We may terminate or suspend your account if you:
                </p>
                <ul>
                    <li>Violate these terms</li>
                    <li>Violate Meta policies</li>
                    <li>Fail to pay subscription fees</li>
                    <li>Engage in fraudulent activity</li>
                </ul>

                <p>
                    You may terminate your account at any time by contacting support. Upon termination,
                    you may request data export.
                </p>

                <h2>12. Limitation of Liability</h2>
                <p>
                    To the maximum extent permitted by law, Pixy shall not be liable for any indirect,
                    incidental, special, consequential, or punitive damages, including loss of profits,
                    data, or goodwill.
                </p>

                <h2>13. Indemnification</h2>
                <p>
                    You agree to indemnify and hold harmless Pixy from any claims arising from your use
                    of the platform, violation of these terms, or violation of any rights of another.
                </p>

                <h2>14. Changes to Terms</h2>
                <p>
                    We reserve the right to modify these terms at any time. We will notify you of material
                    changes via email or platform notification. Continued use after changes constitutes
                    acceptance.
                </p>

                <h2>15. Governing Law</h2>
                <p>
                    These terms are governed by the laws of the United States. Any disputes shall be
                    resolved in the courts of [Your Jurisdiction].
                </p>

                <h2>16. Contact</h2>
                <p>
                    For questions about these terms, contact us at:
                </p>
                <p>
                    <strong>Email:</strong> <a href="mailto:privacidad@pixy.com.co" className="text-primary hover:underline">privacidad@pixy.com.co</a>
                </p>

                <div className="mt-12 p-6 bg-muted rounded-lg">
                    <h3 className="text-lg font-semibold mb-2">Related Documents</h3>
                    <ul className="space-y-2">
                        <li>
                            <a href="/privacy-policy" className="text-primary hover:underline">
                                Privacy Policy
                            </a>
                        </li>
                        <li>
                            <a href="/data-deletion" className="text-primary hover:underline">
                                Data Deletion Instructions
                            </a>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
