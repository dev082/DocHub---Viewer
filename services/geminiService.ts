
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const summarizeDocument = async (fileName: string, content: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Por favor, resuma o conteúdo do seguinte documento "${fileName}". 
      Foque nos pontos principais e seja conciso. Se o conteúdo parecer ser um código XML ou Markdown, explique o que ele faz.
      
      Conteúdo:
      ${content.substring(0, 5000)}`, // Limiting to first 5k chars for safety
    });
    return response.text || "Não foi possível gerar um resumo.";
  } catch (error) {
    console.error("Error summarizing document:", error);
    return "Erro ao processar o resumo com a IA.";
  }
};
