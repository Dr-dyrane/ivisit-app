import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleDemoDispatchReplyRequest } from "./handler.ts";

serve(handleDemoDispatchReplyRequest);
