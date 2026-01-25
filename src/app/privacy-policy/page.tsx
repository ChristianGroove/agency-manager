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
                <h2>Business Solution Data & AI Policy (2026 Compliance)</h2>

                <p>
                    Pixy acts exclusively as a <strong>Data Processor</strong> under the instructions of our Customers (Data Controllers), complying with Meta's January 2026 AI Policy.
                </p>

                <h3>AI No-Training Guarantee</h3>
                <div className="bg-primary/5 p-4 rounded-md border border-primary/20 my-4">
                    <p className="font-semibold text-primary">Strict Prohibition on Model Training</p>
                    <p>
                        PIXY guarantees that <strong>no data</strong> derived from the WhatsApp Business Solution
                        (including message content, user profiles, or metadata) is used to train, fine-tune,
                        improve, or feed our own or third-party Foundation Models (LLMs).
                    </p>
                </div>

                <h3>Technical Attribution</h3>
                <p>
                    We collect unique identifiers such as <code>ctwa_clid</code> (Click-to-WhatsApp Click ID)
                    <strong>solely</strong> for the purpose of attribution and optimizing ad conversions
                    requested by the Data Controller. This data is not used for user profiling across businesses.
                </p>

                <h3>AI Usage Limits</h3>
                <ul>
                    <li>AI processing is stateless with a zero-retention policy at the provider level (OpenAI).</li>
                    <li>AI is restricted to specific business tasks (appointments, support, queries).</li>
                    <li>We do not offer "General Purpose" open-domain chatbots.</li>
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
                    <strong>Data Protection Officer:</strong> <a href="mailto:privacidad@pixy.com.co" className="text-primary hover:underline">privacidad@pixy.com.co</a>
                </p>
                <p>
                    <strong>General Inquiries:</strong> <a href="mailto:privacidad@pixy.com.co" className="text-primary hover:underline">privacidad@pixy.com.co</a>
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
