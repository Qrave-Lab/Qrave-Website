import { NextRequest, NextResponse } from "next/server";

// Uses the same endpoint the Google Translate browser widget uses — no API key needed.
// Responds with { translations: string[] } in the same order as the input `texts`.
export async function POST(req: NextRequest) {
  try {
    const { texts, target } = (await req.json()) as {
      texts: string[];
      target: string;
    };

    if (!texts?.length || !target || target === "en") {
      return NextResponse.json({ translations: texts ?? [] });
    }

    // Split into chunks of max ~400 chars to stay within URL limits
    const CHUNK_CHARS = 400;
    const SEP = "\n⬛\n"; // separator unlikely to appear in menu text

    const chunks: string[][] = [];
    let currentChunk: string[] = [];
    let currentLen = 0;

    for (const text of texts) {
      if (currentLen + text.length > CHUNK_CHARS && currentChunk.length > 0) {
        chunks.push(currentChunk);
        currentChunk = [];
        currentLen = 0;
      }
      currentChunk.push(text);
      currentLen += text.length + SEP.length;
    }
    if (currentChunk.length > 0) chunks.push(currentChunk);

    // Translate each chunk in parallel
    const chunkResults = await Promise.all(
      chunks.map(async (chunk) => {
        const joined = chunk.join(SEP);
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(joined)}`;
        const res = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0" },
        });
        const data = await res.json();
        // data[0] = array of [translated_segment, original_segment, ...]
        const translatedJoined: string = Array.isArray(data[0])
          ? data[0].map((seg: any) => seg[0] ?? "").join("")
          : joined;
        return translatedJoined.split("⬛").map((s: string) => s.trim().replace(/^\n+|\n+$/g, ""));
      })
    );

    const translations = chunkResults.flat();

    // Ensure length matches input (pad with originals on error)
    while (translations.length < texts.length) {
      translations.push(texts[translations.length] ?? "");
    }

    return NextResponse.json({ translations: translations.slice(0, texts.length) });
  } catch (err) {
    console.error("[/api/translate]", err);
    return NextResponse.json({ error: "Translation failed" }, { status: 500 });
  }
}
