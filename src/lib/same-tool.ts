import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import OpenAI from "openai";
import { FreestyleDevServerFilesystem } from "freestyle-sandboxes";

const openai = new OpenAI({
  apiKey: process.env.MORPH_API_KEY,
  baseURL: "https://api.morphllm.com/v1",
});

export const morphTool = (fs: FreestyleDevServerFilesystem) =>
  createTool({
    id: "edit_file",
    description:
      "Use this tool to make an edit to an existing file.\n\nThis will be read by a less intelligent model, which will quickly apply the edit. You should make it clear what the edit is, while also minimizing the unchanged code you write.\nWhen writing the edit, you should specify each edit in sequence, with the special comment // ... existing code ... to represent unchanged code in between edited lines.\n\nFor example:\n\n// ... existing code ...\nFIRST_EDIT\n// ... existing code ...\nSECOND_EDIT\n// ... existing code ...\nTHIRD_EDIT\n// ... existing code ...\n\nYou should still bias towards repeating as few lines of the original file as possible to convey the change.\nBut, each edit should contain sufficient context of unchanged lines around the code you're editing to resolve ambiguity.\nDO NOT omit spans of pre-existing code (or comments) without using the // ... existing code ... comment to indicate its absence. If you omit the existing code comment, the model may inadvertently delete these lines.\nIf you plan on deleting a section, you must provide context before and after to delete it. If the initial code is ```code \\n Block 1 \\n Block 2 \\n Block 3 \\n code```, and you want to remove Block 2, you would output ```// ... existing code ... \\n Block 1 \\n  Block 3 \\n // ... existing code ...```.\nMake sure it is clear what the edit should be, and where it should be applied.\nMake edits to a file in a single edit_file call instead of multiple edit_file calls to the same file. The apply model can handle many distinct edits at once.",
    inputSchema: z.object({
      target_file: z.string().describe("The target file to modify."),
      instructions: z
        .string()
        .describe(
          "A single sentence instruction describing what you are going to do for the sketched edit. This is used to assist the less intelligent model in applying the edit. Use the first person to describe what you are going to do. Use it to disambiguate uncertainty in the edit."
        ),
      code_edit: z
        .string()
        .describe(
          "Specify ONLY the precise lines of code that you wish to edit. NEVER specify or write out unchanged code. Instead, represent all unchanged code using the comment of the language you're editing in - example: // ... existing code ..."
        ),
    }),
    execute: async ({
      context: { target_file, instructions, code_edit: editSnippet },
    }) => {
      let file;
      try {
        file = await fs.readFile(target_file);
      } catch (error) {
        throw new Error(
          `File not found: ${target_file}. Error message: ${error instanceof Error ? error.message : String(error)}`
        );
      }
      const response = await openai.chat.completions.create({
        model: "morph-v3-large",
        messages: [
          {
            role: "user",
            content: `<instruction>${instructions}</instruction>\n<code>${file}</code>\n<update>${editSnippet}</update>`,
          },
        ],
      });

      const finalCode = response.choices[0].message.content;

      if (!finalCode) {
        throw new Error("No code returned from Morph API.");
      }
      // Write to file or return to your application
      await fs.writeFile(target_file, finalCode);
    },
  });
