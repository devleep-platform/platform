import type { Metadata } from "next";
import { DarkAppShell } from "@/components/layout/DarkAppShell";
import { CloudConnectWizard } from "@/components/lab/CloudConnectWizard";

export const metadata: Metadata = {
  title: "Connect Cloud Account",
  robots: { index: false, follow: false },
};

export default function CloudConnectPage() {
  return (
    <DarkAppShell
      title="Connect cloud account"
      description="Give the lab runner constrained access to provision and validate environments."
    >
      <div className="p-6">
        <CloudConnectWizard />
      </div>
    </DarkAppShell>
  );
}
