export interface IRawTSConfig {
    extends?: string;
    compilerOptions?: {
        baseUrl?: string;
        outDir?: string;
        paths?: {
            [key: string]: string[];
        };
    };
}
export interface ITSConfig {
    baseUrl?: string;
    outDir?: string;
    paths?: {
        [key: string]: string[];
    };
}
export declare const mapPaths: (paths: {
    [key: string]: string[];
}, mapper: (x: string) => string) => {
    [key: string]: string[];
};
export declare const loadConfig: (file: string) => ITSConfig;
export declare function walk(dir: string, stopOn?: string): string[];
export declare function getPathThatEndsUp(paths: string[], ending: string): string | undefined;
