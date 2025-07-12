import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");
    const tags = searchParams.getAll("tags");
    const authorId = searchParams.get("author_id");
    const hasAcceptedAnswer = searchParams.get("has_accepted_answer");
    const sortBy = searchParams.get("sort_by") || "created_at";
    const order = searchParams.get("order") || "desc";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    // Build query parameters for backend
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    if (tags.length > 0) tags.forEach((tag) => params.append("tags", tag));
    if (authorId) params.set("author_id", authorId);
    if (hasAcceptedAnswer !== null)
      params.set("has_accepted_answer", hasAcceptedAnswer || "false");
    params.set("sort_by", sortBy);
    params.set("order", order);
    params.set("page", page.toString());
    params.set("limit", limit.toString());

    const backendResponse = await fetch(
      `${process.env.BACKEND_URL}/api/v1/qa/admin/questions?${params}`,
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!backendResponse.ok) {
      throw new Error("Failed to fetch admin questions");
    }

    const data = await backendResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Admin questions error:", error);
    return NextResponse.json(
      { error: "Failed to fetch admin questions" },
      { status: 500 }
    );
  }
}
