import { toast as sonnerToast } from 'sonner';

export const toast = {
    success: (message: string, description?: string) => {
        sonnerToast.success(message, {
            description,
        });
    },
    error: (message: string, description?: string) => {
        sonnerToast.error(message, {
            description,
        });
    },
    warning: (message: string, description?: string) => {
        sonnerToast.warning(message, {
            description,
        });
    },
    info: (message: string, description?: string) => {
        sonnerToast.info(message, {
            description,
        });
    },
    // Generic toast function for API client
    show: (props: { title?: string; description?: string; variant?: 'default' | 'destructive' }) => {
        const { title, description, variant } = props;

        if (variant === 'destructive') {
            sonnerToast.error(title || 'Error', {
                description,
            });
        } else {
            sonnerToast.success(title || 'Success', {
                description,
            });
        }
    },
}; 