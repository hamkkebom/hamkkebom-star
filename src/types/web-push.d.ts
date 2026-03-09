declare module "web-push" {
    interface PushSubscription {
        endpoint: string;
        keys: {
            p256dh: string;
            auth: string;
        };
    }

    interface SendResult {
        statusCode: number;
        headers: Record<string, string>;
        body: string;
    }

    interface VapidDetails {
        subject: string;
        publicKey: string;
        privateKey: string;
    }

    function setVapidDetails(
        subject: string,
        publicKey: string,
        privateKey: string
    ): void;

    function sendNotification(
        subscription: PushSubscription,
        payload: string | Buffer,
        options?: {
            TTL?: number;
            headers?: Record<string, string>;
            vapidDetails?: VapidDetails;
        }
    ): Promise<SendResult>;

    function generateVAPIDKeys(): {
        publicKey: string;
        privateKey: string;
    };
}
