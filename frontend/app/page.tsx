'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { apiClient } from '@/lib/api';
import { Github, Sparkles, Code2, MessageSquare, Zap, Brain, Info } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [repoUrl, setRepoUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await apiClient.ingestRepository({ repo_url: repoUrl });
      router.push(`/repo/${response.repo_id}`);
    } catch (err) {
      setError('Failed to ingest repository. Please check the URL and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-blue-900/20" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/30 via-transparent to-transparent" />

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

      <div className="container mx-auto px-4 py-16 relative z-10">
        {/* Header */}
        <div className="text-center mb-16 space-y-6">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 blur-xl opacity-50" />
              <Code2 className="h-12 w-12 text-indigo-400 relative" />
            </div>
            <h1 className="text-6xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              CodeBase RAG
            </h1>
          </div>
          <p className="text-2xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Transform any GitHub repository into an{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 font-semibold">
              AI-powered knowledge base
            </span>
          </p>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Ask questions, explore code, and understand complex projects in seconds—not hours
          </p>
        </div>

        {/* Main Input Card */}
        <Card className="max-w-4xl mx-auto p-8 shadow-2xl bg-slate-900/50 backdrop-blur-xl border-slate-800 mb-20">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col gap-3">
              <label htmlFor="repo-url" className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Github className="h-4 w-4" />
                GitHub Repository URL
              </label>
              <div className="flex gap-3">
                <Input
                  id="repo-url"
                  type="url"
                  placeholder="https://github.com/username/repository"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  className="flex-1 bg-slate-800/50 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:ring-indigo-500/20"
                  required
                />
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-8 shadow-lg shadow-indigo-500/20"
                >
                  {isLoading ? (
                    <>
                      <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2 h-4 w-4" />
                      Analyze
                    </>
                  )}
                </Button>
              </div>

              <div className="flex items-start gap-3 p-4 bg-indigo-500/5 rounded-xl border border-indigo-500/10 mt-2">
                <Info className="h-5 w-5 text-indigo-400 mt-0.5 shrink-0" />
                <div className="text-sm text-slate-400 leading-relaxed">
                  <p className="text-slate-300 font-medium mb-1">Performance Notice</p>
                  Ingestion time is proportional to repository size. Large codebases (&gt;500 files) may take several minutes to clone, parse, and index for semantic search.
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">{error}</p>
              )}
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-2">
              <Sparkles className="h-3 w-3" />
              Powered by OpenRouter AI • Works with any public repository
            </p>
          </form>
        </Card>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          <Card className="p-8 bg-slate-900/30 backdrop-blur-sm border-slate-800 hover:border-indigo-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10 group">
            <div className="mb-6 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 blur-xl opacity-0 group-hover:opacity-30 transition-opacity" />
              <MessageSquare className="h-10 w-10 text-indigo-400 relative" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-slate-100">Conversational AI</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Ask questions in plain English and get instant, contextual answers with code references
            </p>
          </Card>

          <Card className="p-8 bg-slate-900/30 backdrop-blur-sm border-slate-800 hover:border-purple-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/10 group">
            <div className="mb-6 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 blur-xl opacity-0 group-hover:opacity-30 transition-opacity" />
              <Brain className="h-10 w-10 text-purple-400 relative" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-slate-100">Smart Code Analysis</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Syntax-aware parsing extracts functions and classes for precise, semantic understanding
            </p>
          </Card>

          <Card className="p-8 bg-slate-900/30 backdrop-blur-sm border-slate-800 hover:border-pink-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-pink-500/10 group">
            <div className="mb-6 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-orange-500 blur-xl opacity-0 group-hover:opacity-30 transition-opacity" />
              <Sparkles className="h-10 w-10 text-pink-400 relative" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-slate-100">Instant Onboarding</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Perfect for new developers to quickly grasp complex architectures and patterns
            </p>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center mt-20 text-slate-500 text-sm">
          <p>Built with Next.js, FastAPI, Qdrant, and OpenRouter</p>
        </div>
      </div>
    </div>
  );
}
