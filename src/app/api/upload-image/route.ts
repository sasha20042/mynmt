import { NextResponse } from "next/server";
import { createImageRecord } from "@/lib/airtable/server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file || !file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Expected an image file" },
        { status: 400 }
      );
    }
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    if (base64.length > 98_000) {
      return NextResponse.json(
        { error: "Image too large (max ~70KB for Airtable)" },
        { status: 413 }
      );
    }
    const recordId = await createImageRecord(base64, file.type);
    const origin =
      request.headers.get("x-forwarded-host") ||
      request.headers.get("host") ||
      "";
    const proto = request.headers.get("x-forwarded-proto") || "http";
    const baseUrl = `${proto}://${origin}`.replace(/\/$/, "");
    const url = `${baseUrl}/api/image?id=${recordId}`;
    return NextResponse.json({ url });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload failed" },
      { status: 500 }
    );
  }
}
