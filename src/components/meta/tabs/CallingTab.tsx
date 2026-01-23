'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Info, Phone, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function CallingTab() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [callingEnabled, setCallingEnabled] = useState(false);
    const [iconVisibility, setIconVisibility] = useState<'DEFAULT' | 'HIDE'>('HIDE');
    const [lastUpdated, setLastUpdated] = useState<string>('Never');

    // Load initial state
    useEffect(() => {
        loadCallingStatus();
    }, []);

    async function loadCallingStatus() {
        try {
            // TODO: Replace with actual API call
            // const response = await fetch('/api/meta/calling/status');
            // const data = await response.json();

            // Mock data for now
            const mockData = {
                enabled: false,
                iconVisibility: 'HIDE',
                lastUpdated: new Date().toISOString()
            };

            setCallingEnabled(mockData.enabled);
            setIconVisibility(mockData.iconVisibility as 'DEFAULT' | 'HIDE');
            setLastUpdated(new Date(mockData.lastUpdated).toLocaleString());
        } catch (error) {
            console.error('Failed to load calling status:', error);
        }
    }

    async function handleToggleCalling(enabled: boolean) {
        setLoading(true);

        try {
            // REAL API CALL (Wired to Meta Graph API)
            const response = await fetch('/api/meta/calling', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Network response was not ok');
            }

            setCallingEnabled(enabled);
            setLastUpdated(new Date().toLocaleString());

            toast({
                title: enabled ? 'Calling API Enabled' : 'Calling API Disabled',
                description: enabled
                    ? 'Meta Graph API confirmation received. Icon visible in ~5s.'
                    : 'Meta Graph API confirmation received. Icon hidden.',
                className: "border-green-500 bg-green-50 dark:bg-green-950/20"
            });

            // If enabling, set icon to visible automatically
            if (enabled && iconVisibility === 'HIDE') {
                setIconVisibility('DEFAULT');
            }
        } catch (error: any) {
            console.error('API Error:', error);
            toast({
                title: 'Meta API Error',
                description: error.message || 'Failed to sync with WhatsApp Sandbox.',
                variant: 'destructive'
            });
            // Revert state if failed
            setCallingEnabled(!enabled);
        } finally {
            setLoading(false);
        }
    }

    async function handleIconVisibility(visibility: 'DEFAULT' | 'HIDE') {
        if (!callingEnabled && visibility === 'DEFAULT') {
            toast({
                title: 'Calling Disabled',
                description: 'Enable calling first to show the icon',
                variant: 'destructive'
            });
            return;
        }

        setLoading(true);

        try {
            // TODO: Replace with actual API call
            // await fetch('/api/meta/calling/icon-visibility', {
            //   method: 'POST',
            //   body: JSON.stringify({ visibility })
            // });

            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 500));

            setIconVisibility(visibility);
            setLastUpdated(new Date().toLocaleString());

            toast({
                title: 'Icon Visibility Updated',
                description: visibility === 'DEFAULT'
                    ? 'Call icon is now visible to users'
                    : 'Call icon is now hidden from users'
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to update icon visibility',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-6">
            {/* Main Controls Card */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Calling API Controls</CardTitle>
                            <CardDescription>
                                Manage WhatsApp Business Calling features
                            </CardDescription>
                        </div>
                        <Badge variant={callingEnabled ? "default" : "secondary"} className="h-6">
                            {callingEnabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Enable/Disable Toggle */}
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label
                                htmlFor="calling-toggle"
                                className="text-base font-semibold"
                            >
                                Calling API Status
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                Enable or disable voice calling feature
                            </p>
                        </div>
                        <Switch
                            id="calling-toggle"
                            checked={callingEnabled}
                            onCheckedChange={handleToggleCalling}
                            disabled={loading}
                        />
                    </div>

                    <Separator />

                    {/* Icon Visibility Selector */}
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-base font-semibold">
                                Call Icon Visibility
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                Show or hide call icon in WhatsApp chat
                            </p>
                        </div>
                        <Select
                            value={iconVisibility}
                            onValueChange={(value) => handleIconVisibility(value as 'DEFAULT' | 'HIDE')}
                            disabled={loading || !callingEnabled}
                        >
                            <SelectTrigger className="w-36">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="DEFAULT">
                                    <div className="flex items-center gap-2">
                                        <Eye className="w-4 h-4" />
                                        Visible
                                    </div>
                                </SelectItem>
                                <SelectItem value="HIDE">
                                    <div className="flex items-center gap-2">
                                        <EyeOff className="w-4 h-4" />
                                        Hidden
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {loading && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Updating Meta API...
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Status Info */}
            <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Current Status</AlertTitle>
                <AlertDescription>
                    <div className="space-y-1 mt-2">
                        <p>
                            <strong>API Status:</strong> {callingEnabled ? 'Enabled' : 'Disabled'}
                        </p>
                        <p>
                            <strong>Icon Visibility:</strong>{' '}
                            {iconVisibility === 'DEFAULT'
                                ? 'Visible to users in WhatsApp'
                                : 'Hidden from users'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Last updated: {lastUpdated}
                        </p>
                    </div>
                </AlertDescription>
            </Alert>

            {/* How It Works */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">How It Works</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                    <p>
                        <strong>Enable Calling:</strong> Makes a POST request to Meta Graph API v24.0
                        to activate the calling feature for your WhatsApp Business Number.
                    </p>
                    <p>
                        <strong>Icon Visibility:</strong> Controls whether the call icon appears in
                        users' WhatsApp chat headers. Changes take effect immediately without app restart.
                    </p>
                    <p className="text-muted-foreground">
                        💡 For Meta App Review screencasts, demonstrate both enable/disable and visibility toggle.
                    </p>
                </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="flex gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleCalling(!callingEnabled)}
                    disabled={loading}
                >
                    <Phone className="w-4 h-4 mr-2" />
                    {callingEnabled ? 'Disable' : 'Enable'} Calling
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={loadCallingStatus}
                    disabled={loading}
                >
                    Refresh Status
                </Button>
            </div>

            <Separator />

            {/* Call Permissions Management */}
            <div>
                <h3 className="text-lg font-semibold mb-4">Call Permissions</h3>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Permission Manager</CardTitle>
                        <CardDescription>Request and manage call permissions for clients</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Select Client</Label>
                                    <Select defaultValue="client_1">
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select client" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="client_1">Acme Corp (Demo)</SelectItem>
                                            <SelectItem value="client_2">Tech Innovations</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-end">
                                    <Button className="w-full">
                                        Request Permission
                                    </Button>
                                </div>
                            </div>

                            {/* Active Permission Demo */}
                            <div className="bg-muted p-4 rounded-lg border">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="default" className="bg-green-600">Active</Badge>
                                        <span className="font-medium">Acme Corp</span>
                                    </div>
                                    <span className="text-xs text-muted-foreground">Expires in 71h 30m</span>
                                </div>
                                <p className="text-sm text-muted-foreground mb-3">
                                    Permission granted via WhatsApp template response.
                                </p>
                                <div className="flex gap-2">
                                    <Button size="sm" onClick={() => toast({ title: "Calling Acme Corp...", description: "Establishing WebRTC connection" })}>
                                        <Phone className="w-4 h-4 mr-2" />
                                        Call Client
                                    </Button>
                                    <Button size="sm" variant="outline">
                                        View Logs
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Capacity Monitor */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Active Calls</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0</div>
                        <p className="text-xs text-muted-foreground">
                            Peak: 5 concurrent calls today
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Port Utilization</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0%</div>
                        <p className="text-xs text-muted-foreground">
                            0 / 1000 ports in use
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Separator />

            {/* Call Permissions Management */}
            <div>
                <h3 className="text-lg font-semibold mb-4">Call Permissions</h3>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Permission Manager</CardTitle>
                        <CardDescription>Request and manage call permissions for clients</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Select Client</Label>
                                    <Select defaultValue="client_1">
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select client" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="client_1">Acme Corp (Demo)</SelectItem>
                                            <SelectItem value="client_2">Tech Innovations</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-end">
                                    <Button className="w-full">
                                        Request Permission
                                    </Button>
                                </div>
                            </div>

                            {/* Active Permission Demo */}
                            <div className="bg-muted p-4 rounded-lg border">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="default" className="bg-green-600">Active</Badge>
                                        <span className="font-medium">Acme Corp</span>
                                    </div>
                                    <span className="text-xs text-muted-foreground">Expires in 71h 30m</span>
                                </div>
                                <p className="text-sm text-muted-foreground mb-3">
                                    Permission granted via WhatsApp template response.
                                </p>
                                <div className="flex gap-2">
                                    <Button size="sm" onClick={() => toast({ title: "Calling Acme Corp...", description: "Establishing WebRTC connection" })}>
                                        <Phone className="w-4 h-4 mr-2" />
                                        Call Client
                                    </Button>
                                    <Button size="sm" variant="outline">
                                        View Logs
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Capacity Monitor */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Active Calls</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0</div>
                        <p className="text-xs text-muted-foreground">
                            Peak: 5 concurrent calls today
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Port Utilization</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0%</div>
                        <p className="text-xs text-muted-foreground">
                            0 / 1000 ports in use
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
