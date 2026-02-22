import {
    Repository,
    RepoIngestRequest,
    RepoIngestResponse,
    ChatRequest,
    ChatResponse,
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export class ApiClient {
    private baseUrl: string;

    constructor(baseUrl: string = API_BASE_URL) {
        this.baseUrl = baseUrl;
    }

    async ingestRepository(data: RepoIngestRequest): Promise<RepoIngestResponse> {
        const response = await fetch(`${this.baseUrl}/api/repos/ingest`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            throw new Error('Failed to ingest repository');
        }

        return response.json();
    }

    async getRepoStatus(repoId: string): Promise<Repository> {
        const response = await fetch(`${this.baseUrl}/api/repos/status/${repoId}`);

        if (!response.ok) {
            throw new Error('Failed to get repository status');
        }

        return response.json();
    }

    async listRepositories(): Promise<{ repositories: Repository[] }> {
        const response = await fetch(`${this.baseUrl}/api/repos/list`);

        if (!response.ok) {
            throw new Error('Failed to list repositories');
        }

        return response.json();
    }

    async deleteRepository(repoId: string): Promise<void> {
        const response = await fetch(`${this.baseUrl}/api/repos/${repoId}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            throw new Error('Failed to delete repository');
        }
    }

    async chatQuery(data: ChatRequest): Promise<ChatResponse> {
        const response = await fetch(`${this.baseUrl}/api/chat/query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            throw new Error('Failed to send chat query');
        }

        return response.json();
    }

    async *chatStream(data: ChatRequest): AsyncGenerator<any> {
        const response = await fetch(`${this.baseUrl}/api/chat/stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            throw new Error('Failed to stream chat');
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
            throw new Error('No response body');
        }

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);

                    if (data === '[DONE]') {
                        return;
                    }

                    try {
                        yield JSON.parse(data);
                    } catch (e) {
                        console.error('Failed to parse SSE data:', e);
                    }
                }
            }
        }
    }
}

export const apiClient = new ApiClient();
