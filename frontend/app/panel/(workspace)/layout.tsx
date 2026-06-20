import type { ReactNode } from "react";
import { PanelDataProvider } from "@/components/panel/panel-data";
import { PanelShell } from "@/components/panel/panel-shell";

export default function PanelWorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <PanelDataProvider>
      <PanelShell>{children}</PanelShell>
    </PanelDataProvider>
  );
}