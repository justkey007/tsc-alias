"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = require("path");
exports.mapPaths = (paths, mapper) => {
    const dest = {};
    Object.keys(paths).forEach((key) => {
        dest[key] = paths[key].map(mapper);
    });
    return dest;
};
exports.loadConfig = (file) => {
    const { extends: ext, compilerOptions: { baseUrl, outDir, paths } = {
        baseUrl: undefined,
        outDir: undefined,
        paths: undefined,
    }, } = require(file);
    const config = {};
    if (baseUrl) {
        config.baseUrl = baseUrl;
    }
    if (outDir) {
        config.outDir = outDir;
    }
    if (paths) {
        config.paths = paths;
    }
    if (ext) {
        const parentConfig = exports.loadConfig(path_1.resolve(path_1.dirname(file), ext));
        return Object.assign({}, parentConfig, config);
    }
    return config;
};
function walk(dir, stopOn = '') {
    let results = [];
    const list = fs_1.readdirSync(dir);
    for (let file of list) {
        const dirName = file;
        file = dir + '/' + file;
        if (dirName === stopOn) {
            results.push(file);
            break;
        }
        const stat = fs_1.statSync(file);
        stopOn;
        if (stat && stat.isDirectory() && dirName !== stopOn) {
            results = results.concat(walk(file, stopOn));
            results.push(file);
        }
        else {
        }
    }
    return results;
}
exports.walk = walk;
function getPathThatEndsUp(paths, ending) {
    let splitPath;
    let found = false;
    let i = 0;
    while (!found && i < paths.length) {
        splitPath = paths[i].split('/');
        if (splitPath.lastIndexOf(ending) === splitPath.length - 1) {
            found = true;
        }
        i++;
    }
    if (found) {
        return paths[i - 1];
    }
    return undefined;
}
exports.getPathThatEndsUp = getPathThatEndsUp;
//# sourceMappingURL=util.js.map