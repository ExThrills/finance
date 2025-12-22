import { NextResponse } from "next/server";
import { CountryCode, Products } from "plaid";

import { getCurrentUserId } from "@/lib/auth";
import { plaidClient } from "@/lib/plaid";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const userId = await getCurrentUserId();
    const webhook = process.env.PLAID_WEBHOOK_URL;

    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: userId },
      client_name: "Nestfolio",
      products: [
        Products.Transactions,
        Products.Balance,
        Products.Liabilities,
        Products.Investments,
      ],
      country_codes: [CountryCode.Us],
      language: "en",
      webhook: webhook || undefined,
    });

    return NextResponse.json({ link_token: response.data.link_token });
  } catch (error) {
    const responseData =
      error && typeof error === "object" && "response" in error
        ? (error as { response?: { data?: unknown } }).response?.data
        : null;
    console.error("POST /api/plaid/link-token failed", error, responseData);
    return NextResponse.json(
      { error: "Failed to create link token." },
      { status: 500 }
    );
  }
}
