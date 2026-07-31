import type { Locale, Translation } from "@/src/types/site";

type Props = {
  copy: Translation;
  locale: Locale;
};

export default function NewsTicker({ copy, locale }: Props) {
  return (
    <div className="news-ticker" role="status" aria-label={copy.tickerAria}>
      <div className="container ticker-inner"><span className="ticker-label">{copy.tickerLabel}</span><span className="ticker-pulse" aria-hidden="true" />
        <div className="ticker-track">{copy.ticker.map((item, index) => <span key={`${locale}-ticker-${index}`}>{index > 0 && " • "}{item}</span>)}</div>
        <button type="button" aria-label={copy.tickerPause}>Ⅱ</button>
      </div>
    </div>
  );
}
