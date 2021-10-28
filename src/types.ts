export interface ConfigServer {
    root: string;
    port: number;
    fileExtensions?: boolean;
}

export type Config = ConfigServer[];
