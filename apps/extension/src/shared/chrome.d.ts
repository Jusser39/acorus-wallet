declare namespace chrome {
  interface MessageSender {
    id?: string;
    origin?: string;
    url?: string;
    tab?: {
      id?: number;
      url?: string;
    };
  }

  namespace runtime {
    const id: string | undefined;

    function getURL(path: string): string;

    function sendMessage(message: unknown): Promise<unknown>;

    const onInstalled: {
      addListener(listener: () => void): void;
    };

    const onMessage: {
      addListener(
        listener: (
          message: unknown,
          sender: chrome.MessageSender,
          sendResponse: (response: unknown) => void,
        ) => boolean | void,
      ): void;
    };
  }

  namespace storage {
    namespace local {
      function get(
        keys?: string | string[] | Record<string, unknown> | null,
      ): Promise<Record<string, unknown>>;

      function set(items: Record<string, unknown>): Promise<void>;
    }
  }
}
