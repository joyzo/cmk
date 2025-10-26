import { createEmbedApp } from "@cmk/embed";
import { KintoneClient } from "@cmk/core";
import { APP_KEY, createMockFetch, mockApp } from "./mockData";

interface EnvConfig {
  baseUrl?: string;
  appId?: string;
  apiToken?: string;
}

function readEnv(): EnvConfig {
  return {
    baseUrl: import.meta.env.VITE_KINTONE_BASE_URL,
    appId: import.meta.env.VITE_KINTONE_APP_ID,
    apiToken: import.meta.env.VITE_KINTONE_API_TOKEN
  };
}

function createClient(env: EnvConfig): KintoneClient {
  if (env.baseUrl && env.appId && env.apiToken) {
    return new KintoneClient({
      baseUrl: env.baseUrl,
      apps: {
        [APP_KEY]: {
          appId: Number.parseInt(env.appId, 10),
          apiToken: env.apiToken
        }
      }
    });
  }

  return new KintoneClient({
    baseUrl: "https://mock.local",
    apps: {
      [APP_KEY]: {
        appId: mockApp.appId,
        apiToken: "mock-token"
      }
    },
    fetchImplementation: createMockFetch()
  });
}

function updateModeIndicator(env: EnvConfig) {
  const indicator = document.querySelector<HTMLElement>("[data-mode]");
  if (!indicator) {
    return;
  }

  indicator.textContent = env.baseUrl ? "実機モード (kintone 接続)" : "モックモード";
}

function bootstrap() {
  const env = readEnv();
  const client = createClient(env);

  updateModeIndicator(env);

  createEmbedApp({
    coreClient: client,
    hydration: {
      mode: "lazy"
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap);
} else {
  bootstrap();
}
