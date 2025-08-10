import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { createAzure } from "@ai-sdk/azure";
import { experimental_generateImage as generateImage } from "ai";
import fs from "fs";
import path from "path";


// Initialize OpenAI client
const openai = new OpenAI({
 apiKey: process.env.OPENAI_API_KEY,
});


// Types for our structured response


export async function POST(request) {
 try {
   // Parse the form data to get the image
   const formData = await request.formData();
   const imageFile = formData.get("image");


   if (!imageFile) {
     return NextResponse.json(
       { error: "No image file provided" },
       { status: 400 }
     );
   }


   // Convert image to base64 for OpenAI
   const imageBuffer = await imageFile.arrayBuffer();
   const base64Image = Buffer.from(imageBuffer).toString("base64");
   const imageDataUrl = `data:${imageFile.type};base64,${base64Image}`;


   // Step 1: Analyze the drawing to identify page sections
   console.log("Step 1: Analyzing drawing for page sections...");
   const visionResponse = await openai.chat.completions.create({
     model: "gpt-4o",
     messages: [
       {
         role: "user",
         content: [
           {
             type: "text",
             text: `Analyze this hand-drawn webpage mockup and identify all the distinct page sections you can see. Look for areas like headers, content blocks, sidebars, footers, etc. Provide a detailed list of each section you identify, in the form of section name: section description. Section descriptions should be as detailed as possible; don't hallucinate or make up details, but make sure to detail everything you can see in the image. A good description of a page section includes information on its styling, information about the elements it contains and how they look, and information on where the section is located in relation to other sections.
          
           IMPORTANT: ALL SECTIONS SHOULD BE ABOVE OR BELOW OTHER SECTIONS. IF YOU THINK TWO THINGS ARE SEPARATE SECTIONS AND THEY ARE NEXT TO EACH OTHER, COUNT THEM AS ONE SECTION REGARDLESS OF THE CONTENT THEY CONTAIN.
          
           IMPORTANT: ALL MODULAR/ ATOMIC COMPONENTS, SUCH AS SEARCH BARS, CARDS, ETC, SHOULD ALMOST NEVER BE MARKED AS A PAGE SECTION.


            \n\nEXAMPLE OF A GOOD RESPONSE




            Header: The header bar has rounded corners and contains a button to log in and a button to sign up on the right side. It is directly above the main content
            Main Content: The main content section has a sidebar on the left with rounded corners, and the sidebar contains a button that says create new. It also contains a main content section on the left that appears to be a page of documentation. This page has the title 'How to integrate Supabase Auth'. It is directly below the main content.
            Footer: The Footer bar has the icons for Twitter, Youtube, and Instagram next to text that says follow us.


            Notice that each section was either directly on top or below the other sections.

             `,
           },
           {
             type: "image_url",
             image_url: { url: imageDataUrl, detail: "high" },
           },
         ],
       },
     ],
   });


   const sectionsText = visionResponse.choices[0]?.message?.content;
   if (!sectionsText) {
     throw new Error("Failed to analyze image sections");
   }


   const sectionsSchema = z.object({
     sections: z
       .array(
         z.object({
           SectionName: z
             .string()
             .describe("The name of the section (e.g. Header, Hero Section)."),
           Description: z
             .string()
             .describe(
               "A description of the contents, styling, and the overall visual appearance of the sections"
             ),
         })
       )
       .describe(
         "An ordered list of page sections with their names and descriptions."
       ),
   });
   // Step 2: Convert the analysis to structured format
   console.log("Step 2: Converting to structured format...");
   const structuredResponse = await openai.responses.parse({
     model: "gpt-4o",
     input: [
       {
         role: "system",
         content: `You will recieve a spec that describes a website that needs to be created. Your goal is to take the information you are given and format it into a JSON
         structure. The spec will essentially tell you about a variety of different sections on the page, and your goal isto take that spec and return a JSON that is a list
         of sections, where the SectionName is the name of the section given, and the Description is any details you can find out about the section. DO NOT ADD IN ANY INFORMATION
         NOT PRESENT IN THE SPEC YOU ARE GIVEN, DO NOT MODIFY OR DELETE INFORMATION UNDER ANY CIRCUMSTANCES.


         EXCEPTION: IF THERE IS ANY INFORMATION ABOUT WHERE A PAGE SECTION IS LOCATED ON A PAGE, DO NOT INCLUDE IT. EVER. DESCRIPTIONS LIKE " the sidebar is located to the left of the main content" ARE EXPRESSLY FORBIDDEN.
         `,
       },
       { role: "user", content: `Here is the HTML: ${sectionsText}` },
     ],
     text: {
       format: zodTextFormat(sectionsSchema, "sections"),
     },
   });


   const sections = structuredResponse.output_parsed.sections;


    console.log(
      `Step 3: Generating wireframes for ${sections.length} sections...`
    );

    // Prepare output directory for saving generated images
    const outputDir = path.join(process.cwd(), "public", "scroller", "new");
    await fs.promises.mkdir(outputDir, { recursive: true });
    // Clear previous files to avoid mixing old and new results
    try {
      const existing = await fs.promises.readdir(outputDir);
      await Promise.all(
        existing
          .filter((f) => /\.(png|jpg|jpeg|webp|gif)$/i.test(f))
          .map((f) => fs.promises.unlink(path.join(outputDir, f)))
      );
    } catch {}


   const imageGenerationPromises = sections.map(async (section, sectionIdx) => {
     console.log(`Generating images for section: ${section.SectionName}`);


     // Generate 3 images for each section in parallel
     const azure = createAzure({
      resourceName: process.env.AZURE_OPENAI_RESOURCE,
      apiKey: process.env.AZURE_OPENAI_API_KEY,
    });
      const images = await generateImage({
       model: azure.image("gpt-image-1"),
       prompt: `Create a black and white wireframe mockup for a website section called "${section.SectionName}". This is a decription of its general structure: ${section.Description}. Style: Clean, minimal wireframe with black lines on white background, showing layout structure, boxes for content areas, placeholder text lines, and basic UI elements. No colors, no detailed graphics, just structural wireframe elements. Display only the section and nothing around it, no titles, no other blocks or any other content. Also make sure there is no outline around the thing. The background should be plain white, and there should be no text any text or titles on top of the element.`,
       size: "1536x1024",
       quality: "high",
       n: 3,
     });
     try {
        console.log(images.images);
        const publicUrls = [];
        let index = 0;
        for (const image of images.images) {
          if (!image?.base64) continue;
          const filename = `${sectionIdx + 1}_${++index}.png`;
          const filePath = path.join(outputDir, filename);
          const buffer = Buffer.from(image.base64, "base64");
          await fs.promises.writeFile(filePath, buffer);
          publicUrls.push(`/scroller/new/${filename}`);
        }

       return {
         sectionName: section.SectionName,
         sectionDescription: section.Description,
          options: publicUrls,
       };
     } catch (error) {
       console.error(
         `Failed to generate images for section ${section.SectionName}:`,
         error
       );
       // Return section with empty options if image generation fails
       return {
         sectionName: section.SectionName,
         sectionDescription: section.Description,
         options: [],
       };
     }
   });


   // Wait for all image generation to complete
   const sectionsWithImages = await Promise.all(imageGenerationPromises);

   
   // Step 4: Return the final result
   console.log("Step 4: Returning results...");
   return NextResponse.json(sectionsWithImages, { status: 200 });
 } catch (error) {
   console.error("API Error:", error);


   // Provide more specific error messages
   if (error instanceof Error) {
     if (error.message.includes("API key")) {
       return NextResponse.json(
         { error: "OpenAI API configuration error" },
         { status: 500 }
       );
     }
     if (
       error.message.includes("quota") ||
       error.message.includes("rate limit")
     ) {
       return NextResponse.json(
         { error: "OpenAI API rate limit exceeded" },
         { status: 429 }
       );
     }
   }


   return NextResponse.json(
     { error: "Internal server error processing the drawing" },
     { status: 500 }
   );
 }
}


// Optional: Add request size limits
export const config = {
 api: {
   bodyParser: {
     sizeLimit: "10mb",
   },
 },
};





