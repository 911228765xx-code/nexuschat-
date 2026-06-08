// Validate Turnstile keys are configured
const siteKey = process.env.VITE_TURNSTILE_SITE_KEY;
const secretKey = process.env.TURNSTILE_SECRET_KEY;

console.log('VITE_TURNSTILE_SITE_KEY set:', !!siteKey && siteKey.length > 5);
console.log('TURNSTILE_SECRET_KEY set:', !!secretKey && secretKey.length > 5);

if (!siteKey || siteKey.length <= 5) {
  console.error('ERROR: VITE_TURNSTILE_SITE_KEY is not configured');
  process.exit(1);
}
if (!secretKey || secretKey.length <= 5) {
  console.error('ERROR: TURNSTILE_SECRET_KEY is not configured');
  process.exit(1);
}
console.log('Both Turnstile keys are configured OK');
