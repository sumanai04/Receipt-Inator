"use server";

interface ReceiptItem {
  name: string;
  price: number;
}

export async function analyzeReceiptImage(
  imageDataUrl: string,
  ocrText?: string
): Promise<{
  success: boolean;
  items: ReceiptItem[];
  error?: string;
}> {
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    return { success: false, items: [], error: "DEEPSEEK_API_KEY not configured" };
  }

  try {
    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: imageDataUrl },
              },
              {
                type: "text",
                text: `Extract every purchased item from this receipt or bill photo. Return ONLY a JSON array, no other text.

Rules:
- Each item has "name" (string) and "price" (number)
- Price is the TOTAL line price (not unit price), in the receipt's currency
- IMPORTANT — Skip these non-item lines (do NOT include them in the output):
  - subtotal, sub total, total, grand total, tax, ppn, service charge, service
  - cash, change, kembalian, payment, debit, credit, qris, rounding, pembulatan
  - discounts, promo, voucher, diskon
  - restaurant name, address, date/time, phone, cashier name, waiter, table number
  - any line that is clearly a summary/total, not a purchased item
- For items with quantity like "2x @9000 18000", use the total (18000), name is just "Nasi Putih"
- Negative prices are valid (e.g. rounding adjustment): {"name":"Rounding","price":-200}
- Strip quantity markers (x1, 2x) from names
- If the price uses dot as thousands separator ("15.000"), treat it as 15000
- Normalize names: capitalize each word, remove stray symbols
${ocrText ? `\nTesseract OCR has already read the following raw text from this receipt. Use it to cross-reference and correct any visual misreads. If the OCR text and the image disagree on an item's name or price, use your best judgment — prefer the OCR value when it looks like a clear character recognition result, prefer the visual reading when the OCR seems garbled:\n\n--- OCR TEXT ---\n${ocrText}\n--- END OCR ---\n` : ""}
Example output:
[{"name":"Nasi Putih","price":18000},{"name":"Pepes Teri","price":15000}]

If no items are visible, return an empty array: []`,
              },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return { success: false, items: [], error: `API error ${response.status}: ${body.slice(0, 200)}` };
    }

    const data = await response.json();
    const content: string = data.choices?.[0]?.message?.content || "";

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return { success: false, items: [], error: "Could not parse receipt items from API response" };
    }

    const items: ReceiptItem[] = JSON.parse(jsonMatch[0]);
    const nonItemKeywords = /^(subtotal|sub total|total|grand total|tax|ppn|service|service charge|cash|change|kembalian|payment|debit|credit|qris|rounding|pembulatan|discount|diskon|promo|voucher|thank|order|table|waiter|kasir|cashier)$/i;
    return {
      success: true,
      items: items.filter(
        (i) =>
          i.name &&
          !isNaN(i.price) &&
          i.price !== 0 &&
          !nonItemKeywords.test(i.name.trim())
      ),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, items: [], error: message };
  }
}
