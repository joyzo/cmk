import type { KintoneRecord } from "@cmk/core";
import { embedRuntime, type EmbedRuntimeOptions } from "../runtime";

const template = document.createElement("template");
template.innerHTML = `
  <style>
    :host {
      display: block;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 8px;
      padding: 16px;
      background: #ffffff;
      color: #111827;
    }

    .cmk-embed__heading {
      font-size: 1rem;
      font-weight: 600;
      margin: 0 0 0.75rem 0;
    }

    .cmk-embed__content {
      font-size: 0.875rem;
      line-height: 1.6;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .cmk-embed__status {
      font-size: 0.75rem;
      color: #6b7280;
    }
  </style>
  <section>
    <p class="cmk-embed__status" data-status></p>
    <h2 class="cmk-embed__heading" data-heading></h2>
    <div class="cmk-embed__content" data-content></div>
  </section>
`;

type Observer = IntersectionObserver | null;

export class CmkEmbedElement extends HTMLElement {
  private observer: Observer = null;
  private hasLoaded = false;

  static get observedAttributes() {
    return ["data-slug", "data-app"];
  }

  connectedCallback() {
    if (!this.shadowRoot) {
      const root = this.attachShadow({ mode: "open" });
      root.appendChild(template.content.cloneNode(true));
    }

    this.renderStatus("ready");
    this.hydrate();
  }

  disconnectedCallback() {
    this.cleanupObserver();
  }

  attributeChangedCallback() {
    if (this.isConnected && this.hasLoaded) {
      this.hasLoaded = false;
      this.hydrate();
    }
  }

  hydrate() {
    const runtime = embedRuntime.get();
    if (!runtime) {
      this.renderError("embed runtime is not initialised");
      return;
    }

    if (runtime.hydrationMode === "lazy") {
      if (typeof IntersectionObserver === "undefined") {
        this.loadRecord(runtime);
        return;
      }

      if (!this.observer) {
        this.observer = new IntersectionObserver(entries => {
          entries
            .filter(entry => entry.isIntersecting)
            .forEach(() => {
              this.cleanupObserver();
              this.loadRecord(runtime);
            });
        });
      }

      this.observer.observe(this);
      return;
    }

    this.loadRecord(runtime);
  }

  private cleanupObserver() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  private async loadRecord(runtime: EmbedRuntimeOptions) {
    if (this.hasLoaded) {
      return;
    }

    const appKey = this.dataset.app;
    const slug = this.dataset.slug;

    if (!appKey) {
      this.renderError("data-app attribute is required");
      return;
    }

    if (!slug) {
      this.renderError("data-slug attribute is required");
      return;
    }

    this.renderStatus("loading...");

    try {
      const record = await runtime.client.getRecordBySlug(appKey, slug);
      if (!record) {
        this.hasLoaded = false;
        this.renderError(`record not found for slug: ${slug}`);
        return;
      }

      this.hasLoaded = true;
      this.renderRecord(record);
    } catch (error) {
      this.hasLoaded = false;
      const message = error instanceof Error ? error.message : "unknown error";
      this.renderError(message);
    }
  }

  private renderStatus(status: string) {
    const statusElement = this.shadowRoot?.querySelector<HTMLElement>('[data-status]');
    if (statusElement) {
      statusElement.textContent = status;
    }
  }

  private renderError(message: string) {
    this.renderStatus("error");
    const headingElement = this.shadowRoot?.querySelector<HTMLElement>('[data-heading]');
    const contentElement = this.shadowRoot?.querySelector<HTMLElement>('[data-content]');
    if (headingElement) {
      headingElement.textContent = "読み込みエラー";
    }
    if (contentElement) {
      contentElement.textContent = message;
    }
  }

  private renderRecord(record: KintoneRecord) {
    const headingElement = this.shadowRoot?.querySelector<HTMLElement>('[data-heading]');
    const contentElement = this.shadowRoot?.querySelector<HTMLElement>('[data-content]');
    if (headingElement) {
      const titleField = record["title"];
      headingElement.textContent = typeof titleField === "object" && titleField && "value" in titleField
        ? String((titleField as { value: unknown }).value)
        : "コンテンツ";
    }

    if (contentElement) {
      contentElement.textContent = JSON.stringify(record, null, 2);
    }

    this.renderStatus("loaded");
  }
}
