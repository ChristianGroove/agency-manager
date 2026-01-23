import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Privacy Policy | Pixy',
    description: 'Privacy Policy for Pixy WhatsApp Business Platform',
};

export default function PrivacyPolicyPage() {
    return (
        <div className="container max-w-4xl py-12">
            <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>

            <p className="text-sm text-muted-foreground mb-8">
                Last Updated: January 23, 2026
            </p>

            <div className="prose prose-slate dark:prose-invert max-w-none">
                <h2>Business Solution Data (Meta Requirement)</h2>

                <p>
                    Pixy acts as a <strong>Data Processor</strong> for WhatsApp Business Solution data. We:
                </p>

                <ul>
                    <li>Process business messages on behalf of our customers (Data Controllers)</li>
                    <li>Do NOT use customer data to train AI models</li>
                    <li>Implement zero data retention with LLM providers</li>
                    <li>Use encryption at rest and in transit</li>
                </ul>

                <h3>Data We Process</h3>
                <ul>
                    <li>Business conversation messages</li>
                    <li>User phone numbers (hashed)</li>
                    <li>Call metadata (duration, timestamps)</li>
                    <li>Flow interaction data</li>
                </ul>

                <h3>Data We DO NOT Collect</h3>
                <ul>
                    <li>Message content for training purposes</li>
                    <li>Personal conversations</li>
                    <li>User device information beyond what Meta provides</li>
                </ul>

                <h2>Data Retention</h2>
                <ul>
                    <li><strong>Conversations:</strong> 90 days (configurable by customer)</li>
                    <li><strong>Call logs:</strong> 12 months (compliance requirement)</li>
                    <li><strong>Analytics:</strong> Aggregated only, no PII</li>
                    <li><strong>LLM interactions:</strong> 0 days (zero retention policy)</li>
                </ul>

                <h2>AI Usage</h2>
                <p>Our AI assistant:</p>
                <ul>
                    <li>Processes queries in real-time</li>
                    <li>Does NOT store conversation history for training</li>
                    <li>Uses anonymized user identifiers only</li>
                    <li>Configured with OpenAI zero retention policy</li>
                </ul>

                <h2>User Rights</h2>
                <p>Users can request:</p>
                <ul>
                    <li><strong>Data access:</strong> What data we have</li>
                    <li><strong>Data deletion:</strong> Right to be forgotten</li>
                    <li><strong>Data portability:</strong> Export in JSON format</li>
                </ul>

                <p>
                    See <a href="/data-deletion" className="text-primary hover:underline">Data Deletion Instructions</a> for details.
                </p>

                <h2>Security Measures</h2>
                <ul>
                    <li>End-to-end encryption for WhatsApp messages (Meta protocol)</li>
                    <li>RSA-2048 + AES-128-GCM encryption for Flows data exchange</li>
                    <li>SRTP encryption for voice calls</li>
                    <li>Row-level security (RLS) for database isolation</li>
                    <li>Encrypted credential storage in secure vault</li>
                </ul>

                <h2>Third-Party Services</h2>
                <p>We use the following third-party services:</p>
                <ul>
                    <li><strong>Meta WhatsApp Business API:</strong> Message delivery and calling</li>
                    <li><strong>OpenAI:</strong> AI assistance (zero retention configured)</li>
                    <li><strong>Supabase:</strong> Database and authentication</li>
                    <li><strong>Vercel:</strong> Hosting and edge functions</li>
                </ul>

                <h2>Compliance</h2>
                <ul>
                    <li>GDPR compliant (EU users)</li>
                    <li>CCPA compliant (California users)</li>
                    <li>Meta WhatsApp Business Platform policies</li>
                    <li>Meta 2026 AI policy standards</li>
                </ul>

                <h2>Changes to This Policy</h2>
                <p>
                    We may update this policy from time to time. We will notify you of any changes by posting
                    the new Privacy Policy on this page and updating the "Last Updated" date.
                </p>

                <h2>Contact</h2>
                <p>
                    <strong>Data Protection Officer:</strong> <a href="mailto:privacy@pixy.com" className="text-primary hover:underline">privacy@pixy.com</a>
                </p>
                <p>
                    <strong>General Inquiries:</strong> <a href="mailto:support@pixy.com" className="text-primary hover:underline">support@pixy.com</a>
                </p>

                <div className="mt-12 p-6 bg-muted rounded-lg">
                    <h3 className="text-lg font-semibold mb-2">Quick Links</h3>
                    <ul className="space-y-2">
                        <li>
                            <a href="/terms-of-service" className="text-primary hover:underline">
                                Terms of Service
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
