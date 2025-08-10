import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("image");

    if (!(file instanceof File)) {
      return new Response(JSON.stringify({ error: "Missing 'image' file" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    // For now, just return a hardcoded test URL as requested
    const testUrl = "https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d";

    return new Response(JSON.stringify({ url: testUrl }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Upload failed" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}


