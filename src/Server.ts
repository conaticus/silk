import express, { Express, Response } from "express";
import proxy from "express-http-proxy";
import { existsSync } from "fs";
import { ConfigServer } from "./types";
import error from "./error";

export default class Server {
    private config: ConfigServer;
    private serverNumber: number;
    private server: Express;
    private currentRequestPath: string;

    constructor(config: ConfigServer, serverNumber: number) {
        this.config = config;
        this.serverNumber = serverNumber;
        this.server = express();
        this.currentRequestPath = "";
        this.checkConfig();

        if (this.config.proxy) {
            this.server.use(this.config.location as string, proxy(this.config.proxy));
        }

        this.setupRoutes();
        this.start();
    }

    private setupRoutes(): void {
        this.server.get(`*`, (req, res) => {
            try {
                if (!this.checkRequestUrl(req.path, res)) return;
                this.formatCurrentRequestPath(req.path);
                this.formatResponse(res);
                this.checkUrlExtension(res);
                
                const filePath = `${this.config.root}/${this.currentRequestPath}`;

                if (existsSync(filePath)) {
                    if (this.config.redirectHtmlExtension === false || this.config.redirectHtmlExtension === undefined) {
                        if (this.checkForHtmlExtension(res)) return;
                    }

                    this.sendFile(res, filePath);
                } else if (existsSync(filePath + ".html")) {
                    if (this.currentRequestPath === "/index") {
                        res.redirect("/");
                    } else {
                        this.sendFile(res, filePath + ".html");
                    }
                } else {
                    this.respondNotFound(res);
                }
            } catch {
                this.respondInternalServerError(res);
            }
        });
    }

    private sendFile(res: Response, path: string): void {
        res.sendFile(path, null, (err) => {
            if (err) {
                this.respondNotFound(res);
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

    private checkForHtmlExtension(res: Response): boolean {
        const urlFileExtension = this.getFileExtension(this.currentRequestPath);
        if (urlFileExtension !== "html" || urlFileExtension === null) return false;

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
        return str.substring(0, lastDotIndex);
    }

    private getFileExtension(str: string): string | null {
        if (str === "/") return "html";

        const lastDotIndex = str.lastIndexOf(".");
        if (lastDotIndex === -1) {
            if (existsSync(`${this.config.root}/${str}.html`)) {
                return "html"
            } else return null;
        }

        return str.slice(lastDotIndex + 1);
    }

    private start(): void {
        this.server.disable("x-powered-by");

        if (this.config.port) {
            this.server.listen(this.config.port);
        } else {
            this.server.listen(80);
        }
    }

    private checkConfig(): void {
        if (this.config.proxy && this.config.root) {
            error(`There cannot be both a 'proxy' and a 'root' in the same server. (server #${this.serverNumber})`);
        }

        if (this.config.proxy && this.config.headers !== undefined) {
            error(`The 'headers' configuration cannot be used in the same server as a 'proxy'. (server #${this.serverNumber})`);
        }

        if (!this.config.proxy && !this.config.root) {
            error(`A 'root' or 'proxy' is required in order to start a server. (server #${this.serverNumber})`);
        }

        this.config.location = this.removeOuterSlashes(this.config.location);
        this.config.notFoundPath = this.removeOuterSlashes(this.config.notFoundPath);
        this.config.internalErrorPath = this.removeOuterSlashes(this.config.internalErrorPath);
        this.config.forbiddenPath = this.removeOuterSlashes(this.config.forbiddenPath);
    }

    private checkRequestUrl(url: string, res: Response): boolean {
        if (this.config.location === "/") return true;

        url = this.removeOuterSlashes(url);
        url = url.substring(0, this.config.location?.length);

        if (url !== this.config.location) {
            this.respondNotFound(res);
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

    private formatCurrentRequestPath(path: string): void {

        if (this.config.location !== "/") {
            this.currentRequestPath = path.slice((this.config.location as string).length + 2); // Remove two extra characters for the slashes that were previously removed 
        } else {
            this.currentRequestPath = path;
        }

        this.currentRequestPath = this.removeOuterSlashes(this.currentRequestPath);
    }

    private respondNotFound(res: Response) {
        if (this.config.notFoundPath) {
            res.redirect(`/${this.config.notFoundPath}`);
            return;
        }

        res.status(404).send("<h1>404 Not Found</h1>");
    }

    private respondInternalServerError(res: Response) {
        if (this.config.internalErrorPath) {
            res.redirect(`${this.config.root}/${this.config.internalErrorPath}`);
            return;
        }

        res.status(500).send("<h1>500 Internal Server Error</h1>");
    }

    private respondForbidden(res: Response) 
    {
        if (this.config.forbiddenPath) {
            res.redirect(`${this.config.root}/${this.config.forbiddenPath}`);
            return;
        }

        res.status(403).send("<h1>403 Forbidden</h1>");
    }

    private checkUrlExtension(res: Response) {
        const requestFileType = this.getFileExtension(this.currentRequestPath);
        if (requestFileType !== null) {
            if (typeof this.config.forbiddenFileTypes === "object") {
                if (this.config.forbiddenFileTypes.includes(requestFileType)) {
                    this.respondForbidden(res);
                    return;
                }
            } else if (typeof this.config.allowedFileTypes === "object") {
                if (!this.config.allowedFileTypes.includes(requestFileType)) {
                    this.respondForbidden(res);
                    return;
                }
            }
        }
    }
}
