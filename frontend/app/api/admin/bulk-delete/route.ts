import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const itemIds = searchParams.getAll("item_ids");
    const itemType = searchParams.get("item_type") || "questions";

    if (itemIds.length === 0) {
      return NextResponse.json(
        { error: "No items provided for deletion" },
        { status: 400 }
      );
    }

    // Build query parameters for backend
    const params = new URLSearchParams();
    itemIds.forEach((id) => params.append("item_ids", id));
    params.set("item_type", itemType);

    const backendResponse = await fetch(
      `${process.env.BACKEND_URL}/api/v1/qa/admin/bulk-delete?${params}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json();
      throw new Error(errorData.detail || "Failed to perform bulk delete");
    }

    const data = await backendResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Admin bulk delete error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to perform bulk delete",
      },
      { status: 500 }
    );
  }
}
