import { readFileSync } from "fs";
import { Config } from "./types";
import Server from "./Server";

const CONFIG_PATH = "./config.json";

const config: Config = JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));

config.forEach((server, idx) => {
    new Server(server, idx + 1);
})