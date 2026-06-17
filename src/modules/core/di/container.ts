export class ServiceRegistry {
    private static instance: ServiceRegistry;
    private services: Map<string, any> = new Map();

    private constructor() {}

    public static getInstance(): ServiceRegistry {
        if (!ServiceRegistry.instance) {
            ServiceRegistry.instance = new ServiceRegistry();
        }
        return ServiceRegistry.instance;
    }

    public register<T>(key: string, service: T): void {
        this.services.set(key, service);
    }

    public get<T>(key: string): T {
        const service = this.services.get(key);
        if (!service) {
            throw new Error(`Service ${key} not found in registry`);
        }
        return service as T;
    }

    public has(key: string): boolean {
        return this.services.has(key);
    }
    
    public clear(): void {
        this.services.clear();
    }
}

export const container = ServiceRegistry.getInstance();
