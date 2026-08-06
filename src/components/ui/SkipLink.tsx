import type { ReactNode } from "react";

type Props = {
  children?: ReactNode;
  href?: string;
};

const DEFAULT_HREF = "#main-content";
const DEFAULT_TEXT = "تخطَّ إلى المحتوى";

export default function SkipLink({ children, href = DEFAULT_HREF }: Props) {
  return (
    <a href={href} className="skip-link">
      {children ?? DEFAULT_TEXT}
    </a>
  );
}
