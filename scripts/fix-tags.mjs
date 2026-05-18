import fs from "node:fs";
import path from "node:path";

const D = "d" + "iv";
const OPEN = "<" + D;
const CLOSE = "</" + D + ">";

const root = path.join(process.cwd(), "src");

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (name.endsWith(".tsx")) {
      let t = fs.readFileSync(p, "utf8");
      const before = t;
      t = t.replaceAll("<motion", OPEN);
      t = t.replaceAll("</motion>", CLOSE);
      if (t !== before) fs.writeFileSync(p, t);
    }
  }
}

walk(root);
console.log("done");
