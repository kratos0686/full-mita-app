
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

export type TaskComplexity = 
  | 'FAST_ANALYSIS'      // Dashboard summaries, simple lists (Gemini 3 Flash)
  | 'DEEP_REASONING'     // Complex predictions, compliance checks (Gemini 3 Pro)
  | 'VISION_ANALYSIS'    // Detailed image inspection, OCR, Spatial (Gemini 3 Pro Image)
  | 'CREATIVE_EDIT'      // In-painting, asset generation (Gemini 2.5 Flash Image)
  | 'VIDEO_GENERATION'   // Video creation (Veo)
  | 'LOCATION_SERVICES'; // Maps Grounding (Gemini 2.5 Flash)

interface RouterConfig {
  systemInstruction?: string;
  responseMimeType?: string;
  responseSchema?: any;
  tools?: any[];
  imageConfig?: any;
  toolConfig?: any;
  thinkingBudget?: number;
}

export class IntelligenceRouter {
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  private pickBestModel(complexity: TaskComplexity): string {
    switch (complexity) {
      case 'FAST_ANALYSIS': return 'gemini-3-flash-preview';
      case 'DEEP_REASONING': return 'gemini-3-pro-preview';
      case 'VISION_ANALYSIS': return 'gemini-3-pro-image-preview';
      case 'CREATIVE_EDIT': return 'gemini-2.5-flash-image';
      case 'VIDEO_GENERATION': return 'veo-3.1-fast-generate-preview';
      case 'LOCATION_SERVICES': return 'gemini-2.5-flash'; // Required for Maps
      default: return 'gemini-3-flash-preview';
    }
  }

  async execute(complexity: TaskComplexity, contents: any, config: RouterConfig = {}): Promise<GenerateContentResponse> {
    const model = this.pickBestModel(complexity);
    
    if (complexity === 'VIDEO_GENERATION') {
        throw new Error("Video generation requires specific operation handling via generateVideo method.");
    }

    const generationConfig: any = {
        systemInstruction: config.systemInstruction,
        responseMimeType: config.responseMimeType,
        responseSchema: config.responseSchema,
        tools: config.tools,
        toolConfig: config.toolConfig,
        imageConfig: config.imageConfig,
    };

    // Apply thinking budget for Pro models if requested
    if (config.thinkingBudget && model === 'gemini-3-pro-preview') {
        generationConfig.thinkingConfig = { thinkingBudget: config.thinkingBudget };
    }
    
    return await this.ai.models.generateContent({
      model,
      contents: typeof contents === 'string' ? { parts: [{ text: contents }] } : contents,
      config: generationConfig
    });
  }

  async generateVideo(prompt: string, image?: string) {
      const model = this.pickBestModel('VIDEO_GENERATION');
      const payload: any = {
          model,
          prompt,
          config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
      };
      if (image) {
          payload.image = { imageBytes: image.split(',')[1], mimeType: 'image/png' };
      }
      return await this.ai.models.generateVideos(payload);
  }

  getOperationsClient() {
      return this.ai.operations;
  }
}
