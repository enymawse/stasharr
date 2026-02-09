import type { ExtensionRequest, ExtensionResponse, MessageMap } from './messages.js';

type MessageKey = keyof MessageMap;
type MessageHandler<K extends MessageKey> = (
  request: MessageMap[K]['request'],
) => Promise<MessageMap[K]['response']> | MessageMap[K]['response'];

export function createMessageRouter(
  handlers: Partial<{ [K in MessageKey]: MessageHandler<K> }>,
) {
  return {
    handle(request: ExtensionRequest): Promise<ExtensionResponse> | null {
      const key = request.type as MessageKey;
      const handler = handlers[key] as MessageHandler<MessageKey> | undefined;
      if (!handler) {
        return null;
      }
      return Promise.resolve(
        handler(request as MessageMap[MessageKey]['request']),
      ) as Promise<ExtensionResponse>;
    },
  };
}

type RuntimeWithSendMessage = {
  sendMessage: (message: ExtensionRequest) => Promise<ExtensionResponse>;
};

export function sendMessage<K extends MessageKey>(
  runtime: RuntimeWithSendMessage,
  request: MessageMap[K]['request'],
): Promise<MessageMap[K]['response']> {
  return runtime.sendMessage(request) as Promise<MessageMap[K]['response']>;
}
