export interface Repository {
    repo_id: string;
    repo_url: string;
    status: 'queued' | 'processing' | 'completed' | 'failed';
    progress?: number;
    total_files?: number;
    processed_files?: number;
    created_at: string;
    completed_at?: string;
    error?: string;
}

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    code_references?: CodeReference[];
}

export interface CodeReference {
    file_path: string;
    start_line: number;
    end_line: number;
    code_snippet: string;
}

export interface RepoIngestRequest {
    repo_url: string;
    branch?: string;
}

export interface RepoIngestResponse {
    repo_id: string;
    status: string;
    message: string;
}

export interface ChatRequest {
    repo_id: string;
    message: string;
    conversation_history?: ChatMessage[];
}

export interface ChatResponse {
    message: string;
    code_references: CodeReference[];
}
