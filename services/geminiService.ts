import { GoogleGenAI, Type } from "@google/genai";
import { Page, Section } from "../types";

export async function generateDressPreview(base64Image: string, category: string, gender: string, pose: 'frontal' | 'reference', customApiKey?: string, selectedColor?: string) {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("API Key is missing");
  
  const ai = new GoogleGenAI({ apiKey });
  const model = customApiKey ? 'gemini-3.1-flash-image-preview' : 'gemini-2.5-flash-image';

  const mimeTypeMatch = base64Image.match(/^data:(image\/[a-zA-Z+]+);base64,/);
  const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg';
  const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

  const poseInstruction = pose === 'frontal' 
    ? 'The person should be in a formal, standing, frontal pose, facing the camera directly.'
    : 'Maintain the person\'s original pose and posture from the reference photo.';

  const prompt = `
    You are a world-class fashion stylist and high-end image editor specializing in photorealistic transformations.
    
    TASK:
    Transform the person or people in the provided photo into guests at a boho chic wedding with EXTREME precision.
    
    METADATA:
    Category: ${category}
    Gender: ${gender} (Note: If 'Couple', there may be two people in the photo or two photos combined).
    
    SPECIFIC OUTFIT INSTRUCTIONS:
    ${getOutfitDescription(category, gender, selectedColor)}
    
    ENVIRONMENT:
    Background: A stunning, high-definition (4k quality) boho chic wedding environment. Include natural elements like pampas grass, macrame, warm golden-hour lighting, and elegant floral arrangements.
    
    CRITICAL QUALITY REQUIREMENTS:
    1. EXTREME SIMILARITY: The face, facial features, skin texture, and body structure of EVERY person in the photo MUST be identical to the original. Do not beautify or alter their identity.
    2. PHOTOREALISM: The final image must look like a real 4k photograph taken with a professional camera.
    3. SEAMLESS INTEGRATION: The new clothing must fit each person's body perfectly, respecting their original proportions and posture.
    4. ${poseInstruction}
    5. CLOTHING DETAIL: The fabrics should have realistic textures (silk, linen, wool) as per the "Specific Outfit Instructions".
    6. COUPLE HANDLING: If the category is "Padrinhos" or "Madrinhas" (plural) and there are two people, identify the man and woman (or two women if applicable) and dress them accordingly. If two separate photos were provided, compose them together realistically in the same scene.
    
    STRICT CONSTRAINTS:
    - DO NOT ask for clarification.
    - If metadata conflicts with the photo (e.g., Gender: M but subject is F), adapt the requested outfit to the person's physical form.
    - Output ONLY the transformed image. No text.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "3:4",
        }
      }
    });

    const candidate = response.candidates?.[0];
    if (!candidate) throw new Error('No candidates returned from Gemini');

    let textResponse = '';
    for (const part of candidate.content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
      if (part.text) {
        textResponse += part.text;
      }
    }

    if (textResponse) {
      throw new Error(`Model returned text instead of image: ${textResponse}`);
    }

    if (candidate.finishReason && candidate.finishReason !== 'STOP') {
      throw new Error(`Generation failed with reason: ${candidate.finishReason}`);
    }

    throw new Error('No image generated');
  } catch (error) {
    console.error('Error generating dress preview:', error);
    throw error;
  }
}

function getOutfitDescription(category: string, gender: string, selectedColor?: string) {
  const isCouple = gender === 'Couple' || category === 'Padrinhos' || category === 'Madrinhas';

  if (isCouple) {
    if (category === 'Padrinhos') {
      return "The image should show a couple. The woman should wear a long, fluid Sage Green dress. The man should wear a well-tailored Graphite Grey suit with a Sage Green tie.";
    }
    if (category === 'Madrinhas') {
      return "The image should show two women. Both should wear long, fluid Sage Green dresses. Elegant and sophisticated boho style.";
    }
    // Default couple (Common)
    const colorNote = selectedColor ? `The couple should wear outfits in ${selectedColor} tones.` : "Suggest soft pastels, light pinks, lavenders, or light blues.";
    return `The image should show a couple in elegant formal wedding attire. AVOID these colors: Sage Green, Moss Green, Burgundy, Graphite Grey, Dark Blue, White, and Off-White. ${colorNote} Harmonize with a Boho Chic style.`;
  }

  switch (category) {
    case 'Padrinho':
      return "A well-tailored Graphite Grey suit with a Sage Green tie. Professional and elegant look.";
    case 'Madrinha':
      return "A long, fluid Sage Green dress. Elegant and sophisticated boho style.";
    case 'Demoiselle':
      return "A long Moss Green dress. Elegant and sophisticated boho style.";
    case 'Mãe da Noiva':
    case 'Mãe do Noivo':
      return "An elegant long Burgundy (Bordô) dress. Sophisticated and maternal look.";
    case 'Pai da Noiva':
    case 'Pai do Noivo':
      return "A Dark Blue suit with a Burgundy tie. Classic and elegant.";
    case 'Noivo':
      return "A Light Blue suit with a Pale Gold tie. The star of the show.";
    default:
      const colorNote = selectedColor ? `The outfit should be in ${selectedColor} tones.` : "Suggest soft pastels, light pinks, lavenders, or light blues.";
      return `Elegant formal wedding attire. AVOID these colors: Sage Green, Moss Green, Burgundy, Graphite Grey, Dark Blue, White, and Off-White. ${colorNote} Harmonize with a Boho Chic style.`;
  }
}

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
      model: "gemini-3-flash-preview",
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