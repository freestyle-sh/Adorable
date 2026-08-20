import { streamLlmResponse } from "@/lib/llm-provider";
import type {
  ModelProvider,
  StreamModelResponseParams,
} from "@/lib/ports/model-provider";

export class AiSdkModelProvider implements ModelProvider {
  async streamResponse(input: StreamModelResponseParams) {
    return streamLlmResponse(input);
  }
}

export const aiSdkModelProvider = new AiSdkModelProvider();
