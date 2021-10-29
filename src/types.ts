export interface ConfigServer {
    root: string;
    port?: number;
    proxy?: string;
    location?: string;
    redirectHtmlExtension?: boolean;
    allowedFileTypes?: string[];
    forbiddenFileTypes?: string[];
    headers?: {
        [key: string]: any;
    };
}

export type Config = ConfigServer[];
