import { NextResponse } from "next/server";
import { getImageRecord } from "@/lib/airtable/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  try {
    const { content, mimeType } = await getImageRecord(id);
    const buffer = Buffer.from(content, "base64");
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": mimeType || "image/png",
        "Cache-Control": "public, max-age=31536000",
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Not found" },
      { status: 404 }
    );
  }
}
