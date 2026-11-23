import {handleRequest} from '../server.js';

// Single entry point for dynamic Seasons routes on Vercel.
// Imports the same allowlisted private routes used by the local Node server.
// No secrets are available to the browser. If auth is not configured, Studio fails closed.
export default async function handler(request,response){
 return handleRequest(request,response);
}
