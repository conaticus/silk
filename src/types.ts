export interface ConfigServer {
    root: string;
    port?: number;
    location?: string | undefined;
    fileExtensions?: boolean;
    headers?: {
        [key: string]: any;
    };
}

export type Config = ConfigServer[];
