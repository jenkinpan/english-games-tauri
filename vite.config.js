import { defineConfig } from "vite";
import { resolve, relative, extname } from "path";
import { glob } from "glob"; // 稍后我们会安装这个小工具
import { fileURLToPath } from "node:url";

export default defineConfig(async () => {
  // 获取所有 HTML 文件的路径
  const files = await glob("src/**/*.html");

  // 生成 rollup 的 input 对象
  // 格式如: { main: 'src/index.html', game1: 'src/games/Bomb Game/game.html', ... }
  const input = {};
  files.forEach((file) => {
    // 生成一个唯一的 key
    const name = relative("src", file)
      .replace(/\.[^/.]+$/, "")
      .replace(/\\/g, "/");
    input[name] = resolve(__dirname, file);
  });

  return {
    root: "src",
    base: "./", // 确保构建后的路径是相对路径
    build: {
      outDir: "../dist",
      emptyOutDir: true,
      rollupOptions: {
        input: input, // 这里传入所有的 HTML 入口
      },
    },
    server: {
      port: 1420,
      strictPort: true,
    },
  };
});
