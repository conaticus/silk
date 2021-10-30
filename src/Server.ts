import express, { Express, Response } from "express";
import proxy from "express-http-proxy";
import { existsSync } from "fs";
import { ConfigServer } from "./types";
import { isBool, isNumber, isString } from "./util";
import { exit } from "process";

/** Class creating a new Express server based on a configuration */
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

    /**
     * Checks the server configuration for errors and formats any neccesary data
     */
    private checkConfig(): void {
        if (this.config.proxy && this.config.root) {
            this.error("There cannot be both a 'proxy' and a 'root' in the same server.");
        }

        if (this.config.proxy && this.config.headers !== undefined) {
            this.error("The 'headers' configuration cannot be used in the same server as a 'proxy'.)");
        }

        if (!this.config.proxy && !this.config.root) {
            this.error("A 'root' or 'proxy' is required in order to start a server.");
        }

        if (this.config.proxy && !isString(this.config.proxy)) {
            this.error("'proxy' must be of type string.");
        }

        if (this.config.root && !isString(this.config.root)) {
            this.error("'root' must be of type string.");
        }

        if (this.config.port !== undefined && !isNumber(this.config.port)) {
            this.error("'port' must be of type number.");
        }

        if (this.config.location && !isString(this.config.location)) {
            this.error("'location' must be of type string.");
        }

        if (this.config.redirectHtmlExtension && !isBool(this.config.redirectHtmlExtension)) {
            this.error("'redirectHtmlExtension must be of type boolean.'");
        }

        if (this.config.notFoundPath && !isString(this.config.notFoundPath)) {
            this.error("'notFoundPath must be of type string.'");
        }

        if (this.config.internalErrorPath && !isString(this.config.internalErrorPath)) {
            this.error("'internalErrorPath' must be of type string.");
        }

        if (this.config.forbiddenPath && !isString(this.config.forbiddenPath)) {
            this.error("'forbiddenPath' must be of type string.");
        }

        if (this.config.allowedFileTypes && this.config.forbiddenFileTypes) {
            this.error("There can only be 'allowedFileTypes' or 'forbiddenFileTypes', not both.");
        }

        this.config.location = this.removeOuterSlashes(this.config.location);
        this.config.notFoundPath = this.removeOuterSlashes(this.config.notFoundPath);
        this.config.internalErrorPath = this.removeOuterSlashes(this.config.internalErrorPath);
        this.config.forbiddenPath = this.removeOuterSlashes(this.config.forbiddenPath);
    }

    /**
     * Creates the routes for the server
     */
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

    /**
     * Remove all outer slashes of from a string
     */
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

    /**
     * Checks a url is correct in correspondence to the server's root
     * @returns whether or not the url was correct
     */
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

   /**
    * Sets the `currentRequestPath` as a local path in relation `path`
    */
    private formatCurrentRequestPath(path: string): void {

        if (this.config.location !== "/") {
            this.currentRequestPath = path.slice((this.config.location as string).length + 2); // Remove two extra characters for the slashes that were previously removed 
        } else {
            this.currentRequestPath = path;
        }

        this.currentRequestPath = this.removeOuterSlashes(this.currentRequestPath);
    }

    /**
     * Formats the headers of `res`
     */
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

    /**
     * Check a request's URL extension is not forbidden
     */
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

    /**
     * Gets the file extension of `string` if it has one
     */
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

    /**
     * Removes the file extension of a string
     */
    private removeFileExtension(str: string): string {
        const lastDotIndex = str.lastIndexOf(".");
        return str.substring(0, lastDotIndex);
    }

    /**
     * Check if the request path has a HTMl file extension, if so redirect to the path without the HTMl file extension
     */
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

    /**
     * Send a file in the HTTP response 
     */
    private sendFile(res: Response, path: string): void {
        res.sendFile(path, null, (err) => {
            if (err) {
                this.respondNotFound(res);
            }
        });
    }

    /**
     * Send a 404 response 
     */
    private respondNotFound(res: Response) {
        if (this.config.notFoundPath) {
            res.redirect(`/${this.config.notFoundPath}`);
            return;
        }

        res.status(404).send("<h1>404 Not Found</h1>");
    }

    /**
     * Send a 505 response
     */
    private respondInternalServerError(res: Response) {
        if (this.config.internalErrorPath) {
            res.redirect(`${this.config.root}/${this.config.internalErrorPath}`);
            return;
        }

        res.status(500).send("<h1>500 Internal Server Error</h1>");
    }

    /**
     * Send a 403 response
     */
    private respondForbidden(res: Response) 
    {
        if (this.config.forbiddenPath) {
            res.redirect(`${this.config.root}/${this.config.forbiddenPath}`);
            return;
        }

        res.status(403).send("<h1>403 Forbidden</h1>");
    }

    /**
     * Start the Express server
     */
    private start(): void {
        this.server.disable("x-powered-by");

        if (this.config.port) {
            this.server.listen(this.config.port);
        } else {
            this.server.listen(80);
        }
    }

    /**
     * Print an error with the current server number and exit the program 
     */
    private error(message: string) {
        console.error("\x1b[31m", "[ERROR]:", "\x1b[0m", message, `(server #${this.serverNumber})`);
        console.log("Program has exited.");
        exit(1);
    }
}
