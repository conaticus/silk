export interface ConfigServer {
    root: string;
    port?: number;
    proxy?: string;
    location?: string;
    fileExtensions?: boolean;
    headers?: {
        [key: string]: any;
    };
}

export type Config = ConfigServer[];
