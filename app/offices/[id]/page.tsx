import OrganizationProfilePage from "@/src/components/public/organization-profile-page";

export default async function RealEstateCompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrganizationProfilePage mode="offices" id={id} />;
}
