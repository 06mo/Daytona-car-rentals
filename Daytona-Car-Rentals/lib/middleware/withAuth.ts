import "server-only";

import { NextResponse } from "next/server";

import { getAdminAuth } from "@/lib/firebase/admin";
import { FirebaseConfigError } from "@/lib/firebase/firestore";
import type { AuthUser } from "@/types";

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }

  const cookieHeader = request.headers.get("cookie");

  if (!cookieHeader) {
    return null;
  }

  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((entry) => {
      const [key, ...rest] = entry.trim().split("=");
      return [key, decodeURIComponent(rest.join("="))];
    }),
  );

  return cookies.__session ?? cookies.token ?? null;
}

export async function requireAuth(request: Request): Promise<AuthUser> {
  const token = getBearerToken(request);

  if (!token) {
    throw new Error("Authentication required.");
  }

  const adminAuth = getAdminAuth();

  if (!adminAuth) {
    throw new FirebaseConfigError();
  }

  const decodedToken = await adminAuth.verifyIdToken(token);

  return {
    email: decodedToken.email ?? null,
    token,
    userId: decodedToken.uid,
    role: decodedToken.role === "admin" ? "admin" : "customer",
  };
}

export function withAuth<TContext>(
  handler: (request: Request, context: TContext, user: AuthUser) => Promise<Response>,
) {
  return async (request: Request, context: TContext) => {
    try {
      const user = await requireAuth(request);
      return await handler(request, context, user);
    } catch (error) {
      if (error instanceof FirebaseConfigError) {
        return NextResponse.json({ error: error.message }, { status: 503 });
      }

      if (error instanceof Error && error.message === "Authentication required.") {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }

      if (error instanceof Error) {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }

      return NextResponse.json({ error: "Authentication failed." }, { status: 401 });
    }
  };
}
