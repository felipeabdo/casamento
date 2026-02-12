import { GoogleGenAI, Type } from "@google/genai";
import { Page, Section } from "../types";

const SYSTEM_INSTRUCTION = `
You are an expert web designer and copywriter for high-end weddings. 
Your goal is to generate JSON content for a new wedding website page.
The style should be romantic, elegant, classic, and welcoming.
The content must be coherent with the provided existing pages.
Output strictly JSON.
`;

export const generatePageContent = async (
  topic: string,
  existingPages: Page[],
  apiKey: string
): Promise<Page> => {
  if (!apiKey) throw new Error("API Key is missing");

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    I need a new page for a wedding website about: "${topic}".
    
    Here is the context of the existing site content:
    ${JSON.stringify(existingPages.map(p => ({ title: p.title, sections: p.sections.map(s => s.content) })))}

    Please generate a valid JSON object for a single 'Page'.
    
    The JSON schema must follow this TypeScript interface:
    interface Page {
      id: string; // generate a random UUID string
      title: string;
      slug: string; // should start with /
      isSystem: boolean; // always false
      sections: Array<{
        id: string; // generate a random UUID string
        type: 'hero' | 'text' | 'image-text' | 'gallery';
        title?: string;
        content?: string;
        imageUrl?: string; // Use https://picsum.photos/width/height
        imagePosition?: 'left' | 'right';
      }>
    }

    Rules:
    1. Use 'hero' for the top section.
    2. Write romantic, inviting copy in Portuguese (pt-BR).
    3. Ensure the tone matches the existing pages.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-latest",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
         // We define the schema to ensure strict type compliance
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            title: { type: Type.STRING },
            slug: { type: Type.STRING },
            isSystem: { type: Type.BOOLEAN },
            sections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ['hero', 'text', 'image-text', 'gallery'] },
                  title: { type: Type.STRING, nullable: true },
                  content: { type: Type.STRING, nullable: true },
                  imageUrl: { type: Type.STRING, nullable: true },
                  imagePosition: { type: Type.STRING, enum: ['left', 'right'], nullable: true },
                },
                required: ['id', 'type']
              }
            }
          },
          required: ['id', 'title', 'slug', 'isSystem', 'sections']
        }
      },
    });

    if (response.text) {
      const pageData = JSON.parse(response.text) as Page;
      // Force isSystem to false for generated pages to avoid overwriting core routes
      pageData.isSystem = false;
      return pageData;
    }
    throw new Error("No content generated");
  } catch (error) {
    console.error("Gemini generation error:", error);
    throw error;
  }
};