import { exit } from "process";

const error = (message: string) => {
    console.error("\x1b[31m", "[ERROR]:", "\x1b[0m", message);
    console.log("Program has exited.");
    exit(1);
}

export default error;