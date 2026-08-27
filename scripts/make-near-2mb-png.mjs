import { copyFile, stat, truncate } from "node:fs/promises";

const source = "/home/ubuntu/upload/Screenshot_20260827-205530.png";
const output = "/home/ubuntu/upload/visionverify-near-2mb.png";
const targetBytes = 2_040_000;
await copyFile(source, output);
await truncate(output, targetBytes);
const result = await stat(output);
console.log(`${output} ${result.size} bytes`);
