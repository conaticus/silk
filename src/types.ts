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
    notFoundPath?: string;
    internalErrorPath?: string;
    forbiddenPath?: string;
}

export type Config = ConfigServer[];
