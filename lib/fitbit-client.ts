// Fitbit Web API Client
// Handles OAuth 2.0 PKCE flow and data fetching

import crypto from "crypto";

const FITBIT_AUTH_URL = "https://www.fitbit.com/oauth2/authorize";
const FITBIT_TOKEN_URL = "https://api.fitbit.com/oauth2/token";
const FITBIT_API_BASE = "https://api.fitbit.com";
const FITBIT_CALLBACK_PATH = "/api/fitbit/callback";

const FITBIT_SCOPES = [
  "activity",
  "heartrate",
  "sleep",
  "oxygen_saturation",
  "respiratory_rate",
  "profile",
].join(" ");

// PKCE helpers
export function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function generateCodeChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

export function generateState(): string {
  return crypto.randomBytes(16).toString("hex");
}

function getFitbitRedirectURI(): string {
  const explicitRedirectUri = process.env.FITBIT_REDIRECT_URI?.trim();
  if (explicitRedirectUri) {
    return explicitRedirectUri.replace(/\/+$/, "");
  }

  const baseUrl = process.env.NEXTAUTH_URL?.trim();
  if (!baseUrl) {
    throw new Error(
      "NEXTAUTH_URL or FITBIT_REDIRECT_URI must be configured in environment variables",
    );
  }

  return `${baseUrl.replace(/\/+$/, "")}${FITBIT_CALLBACK_PATH}`;
}

// Build OAuth2 authorization URL
export function getFitbitAuthURL(params: {
  codeChallenge: string;
  state: string;
}): string {
  const clientId = process.env.FITBIT_CLIENT_ID?.trim();
  const redirectUriEnv = process.env.FITBIT_REDIRECT_URI?.trim();

  if (!clientId) {
    throw new Error(
      "FITBIT_CLIENT_ID is not configured in environment variables",
    );
  }

  if (!redirectUriEnv) {
    throw new Error(
      "FITBIT_REDIRECT_URI is not configured in environment variables",
    );
  }

  const redirectUri = redirectUriEnv.replace(/\/+$/, "");
  const encodedScope = encodeURIComponent(FITBIT_SCOPES).replace(/\+/g, "%20");

  const url = `${FITBIT_AUTH_URL}?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodedScope}`;

  const authUrl = `${url}&code_challenge=${encodeURIComponent(params.codeChallenge)}&code_challenge_method=S256&state=${encodeURIComponent(params.state)}`;

  console.log("Redirect URI:", redirectUri);

  return authUrl;
}

// Exchange authorization code for tokens
export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  userId: string;
  scope: string;
}> {
  const clientId = process.env.FITBIT_CLIENT_ID;
  const clientSecret = process.env.FITBIT_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Fitbit credentials not configured");
  }

  const redirectUri = getFitbitRedirectURI();
  console.log("Redirect URI:", redirectUri);

  const response = await fetch(FITBIT_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
      client_id: clientId,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("[Fitbit OAuth] Token exchange failed:", error);
    throw new Error(`Fitbit token exchange failed: ${error}`);
  }

  const data = await response.json();
  console.log(
    "[Fitbit OAuth] Token exchange successful for user:",
    data.user_id,
  );

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    userId: data.user_id,
    scope: data.scope,
  };
}

// Refresh an expired access token
export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  const clientId = process.env.FITBIT_CLIENT_ID;
  const clientSecret = process.env.FITBIT_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Fitbit credentials not configured");
  }

  const response = await fetch(FITBIT_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Fitbit token refresh failed: ${error}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

// Generic authenticated Fitbit API request
async function fetchFitbitAPI<T>(
  endpoint: string,
  accessToken: string,
): Promise<T> {
  const response = await fetch(`${FITBIT_API_BASE}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (response.status === 401) {
    throw new Error("FITBIT_TOKEN_EXPIRED");
  }

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Fitbit API error (${response.status}): ${error}`);
  }

  return response.json();
}

// Revoke a Fitbit token
export async function revokeToken(token: string): Promise<void> {
  const clientId = process.env.FITBIT_CLIENT_ID;
  const clientSecret = process.env.FITBIT_CLIENT_SECRET;
  if (!clientId || !clientSecret) return;

  await fetch(`${FITBIT_API_BASE}/oauth2/revoke`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({ token }),
  });
}

// Format date for Fitbit API (YYYY-MM-DD)
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

// ---- Data Fetching Functions ----

export interface FitbitHeartRateResponse {
  "activities-heart": Array<{
    dateTime: string;
    value: {
      customHeartRateZones: Array<{
        name: string;
        min: number;
        max: number;
        minutes: number;
        caloriesOut: number;
      }>;
      heartRateZones: Array<{
        name: string;
        min: number;
        max: number;
        minutes: number;
        caloriesOut: number;
      }>;
      restingHeartRate?: number;
    };
  }>;
}

