import TrackPageClient from "./TrackPageClient";

export function generateStaticParams() {
  return [{ slug: "__shell" }];
}

export default function TrackPage() {
  return <TrackPageClient />;
}
