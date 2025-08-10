// app/api/sections-from-mockup/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Vercel AI SDK (Core) + Azure provider
import {
  generateText,
  generateObject,
  experimental_generateImage as generateImage,
} from "ai";
import { createAzure } from "@ai-sdk/azure";

// ---- Azure config (set these in your env) ----
// AZURE_OPENAI_API_KEY
// AZURE_OPENAI_RESOURCE          e.g. "my-azure-openai"
// AZURE_OPENAI_API_VERSION       e.g. "2024-06-01"
// AZURE_OPENAI_GPT4O_DEPLOYMENT     your GPT-4o deployment name
// AZURE_OPENAI_GPT_IMAGE_DEPLOYMENT your gpt-image-1 deployment name
const missingEnv: string[] = [];
if (!process.env.AZURE_OPENAI_API_KEY) missingEnv.push("AZURE_OPENAI_API_KEY");
if (!process.env.AZURE_OPENAI_RESOURCE && !process.env.AZURE_OPENAI_BASE_URL)
  missingEnv.push("AZURE_OPENAI_RESOURCE or AZURE_OPENAI_BASE_URL");
if (!process.env.AZURE_OPENAI_GPT4O_DEPLOYMENT) missingEnv.push("AZURE_OPENAI_GPT4O_DEPLOYMENT");
if (!process.env.AZURE_OPENAI_GPT_IMAGE_DEPLOYMENT) missingEnv.push("AZURE_OPENAI_GPT_IMAGE_DEPLOYMENT");

const azure = createAzure({
  resourceName: process.env.AZURE_OPENAI_RESOURCE,
  baseURL: process.env.AZURE_OPENAI_BASE_URL,
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  apiVersion: process.env.AZURE_OPENAI_API_VERSION ?? "2024-06-01",
});

// Zod schema for the structured sections result
const SectionsSchema = z.object({
  sections: z
    .array(
      z.object({
        SectionName: z
          .string()
          .describe("The name of the section (e.g. Header, Hero Section)."),
        Description: z
          .string()
          .describe(
            "A description of the contents, styling, and overall visual appearance of the section."
          ),
      })
    )
    .describe("An ordered list of page sections with their names and descriptions."),
});

type Sections = z.infer<typeof SectionsSchema>;

export const runtime = "nodejs"; // or 'edge' if your Azure setup supports it

export async function POST(request: NextRequest) {
  try {
    if (missingEnv.length > 0) {
      return NextResponse.json(
        { error: `Missing Azure config: ${missingEnv.join(", ")}` },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const imageFile = formData.get("image") as File | null;

    if (!imageFile) {
      return NextResponse.json({ error: "No image file provided" }, { status: 400 });
    }

    // Convert the uploaded image to a base64 data URL so we can pass it as multimodal input
    const buf = Buffer.from(await imageFile.arrayBuffer());
    const base64 = buf.toString("base64");
    const dataUrl = `data:${imageFile.type};base64,${base64}`;

    // --- Step 1: Vision analysis (GPT-4o on Azure) ---
    const visionText = await generateText({
      model: azure(process.env.AZURE_OPENAI_GPT4O_DEPLOYMENT as string), // e.g. 'gpt-4o'
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this hand-drawn webpage mockup and identify all the distinct page sections you can see.
Look for areas like headers, content blocks, sidebars, footers, etc. Provide a detailed list of each section you
identify, in the form of "SectionName: Description". Descriptions should be detailed but must not hallucinate — only
describe what is visible. Include styling cues, contained elements, and any visual hints. A good example:

Header: The header bar has rounded corners and contains a button to log in and a button to sign up on the right side. It is directly above the sidebar and the main content
Sidebar: The sidebar has rounded corners and is a vertical rectangle. It contains 3 pill-shaped buttons stacked...`,
            },
            {
              type: "image",
              image: dataUrl, // Strings can be data URLs, base64, or http(s) URLs
              mediaType: imageFile.type,
            },
          ],
        },
      ],
      temperature: 0.2,
    });

    const sectionsText = visionText.text?.trim();
    if (!sectionsText) throw new Error("Failed to analyze image sections");

    // --- Step 2: Structure to JSON via Zod (generateObject) ---
     const structured = await generateObject({
       model: azure(process.env.AZURE_OPENAI_GPT4O_DEPLOYMENT as string),
      schema: SectionsSchema,
      messages: [
        {
          role: "system",
          content: `You'll receive a spec describing a website to be created.
Return JSON with { sections: Array<{ SectionName, Description }> } where:
- Use the exact names and details from the spec text (no additions).
- Do NOT add, modify, or remove information.
- EXCEPTION: Remove positional phrases (e.g., "left of", "above"). No positional info.`,
        },
        {
          role: "user",
          content: `Here is the spec text:\n${sectionsText}`,
        },
      ],
      temperature: 0,
    });

    const sections = (structured.object as Sections).sections;

    // --- Step 3: Generate wireframes (3 per section) via Azure GPT-Image-1 ---
    // We request b64 output so we can return it directly.
     const imageJobs = sections.map(async (s) => {
      const prompt = `Create a black-and-white wireframe for a website section called "${s.SectionName}".
Description of its structure: ${s.Description}
Style: clean, minimal wireframe with black lines on white background, layout boxes, placeholder text lines, and basic UI elements. No colors, no detailed graphics.`;

 const result = await generateImage({
     model: azure.image(process.env.AZURE_OPENAI_GPT_IMAGE_DEPLOYMENT as string),
    prompt,
    size: "1536x1024",
    n: 3,
    providerOptions: { azure: { responseFormat: "b64_json" } },
  });
  
  // result.images is an array of generated images
   const images = Array.isArray((result as any).images) ? (result as any).images : [];
   const options = images
     .map((img: any) => {
       if (img?.b64_json) return img.b64_json as string;
       if (img?.data) return Buffer.from(img.data as ArrayBuffer).toString("base64");
       if (typeof img === "string" && (img as string).startsWith("data:")) return (img as string).split(",")[1] ?? "";
       return "";
     })
     .filter((s: string) => s.length > 0);

      return {
        sectionName: s.SectionName,
        sectionDescription: s.Description,
        options,
      };
    });

    const sectionsWithImages = await Promise.all(imageJobs);

    // --- Step 4: Return JSON ---
    return NextResponse.json(sectionsWithImages, { status: 200 });
  } catch (err: any) {
    console.error("API Error:", err);

    const msg = (err?.message || "").toLowerCase();
    if (msg.includes("api key")) {
      return NextResponse.json(
        { error: "Azure OpenAI API configuration error" },
        { status: 500 }
      );
    }
    if (msg.includes("quota") || msg.includes("rate limit")) {
      return NextResponse.json(
        { error: "Azure OpenAI API rate limit exceeded" },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error processing the drawing" },
      { status: 500 }
    );
  }
}

// Optional: request size limits for multipart uploads
export const config = {
  api: { bodyParser: { sizeLimit: "10mb" } },
};
