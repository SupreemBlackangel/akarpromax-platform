export type LegalSection = {
  heading: string;
  paragraphs: string[];
};

export type LegalDocument = {
  slug: string[];
  title: string;
  description: string;
  sections: LegalSection[];
};

const REVIEW_NOTICE = "REQUIRES HUMAN LEGAL REVIEW BEFORE PRODUCTION";

export const LEGAL_DOCUMENTS: LegalDocument[] = [
  {
    slug: [],
    title: "Legal Center",
    description: `${REVIEW_NOTICE}. Central access point for platform terms, privacy, marketplace, provider, advertising, review, dispute, IP, and data-retention policies.`,
    sections: [
      {
        heading: "Scope",
        paragraphs: [
          "AkarProMax operates a real-estate marketplace, a services marketplace, and a business/supplier ecosystem that will expand over time.",
          "This legal center groups the platform rules that users, professionals, organizations, advertisers, and future suppliers must understand before launch.",
        ],
      },
      {
        heading: "Review status",
        paragraphs: [REVIEW_NOTICE],
      },
    ],
  },
  {
    slug: ["terms"],
    title: "General Terms",
    description: REVIEW_NOTICE,
    sections: [
      { heading: "Platform role", paragraphs: ["AkarProMax provides discovery, publishing, request, matching, communication, and workspace tools. It does not automatically guarantee title, licensure, service quality, legality, or regulatory compliance unless a specific verified workflow explicitly says so."] },
      { heading: "Account responsibilities", paragraphs: ["Users are responsible for account security, truthful registration data, and lawful use of platform tools.", "Privileged roles, verification outcomes, and trust levels are granted by platform workflows and review, not by self-declaration."] },
      { heading: "Suspension and termination", paragraphs: ["Accounts, content, and marketplace participation may be limited, suspended, or removed for abuse, fraud, policy breaches, safety concerns, legal requests, or platform integrity reasons."] },
    ],
  },
  {
    slug: ["privacy"],
    title: "Privacy Notice",
    description: REVIEW_NOTICE,
    sections: [
      { heading: "Data categories", paragraphs: ["Current platform data includes identity/contact data, property records, services marketplace activity, organization data, verification records, reputation records, Find My Land documents, and security/audit telemetry."] },
      { heading: "Purpose", paragraphs: ["Data is processed to operate authentication, publishing, requests/offers/jobs, moderation, AMRS verification/reputation, office integrations, tools, and security controls."] },
      { heading: "Review status", paragraphs: [REVIEW_NOTICE] },
    ],
  },
  {
    slug: ["marketplace"],
    title: "Marketplace Framework",
    description: REVIEW_NOTICE,
    sections: [
      { heading: "Coverage", paragraphs: ["The platform hosts a real-estate marketplace and a services marketplace today, with product/supplier readiness planned as a future expansion."] },
      { heading: "Integrity", paragraphs: ["Trust signals, verification, reputation, and policy enforcement are separate from advertising and future monetization.", "Sponsored visibility must remain labeled and cannot silently replace organic trust or eligibility. "] },
    ],
  },
  {
    slug: ["services"],
    title: "Services Marketplace Terms",
    description: REVIEW_NOTICE,
    sections: [
      { heading: "Lifecycle", paragraphs: ["The current marketplace lifecycle is Request -> Matching -> Offer -> Acceptance/Decline -> Job -> Completion -> Customer confirmation -> Review/Dispute."] },
      { heading: "Roles", paragraphs: ["Customers publish requests and select offers.", "Professionals and service companies publish provider capabilities and submit offers.", "AkarProMax provides workflow, communication, moderation, and trust infrastructure but is not automatically the contracting party unless explicitly stated."] },
      { heading: "Completion policy", paragraphs: ["Provider completion claims may move a job to a waiting-customer-confirmation state.", "Customer confirmation finalizes verified completion.", "Disputes and reports are separate moderation workflows."] },
    ],
  },
  {
    slug: ["real-estate"],
    title: "Real Estate Marketplace Terms",
    description: REVIEW_NOTICE,
    sections: [
      { heading: "Listing responsibility", paragraphs: ["Property advertisers remain responsible for title/authority, accuracy, imagery, pricing, and lawful publication."] },
      { heading: "Verification limitations", paragraphs: ["AkarProMax may display trust or verification signals where implemented, but these do not replace professional legal/title diligence unless a dedicated workflow explicitly states otherwise."] },
    ],
  },
  {
    slug: ["providers"],
    title: "Provider Terms",
    description: REVIEW_NOTICE,
    sections: [
      { heading: "Professional capability", paragraphs: ["Professional/provider capability is an upgrade path attached to a user identity, not a separate account type."] },
      { heading: "Claims and evidence", paragraphs: ["Licenses, qualifications, organization claims, and future supplier claims must not be treated as trusted from self-declaration alone."] },
    ],
  },
  {
    slug: ["advertising"],
    title: "Advertising & Sponsored Content Policy",
    description: REVIEW_NOTICE,
    sections: [
      { heading: "Separation of trust and paid placement", paragraphs: ["Paid promotion cannot purchase verification truth, reputation rank, GOLD, or PROMAX.", "Sponsored items must remain labeled and separate from organic trust. "] },
      { heading: "Safe zones", paragraphs: ["Critical trust, verification, tool-processing, and sensitive transaction steps may require restricted advertising behavior."] },
    ],
  },
  {
    slug: ["reviews"],
    title: "Review & Reputation Policy",
    description: REVIEW_NOTICE,
    sections: [
      { heading: "Verified interaction", paragraphs: ["Service reviews are attached to completed service jobs/orders, not arbitrary user input detached from a recorded interaction."] },
      { heading: "Abuse handling", paragraphs: ["Fake reviews, collusion, harassment, misleading qualifications, and other integrity attacks may trigger moderation, hidden reviews, or account action."] },
    ],
  },
  {
    slug: ["disputes"],
    title: "Dispute & Complaint Handling",
    description: REVIEW_NOTICE,
    sections: [
      { heading: "Current platform support", paragraphs: ["The services marketplace supports dispute/report targets at the job/order level and moderation workflows through service reports."] },
      { heading: "Expectation", paragraphs: ["AkarProMax can collect dispute evidence and route it for moderation, but human review rules and legal escalation language require counsel review before production."] },
    ],
  },
  {
    slug: ["acceptable-use"],
    title: "Acceptable Use",
    description: REVIEW_NOTICE,
    sections: [
      { heading: "Prohibited behavior", paragraphs: ["Fraud, impersonation, spam, misleading listings, malicious uploads, credential abuse, review manipulation, illegal products/services, and IP infringement are prohibited."] },
    ],
  },
  {
    slug: ["intellectual-property"],
    title: "Intellectual Property",
    description: REVIEW_NOTICE,
    sections: [
      { heading: "Protected content", paragraphs: ["Logos, brand names, photos, datasheets, designs, and third-party materials remain subject to ownership and usage rights."] },
      { heading: "Reporting", paragraphs: ["The platform should support report/escalation workflows for IP complaints; any final takedown/legal process requires human legal review."] },
    ],
  },
  {
    slug: ["data-retention"],
    title: "Data Retention",
    description: REVIEW_NOTICE,
    sections: [
      { heading: "Operational retention", paragraphs: ["Identity, verification, reputation, services, office, and security records follow platform retention and cleanup logic defined in code and operations runbooks."] },
      { heading: "Legal review", paragraphs: [REVIEW_NOTICE] },
    ],
  },
];

export const LEGAL_DOCUMENT_MAP = new Map(
  LEGAL_DOCUMENTS.map((doc) => [doc.slug.join("/"), doc]),
);
