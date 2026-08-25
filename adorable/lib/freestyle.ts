import { Freestyle } from "freestyle";

/**
 * The Freestyle client. VMs are the only primitive Adorable uses: there is no
 * hosted git and no serverless deployment, so a project *is* its VMs.
 */
export const freestyle = new Freestyle({
  apiKey: process.env["FREESTYLE_API_KEY"],
});
