import express, { Express, Response } from "express";
import proxy from "express-http-proxy";
import { existsSync } from "fs";
import { ConfigServer } from "./types";

export default class Server {
    private config: ConfigServer;
    private server: Express;
    private currentRequestPath: string;

    constructor(config: ConfigServer) {
        this.config = config;
        this.server = express();
        this.currentRequestPath = "";
        this.formatConfig();

        if (this.config.proxy) {
            this.server.use(this.config.location as string, proxy(this.config.proxy));
        }
        
        this.setupRoutes();
        this.start();
    }

    private setupRoutes(): void {
        this.server.get(`*`, (req, res) => {
            if (!this.checkRequestUrl(req.path, res)) return;

            if (this.config.location !== "/") {
                this.currentRequestPath = req.path.slice((this.config.location as string).length + 2); // Remove two extra characters for the slashes that were previously removed 
                this.currentRequestPath = this.removeOuterSlashes(this.currentRequestPath);
            } else {
                this.currentRequestPath = req.path;
            }
            
            const filePath = `${this.config.root}/${this.currentRequestPath}`;

            if (existsSync(filePath)) {
                if (this.extensionsEnabled) {
                    if (this.checkForExtensions(res)) return;
                }

                this.sendFile(res, filePath);
            } else if (existsSync(filePath + ".html")) {
                if (this.currentRequestPath === "/index") {
                    res.redirect("/");
                } else {
                    this.sendFile(res, filePath + ".html");
                }
            } else {
                this.notFound(res);
            }
        });
    }

    private sendFile(res: Response, path: string): void {
        this.formatResponse(res);

        res.sendFile(path, null, (err) => {
            if (err) {
                this.notFound(res);
            }
        });
    }

    private formatResponse(res: Response) {
        res.set("Server", "Silk");

        for (const headerKey in this.config.headers) {
            const headerVal = this.config.headers[headerKey];
            if (headerVal === null) {
                res.removeHeader(headerKey);
                delete this.config.headers[headerKey];
            } 
        }

        res.set(this.config.headers);
    }

    private get extensionsEnabled() {
        return (this.config.fileExtensions === false || this.config.fileExtensions === undefined);
    }

    private checkForExtensions(res: Response): boolean {
        const lastDotIndex = this.currentRequestPath?.lastIndexOf(".");

        if (lastDotIndex !== -1) {
            const removedExtensionUrl = this.removeFileExtension(this.currentRequestPath);

            if (removedExtensionUrl === "/index") {
                res.redirect("/");
            } else {
                res.redirect(removedExtensionUrl);
            }

            return true;
        }

        return false;
    }

    private removeFileExtension(str: string): string {
        const lastDotIndex = str.lastIndexOf(".");
        str = str.substring(0, lastDotIndex);
        return str;
    }

    private start(): void {
        this.server.disable("x-powered-by");

        if (this.config.port) {
            this.server.listen(this.config.port);
        } else {
            this.server.listen(80);
        }
    }

    private formatConfig(): void {
        this.config.location = this.removeOuterSlashes(this.config.location);
    }

    private checkRequestUrl(url: string, res: Response): boolean {
        if (this.config.location === "/") return true;

        url = this.removeOuterSlashes(url);
        url = url.substring(0, this.config.location?.length);

        if (url !== this.config.location) {
            this.notFound(res);
            return false;
        }

        return true;
   }

    private removeOuterSlashes(url: string | undefined): string {
        if (url === "/" || !url) return "/";
        while (url[0] === "/") {
            url = url?.substring(1);
        }

        while (url[url.length - 1] === "/") {
            url = url?.slice(0, -1);
        }

        return url;
    }

    private notFound(res: Response) {
        res.status(404).send("<h1>404 Not Found</h1>");
    }
}
