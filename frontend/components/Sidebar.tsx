'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    ChevronLeft,
    ChevronRight,
    Home,
    Plus,
    Database,
    Trash2,
    CheckCircle2,
    Clock,
    AlertCircle,
    Loader2
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Repository } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

export function Sidebar() {
    const router = useRouter();
    const params = useParams();
    const currentRepoId = params.id as string;

    const [repos, setRepos] = useState<Repository[]>([]);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadRepositories();
        // Refresh list occasionally to catch ingestion progress
        const interval = setInterval(loadRepositories, 10000);
        return () => clearInterval(interval);
    }, []);

    const loadRepositories = async () => {
        try {
            const data = await apiClient.listRepositories();
            // Sort by created_at descending
            const sorted = [...(data.repositories || [])].sort((a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
            setRepos(sorted);
        } catch (error) {
            console.error('Failed to load repositories:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (e: React.MouseEvent, repoId: string) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this repository index?')) {
            try {
                await apiClient.deleteRepository(repoId);
                setRepos(repos.filter(r => r.repo_id !== repoId));
                if (currentRepoId === repoId) {
                    router.push('/');
                }
            } catch (error) {
                console.error('Failed to delete repository:', error);
            }
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return <CheckCircle2 className="text-emerald-500" size={14} />;
            case 'processing': return <Loader2 className="text-blue-500 animate-spin" size={14} />;
            case 'failed': return <AlertCircle className="text-rose-500" size={14} />;
            default: return <Clock className="text-slate-500" size={14} />;
        }
    };

    return (
        <aside
            className={cn(
                "h-screen border-r border-white/5 bg-black/40 backdrop-blur-xl transition-all duration-300 flex flex-col z-20 shrink-0",
                isCollapsed ? "w-16" : "w-64"
            )}
        >
            {/* Logo/Header */}
            <div className="h-16 flex items-center px-4 shrink-0 overflow-hidden">
                {!isCollapsed && (
                    <div className="flex items-center gap-2 font-bold text-white tracking-tight">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                            <Database size={18} />
                        </div>
                        <span className="truncate">CodeBase RAG</span>
                    </div>
                )}
                {isCollapsed && (
                    <div className="w-full flex justify-center">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                            <Database size={18} />
                        </div>
                    </div>
                )}
            </div>

            <Separator className="bg-white/5" />

            {/* Navigation */}
            <div className="p-2 flex flex-col gap-1 shrink-0">
                <Button
                    variant="ghost"
                    size={isCollapsed ? "icon" : "default"}
                    className={cn(
                        "justify-start gap-3 hover:bg-white/5 hover:text-white transition-all",
                        isCollapsed ? "mx-auto" : "w-full"
                    )}
                    onClick={() => router.push('/')}
                >
                    <Home size={18} className="shrink-0" />
                    {!isCollapsed && <span>Dashboard</span>}
                </Button>

                <Button
                    variant="ghost"
                    size={isCollapsed ? "icon" : "default"}
                    className={cn(
                        "justify-start gap-3 hover:bg-white/5 hover:text-white transition-all",
                        isCollapsed ? "mx-auto" : "w-full"
                    )}
                    onClick={() => router.push('/')}
                >
                    <Plus size={18} className="shrink-0" />
                    {!isCollapsed && <span>New Repository</span>}
                </Button>
            </div>

            <Separator className="bg-white/5" />

            {/* Repository List */}
            <div className="flex-1 flex flex-col min-h-0">
                {!isCollapsed && (
                    <div className="px-4 py-3">
                        <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                            Recent Indexes
                        </h3>
                    </div>
                )}

                <ScrollArea className="flex-1 px-2">
                    <div className="flex flex-col gap-1 py-1">
                        {repos.map((repo) => (
                            <div
                                key={repo.repo_id}
                                onClick={() => router.push(`/repo/${repo.repo_id}`)}
                                className={cn(
                                    "group flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all hover:bg-white/5",
                                    currentRepoId === repo.repo_id ? "bg-white/10 text-white" : "text-slate-400 hover:text-slate-200",
                                    isCollapsed && "justify-center"
                                )}
                            >
                                <div className="shrink-0">
                                    {getStatusIcon(repo.status)}
                                </div>

                                {!isCollapsed && (
                                    <div className="flex-1 min-w-0 flex flex-col">
                                        <span className="text-sm font-medium truncate">
                                            {repo.repo_url.split('/').pop()?.replace('.git', '')}
                                        </span>
                                        <span className="text-[10px] opacity-50 truncate">
                                            {new Date(repo.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                )}

                                {!isCollapsed && (
                                    <button
                                        onClick={(e) => handleDelete(e, repo.repo_id)}
                                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-500 transition-all shrink-0"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                        ))}

                        {repos.length === 0 && !isLoading && !isCollapsed && (
                            <div className="px-4 py-8 text-center">
                                <p className="text-xs text-slate-600 italic">No repositories indexed yet</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* Footer / Toggle */}
            <Separator className="bg-white/5" />
            <div className="p-2 shrink-0">
                <Button
                    variant="ghost"
                    size="icon"
                    className="w-full hover:bg-white/5 text-slate-500 hover:text-white"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                >
                    {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                </Button>
            </div>
        </aside>
    );
}
