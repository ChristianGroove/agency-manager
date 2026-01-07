"use client"

import { Channel } from "../types"
import { PipelineStage } from "@/modules/core/crm/pipeline-actions"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Save } from "lucide-react"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState } from "react"
import { updateChannel } from "../actions"
import { toast } from "sonner"
import { Switch } from "@/components/ui/switch"

import { upsertAssignmentRule, deleteAssignmentRule } from "@/modules/core/messaging/assignment-actions"

interface ChannelDetailProps {
    channel: Channel
    pipelineStages: PipelineStage[]
    initialRule: any
    agents: any[]
}

export function ChannelDetail({ channel, pipelineStages, initialRule, agents }: ChannelDetailProps) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)

    // Form State
    const [name, setName] = useState(channel.connection_name)
    const [isPrimary, setIsPrimary] = useState(channel.is_primary)
    // Pipeline
    const [pipelineStageId, setPipelineStageId] = useState(channel.default_pipeline_stage_id || "none")
    // Auto Reply
    const [autoReply, setAutoReply] = useState(channel.auto_reply_when_offline || "")
    const [welcomeMessage, setWelcomeMessage] = useState(channel.welcome_message || "")

    // Working Hours
    const defaultHours = { start: "09:00", end: "17:00", days: [1, 2, 3, 4, 5] }
    const [workingHours, setWorkingHours] = useState<any>(channel.working_hours || defaultHours)

    // Routing Rule
    const [assignmentRule, setAssignmentRule] = useState<any>(initialRule)

    const handleSave = async () => {
        setIsLoading(true)
        try {
            // 1. Save Channel Config
            await updateChannel(channel.id, {
                connection_name: name,
                is_primary: isPrimary,
                default_pipeline_stage_id: pipelineStageId === "none" ? null : pipelineStageId,
                auto_reply_when_offline: autoReply,
                welcome_message: welcomeMessage,
                working_hours: workingHours
            })

            // 2. Save Routing Rule
            if (assignmentRule) {
                await upsertAssignmentRule({
                    ...assignmentRule,
                    conditions: { connection_id: [channel.id] } // Enforce connection link
                })
            } else if (initialRule && !assignmentRule) {
                // If it existed but now is null (disabled), delete it
                await deleteAssignmentRule(initialRule.id)
            }

            toast.success("Saved", { description: "Channel settings updated" })
            router.refresh()
        } catch (error) {
            toast.error("Error", { description: "Failed to save settings" })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h2 className="text-lg font-medium">{channel.connection_name}</h2>
                        <p className="text-sm text-muted-foreground capitalize">
                            {channel.provider_key.replace('_', ' ')} • {channel.status}
                        </p>
                    </div>
                </div>
                <Button onClick={handleSave} disabled={isLoading}>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                </Button>
            </div>

            <Tabs defaultValue="general" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="general">General</TabsTrigger>
                    <TabsTrigger value="routing">Routing & Assignments</TabsTrigger>
                    <TabsTrigger value="automation">Automation</TabsTrigger>
                </TabsList>

                <TabsContent value="general">
                    <Card>
                        <CardHeader>
                            <CardTitle>General Settings</CardTitle>
                            <CardDescription>Basic configuration for this channel</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                <Label>Connection Name</Label>
                                <Input value={name} onChange={e => setName(e.target.value)} />
                            </div>
                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Primary Channel</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Use this channel as the default for outbound messages
                                    </p>
                                </div>
                                <Switch checked={isPrimary} onCheckedChange={setIsPrimary} />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="routing">
                    <Card>
                        <CardHeader>
                            <CardTitle>Routing Rules</CardTitle>
                            <CardDescription>Determine who receives messages from this channel</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Custom Routing</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Override default organization rules for this specific channel
                                    </p>
                                </div>
                                <Switch
                                    checked={!!assignmentRule}
                                    onCheckedChange={(checked) => {
                                        if (checked && !assignmentRule) {
                                            // Create default rule in state
                                            setAssignmentRule({
                                                name: `Routing for ${channel.connection_name}`,
                                                priority: 10,
                                                conditions: { connection_id: [channel.id] },
                                                strategy: 'round-robin',
                                                assign_to: [],
                                                is_active: true
                                            } as any)
                                        } else if (!checked) {
                                            // Mark to delete or disable
                                            setAssignmentRule(null)
                                        }
                                    }}
                                />
                            </div>

                            {assignmentRule && (
                                <div className="space-y-4 border-l-2 border-primary/20 pl-4">
                                    <div className="grid gap-2">
                                        <Label>Assignment Strategy</Label>
                                        <Select
                                            value={assignmentRule.strategy}
                                            onValueChange={(val) => setAssignmentRule({ ...assignmentRule, strategy: val })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="round-robin">Round Robin (Distribute Equally)</SelectItem>
                                                <SelectItem value="load-balance">Load Balance (Least Busy)</SelectItem>
                                                <SelectItem value="specific-agent">Specific Agents</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {assignmentRule.strategy === 'specific-agent' && (
                                        <div className="grid gap-2">
                                            <Label>Assign To</Label>
                                            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-md p-2">
                                                {agents.map(agent => (
                                                    <div key={agent.user.id} className="flex items-center space-x-2">
                                                        <Switch
                                                            id={agent.user.id}
                                                            checked={assignmentRule.assign_to?.includes(agent.user.id)}
                                                            onCheckedChange={(checked) => {
                                                                const current = assignmentRule.assign_to || []
                                                                const updated = checked
                                                                    ? [...current, agent.user.id]
                                                                    : current.filter((id: string) => id !== agent.user.id)
                                                                setAssignmentRule({ ...assignmentRule, assign_to: updated })
                                                            }}
                                                        />
                                                        <Label htmlFor={agent.user.id} className="text-sm font-normal cursor-pointer">
                                                            {agent.user.full_name || agent.user.email}
                                                        </Label>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="automation">
                    <Card>
                        <CardHeader>
                            <CardTitle>Automation Settings</CardTitle>
                            <CardDescription>Configure auto-replies and workflows</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label>Default Pipeline Stage</Label>
                                <Select value={pipelineStageId || "none"} onValueChange={setPipelineStageId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a stage" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Disabled</SelectItem>
                                        {pipelineStages.map(stage => (
                                            <SelectItem key={stage.id} value={stage.id}>
                                                {stage.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    New contacts from this channel will automatically enter this stage.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label>Welcome Message</Label>
                                <Input
                                    value={welcomeMessage}
                                    onChange={e => setWelcomeMessage(e.target.value)}
                                    placeholder="Hi! Thanks for reaching out..."
                                />
                                <p className="text-xs text-muted-foreground">Sent to new contacts on their first message.</p>
                            </div>

                            <div className="space-y-4 pt-4 border-t">
                                <div className="flex items-end justify-between">
                                    <Label className="text-base font-semibold">Working Hours Configuration</Label>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Start Time</Label>
                                        <Input type="time" value={workingHours.start} onChange={e => setWorkingHours({ ...workingHours, start: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>End Time</Label>
                                        <Input type="time" value={workingHours.end} onChange={e => setWorkingHours({ ...workingHours, end: e.target.value })} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Active Days</Label>
                                    <div className="flex gap-2 flex-wrap">
                                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => {
                                            const dayNum = idx + 1
                                            const isActive = workingHours.days.includes(dayNum)
                                            return (
                                                <div
                                                    key={day}
                                                    className={`px-3 py-1 rounded-full border cursor-pointer text-xs transition-colors ${isActive ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary hover:bg-secondary/80'}`}
                                                    onClick={() => {
                                                        const newDays = isActive
                                                            ? workingHours.days.filter((d: number) => d !== dayNum)
                                                            : [...workingHours.days, dayNum]
                                                        setWorkingHours({ ...workingHours, days: newDays })
                                                    }}
                                                >
                                                    {day}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Offline Auto-Reply</Label>
                                <Input
                                    value={autoReply}
                                    onChange={e => setAutoReply(e.target.value)}
                                    placeholder="We are currently closed. We'll reply soon."
                                />
                                <p className="text-xs text-muted-foreground">
                                    Sent when a message is received outside working hours.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                </TabsContent >
            </Tabs >
        </div >
    )
}