export interface FitbitActivityResponse {
  activities: Array<{
    activityId: number;
    activityParentId: number;
    activityParentName: string;
    calories: number;
    description: string;
    distance?: number;
    duration: number;
    hasActiveZoneMinutes: boolean;
    hasStartTime: boolean;
    isFavorite: boolean;
    lastModified: string;
    logId: number;
    name: string;
    startDate: string;
    startTime: string;
    steps?: number;
  }>;
  goals: {
    activeMinutes: number;
    caloriesOut: number;
    distance: number;
    steps: number;
  };
  summary: {
    activeScore: number;
    activityCalories: number;
    caloriesBMR: number;
    caloriesOut: number;
    distances: Array<{ activity: string; distance: number }>;
    fairlyActiveMinutes: number;
    lightlyActiveMinutes: number;
    marginalCalories: number;
    sedentaryMinutes: number;
    steps: number;
    veryActiveMinutes: number;
    heartRateZones?: Array<{
      name: string;
      min: number;
      max: number;
      minutes: number;
      caloriesOut: number;
    }>;
    restingHeartRate?: number;
  };
}

export interface FitbitSleepResponse {
  sleep: Array<{
    dateOfSleep: string;
    duration: number; // ms
    efficiency: number;
    isMainSleep: boolean;
    levels: {
      summary: {
        deep?: { count: number; minutes: number; thirtyDayAvgMinutes: number };
        light?: { count: number; minutes: number; thirtyDayAvgMinutes: number };
        rem?: { count: number; minutes: number; thirtyDayAvgMinutes: number };
        wake?: { count: number; minutes: number; thirtyDayAvgMinutes: number };
      };
      data: Array<{ dateTime: string; level: string; seconds: number }>;
    };
    logId: number;
    minutesAfterWakeup: number;
    minutesAsleep: number;
    minutesAwake: number;
    minutesToFallAsleep: number;
    startTime: string;
    endTime: string;
    timeInBed: number;
    type: string;
  }>;
  summary: {
    totalMinutesAsleep: number;
    totalSleepRecords: number;
    totalTimeInBed: number;
  };
}

export interface FitbitSpO2Response {
  dateTime: string;
  value: {
    avg: number;
    min: number;
    max: number;
  };
}

export interface FitbitBreathingRateResponse {
  br: Array<{
    dateTime: string;
    value: {
      breathingRate: number;
    };
  }>;
}

export interface FitbitProfileResponse {
  user: {
    displayName: string;
    avatar: string;
    encodedId: string;
    memberSince: string;
  };
}

// Fetch heart rate data for a date
export async function getHeartRate(
  accessToken: string,
  date: Date = new Date(),
): Promise<FitbitHeartRateResponse> {
  return fetchFitbitAPI(
    `/1/user/-/activities/heart/date/${formatDate(date)}/1d.json`,
    accessToken,
  );
}

// Fetch daily activity summary
export async function getActivitySummary(
  accessToken: string,
  date: Date = new Date(),
): Promise<FitbitActivityResponse> {
  return fetchFitbitAPI(
    `/1/user/-/activities/date/${formatDate(date)}.json`,
    accessToken,
  );
}

// Fetch sleep log
export async function getSleepLog(
  accessToken: string,
  date: Date = new Date(),
): Promise<FitbitSleepResponse> {
  return fetchFitbitAPI(
    `/1.2/user/-/sleep/date/${formatDate(date)}.json`,
    accessToken,
  );
}

// Fetch SpO2 data
export async function getSpO2(
  accessToken: string,
  date: Date = new Date(),
): Promise<FitbitSpO2Response> {
  return fetchFitbitAPI(
    `/1/user/-/spo2/date/${formatDate(date)}.json`,
    accessToken,
  );
}

// Fetch breathing rate
export async function getBreathingRate(
  accessToken: string,
  date: Date = new Date(),
): Promise<FitbitBreathingRateResponse> {
  return fetchFitbitAPI(
    `/1/user/-/br/date/${formatDate(date)}.json`,
    accessToken,
  );
}

// Fetch user profile
export async function getProfile(
  accessToken: string,
): Promise<FitbitProfileResponse> {
  return fetchFitbitAPI("/1/user/-/profile.json", accessToken);
}

// Fetch all health data for a date (combined call)
export async function getAllHealthData(
  accessToken: string,
  date: Date = new Date(),
) {
  const [heartRate, activity, sleep, profile] = await Promise.allSettled([
    getHeartRate(accessToken, date),
    getActivitySummary(accessToken, date),
    getSleepLog(accessToken, date),
    getProfile(accessToken),
  ]);

  // SpO2 and breathing rate may not be available on all devices
  const [spo2, breathingRate] = await Promise.allSettled([
    getSpO2(accessToken, date),
    getBreathingRate(accessToken, date),
  ]);

  return {
    heartRate: heartRate.status === "fulfilled" ? heartRate.value : null,
    activity: activity.status === "fulfilled" ? activity.value : null,
    sleep: sleep.status === "fulfilled" ? sleep.value : null,
    profile: profile.status === "fulfilled" ? profile.value : null,
    spo2: spo2.status === "fulfilled" ? spo2.value : null,
    breathingRate:
      breathingRate.status === "fulfilled" ? breathingRate.value : null,
  };
}
