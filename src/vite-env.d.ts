/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BASE: string;
  readonly VITE_TRANSFORMERS_REMOTE_HOST?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
