import { serve } from "inngest/next";
import { inngest } from "@/modules/infrastructure/automation/inngest/client";
import { functions } from "@/modules/infrastructure/automation/inngest/functions";

export const { GET, POST, PUT } = serve({
    client: inngest,
    functions,
});
