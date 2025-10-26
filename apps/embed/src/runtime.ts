import type { KintoneClient } from "@cmk/core";

export type HydrationMode = "eager" | "lazy";

export interface EmbedRuntimeOptions {
  client: KintoneClient;
  hydrationMode: HydrationMode;
}

let runtime: EmbedRuntimeOptions | null = null;

export const embedRuntime = {
  set(options: EmbedRuntimeOptions) {
    runtime = options;
  },
  clear() {
    runtime = null;
  },
  get(): EmbedRuntimeOptions | null {
    return runtime;
  }
};
