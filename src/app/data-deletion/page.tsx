import { Metadata } from 'next';
import { Mail, MessageSquare, Settings } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Data Deletion Instructions | Pixy',
    description: 'How to request deletion of your data from Pixy',
};

export default function DataDeletionPage() {
    return (
        <div className="container max-w-4xl py-12">
            <h1 className="text-4xl font-bold mb-8">User Data Deletion Instructions</h1>

            <p className="text-lg text-muted-foreground mb-8">
                You have the right to request deletion of your personal data at any time.
                Follow any of the methods below.
            </p>

            <div className="prose prose-slate dark:prose-invert max-w-none">
                <h2>How to Request Data Deletion</h2>

                <div className="grid gap-6 my-8 not-prose">
                    {/* Option 1: WhatsApp */}
                    <div className="p-6 border rounded-lg">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-primary/10 rounded-lg">
                                <MessageSquare className="w-6 h-6 text-primary" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold mb-2">Option 1: Via WhatsApp</h3>
                                <p className="text-muted-foreground mb-4">
                                    Send a message to our WhatsApp Business number
                                </p>

                                <div className="bg-muted p-4 rounded-md space-y-2">
                                    <p className="font-mono text-sm">
                                        <strong>Number:</strong> +1 (555) 000-0001
                                    </p>
                                    <p className="font-mono text-sm">
                                        <strong>Message:</strong> "Delete my data"
                                    </p>
                                </div>

                                <div className="mt-4 space-y-2 text-sm">
                                    <p><strong>We will:</strong></p>
                                    <ol className="list-decimal list-inside space-y-1">
                                        <li>Verify your identity</li>
                                        <li>Process deletion within 30 days</li>
                                        <li>Send confirmation message</li>
                                    </ol>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Option 2: Email */}
                    <div className="p-6 border rounded-lg">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-primary/10 rounded-lg">
                                <Mail className="w-6 h-6 text-primary" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold mb-2">Option 2: Via Email</h3>
                                <p className="text-muted-foreground mb-4">
                                    Send an email to our Data Protection team.
                                </p>

                                <div className="bg-muted p-4 rounded-md space-y-2">
                                    <p className="font-mono text-sm">
                                        <strong>To:</strong> privacidad@pixy.com.co
                                    </p>
                                    <p className="font-mono text-sm">
                                        <strong>Subject:</strong> DATA DELETION REQUEST
                                    </p>
                                    <p className="font-mono text-sm">
                                        <strong>Body:</strong> Please include your registered phone number.
                                    </p>
                                </div>

                                <p className="mt-4 text-sm">
                                    <strong>Process:</strong> We will process the total deletion of metadata and records within a maximum of 30 calendar days and notify you via the same channel.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Option 3: Platform */}
                    <div className="p-6 border rounded-lg">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-primary/10 rounded-lg">
                                <Settings className="w-6 h-6 text-primary" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold mb-2">Option 3: Via Our Platform</h3>
                                <p className="text-muted-foreground mb-4">
                                    Request deletion directly from your account
                                </p>

                                <div className="space-y-2 text-sm">
                                    <ol className="list-decimal list-inside space-y-2">
                                        <li>Log in to Pixy dashboard</li>
                                        <li>Go to <strong>Settings</strong> → <strong>Privacy</strong></li>
                                        <li>Click <strong>"Request Data Deletion"</strong></li>
                                        <li>Confirm your request</li>
                                    </ol>
                                </div>

                                <p className="mt-4 text-sm">
                                    <strong>Status tracking:</strong> View deletion progress in your account
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <h2>What Gets Deleted</h2>
                <p>When you request deletion, we will remove:</p>
                <ul>
                    <li>All your messages and conversation history</li>
                    <li>Your contact information (name, email, phone)</li>
                    <li>Call logs involving your number</li>
                    <li>Any custom data fields associated with your profile</li>
                    <li>Analytics data containing your information</li>
                </ul>

                <h2>What We Retain (Legal Requirement)</h2>
                <p>
                    For legal compliance and fraud prevention purposes, we may retain:
                </p>
                <ul>
                    <li><strong>Transaction records:</strong> 12 months</li>
                    <li><strong>Fraud prevention logs:</strong> 6 months</li>
                    <li><strong>Aggregated, anonymized analytics:</strong> Indefinitely (no PII)</li>
                </ul>

                <p className="text-sm text-muted-foreground">
                    These retained records cannot be used to identify you and are kept only for legal compliance.
                </p>

                <h2>Deletion Timeframe</h2>
                <div className="bg-muted p-6 rounded-lg my-4 not-prose">
                    <div className="grid gap-4">
                        <div className="flex justify-between items-center">
                            <span className="font-semibold">Acknowledgment</span>
                            <span className="text-sm">Within 48 hours</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="font-semibold">Processing Complete</span>
                            <span className="text-sm">Within 30 days</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="font-semibold">Confirmation Sent</span>
                            <span className="text-sm">Email upon completion</span>
                        </div>
                    </div>
                </div>

                <h2>Verification Process</h2>
                <p>
                    To protect your privacy, we must verify your identity before processing deletion requests.
                    This may involve:
                </p>
                <ul>
                    <li>Confirming your phone number via SMS</li>
                    <li>Verifying your email address</li>
                    <li>Answering security questions</li>
                </ul>

                <h2>Questions or Issues?</h2>
                <p>If you have any questions about data deletion or face any issues, contact us:</p>

                <div className="bg-muted p-6 rounded-lg my-4 not-prose">
                    <div className="space-y-3">
                        <div>
                            <p className="font-semibold">Email</p>
                            <a href="mailto:privacy@pixy.com" className="text-primary hover:underline">
                                privacy@pixy.com
                            </a>
                        </div>
                        <div>
                            <p className="font-semibold">WhatsApp Support</p>
                            <p className="text-sm">+1 (555) 000-0001</p>
                        </div>
                        <div>
                            <p className="font-semibold">Business Hours</p>
                            <p className="text-sm">Monday - Friday, 9:00 AM - 6:00 PM EST</p>
                        </div>
                    </div>
                </div>

                <div className="mt-12 p-6 bg-primary/5 border border-primary/20 rounded-lg">
                    <h3 className="text-lg font-semibold mb-2">Your Rights</h3>
                    <p className="text-sm">
                        Under GDPR and CCPA, you have the right to:
                    </p>
                    <ul className="text-sm space-y-1 mt-2">
                        <li>Access your data (what we have)</li>
                        <li>Delete your data (right to be forgotten)</li>
                        <li>Export your data (data portability)</li>
                        <li>Correct inaccurate data</li>
                        <li>Object to processing</li>
                    </ul>
                </div>

                <div className="mt-8 p-6 bg-muted rounded-lg">
                    <h3 className="text-lg font-semibold mb-2">Related Information</h3>
                    <ul className="space-y-2">
                        <li>
                            <a href="/privacy-policy" className="text-primary hover:underline">
                                Privacy Policy - Learn how we handle your data
                            </a>
                        </li>
                        <li>
                            <a href="/terms-of-service" className="text-primary hover:underline">
                                Terms of Service - Understand our service terms
                            </a>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
