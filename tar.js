const { is, string } = require("@algebraic/type");
const toPooled = require("@cause/task/transform/to-pooled");
const map = require("@cause/task/map");
const { mkdirp } = require("@cause/task/fs");
const glob = require("./glob");
const FileSet = require("./file-set");
const { lastline, stdout: spawn } = require("@cause/task/spawn");
const CACHE = "./cache";


const extract = toPooled(["glob", "mkdirp", "spawn", "map"], function extract(fileSet)
{
    const { origin } = fileSet;
    const filenames = glob(fileSet);

    if (is(string, fileSet.origin))
        return filenames;

    const identifier = origin.id;
    const container = lastline(spawn("docker", ["create", origin.id]));
    const destination = mkdirp(`${CACHE}/${origin.id}`);

    return map(filename => spawn("docker",
    [
        "cp",
        `${container}:${filename}`,
        `${destination}/${filename}`
    ]) || `${destination}/${filename}`, filenames);
}, { glob, is, string, mkdirp, CACHE, spawn, map, lastline });

module.exports = toPooled(["map"], function tar(fileSets)
{
    // Merge all the disparate file sets that share the same origin so we can
    // do one big glob for each of them.
    const fileSetsByOrigin = fileSets
        .groupBy(fileSet => fileSet.origin)
        .map((fileSets, origin) =>
            fileSets.flatMap(fileSet => fileSet.patterns))
        .map((patterns, origin) => FileSet({ origin, patterns }));
    
    const uu = map(extract, [...fileSetsByOrigin.values()]);
    
    const xx = console.log("input: " + fileSetsByOrigin);
    //const uu = map(glob, [...fileSetsByOrigin.values()]);
    const tt = console.log("RESULT: (" + uu + ")");

    return 1;
}, { map, glob, FileSet, extract });





/*

const { fromAsync } = require("@cause/task");
const { stdout: spawn } = require("@cause/task/spawn");

const command = (binary, ...prefix) =>
    (...args) => spawn(binary, [...prefix, ...args]);

const darwin = require("os").platform() === "darwin";
const tar = command(darwin ? "gtar" : "tar");
const shasum = command(...(darwin ?
    ["shasum", "-a", "256"] : ["sha256sum"]));


*/