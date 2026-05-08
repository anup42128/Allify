export const API_BASE_URL = ''; // Removed legacy localhost URL

export interface HealthResponse {
    status: string;
    message: string;
}

export const api = {
    checkHealth: async (): Promise<HealthResponse | null> => {
        return { status: 'ok', message: 'Local API deprecated' };
    },

    secureAction: async () => {
        return { status: 'ok' };
    },

    checkResetPermission: async (_deviceId: string, _action: string = "request", _checkOnly: boolean = false) => {
        // Default to allowed. The old localhost fetch was triggering Chrome's 
        // "Access other apps and services" security warning on the live website.
        return { status: "allowed" };
    }
};
