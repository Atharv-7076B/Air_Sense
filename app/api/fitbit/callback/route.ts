import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { timingSafeEqual } from "crypto";
import { exchangeCodeForTokens } from "@/lib/fitbit-client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function safeCompareState(returnedState: string, storedState: string): boolean {
  const returnedBuffer = Buffer.from(returnedState, "utf8");
  const storedBuffer = Buffer.from(storedState, "utf8");

  if (returnedBuffer.length !== storedBuffer.length) {
    return false;
  }

  return timingSafeEqual(returnedBuffer, storedBuffer);
}

function getAppBaseURL(): string {
  const baseUrl = process.env.NEXTAUTH_URL?.trim();
  if (!baseUrl) {
    throw new Error("NEXTAUTH_URL is not configured");
  }
  return baseUrl.replace(/\/+$/, "");
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    console.log("[Fitbit Callback] Request host:", new URL(request.url).host);
    const code = searchParams.get("code");
    const returnedState = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(`${getAppBaseURL()}/settings?fitbit=denied`);
    }

    if (!code || !returnedState) {
      return NextResponse.json(
        { error: "Missing code or state parameter" },
        { status: 400 },
      );
    }

    // Verify state and get code verifier from cookie-based OAuth context
    const cookieStore = await cookies();
    const encodedOAuthContext = cookieStore.get("fitbit_oauth_ctx")?.value;

    let storedState: string | undefined;
    let codeVerifier: string | undefined;

    if (encodedOAuthContext) {
      try {
        const decoded = Buffer.from(encodedOAuthContext, "base64url").toString("utf8");
        const parsed = JSON.parse(decoded) as {
          state?: string;
          codeVerifier?: string;
        };
        storedState = parsed.state;
        codeVerifier = parsed.codeVerifier;
      } catch (parseError) {
        console.error("[Fitbit Callback] Invalid OAuth context cookie:", parseError);
      }
    }

    console.log("Returned state:", returnedState);
    console.log("Stored state:", storedState);
    console.log(
      "[Fitbit Callback] State cookie present:",
      Boolean(storedState),
    );
    console.log(
      "[Fitbit Callback] PKCE verifier cookie present:",
      Boolean(codeVerifier),
    );

    if (!storedState || !safeCompareState(returnedState, storedState)) {
      cookieStore.delete("fitbit_oauth_ctx");
      return NextResponse.json(
        { error: "Invalid state parameter - possible CSRF attack" },
        { status: 403 },
      );
    }

    // State is single-use; clear it immediately after successful validation.
    cookieStore.delete("fitbit_oauth_ctx");

    if (!codeVerifier) {
      return NextResponse.json(
        { error: "Missing code verifier - please try again" },
        { status: 400 },
      );
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code, codeVerifier);

    // Get or create user (using first user for now - no auth system)
    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: { name: "User", city: "Mumbai" },
      });
    }

    // Store Fitbit connection
    const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);
    await prisma.fitbitConnection.upsert({
      where: { userId: user.id },
      update: {
        fitbitUserId: tokens.userId,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt,
        scopes: tokens.scope,
      },
      create: {
        userId: user.id,
        fitbitUserId: tokens.userId,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt,
        scopes: tokens.scope,
      },
    });

    // Clear OAuth context cookie after successful token exchange
    cookieStore.delete("fitbit_oauth_ctx");

    return NextResponse.redirect(
      `${getAppBaseURL()}/settings?fitbit=connected`,
    );
  } catch (error) {
    console.error("[Fitbit OAuth] Callback error:", error);

    try {
      const cookieStore = await cookies();
      cookieStore.delete("fitbit_oauth_ctx");
    } catch {
      // Ignore cleanup errors; we still want to return a deterministic response.
    }

    try {
      return NextResponse.redirect(`${getAppBaseURL()}/settings?fitbit=error`);
    } catch {
      return NextResponse.json(
        { error: "Fitbit callback failed and NEXTAUTH_URL is not configured" },
        { status: 500 },
      );
    }
  }
}
