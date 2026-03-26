import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import {
  generateCodeVerifier,
  generateCodeChallenge,
  getFitbitAuthURL,
} from "@/lib/fitbit-client";

export async function GET(request: Request) {
  try {
    console.log("[Fitbit Auth] Starting OAuth flow...");
    console.log("[Fitbit Auth] NEXTAUTH_URL:", process.env.NEXTAUTH_URL);
    console.log("[Fitbit Auth] NODE_ENV:", process.env.NODE_ENV);

    const requestHost = new URL(request.url).host;
    const redirectHost = process.env.FITBIT_REDIRECT_URI
      ? new URL(process.env.FITBIT_REDIRECT_URI).host
      : "(not set)";
    console.log("[Fitbit Auth] Request host:", requestHost);
    console.log("[Fitbit Auth] Redirect URI host:", redirectHost);

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
    const state = randomUUID();

    const authURL = getFitbitAuthURL({ codeChallenge, state });
    console.log(
      "[Fitbit Auth] Redirecting to:",
      authURL.substring(0, 100) + "...",
    );
    console.log("[Fitbit Auth] Full auth URL:", authURL);

    const response = NextResponse.redirect(authURL);
    response.cookies.set("fitbit_code_verifier", codeVerifier, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
    });
    response.cookies.set("fitbit_oauth_state", state, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });

    return response;
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
