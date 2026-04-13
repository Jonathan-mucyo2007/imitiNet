import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return;
          }

          if (
            id.includes("/react/") ||
            id.includes("/react-dom/") ||
            id.includes("/scheduler/")
          ) {
            return "react-vendor";
          }

          if (id.includes("/html5-qrcode/") || id.includes("/react-qr-code/")) {
            return "qr-vendor";
          }

          if (id.includes("/leaflet/") || id.includes("/react-leaflet/")) {
            return "maps-vendor";
          }

          if (id.includes("/framer-motion/")) {
            return "motion-vendor";
          }

          if (
            id.includes("/react-router/") ||
            id.includes("/react-router-dom/") ||
            id.includes("/@tanstack/react-query/") ||
            id.includes("/axios/")
          ) {
            return "app-vendor";
          }
        },
      },
    },
  },
});
