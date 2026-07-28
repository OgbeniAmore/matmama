import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const lovableCloudUrl = "https://wwhkfahlmivbqbtyidfr.supabase.co";
const lovableCloudPublishableKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3aGtmYWhsbWl2YnFidHlpZGZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNDI0MzMsImV4cCI6MjA4NTcxODQzM30.S3j2gGrUTCIhlzqalumjpG79fbx767EtX7Eyc_6o2tE";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(
      process.env.VITE_SUPABASE_URL || lovableCloudUrl
    ),
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY || lovableCloudPublishableKey
    ),
  },
}));
