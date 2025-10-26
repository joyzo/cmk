import type { KintoneClient } from "@cmk/core";
import { CmkEmbedElement } from "./elements/cmk-embed-element";
import { embedRuntime, type HydrationMode } from "./runtime";

export interface CreateEmbedAppOptions {
  /** カスタムエレメントのタグ名。既定は `cmk-embed` */
  elementSelector?: string;
  coreClient: KintoneClient;
  hydration?: {
    mode?: HydrationMode;
  };
}

export interface EmbedAppHandle {
  /** 登録済みのカスタムエレメントを解除し、ランタイムをリセットする */
  destroy(): void;
}

const DEFAULT_SELECTOR = "cmk-embed";

export function createEmbedApp(options: CreateEmbedAppOptions): EmbedAppHandle {
  const selector = options.elementSelector ?? DEFAULT_SELECTOR;
  const hydrationMode = options.hydration?.mode ?? "eager";

  if (!selector.includes("-")) {
    throw new Error("elementSelector must be a valid custom element tag name (e.g. \"cmk-embed\")");
  }

  embedRuntime.set({
    client: options.coreClient,
    hydrationMode
  });

  if (!customElements.get(selector)) {
    customElements.define(selector, CmkEmbedElement);
  }

  const elements = Array.from(document.querySelectorAll(selector));
  for (const element of elements) {
    if (element instanceof CmkEmbedElement) {
      element.hydrate();
    }
  }

  return {
    destroy() {
      embedRuntime.clear();
    }
  };
}
