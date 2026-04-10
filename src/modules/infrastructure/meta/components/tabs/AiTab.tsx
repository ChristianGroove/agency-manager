'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Brain, MessageSquare, Sparkles, ShieldCheck } from 'lucide-react';

export default function AiTab() {
    return (
        <div className="space-y-6">
            {/* AI Model Configuration */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Brain className="w-4 h-4" />
                            Model Configuration
                        </CardTitle>
                        <Badge variant="outline">GPT-4o</Badge>
                    </div>
                    <CardDescription>Configure the AI Assistant behavior</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label>Model Selection</Label>
                        <Select defaultValue="gpt-4o">
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="gpt-4o">GPT-4o (Recommended)</SelectItem>
                                <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                                <SelectItem value="claude-3-5-sonnet">Claude 3.5 Sonnet</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label>Temperature (Creativity)</Label>
                            <span className="text-sm text-muted-foreground">0.7</span>
                        </div>
                        <Slider defaultValue={[0.7]} max={1} step={0.1} className="w-full" />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>Context Awareness</Label>
                            <p className="text-xs text-muted-foreground">Use previous conversation history</p>
                        </div>
                        <Switch checked={true} />
                    </div>
                </CardContent>
            </Card>

            {/* Performance Stats */}
            <div className="grid grid-cols-2 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex flex-col items-center">
                            <Sparkles className="w-6 h-6 text-purple-600 mb-2" />
                            <p className="text-2xl font-bold">94%</p>
                            <p className="text-xs text-muted-foreground text-center">Satisfaction Rate</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex flex-col items-center">
                            <MessageSquare className="w-6 h-6 text-blue-600 mb-2" />
                            <p className="text-2xl font-bold">1.2s</p>
                            <p className="text-xs text-muted-foreground text-center">Avg Response Time</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Guardrails */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4" />
                        Safety Guardrails
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>PII Redaction</Label>
                            <p className="text-xs text-muted-foreground">Automatically remove sensitive data</p>
                        </div>
                        <Switch checked={true} disabled />
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>Off-Topic Deflection</Label>
                            <p className="text-xs text-muted-foreground">Reject non-business queries</p>
                        </div>
                        <Switch checked={true} />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
