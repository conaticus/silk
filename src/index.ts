import { readFileSync } from "fs";
import { Config } from "./types";
import Server from "./Server";

const CONFIG_PATH = "./config.json";

const config: Config = JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));

for (const server of config) {
    new Server(server);
}
