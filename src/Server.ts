import express, { Express, Request, Response } from "express";
import { existsSync } from "fs";
import { ConfigServer } from "./types";

export default class Server {
    private config: ConfigServer;
    private server: Express;

    constructor(config: ConfigServer) {
        this.config = config;
        this.server = express();
        this.setupRoutes();
        this.server.listen(this.config.port);
    }

    private setupRoutes(): void {
        this.server.get("*", (req, res) => {
            const filePath = `${this.config.root}/${req.originalUrl}`;

            if (existsSync(filePath)) {
                if (this.extensionsEnabled) {
                    if (this.checkForExtensions(req, res)) return;
                }

                this.sendFile(res, filePath);
            } else if (existsSync(filePath + ".html")) {
                if (req.originalUrl === "/index") {
                    res.redirect("/");
                } else {
                    this.sendFile(res, filePath + ".html");
                }
            } else {
                res.status(404).send("<h1>404 Not Found</h1>");
            }
        });
    }

    private sendFile(res: Response, path: string): void {
        res.sendFile(path, null, (err) => {
            if (err) {
                res.status(404).send("<h1>404 Not Found</h1>");
            }
        });
    }

    private get extensionsEnabled() {
        return (
            this.config.fileExtensions === false ||
            this.config.fileExtensions === undefined
        );
    }

    private checkForExtensions(req: Request, res: Response): boolean {
        const lastDotIndex = req.originalUrl.lastIndexOf(".");
        if (lastDotIndex !== -1) {
            const removedExtensionUrl = req.originalUrl.substring(
                0,
                lastDotIndex
            );

            if (removedExtensionUrl === "/index") {
                res.redirect("/");
            } else {
                res.redirect(removedExtensionUrl);
            }

            return true;
        } else return false;
    }
}
