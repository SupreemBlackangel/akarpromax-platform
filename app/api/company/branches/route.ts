// ORGANIZATIONS_F3_WORKSPACE
import { NextRequest } from "next/server";
import { createBranch, deleteBranch, listBranches, updateBranch } from "@/lib/amrs/workspace-branches-api";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) { return listBranches(req, "company"); }
export async function POST(req: NextRequest) { return createBranch(req, "company"); }
export async function PATCH(req: NextRequest) { return updateBranch(req, "company"); }
export async function DELETE(req: NextRequest) { return deleteBranch(req, "company"); }
