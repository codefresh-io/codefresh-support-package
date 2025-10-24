interface CodefreshContext {
    name: string;
    token: string;
    type: string;
    url: string;
}

export interface CodefreshConfig {
    contexts: Record<string, CodefreshContext>;
    'current-context': string;
}

export interface CodefreshCredentials {
    headers: { Authorization: string };
    baseUrl: string;
}
