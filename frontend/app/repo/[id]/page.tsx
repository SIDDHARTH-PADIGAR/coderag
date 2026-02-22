'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { Repository, ChatMessage, CodeReference } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Send, FileCode, ExternalLink } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

import { Sidebar } from '@/components/Sidebar';
import { cn } from '@/lib/utils';

export default function RepoPage() {
    const params = useParams();
    const router = useRouter();
    const repoId = params.id as string;

    const [repo, setRepo] = useState<Repository | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        loadRepoStatus();
        const interval = setInterval(() => {
            if (repo?.status === 'processing' || repo?.status === 'queued') {
                loadRepoStatus();
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [repoId, repo?.status]);

    const loadRepoStatus = async () => {
        try {
            const data = await apiClient.getRepoStatus(repoId);
            setRepo(data);
        } catch (error) {
            console.error('Failed to load repo status:', error);
        }
    };

    const handleSendMessage = async () => {
        if (!input.trim() || isSending || repo?.status !== 'completed') return;

        const userMessage: ChatMessage = {
            role: 'user',
            content: input,
        };

        const currentHistory = [...messages, userMessage];
        setMessages(currentHistory);
        setInput('');
        setIsSending(true);

        try {
            let assistantMessage: ChatMessage = {
                role: 'assistant',
                content: '',
                code_references: [],
            };

            setMessages((prev) => [...prev, assistantMessage]);

            const stream = apiClient.chatStream({
                repo_id: repoId,
                message: userMessage.content,
                conversation_history: messages, // Send history BEFORE current message
            });

            for await (const chunk of stream) {
                if (chunk.type === 'references') {
                    assistantMessage.code_references = chunk.data;
                    setMessages((prev) => {
                        const newMessages = [...prev];
                        newMessages[newMessages.length - 1] = { ...assistantMessage };
                        return newMessages;
                    });
                } else if (chunk.type === 'content') {
                    assistantMessage.content += chunk.data;
                    setMessages((prev) => {
                        const newMessages = [...prev];
                        newMessages[newMessages.length - 1] = { ...assistantMessage };
                        return newMessages;
                    });
                }
            }
        } catch (error) {
            console.error('Failed to send message:', error);
            setMessages((prev) => [
                ...prev.slice(0, -1),
                {
                    role: 'assistant',
                    content: 'Sorry, I encountered an error. Please try again.',
                },
            ]);
        } finally {
            setIsSending(false);
        }
    };

    const getLanguageFromPath = (path: string): string => {
        const ext = path.split('.').pop()?.toLowerCase();
        const langMap: Record<string, string> = {
            py: 'python',
            js: 'javascript',
            jsx: 'javascript',
            ts: 'typescript',
            tsx: 'typescript',
            java: 'java',
            go: 'go',
            rs: 'rust',
            cpp: 'cpp',
            c: 'c',
        };
        return langMap[ext || ''] || 'text';
    };

    return (
        <div className="flex h-screen bg-black overflow-hidden relative">
            {/* Background elements */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/10 via-black to-slate-950 z-0 pointer-events-none" />

            <Sidebar />

            <main className="flex-1 flex flex-col relative z-10 w-full overflow-hidden">
                {/* Header */}
                <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-black/40 backdrop-blur-md shrink-0">
                    <div className="flex items-center gap-4 overflow-hidden">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push('/')}
                            className="text-slate-400 hover:text-white shrink-0"
                        >
                            <ArrowLeft size={20} />
                        </Button>
                        <div className="flex flex-col min-w-0">
                            <h2 className="text-sm font-semibold text-slate-200 truncate pr-4">
                                {repo?.repo_url.split('/').pop()?.replace('.git', '') || 'Loading...'}
                            </h2>
                            <p className="text-[10px] text-slate-500 truncate pr-4 opacity-60">
                                {repo?.repo_url}
                            </p>
                        </div>
                    </div>

                    <Badge
                        variant={
                            repo?.status === 'completed'
                                ? 'default'
                                : repo?.status === 'failed'
                                    ? 'destructive'
                                    : 'secondary'
                        }
                        className={cn(
                            "ml-auto text-[10px] uppercase font-bold px-2 py-0.5 shadow-sm",
                            repo?.status === 'completed' ? "bg-emerald-500 text-white" : ""
                        )}
                    >
                        {repo?.status === 'processing' && <Loader2 className="h-2 w-2 animate-spin mr-1" />}
                        {repo?.status}
                    </Badge>
                </header>

                <div className="flex-1 overflow-hidden flex flex-col lg:flex-row p-4 gap-4">
                    {/* Chat Area */}
                    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                        {repo === null ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6 bg-slate-900/20 backdrop-blur-sm rounded-2xl border border-white/5">
                                <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
                                <p className="text-slate-400">Loading repository details...</p>
                            </div>
                        ) : repo.status === 'processing' || repo.status === 'queued' ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6 bg-slate-900/20 backdrop-blur-sm rounded-2xl border border-white/5">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-indigo-500 blur-3xl opacity-20 animate-pulse" />
                                    <Loader2 className="h-16 w-16 animate-spin text-indigo-500 relative shrink-0" />
                                </div>
                                <div className="space-y-2">
                                    <h2 className="text-2xl font-bold text-white">Ingesting Repository</h2>
                                    <p className="text-slate-400 max-w-sm mx-auto">
                                        We're cloning, parsing, and indexing your code for semantic search. This takes a moment depending on the project size.
                                    </p>
                                </div>
                                <div className="w-full max-w-sm space-y-2">
                                    <div className="flex justify-between text-xs text-slate-400">
                                        <span>Progress</span>
                                        <span>{repo.processed_files} / {repo.total_files} files</span>
                                    </div>
                                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                        <div
                                            className="bg-indigo-500 h-full rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                                            style={{ width: `${(repo.progress || 0) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : repo?.status === 'failed' ? (
                            <div className="flex-1 flex items-center justify-center p-8 text-center bg-red-950/10 backdrop-blur-sm rounded-2xl border border-red-500/20">
                                <div className="space-y-4">
                                    <div className="bg-red-500/10 p-4 rounded-full w-fit mx-auto border border-red-500/20">
                                        <ArrowLeft className="h-10 w-10 text-red-500" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-white">Processing Failed</h2>
                                    <p className="text-red-400 max-w-md mx-auto p-4 bg-red-500/10 rounded-lg border border-red-500/10">
                                        {repo.error}
                                    </p>
                                    <Button onClick={() => router.push('/')} variant="outline" className="border-slate-700 text-slate-300">
                                        Try another repository
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <Card className="flex-1 flex flex-col bg-slate-900/20 backdrop-blur-sm border-white/5 rounded-2xl overflow-hidden shadow-2xl relative">
                                <ScrollArea className="flex-1 px-4 py-6">
                                    <div className="max-w-4xl mx-auto w-full">
                                        {messages.length === 0 ? (
                                            <div className="py-20 flex flex-col items-center justify-center text-center space-y-8">
                                                <div className="p-4 bg-indigo-500/10 rounded-full border border-indigo-500/20">
                                                    <Brain className="h-12 w-12 text-indigo-400" />
                                                </div>
                                                <div className="space-y-2">
                                                    <h3 className="text-2xl font-bold text-white">Repository Insight</h3>
                                                    <p className="text-slate-400 max-w-sm">
                                                        The model has indexed this codebase. You can now ask questions about its structure, logic, or dependencies.
                                                    </p>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl px-4">
                                                    {[
                                                        'Give me a 5-minute overview of this codebase',
                                                        'Explain the main architecture',
                                                        'What are the key dependencies?',
                                                        'How does the authentication flow work?'
                                                    ].map((prompt) => (
                                                        <Button
                                                            key={prompt}
                                                            variant="outline"
                                                            onClick={() => setInput(prompt)}
                                                            className="bg-slate-900/50 border-white/5 text-slate-400 hover:text-white hover:bg-slate-800 text-xs justify-start h-auto py-3 px-4 transition-all duration-200"
                                                        >
                                                            {prompt}
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-8 pb-10">
                                                {messages.map((msg, idx) => (
                                                    <div
                                                        key={idx}
                                                        className={`flex items-start gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                                                    >
                                                        <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border ${msg.role === 'user'
                                                            ? 'bg-slate-800 border-slate-700 text-slate-300'
                                                            : 'bg-indigo-600 border-indigo-500 text-white'
                                                            }`}>
                                                            {msg.role === 'user' ? <User size={16} /> : <Brain size={16} />}
                                                        </div>
                                                        <div
                                                            className={cn(
                                                                "max-w-[85%] rounded-2xl p-5 shadow-lg",
                                                                msg.role === 'user'
                                                                    ? 'bg-slate-800/80 border border-slate-700 text-slate-100 flex-shrink-1'
                                                                    : 'bg-slate-900/60 border border-indigo-500/10 text-slate-200'
                                                            )}
                                                        >
                                                            <p className="whitespace-pre-wrap break-words overflow-hidden leading-relaxed text-sm lg:text-base">{msg.content}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>

                                <div className="p-4 bg-black/40 border-t border-white/5">
                                    <div className="max-w-4xl mx-auto flex gap-3 relative">
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-500 h-px w-1/2 opacity-20" />
                                        <Input
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                            placeholder="Ask about the codebase..."
                                            disabled={isSending}
                                            className="bg-slate-900/50 border-white/10 text-slate-200 placeholder:text-slate-600 focus:border-indigo-500 h-14 px-6 rounded-xl ring-offset-black"
                                        />
                                        <Button
                                            onClick={handleSendMessage}
                                            disabled={isSending}
                                            className="h-14 w-14 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20"
                                        >
                                            {isSending ? (
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                            ) : (
                                                <Send className="h-5 w-5" />
                                            )}
                                        </Button>
                                    </div>
                                    <p className="text-[10px] text-slate-600 text-center mt-3">
                                        CodeBase RAG can sometimes be inaccurate. Verify important information.
                                    </p>
                                </div>
                            </Card>
                        )}
                    </div>

                    {/* Code References Side Panel */}
                    <div className="lg:w-80 xl:w-96 flex flex-col h-full overflow-hidden">
                        <Card className="flex-1 flex flex-col bg-slate-900/20 backdrop-blur-sm border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                            <h3 className="font-semibold px-4 py-4 text-sm flex items-center gap-2 text-slate-200 border-b border-white/5">
                                <FileCode className="h-4 w-4 text-indigo-400" />
                                Code References
                            </h3>
                            <ScrollArea className="flex-1 overflow-y-auto">
                                <div className="p-4 space-y-4">
                                    {messages
                                        .filter((msg) => msg.role === 'assistant' && msg.code_references && msg.code_references.length > 0)
                                        .slice(-3) // Show references from the most recent assistant messages
                                        .flatMap((msg) => msg.code_references || [])
                                        .map((ref, idx) => (
                                            <div key={idx} className="bg-slate-900/60 rounded-xl border border-white/5 overflow-hidden group hover:border-indigo-500/30 transition-colors">
                                                <div className="flex items-center justify-between px-3 py-2 bg-white/5 border-b border-white/5">
                                                    <span className="font-mono text-[10px] text-slate-400 truncate pr-2 max-w-[150px]">
                                                        {ref.file_path}
                                                    </span>
                                                    <Badge variant="outline" className="text-[8px] bg-indigo-500/10 text-indigo-400 border-indigo-500/20 shrink-0">
                                                        L{ref.start_line}-{ref.end_line}
                                                    </Badge>
                                                </div>
                                                <div className="p-1">
                                                    <SyntaxHighlighter
                                                        language={getLanguageFromPath(ref.file_path)}
                                                        style={vscDarkPlus}
                                                        customStyle={{
                                                            fontSize: '0.65rem',
                                                            borderRadius: '0.5rem',
                                                            margin: 0,
                                                            background: 'transparent'
                                                        }}
                                                    >
                                                        {ref.code_snippet}
                                                    </SyntaxHighlighter>
                                                </div>
                                            </div>
                                        ))}
                                    {messages.filter(m => m.role === 'assistant' && m.code_references?.length).length === 0 && (
                                        <div className="text-center py-20 text-slate-600 space-y-3">
                                            <div className="p-3 bg-white/5 rounded-full w-fit mx-auto">
                                                <FileCode className="h-6 w-6 opacity-20" />
                                            </div>
                                            <p className="text-xs">Contextual references will appear here</p>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}

// Minimal icons for local use
function User({ size, className }: { size?: number, className?: string }) {
    return <svg xmlns="http://www.w3.org/2000/svg" width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cn("lucide lucide-user", className)}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
}

function Brain({ size, className }: { size?: number, className?: string }) {
    return <svg xmlns="http://www.w3.org/2000/svg" width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cn("lucide lucide-brain", className)}><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .52 8.105 3.32 3.32 0 0 0 6.003-1.5V6.375" /><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.52 8.105 3.32 3.32 0 0 1-6.003-1.5V6.375" /></svg>
}

function Loader2({ className, size }: { className?: string, size?: number }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size || 24}
            height={size || 24}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn("lucide lucide-loader-2", className)}
        >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
    );
}
