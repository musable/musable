"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogLevel = void 0;
const config_1 = __importDefault(require("../config/config"));
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["ERROR"] = 0] = "ERROR";
    LogLevel[LogLevel["WARN"] = 1] = "WARN";
    LogLevel[LogLevel["INFO"] = 2] = "INFO";
    LogLevel[LogLevel["DEBUG"] = 3] = "DEBUG";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
class Logger {
    constructor() {
        switch (config_1.default.logLevel.toLowerCase()) {
            case 'error':
                this.level = LogLevel.ERROR;
                break;
            case 'warn':
                this.level = LogLevel.WARN;
                break;
            case 'info':
                this.level = LogLevel.INFO;
                break;
            case 'debug':
                this.level = LogLevel.DEBUG;
                break;
            default:
                this.level = LogLevel.INFO;
        }
    }
    log(level, message, ...args) {
        if (level <= this.level) {
            const timestamp = new Date().toISOString();
            const levelName = LogLevel[level];
            console.log(`[${timestamp}] [${levelName}] ${message}`, ...args);
        }
    }
    error(message, ...args) {
        this.log(LogLevel.ERROR, message, ...args);
    }
    warn(message, ...args) {
        this.log(LogLevel.WARN, message, ...args);
    }
    info(message, ...args) {
        this.log(LogLevel.INFO, message, ...args);
    }
    debug(message, ...args) {
        this.log(LogLevel.DEBUG, message, ...args);
    }
}
exports.default = new Logger();
//# sourceMappingURL=logger.js.map