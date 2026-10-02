import { NextRequest, NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const room = searchParams.get("room");
    const identity = searchParams.get("identity") || `student_${Math.random().toString(36).substring(2, 9)}`;
    const name = searchParams.get("name") || identity;

    if (!room) {
      return NextResponse.json(
        { error: "Missing 'room' query parameter." },
        { status: 400 }
      );
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl =
      process.env.LIVEKIT_URL ||
      process.env.NEXT_PUBLIC_LIVEKIT_URL ||
      "wss://campus-hub-50uslxwj.livekit.cloud";

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "LiveKit server credentials are not configured in environment." },
        { status: 500 }
      );
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity,
      name,
      ttl: "4h",
    });

    at.addGrant({
      roomJoin: true,
      room,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();

    return NextResponse.json(
      {
        token,
        url: livekitUrl,
        room,
        identity,
        name,
      },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      }
    );
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Error creating LiveKit token:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate LiveKit token" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const room = body.room;
    const identity = body.identity || `student_${Math.random().toString(36).substring(2, 9)}`;
    const name = body.name || identity;

    if (!room) {
      return NextResponse.json(
        { error: "Missing 'room' parameter in request body." },
        { status: 400 }
      );
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl =
      process.env.LIVEKIT_URL ||
      process.env.NEXT_PUBLIC_LIVEKIT_URL ||
      "wss://campus-hub-50uslxwj.livekit.cloud";

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "LiveKit server credentials are not configured in environment." },
        { status: 500 }
      );
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity,
      name,
      ttl: "4h",
    });

    at.addGrant({
      roomJoin: true,
      room,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();

    return NextResponse.json(
      {
        token,
        url: livekitUrl,
        room,
        identity,
        name,
      },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      }
    );
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Error creating LiveKit token:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate LiveKit token" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
