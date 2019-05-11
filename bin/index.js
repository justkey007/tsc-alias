#! /usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const program = require("commander");
const fs_1 = require("fs");
const globby_1 = require("globby");
const normalizePath = require("normalize-path");
const path_1 = require("path");
const util_1 = require("./util");
program
    .version('1.0.2')
    .option('-p, --project <file>', 'path to tsconfig.json');
program.on('--help', () => {
    console.log(`
  $ tscpath
  $ tscpath -p tsconfig.json
`);
});
program.parse(process.argv);
const { project } = program;
console.log = () => { };
console.info('***tsc-alias starting***');
const configFile = path_1.resolve(process.cwd(), project ? project : 'tsconfig.json');
console.log(`tsconfig.json: ${configFile}`);
const { baseUrl, outDir, paths } = util_1.loadConfig(configFile);
if (!baseUrl) {
    throw new Error('compilerOptions.baseUrl is not set');
}
if (!paths) {
    throw new Error('compilerOptions.paths is not set');
}
if (!outDir) {
    throw new Error('compilerOptions.outDir is not set');
}
console.log(`baseUrl: ${baseUrl}`);
console.log(`outDir: ${outDir}`);
console.log(`paths: ${JSON.stringify(paths, null, 2)}`);
const configDir = normalizePath(path_1.dirname(configFile));
console.log('configDir', configDir);
const outPath = normalizePath(configDir + '/' + outDir);
console.log(`outPath: ${outPath}`);
const confDirParentFolderName = path_1.basename(configDir);
let hasExtraModule = false;
let configDirInOutPath = null;
const aliases = Object.keys(paths)
    .map((alias) => {
    const _paths = paths[alias].map((path) => path.replace(/\*$/, '').replace('ts', 'js'));
    let isExtra = false;
    let basePath;
    if (path_1.normalize(_paths[0]).includes('..')) {
        hasExtraModule = true;
        isExtra = true;
        basePath = normalizePath(util_1.getPathThatEndsUp(util_1.walk(normalizePath(path_1.normalize(`${configDir}/${baseUrl}/${outDir}`)), confDirParentFolderName), confDirParentFolderName));
        if (!configDirInOutPath) {
            configDirInOutPath = basePath;
        }
    }
    else {
        basePath = normalizePath(path_1.normalize(`${configDir}/${baseUrl}/${outDir}`));
    }
    return {
        prefix: alias.replace(/\*$/, '').replace(/\//g, ''),
        basePath,
        paths: _paths,
        isExtra,
    };
})
    .filter(({ prefix }) => prefix);
console.log(`aliases: ${JSON.stringify(aliases, null, 2)}`);
let relConfDirPathInOutPath;
if (configDirInOutPath) {
    const stepsbackPath = path_1.relative(configDirInOutPath, outPath);
    const splitStepBackPath = normalizePath(stepsbackPath).split('/');
    const nbOfStepBack = splitStepBackPath.length;
    const splitConfDirInOutPath = configDirInOutPath.split('/');
    let i = 1;
    const splitRelPath = [];
    while (i <= nbOfStepBack) {
        splitRelPath.unshift(splitConfDirInOutPath[splitConfDirInOutPath.length - i]);
        i++;
    }
    relConfDirPathInOutPath = splitRelPath.join('/');
    console.log('===>relParentPath', relConfDirPathInOutPath);
}
const requireRegex = /(?:import|require)\(['"]([^'"]*)['"]\)/g;
const importRegex = /(?:import|from) ['"]([^'"]*)['"]/g;
const replaceImportStatement = ({ orig, file, alias, }) => {
    const requiredModule = orig.split(/"|'/)[1];
    const index = orig.indexOf(alias.prefix);
    const isAlias = requiredModule.indexOf(alias.prefix) === 0;
    if (index > -1 && isAlias) {
        let absoluteAliasPath;
        absoluteAliasPath = normalizePath(path_1.normalize(`${alias.basePath}/${hasExtraModule && !alias.isExtra ? relConfDirPathInOutPath + '/' : ''}${alias.paths[0]}`));
        console.log('abs', absoluteAliasPath);
        console.log('fileDirName', path_1.dirname(file));
        let relativeAliasPath = normalizePath(path_1.relative(path_1.dirname(file), absoluteAliasPath));
        console.log('rel', relativeAliasPath + '\n');
        if (relativeAliasPath[0] !== '.') {
            relativeAliasPath = './' + relativeAliasPath;
        }
        const modulePath = orig.substring(0, index) +
            relativeAliasPath +
            orig.substring(index + alias.prefix.length);
        return modulePath;
    }
    return orig;
};
const replaceAlias = (text, file) => {
    for (const alias of aliases) {
        const replacementParams = {
            file,
            alias,
        };
        text = text
            .replace(requireRegex, (orig) => replaceImportStatement(Object.assign({ orig }, replacementParams)))
            .replace(importRegex, (orig) => replaceImportStatement(Object.assign({ orig }, replacementParams)));
    }
    return text;
};
const files = globby_1.sync(`${outPath}/**/*.{js,jsx,ts,tsx}`, {
    dot: true,
    noDir: true,
}).map((x) => path_1.resolve(x));
const flen = files.length;
let replaceCount = 0;
for (let i = 0; i < flen; i += 1) {
    const file = files[i];
    const text = fs_1.readFileSync(file, 'utf8');
    const newText = replaceAlias(text, file);
    if (text !== newText) {
        replaceCount++;
        fs_1.writeFileSync(file, newText, 'utf8');
    }
}
console.info(`${replaceCount} files have been replaced!`);
//# sourceMappingURL=index.js.map