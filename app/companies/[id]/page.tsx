import OrganizationProfilePage from "@/src/components/public/organization-profile-page";

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrganizationProfilePage mode="companies" id={id} />;
}
