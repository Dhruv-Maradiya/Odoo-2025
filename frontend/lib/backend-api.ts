const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:8000';

// Helper function to convert relative image URLs to absolute URLs
export function getImageUrl(imagePath: string | null | undefined): string | null {
    if (!imagePath) return null;

    // If it's already a full URL, return as is
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath;
    }

    // If it's a relative path, prefix with backend URL
    if (imagePath.startsWith('/')) {
        return `${BACKEND_URL}${imagePath}`;
    }

    // If it's just a filename, assume it's in the static directory
    return `${BACKEND_URL}/static/${imagePath}`;
}

export interface BackendApiOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: any;
    headers?: Record<string, string>;
}

export async function callBackendApi(
    endpoint: string,
    accessToken: string,
    options: BackendApiOptions = {}
): Promise<any> {
    const { method = 'GET', body, headers = {} } = options;

    const requestOptions: RequestInit = {
        method,
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            ...headers,
        },
    };

    if (body) {
        if (body instanceof FormData) {
            // Remove Content-Type for FormData to let browser set it with boundary
            const headers = requestOptions.headers as Record<string, string>;
            delete headers['Content-Type'];
            requestOptions.body = body;
        } else {
            requestOptions.body = JSON.stringify(body);
        }
    }

    const response = await fetch(`${BACKEND_URL}/api/v1${endpoint}`, requestOptions);

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

// Profile-specific API functions
export const profileApi = {
    getProfile: (accessToken: string) =>
        callBackendApi('/users/me', accessToken),

    updateProfile: (accessToken: string, data: { name?: string }) =>
        callBackendApi('/users/me', accessToken, {
            method: 'PUT',
            body: data,
        }),

    uploadAvatar: (accessToken: string, file: File) => {
        const formData = new FormData();
        formData.append('file', file);

        return callBackendApi('/users/me/upload-avatar', accessToken, {
            method: 'POST',
            body: formData,
            headers: {}, // Let browser set Content-Type for FormData
        });
    },
}; 