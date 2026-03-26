import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  getFitbitAuthURL,
} from "@/lib/fitbit-client";

export async function GET() {
  try {
    console.log("[Fitbit Auth] Starting OAuth flow...");
    console.log("[Fitbit Auth] NEXTAUTH_URL:", process.env.NEXTAUTH_URL);
    console.log("[Fitbit Auth] NODE_ENV:", process.env.NODE_ENV);

    if (!process.env.FITBIT_CLIENT_ID) {
      return NextResponse.json(
        {
          error:
            "Fitbit integration not configured. Set FITBIT_CLIENT_ID in .env",
        },
        { status: 500 },
      );
    }

    if (!process.env.NEXTAUTH_URL) {
      return NextResponse.json(
        { error: "NEXTAUTH_URL is not configured in environment variables" },
        { status: 500 },
      );
    }

    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const state = generateState();

    // Store PKCE verifier and state in cookies for the callback
    const cookieStore = await cookies();
    cookieStore.set("fitbit_code_verifier", codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
    });
    cookieStore.set("fitbit_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });

    const authURL = getFitbitAuthURL({ codeChallenge, state });
    console.log(
      "[Fitbit Auth] Redirecting to:",
      authURL.substring(0, 100) + "...",
    );
    console.log("[Fitbit Auth] Full auth URL:", authURL);

    return NextResponse.redirect(authURL);
  } catch (error) {
    console.error("[Fitbit Auth] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to initiate Fitbit authorization",
        details: String(error),
      },
      { status: 500 },
    );
  }
}
