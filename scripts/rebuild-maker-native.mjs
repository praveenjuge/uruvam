import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const environment = Object.fromEntries(
  Object.entries(process.env).filter(
    ([name]) => !/(?:TOKEN|KEY|PASSWORD|SECRET|AUTH|CREDENTIAL)/i.test(name),
  ),
);

const result = spawnSync(
  process.execPath,
  [resolve("node_modules/.bin/node-gyp"), "rebuild"],
  {
    cwd: resolve("node_modules/macos-alias"),
    stdio: "ignore",
    env: {
      ...environment,
      npm_config_build_from_source: "true",
      npm_config_loglevel: "silent",
    },
  },
);
if (result.status !== 0) throw new Error("macos-alias rebuild failed");
