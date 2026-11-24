const config = window.__POSTHOG_CONFIG__;
const missingMessage = name => `${name} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${name} is configured`;

if (!config?.apiKey || !config?.host) {
 if (config?.environment !== 'production') {
  console.error(missingMessage(!config?.apiKey ? 'POSTHOG_PROJECT_TOKEN' : 'POSTHOG_HOST'));
 }
} else {
 const script = document.createElement('script');
 script.src = `${config.host.replace(/\/$/, '')}/static/array.js`;
 script.async = true;
 script.onload = () => window.posthog.init(config.apiKey, {api_host: config.host});
 document.head.append(script);
}
