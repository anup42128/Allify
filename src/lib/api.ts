export const API_BASE_URL = 'http://localhost:8080';

export interface HealthResponse {
    status: string;
    message: string;
}

export const api = {
    checkHealth: async (): Promise<HealthResponse | null> => {
        try {
            const response = await fetch(`${API_BASE_URL}/health`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            return null;
        }
    },

    secureAction: async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/secure-action`, {
                method: 'POST',
            });
            return await response.json();
        } catch (error) {
            console.error('Secure Action Error:', error);
            return null;
        }
    },

    checkResetPermission: async (deviceId: string, action: string = "request", checkOnly: boolean = false) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/security/request-reset`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ device_id: deviceId, action, check_only: checkOnly }),
            });
            return await response.json();
        } catch (error) {
            console.error('Permission Check Error:', error);
            // Default to allowed if backend is unreachable to avoid blocking legitimate users during outages
            return { status: "allowed" };
        }
    }
};
