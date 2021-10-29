export interface ConfigServer {
    root: string;
    port?: number;
    location?: string | undefined;
    fileExtensions?: boolean;
}

export type Config = ConfigServer[];
