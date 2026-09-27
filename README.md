# property-app-backend

Run `npm run worker:email` as a separate process with Redis and SMTP environment variables configured to deliver queued email notifications. The API only enqueues jobs; it does not send email in request handlers.

Analytics events are append-only operational data, indexed by event, owner, target, and time. The initial retention policy is 12 months; schedule a monthly database job to delete `AnalyticsEvent` rows older than 12 months after aggregate/report requirements are confirmed.