type BackgroundRequest = { type?: string; [key: string]: any };
type BackgroundResponse = { [key: string]: any };
type BackgroundHandler = (
  request: BackgroundRequest,
) => Promise<BackgroundResponse> | BackgroundResponse;

type BackgroundRuntime = {
  runtime: {
    onMessage: {
      addListener: (callback: any) => void;
    };
  };
};

function createBaseHandlers(options: {
  messageTypes: {
    ping: string;
    getSettings: string;
    getConfigStatus: string;
    openOptionsPage: string;
  };
  version: string;
  getSettings: () => Promise<{
    whisparrBaseUrl?: string;
    whisparrApiKey?: string;
    [key: string]: any;
  }>;
  openOptionsPage?: () => void;
}) {
  const { messageTypes, version, getSettings, openOptionsPage } = options;
  return {
    [messageTypes.ping]: async () => ({
      ok: true,
      type: messageTypes.ping,
      version,
      timestamp: new Date().toISOString(),
    }),
    [messageTypes.getSettings]: async () => {
      const settings = await getSettings();
      return { ok: true, type: messageTypes.getSettings, settings };
    },
    [messageTypes.getConfigStatus]: async () => {
      const settings = await getSettings();
      return {
        ok: true,
        type: messageTypes.getConfigStatus,
        configured: Boolean(settings.whisparrBaseUrl && settings.whisparrApiKey),
      };
    },
    [messageTypes.openOptionsPage]: async () => {
      if (openOptionsPage) {
        openOptionsPage();
        return { ok: true, type: messageTypes.openOptionsPage };
      }
      return {
        ok: false,
        type: messageTypes.openOptionsPage,
        error: 'openOptionsPage not available.',
      };
    },
  };
}

function createBackgroundHandler(options: {
  handlers: Record<string, BackgroundHandler>;
  unknownResponse: BackgroundResponse;
}) {
  return async (request: BackgroundRequest): Promise<BackgroundResponse> => {
    const type = request?.type ?? '';
    const handler = options.handlers[type];
    if (handler) {
      return handler(request);
    }
    return options.unknownResponse;
  };
}

function registerBackgroundListener(options: {
  ext: BackgroundRuntime;
  handleMessage: (request: BackgroundRequest) => Promise<BackgroundResponse>;
  onError: (error: Error) => BackgroundResponse;
}) {
  options.ext.runtime.onMessage.addListener(
    (
      request: BackgroundRequest,
      _sender: unknown,
      sendResponse: (response: BackgroundResponse) => void,
    ) => {
      options
        .handleMessage(request)
        .then((response) => sendResponse(response))
        .catch((error) => sendResponse(options.onError(error as Error)));
      return true;
    },
  );
}

export {
  createBackgroundHandler,
  createBaseHandlers,
  registerBackgroundListener,
};

export type { BackgroundHandler, BackgroundRequest, BackgroundResponse };
