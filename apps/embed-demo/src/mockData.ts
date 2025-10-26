import type { FetchImplementation, KintoneRecord } from "@cmk/core";

interface MockAppRecords {
  appId: number;
  records: KintoneRecord[];
}

export const APP_KEY = "blog";

export const mockApp: MockAppRecords = {
  appId: 1,
  records: [
    {
      slug: {
        type: "SINGLE_LINE_TEXT",
        value: "hello-world"
      },
      title: {
        type: "SINGLE_LINE_TEXT",
        value: "初めてのヘッドレス CMS"
      },
      body: {
        type: "RICH_TEXT",
        value:
          "kintone をヘッドレス CMS として活用するプロジェクト CMK のモック記事です。\n" +
          "このデモは API に接続しなくてもコンポーネントの挙動を確認できます。"
      },
      tags: {
        type: "CHECK_BOX",
        value: ["ヘッドレス", "kintone"]
      }
    },
    {
      slug: {
        type: "SINGLE_LINE_TEXT",
        value: "next-steps"
      },
      title: {
        type: "SINGLE_LINE_TEXT",
        value: "CMK の次の一歩"
      },
      body: {
        type: "RICH_TEXT",
        value:
          "Bulk Request や埋め込みカスタムエレメントの設計など、今後の開発ロードマップを検証するためのダミーコンテンツです。"
      },
      tags: {
        type: "CHECK_BOX",
        value: ["プロトタイプ"]
      }
    }
  ]
};

function matchSlugQuery(record: KintoneRecord, query: string | undefined) {
  if (!query) {
    return true;
  }

  const slugMatch = query.match(/slug\s*=\s*"([^"]+)"/);
  if (!slugMatch) {
    return true;
  }

  const slugField = record.slug;
  if (!slugField || typeof slugField !== "object" || !("value" in slugField)) {
    return false;
  }

  return String(slugField.value) === slugMatch[1];
}

export function createMockFetch(): FetchImplementation {
  return async (input, init) => {
    const url = typeof input === "string" ? input : (input as URL | Request).toString();
    const { pathname } = new URL(url, "https://mock.invalid");
    const bodyText = typeof init?.body === "string" ? init.body : undefined;
    const payload = bodyText ? JSON.parse(bodyText) : {};

    if (pathname.endsWith("/records.json")) {
      const query: string | undefined = payload.query;
      const limit: number | undefined = typeof payload.limit === "number" ? payload.limit : undefined;
      const records = mockApp.records.filter(record => matchSlugQuery(record, query));
      const sliced = typeof limit === "number" ? records.slice(0, limit) : records;
      return new Response(
        JSON.stringify({ records: sliced }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }

    return new Response(
      JSON.stringify({ message: `Mock fetch: unhandled path ${pathname}` }),
      {
        status: 404,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  };
}
