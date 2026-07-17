# Database Schema

PostPilot AI stores user-owned social media workspace data in MongoDB through Mongoose models.

## User

Collection: `users`

- `name`
- `email`
- `password`
- `avatar`
- `isActive`
- `timestamps`

Purpose: authentication identity and profile basics.

## UserSettings

Collection: `usersettings`

- `userId`
- `theme`
- `emailNotifications`
- `campaignReminders`
- `weeklyDigest`
- `productUpdates`
- `timestamps`

Purpose: dashboard preferences and notification settings.

## AIHistory

Collection: `aihistories`

- `userId`
- `type`
- `input`
- `output`
- `metadata`
- `timestamps`

Purpose: generated captions, hashtags, CTA suggestions, thumbnails, and fallback metadata.

## BrandKit

Collection: `brandkits`

- `createdBy`
- `brandName`
- `description`
- `industry`
- `website`
- `targetAudience`
- `colors`
- `toneOfVoice`
- `logoUrl`
- `timestamps`

Purpose: brand voice and visual context for AI generation.

## Post

Collection: `posts`

- `title`
- `caption`
- `platform`
- `media`
- `scheduledAt`
- `status`
- `publishedAt`
- `externalPostId`
- `publishError`
- `createdBy`
- `timestamps`

Purpose: drafts, scheduled posts, published posts, and Zernio publish status.

## ConnectedAccount

Collection: `connectedaccounts`

- `userId`
- `provider`
- `providerAccountId`
- `accountName`
- `status`
- `accessTokenEncrypted`
- `refreshTokenEncrypted`
- `tokenExpiresAt`
- `scopes`
- `timestamps`

Purpose: secure social account connection records for LinkedIn, Instagram, X, and Facebook.

## Campaign

Collection: `campaigns`

- `title`
- `objective`
- `audience`
- `durationDays`
- `platforms`
- `ideas`
- `createdBy`
- `timestamps`

Nested `ideas` include day, date, platform, format, title, caption, hashtags, CTA, best time, status, and created post reference.

## Competitor

Collection: `competitors`

- `createdBy`
- `name`
- `website`
- `industry`
- `platforms`
- `positioning`
- `strengths`
- `notes`
- `timestamps`

Purpose: competitor profiles and market context for trend intelligence.

## AgentChatSession

Collection: `agentchatsessions`

- `createdBy`
- `title`
- `messages`
- `timestamps`

Purpose: AI Agent conversation history.

## CopilotChatSession

Collection: `copilotchatsessions`

- `createdBy`
- `title`
- `messages`
- `timestamps`

Purpose: AI Content Copilot conversation history and action traces.

## AutomationWorkflow

Collection: `automationworkflows`

- `createdBy`
- `name`
- `description`
- `status`
- `trigger`
- `actions`
- `lastRunAt`
- `nextRunAt`
- `runCount`
- `lastRunStatus`
- `lastRunMessage`
- `timestamps`

Purpose: scheduled AI content workflows with generate, schedule, publish, and notify actions.
