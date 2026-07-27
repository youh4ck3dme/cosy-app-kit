import JSZip from "jszip";
import type { ExportOptions } from "../semantic-intent/types";

export class ZipExporterEngine {
  /**
   * Package generated React smart component into a full Vite + React + Tailwind + TypeScript Zip archive
   */
  public async generateZipArchive(options: ExportOptions): Promise<Blob> {
    const zip = new JSZip();
    const { componentName, code, framework } = options;

    if (framework === "vite") {
      // 1. package.json
      zip.file(
        "package.json",
        JSON.stringify(
          {
            name: componentName.toLowerCase(),
            private: true,
            version: "1.0.0",
            type: "module",
            scripts: {
              dev: "vite",
              build: "tsc && vite build",
              preview: "vite preview",
            },
            dependencies: {
              react: "^18.3.1",
              "react-dom": "^18.3.1",
              "lucide-react": "^0.460.0",
            },
            devDependencies: {
              "@types/react": "^18.3.12",
              "@types/react-dom": "^18.3.1",
              "@vitejs/plugin-react": "^4.3.3",
              autoprefixer: "^10.4.20",
              postcss: "^8.4.49",
              tailwindcss: "^3.4.14",
              typescript: "^5.6.3",
              vite: "^5.4.10",
            },
          },
          null,
          2,
        ),
      );

      // 2. vite.config.ts
      zip.file(
        "vite.config.ts",
        `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
`,
      );

      // 3. index.html
      zip.file(
        "index.html",
        `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${componentName}</title>
  </head>
  <body class="bg-slate-950 text-slate-100 min-h-screen">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,
      );

      // 4. src/main.tsx
      zip.file(
        "src/main.tsx",
        `import React from 'react';
import ReactDOM from 'react-dom/client';
import ${componentName} from './${componentName}';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <${componentName} />
  </React.StrictMode>
);
`,
      );

      // 5. Component & Styling
      zip.file(`src/${componentName}.tsx`, code);
      zip.file(
        "src/index.css",
        `@tailwind base;
@tailwind components;
@tailwind utilities;
`,
      );
    }

    // Prefer blob; fall back to uint8array→Blob for runtimes with incomplete Blob zip support
    try {
      const zipBlob = await zip.generateAsync({ type: "blob" });
      if (zipBlob && typeof zipBlob.size === "number" && zipBlob.size > 32) {
        return zipBlob;
      }
    } catch {
      // continue to uint8array path
    }
    const bytes = await zip.generateAsync({ type: "uint8array" });
    return new Blob([bytes], { type: "application/zip" });
  }

  /**
   * Helper method to trigger browser file download
   */
  public downloadBlob(blob: Blob, filename: string) {
    if (typeof window === "undefined") return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
