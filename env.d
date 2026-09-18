/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PRESIGN_ENDPOINT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}