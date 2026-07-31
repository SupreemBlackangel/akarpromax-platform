import type { CountryOption } from "@/src/types/site";

export default function CountryFlag({ country }: { country: CountryOption }) {
  return <span className="country-flag" aria-hidden="true"><img src={`https://flagcdn.com/24x18/${country.id}.png`} alt="" decoding="async" onError={(event) => { event.currentTarget.parentElement?.classList.add("emoji-fallback"); }} /><span className="country-flag-emoji">{country.flag}</span></span>;
}
