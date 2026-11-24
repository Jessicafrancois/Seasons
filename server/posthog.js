import { PostHog } from 'posthog-node';

const requiredVariables = ['POSTHOG_PROJECT_TOKEN', 'POSTHOG_HOST'];
const missingVariables = requiredVariables.filter(name => !process.env[name]);

if (missingVariables.length && process.env.NODE_ENV !== 'production') {
 for (const name of missingVariables) {
  console.warn(`${name} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${name} is configured`);
 }
}

export const posthog = missingVariables.length ? null : new PostHog(process.env.POSTHOG_PROJECT_TOKEN, {
 host: process.env.POSTHOG_HOST,
 enableExceptionAutocapture: true,
 logs: { serviceName: 'seasons-web' },
 flushAt: 1,
 flushInterval: 0,
 requestTimeout: 2000,
 fetchRetryCount: 0
});

export const posthogLog = posthog?.logger ?? null;
