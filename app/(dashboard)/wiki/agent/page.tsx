import { Suspense } from "react";
import { WikiAgentClient } from "./wiki-agent-client";

export default function WikiAgentPage() {
  return (
    <Suspense>
      <WikiAgentClient />
    </Suspense>
  );
}
