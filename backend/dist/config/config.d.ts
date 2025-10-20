interface Config {
    port: number;
    nodeEnv: string;
    databasePath: string;
    jwtSecret: string;
    jwtExpiresIn: string;
    sessionSecret: string;
    maxFileSize: number;
    uploadPath: string;
    libraryPaths: string[];
    supportedFormats: string[];
    youtubeEnabled: boolean;
    youtubeDownloadPath: string;
    youtubeApiKey: string | undefined;
    adminEmail: string;
    adminPassword: string;
    rateLimitWindowMs: number;
    rateLimitMaxRequests: number;
    corsOrigin: string;
    logLevel: string;
}
declare const config: Config;
export default config;
//# sourceMappingURL=config.d.ts.map