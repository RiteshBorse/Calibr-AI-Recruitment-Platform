import { NextResponse } from "next/server";
import candidateProfile from "@/models/candidateProfile.model";
import { withDatabase, createErrorResponse, logError } from "@/utils/action-helpers";
import { validateSession } from "@/utils/auth-helpers";

export async function GET() {
  try {

    const { success, candidateId, error } = await validateSession();

    if (!success || !candidateId) {
      logError("Unauthorized access attempt");
      return NextResponse.json(
        createErrorResponse("Unauthorized", error),
        { status: 401 }
      );
    }

    const result = await withDatabase(async () => {

      const profile = await candidateProfile
        .findOne({ candidate: candidateId })
        .select("profileImage")
        .lean();

      return {
        success: true,
        data: {
          profileImage: profile?.profileImage || null,
        },
      };
    }, "Error fetching candidate profile");

    return NextResponse.json(result);
  } catch (error) {
    logError("Error fetching candidate profile image", error);
    return NextResponse.json(
      createErrorResponse("Internal server error", error),
      { status: 500 }
    );
  }
}
