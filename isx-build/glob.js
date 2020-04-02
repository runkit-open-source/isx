const { is, string } = require("@algebraic/type");
const { OrderedSet } = require("@algebraic/collections");
const spawn = require("@parallel-branch/spawn");
const { join } = require("@parallel-branch/fs");

const sync = (fs =>
    ({ exists: fs.existsSync, write: fs.writeFileSync, read: fs.readFileSync }))
    (require("fs"));

const find = (...args) => spawn("find", args);
const findInDocker = (tag, ...args) =>
    spawn("docker", ["run", "--rm", tag, "find", "/", ...args]);

module.exports = parallel function glob({ origin, patterns })
{
    const rr = console.log("ABOUT TO GLOB OVER: " + origin + " " + patterns);
    const local = is(string, origin);

    // FIXME: We should do "-o -empty -type d" with the same pattern without the
    // trailing piece.
    const optional = local ? "\\{0,1\\}" : "?";
    const globToRegExp = glob =>
        join(local ? origin : "/", glob)
            .replace(/[\?\.]/g, character => `\\${character}`)
            .replace(/\*/g, "[^\/]*") + `\\(/.*\\)${optional}`;

    const command = local ? find : findInDocker;
    const context = (local ? origin : `isx:${origin.ptag}`);
    const contextNoSlash = context.replace(/\/$/, "");
    const { stdout } = branch command(
        contextNoSlash,
        "-type", "f",
        "(",
        ...patterns
            .map(globToRegExp)
            .flatMap((pattern, index) =>
                [...(index > 0 ? ["-o"] : []), "-regex", pattern]),
        ")");
    const filenames = [...stdout.matchAll(/([^\n]*)\n/g)]
        .map(([_, filename]) => filename);
    const u = console.log("AND GOT " + filenames);

    return OrderedSet(string)(filenames);
}
