import { NextResponse } from "next/server";

export async function GET() {
  const baseUrl = process.env.NEXTAUTH_URL;
  const clientId = process.env.FITBIT_CLIENT_ID;

  if (!baseUrl || !clientId) {
    return NextResponse.json(
      {
        error: "Missing environment variables",
        baseUrl: baseUrl ? "Set" : "NOT SET",
        clientId: clientId ? "Set" : "NOT SET",
      },
      { status: 500 },
    );
  }

  // Construct redirect_uri exactly as getFitbitAuthURL does
  const redirectUri = `${baseUrl.replace(/\/$/, "")}/api/fitbit/callback`;

  return NextResponse.json(
    {
      status: "OK",
      environment: {
        NEXTAUTH_URL: baseUrl,
        NODE_ENV: process.env.NODE_ENV,
      },
      constructed_redirect_uri: redirectUri,
      expected_redirect_uri:
        "https://airsense-app.vercel.app/api/fitbit/callback",
      match:
        redirectUri === "https://airsense-app.vercel.app/api/fitbit/callback",
      instructions: [
        '1. Copy the "constructed_redirect_uri" above',
        "2. Go to https://dev.fitbit.com/build/reference/web-api/oauth2-guide",
        "3. Register your Fitbit app with this exact redirect URI",
        "4. Ensure NEXTAUTH_URL matches your deployment domain",
      ],
    },
    { status: 200 },
  );
}
