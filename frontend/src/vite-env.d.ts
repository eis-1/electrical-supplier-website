/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_APP_NAME: string;
  readonly VITE_APP_DESCRIPTION: string;
  readonly VITE_COMPANY_NAME: string;
  readonly VITE_COMPANY_PHONE: string;
  readonly VITE_COMPANY_WHATSAPP: string;
  readonly VITE_COMPANY_EMAIL: string;
  readonly VITE_COMPANY_ADDRESS: string;
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
  readonly VITE_GOOGLE_MAPS_LAT?: string;
  readonly VITE_GOOGLE_MAPS_LNG?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
