import { spawn } from "node:child_process";
const typecheck = spawn(
  process.execPath,
  ["node_modules/typescript/bin/tsc", "-b"],
  { stdio: "inherit" },
);
const typecheckCode = await new Promise((resolve) =>
  typecheck.on("exit", resolve),
);
if (typecheckCode !== 0) process.exit(typecheckCode || 1);
const build = spawn(
  process.execPath,
  ["node_modules/vite/bin/vite.js", "build"],
  { stdio: "inherit" },
);
build.on("exit", (code) => {
  if (code !== 0) {
    process.exitCode = code || 1;
    return;
  }
  const preview = spawn(
    process.execPath,
    [
      "node_modules/vite/bin/vite.js",
      "preview",
      "--host",
      "127.0.0.1",
      "--port",
      "5175",
      "--strictPort",
    ],
    { stdio: "inherit" },
  );
  preview.on("exit", (status) => {
    process.exitCode = status || 0;
  });
  process.on("SIGTERM", () => preview.kill());
  process.on("SIGINT", () => preview.kill());
});
