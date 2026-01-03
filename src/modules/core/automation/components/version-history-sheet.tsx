import React, { useEffect, useState } from 'react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, RotateCcw, Calendar, User, GitCommit } from 'lucide-react';
import { getWorkflowVersions, restoreWorkflowVersion } from '../actions';
import { toast } from 'sonner';

interface VersionHistorySheetProps {
    workflowId: string;
    isOpen: boolean;
    onClose: () => void;
    onVersionRestored: () => void;
}

interface Version {
    id: string;
    version_number: number;
    name: string;
    created_at: string;
    created_by: string;
}

export function VersionHistorySheet({ workflowId, isOpen, onClose, onVersionRestored }: VersionHistorySheetProps) {
    const [versions, setVersions] = useState<Version[]>([]);
    const [loading, setLoading] = useState(false);
    const [restoringId, setRestoringId] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && workflowId) {
            loadVersions();
        }
    }, [isOpen, workflowId]);

    const loadVersions = async () => {
        setLoading(true);
        try {
            const data = await getWorkflowVersions(workflowId);
            setVersions(data as any[]); // Type assertion for now until types are strictly shared
        } catch (error) {
            console.error("Failed to load versions", error);
            toast.error("Error loading version history");
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async (version: Version) => {
        if (!confirm(`Are you sure you want to restore Version ${version.version_number}? Current changes will be overwritten.`)) {
            return;
        }

        setRestoringId(version.id);
        try {
            await restoreWorkflowVersion(workflowId, version.id);
            toast.success(`Restored Version ${version.version_number} successfully`);
            onVersionRestored();
            onClose();
        } catch (error) {
            console.error("Failed to restore version", error);
            toast.error("Failed to restore version");
        } finally {
            setRestoringId(null);
        }
    };

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="w-[400px] sm:w-[540px] p-0 flex flex-col bg-white dark:bg-slate-950">
                <div className="px-6 py-6 border-b border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/50">
                    <SheetHeader className="p-0">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 flex items-center justify-center">
                                <History size={20} />
                            </div>
                            <div>
                                <SheetTitle className="text-lg font-bold">Version History</SheetTitle>
                                <p className="text-sm text-muted-foreground">Restore previous snapshots of this workflow</p>
                            </div>
                        </div>
                    </SheetHeader>
                </div>

                <ScrollArea className="flex-1 p-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                            <p className="text-sm">Loading history...</p>
                        </div>
                    ) : versions.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <History className="h-12 w-12 mx-auto mb-3 opacity-20" />
                            <p>No versions saved yet.</p>
                            <p className="text-xs mt-1">Creating a version saves a snapshot of your work.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {versions.map((version) => (
                                <div
                                    key={version.id}
                                    className="group relative border border-slate-200 dark:border-slate-800 rounded-xl p-4 hover:border-orange-300 dark:hover:border-orange-800 transition-all bg-white dark:bg-slate-900 shadow-sm hover:shadow-md"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 text-xs font-bold px-2 py-1 rounded-md">
                                                v{version.version_number}
                                            </span>
                                            <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                                                {version.name || `Version ${version.version_number}`}
                                            </h4>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleRestore(version)}
                                            disabled={!!restoringId}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity h-8 bg-orange-50 text-orange-600 hover:bg-orange-100 dark:bg-orange-900/20 dark:text-orange-400 dark:hover:bg-orange-900/40"
                                        >
                                            {restoringId === version.id ? (
                                                <span className="animate-pulse">Restoring...</span>
                                            ) : (
                                                <>
                                                    <RotateCcw size={14} className="mr-2" />
                                                    Restore
                                                </>
                                            )}
                                        </Button>
                                    </div>

                                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3">
                                        <div className="flex items-center gap-1.5">
                                            <Calendar size={12} />
                                            <span>{new Date(version.created_at).toLocaleString()}</span>
                                        </div>
                                        {/* Ideally we resolve user ID to name, for now showing generic */}
                                        <div className="flex items-center gap-1.5">
                                            <User size={12} />
                                            <span>User</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>

                <div className="p-4 border-t border-slate-100 dark:border-slate-900 bg-slate-50 dark:bg-slate-900 text-center text-xs text-muted-foreground">
                    Restoring a version will overwrite your current draft.
                </div>
            </SheetContent>
        </Sheet>
    );
}
