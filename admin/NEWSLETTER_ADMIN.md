# Newsletter Management - Admin Panel

This document describes the admin panel features for managing the newsletter system.

## Overview

The newsletter system has two new admin pages for managing subscriber lists and sending broadcasts:

1. **Newsletter Subscribers** - View and manage all newsletter subscribers
2. **Newsletter Broadcasts** - Create and send newsletter campaigns

## Features

### Newsletter Subscribers Page

**Location:** `/admin/newsletter-subscribers`

**Capabilities:**
- View all newsletter subscribers with pagination (20 per page)
- Filter by subscription status (subscribed, unsubscribed, bounced)
- Filter by source (public, authenticated users)
- Search by email address
- Export subscriber list as CSV
- View subscription date and last broadcast date

**Features:**
- Real-time status badges
- Color-coded subscriber sources
- Sortable data table
- Responsive design for mobile

### Newsletter Broadcasts Page

**Location:** `/admin/newsletter-broadcasts`

**Capabilities:**
- View all broadcast campaigns with status
- Create new broadcasts with title and content
- Select target audience:
  - All subscribers
  - Authenticated users only
  - Public subscribers only
- View delivery statistics:
  - Total recipients
  - Successfully sent count
  - Failed count
  - Pending count
- View broadcast content details
- Track broadcast status (draft, sending, sent, failed)

**Features:**
- Rich form for creating campaigns
- Real-time status tracking
- Export-ready statistics
- Detailed broadcast logs
- Modal view for detailed statistics

## API Endpoints Used

The admin pages communicate with the following backend API endpoints:

### Subscribers
- `GET /api/newsletter/subscribers` - List all subscribers with filters and pagination
  - Query params: `page`, `limit`, `status`, `source`, `search`

### Broadcasts
- `GET /api/newsletter/broadcasts` - List all broadcasts
- `GET /api/newsletter/broadcast/:id` - Get broadcast details and delivery stats
- `POST /api/newsletter/broadcast` - Create and send a new broadcast
  - Body: `{ title, content, segmentationFilter }`

## Segmentation Filters

The system supports three types of audience segmentation:

1. **All** - Send to all subscribers (both public and authenticated)
2. **Users Only** - Send only to authenticated users
3. **Public Only** - Send only to public subscribers

## Subscriber Statuses

Subscribers can have the following statuses:

- **Subscribed** - Active subscriber
- **Unsubscribed** - Manually unsubscribed via one-click link
- **Bounced** - Email delivery failed (SMTP error)

## Background Processing

Broadcasts are processed by the background worker service which:
- Polls every 5 minutes for pending broadcasts
- Processes up to 50 emails per cycle
- Automatically retries failed deliveries (max 5 attempts)
- Updates delivery status in real-time

## Security

- All admin endpoints require authentication (`authenticateToken` middleware)
- Admin-only routes require `requireAdmin` middleware
- Email addresses are validated before storage
- Unsubscribe links use UUID tokens for security

## Integration

### Adding to Admin Sidebar

To add these pages to your admin menu, update your admin navigation/routing:

```jsx
import NewsletterSubscribersPage from './pages/NewsletterSubscribersPage';
import NewsletterBroadcastPage from './pages/NewsletterBroadcastPage';

// Add to your routing configuration:
<Route path="/admin/newsletter-subscribers" element={<NewsletterSubscribersPage />} />
<Route path="/admin/newsletter-broadcasts" element={<NewsletterBroadcastPage />} />
```

### User Profile Integration

Users can now manage their newsletter preferences in their account settings:
- Preferences tab with:
  - Newsletter subscription toggle
  - Email notifications toggle
  - Preference save button

## User Experience

### For Subscribers

Users can:
1. Subscribe from homepage or deals page
2. Manage preferences in their account profile
3. Unsubscribe via one-click link in every newsletter email

### For Admins

Admins can:
1. View subscriber analytics
2. Create targeted campaigns
3. Monitor delivery status
4. Export subscriber lists
5. See detailed broadcast statistics

## Technical Stack

- **Backend:** Node.js + Express
- **Database:** PostgreSQL
- **Frontend Admin:** React + CSS
- **API Communication:** Axios
- **Email Service:** Nodemailer

## Future Enhancements

Potential features for future development:
- Scheduled broadcasts (send at specific time)
- Template library for campaigns
- A/B testing support
- Advanced subscriber segmentation
- Automated campaign workflows
- Subscriber activity tracking
- Analytics dashboard
- Email preview functionality
