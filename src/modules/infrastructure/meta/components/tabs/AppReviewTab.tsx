'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Copy, Eye, EyeOff, QrCode, Check, Database } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function AppReviewTab() {
    const { toast } = useToast();
    const [showPassword, setShowPassword] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    // Test credentials from reviewer-mode.ts
    const credentials = {
        email: 'meta_reviewer@pixy.test',
        password: 'MetaReview2026!Secure',
        phoneNumber: '+15550000001',
        testNumbers: ['+15550000001', '+15550000002'],
        wabaId: 'test_waba_123456',
        phoneNumberId: 'test_phone_123456'
    };

    const copyToClipboard = async (text: string, field: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedField(field);

            toast({
                title: 'Copied!',
                description: `${field} copied to clipboard`,
            });

            setTimeout(() => setCopiedField(null), 2000);
        } catch (error) {
            toast({
                title: 'Failed to copy',
                description: 'Please copy manually',
                variant: 'destructive'
            });
        }
    };

    const copyAllCredentials = async () => {
        const allCreds = `
Meta Reviewer Test Credentials
=============================
Email: ${credentials.email}
Password: ${credentials.password}
Phone Number: ${credentials.phoneNumber}
Test Numbers: ${credentials.testNumbers.join(', ')}
WABA ID: ${credentials.wabaId}
Phone Number ID: ${credentials.phoneNumberId}
Dashboard URL: https://pixy-demo.vercel.app
    `.trim();

        await copyToClipboard(allCreds, 'All Credentials');
    };

    return (
        <div className="space-y-6">
            {/* Test Credentials Card */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Test Credentials</CardTitle>
                            <CardDescription>
                                For Meta App Review reviewers
                            </CardDescription>
                        </div>
                        <Badge variant="outline">Reviewer Mode</Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Email */}
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <div className="flex gap-2">
                            <Input
                                id="email"
                                value={credentials.email}
                                readOnly
                                className="font-mono text-sm"
                            />
                            <Button
                                size="icon"
                                variant="outline"
                                onClick={() => copyToClipboard(credentials.email, 'Email')}
                            >
                                {copiedField === 'Email' ? (
                                    <Check className="w-4 h-4 text-green-600" />
                                ) : (
                                    <Copy className="w-4 h-4" />
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* Password */}
                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <div className="flex gap-2">
                            <Input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                value={credentials.password}
                                readOnly
                                className="font-mono text-sm"
                            />
                            <Button
                                size="icon"
                                variant="outline"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? (
                                    <EyeOff className="w-4 h-4" />
                                ) : (
                                    <Eye className="w-4 h-4" />
                                )}
                            </Button>
                            <Button
                                size="icon"
                                variant="outline"
                                onClick={() => copyToClipboard(credentials.password, 'Password')}
                            >
                                {copiedField === 'Password' ? (
                                    <Check className="w-4 h-4 text-green-600" />
                                ) : (
                                    <Copy className="w-4 h-4" />
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* Primary Phone */}
                    <div className="space-y-2">
                        <Label htmlFor="phone">Primary Phone Number</Label>
                        <div className="flex gap-2">
                            <Input
                                id="phone"
                                value={credentials.phoneNumber}
                                readOnly
                                className="font-mono text-sm"
                            />
                            <Button
                                size="icon"
                                variant="outline"
                                onClick={() => copyToClipboard(credentials.phoneNumber, 'Phone')}
                            >
                                {copiedField === 'Phone' ? (
                                    <Check className="w-4 h-4 text-green-600" />
                                ) : (
                                    <Copy className="w-4 h-4" />
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* Test Numbers */}
                    <div className="space-y-2">
                        <Label>Meta Public Test Numbers</Label>
                        <div className="space-y-2">
                            {credentials.testNumbers.map((num, idx) => (
                                <div key={num} className="flex gap-2">
                                    <Input
                                        value={num}
                                        readOnly
                                        className="font-mono text-sm"
                                    />
                                    <Button
                                        size="icon"
                                        variant="outline"
                                        onClick={() => copyToClipboard(num, `Test Number ${idx + 1}`)}
                                    >
                                        {copiedField === `Test Number ${idx + 1}` ? (
                                            <Check className="w-4 h-4 text-green-600" />
                                        ) : (
                                            <Copy className="w-4 h-4" />
                                        )}
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-2 pt-4">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={copyAllCredentials}
                            className="flex-1"
                        >
                            <Copy className="w-4 h-4 mr-2" />
                            Copy All Credentials
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toast({
                                title: 'QR Code',
                                description: 'QR code generation coming soon'
                            })}
                        >
                            <QrCode className="w-4 h-4 mr-2" />
                            Generate QR
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Demo Data Info */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-base">Demo Data Status</CardTitle>
                            <CardDescription>
                                Pre-loaded test data for reviewers
                            </CardDescription>
                        </div>
                        <Badge variant="default">Active</Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <Alert>
                        <Database className="h-4 w-4" />
                        <AlertTitle>Demo Mode Active</AlertTitle>
                        <AlertDescription>
                            <div className="space-y-2 mt-2">
                                <p className="text-sm">
                                    The platform is pre-populated with realistic test data:
                                </p>
                                <ul className="text-sm space-y-1 ml-4">
                                    <li>• 2 Demo clients (Acme Corp, Tech Innovations)</li>
                                    <li>• Marketing campaign with ROI metrics</li>
                                    <li>• 45 leads, 12 purchases, $3,599.88 revenue</li>
                                    <li>• ROI: 619.98% | CPL: $11.11</li>
                                    <li>• Sample call logs and Flow completions</li>
                                </ul>
                            </div>
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>

            {/* Access Instructions */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Access Instructions</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                    <ol className="list-decimal list-inside space-y-2">
                        <li>Navigate to: <code className="text-xs bg-muted px-1 py-0.5 rounded">https://pixy-demo.vercel.app</code></li>
                        <li>Enter the email and password above</li>
                        <li>Dashboard will load in <strong>English</strong> automatically</li>
                        <li>All features are functional with demo data</li>
                        <li>Use test phone numbers for WhatsApp testing</li>
                    </ol>

                    <div className="mt-4 p-3 bg-muted rounded-md">
                        <p className="text-xs text-muted-foreground">
                            💡 <strong>Tip:</strong> Screenshots and recordings show professional UI with realistic
                            metrics. Perfect for Meta App Review demonstration.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Documentation Links */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Review Documentation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <div className="grid gap-2">
                        <a
                            href="/privacy-policy"
                            target="_blank"
                            className="text-sm text-primary hover:underline flex items-center gap-2"
                        >
                            📄 Privacy Policy
                        </a>
                        <a
                            href="/terms-of-service"
                            target="_blank"
                            className="text-sm text-primary hover:underline flex items-center gap-2"
                        >
                            📄 Terms of Service
                        </a>
                        <a
                            href="/data-deletion"
                            target="_blank"
                            className="text-sm text-primary hover:underline flex items-center gap-2"
                        >
                            📄 Data Deletion Instructions
                        </a>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
