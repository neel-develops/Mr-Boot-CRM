import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const transcript = typeof body?.transcript === "string" ? body.transcript.slice(0, 1000) : "";
    if (!transcript) {
      return NextResponse.json({ error: "Transcript is required" }, { status: 400 });
    }

    const groqApiKey = process.env.GROQ_API_KEY || "";
    if (groqApiKey) {
     try {
      const groq = new Groq({ apiKey: groqApiKey });

      const prompt = `You are a structured parser for Mr. Boot CRM that extracts order details from spoken voice search or voice orders.
Extract the customer's identity, item details, price, and whether the order is for a ready-made shoe sale (e.g. purchase of stock shoes) or standard service/restoration.

Spoken input: "${transcript}"

Return ONLY a JSON object (JSON mode) with the following structure:
{
  "firstName": "Customer's first name (if found, otherwise empty)",
  "lastName": "Customer's last name (if found, otherwise empty)",
  "phone": "Customer's phone/contact number (extract digits only, if found, otherwise empty)",
  "itemType": "Shoe model or item description (if found, otherwise empty)",
  "price": number or null (extracted price/cost, as a number, if found, otherwise null),
  "isReadymade": true if user mentions ready-made/readymade/buying shoes/buying ready shoes, false if it is for deep clean/sole replacement/restoration/service/bespoke custom order
}
`;

      const response = await groq.chat.completions.create({
        messages: [
          { role: "system", content: "You are a precise JSON extractor. Output valid JSON only." },
          { role: "user", content: prompt }
        ],
        model: "openai/gpt-oss-20b",
        reasoning_effort: "low",
        response_format: { type: "json_object" }
      });

      const parsedContent = response.choices[0]?.message?.content;
      if (parsedContent) {
        const parsed = JSON.parse(parsedContent);
        return NextResponse.json(parsed);
      }
     } catch (err) {
      // Fall through to the regex parser below instead of failing the whole command.
      console.error("Groq voice parse failed, using fallback:", err);
     }
    }

    // Fallback: Regex parsing if Groq is not configured or fails
    const phoneMatch = transcript.match(/\b\d{10}\b/) || transcript.match(/\b\d{5}\s?\d{5}\b/);
    const phone = phoneMatch ? phoneMatch[0].replace(/\s/g, "") : "";

    // Remove the phone number first so its digits aren't read as the price.
    const withoutPhone = phone ? transcript.replace(phoneMatch![0], " ") : transcript;
    const priceMatch =
      withoutPhone.match(/(?:rs\.?|₹|rupees|inr|price|cost|amount)\s*(\d{2,6})\b/i) ||
      withoutPhone.match(/\b(\d{2,6})\s*(?:rs|rupees|inr)\b/i) ||
      withoutPhone.match(/\b(\d{3,5})\b/);
    const price = priceMatch ? parseInt(priceMatch[1], 10) : null;

    // Detect names using simple capitalized word matching
    const words = transcript.split(/\s+/);
    let firstName = "";
    let lastName = "";
    const nameKeywords = ["for", "customer", "name", "client", "of"];
    for (let i = 0; i < words.length - 1; i++) {
      if (nameKeywords.includes(words[i].toLowerCase())) {
        firstName = words[i + 1].charAt(0).toUpperCase() + words[i + 1].slice(1);
        if (i + 2 < words.length && !words[i + 2].toLowerCase().match(/phone|price|cost/)) {
          lastName = words[i + 2].charAt(0).toUpperCase() + words[i + 2].slice(1);
        }
        break;
      }
    }

    const isReadymade = transcript.toLowerCase().includes("ready") || transcript.toLowerCase().includes("buy");

    return NextResponse.json({
      firstName,
      lastName,
      phone,
      itemType: "",
      price,
      isReadymade
    });

  } catch (error: any) {
    console.error("Error parsing voice transcript:", error);
    return NextResponse.json({ error: error.message || "Failed to parse voice command" }, { status: 500 });
  }
}
