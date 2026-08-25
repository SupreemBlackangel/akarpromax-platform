// ORGANIZATIONS_F3_WORKSPACE
import { NextRequest } from "next/server";
import { getProfile, patchProfile } from "@/lib/amrs/workspace-profile-api";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) { return getProfile(req, "company"); }
export async function PATCH(req: NextRequest) { return patchProfile(req, "company"); }
