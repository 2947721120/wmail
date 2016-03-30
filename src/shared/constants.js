module.exports = Object.freeze({
  APP_ID: 'tombeverley.wmail',

  GITHUB_URL: 'https://github.com/Thomas101/wmail/',
  GITHUB_ISSUE_URL: 'https://github.com/Thomas101/wmail/issues',
  GITHUB_RELEASES_URL: 'http://thomas101.github.io/wmail/download',
  UPDATE_CHECK_URL: 'https://api.github.com/repos/Thomas101/wmail/releases',

  GMAIL_PROFILE_SYNC_MS: 1000 * 60 * 60, // 60 mins
  GMAIL_UNREAD_SYNC_MS: 1000 * 60, // 60 seconds
  GMAIL_NOTIFICATION_SYNC_MS: 1000 * 90, // 90 seconds
  GMAIL_NOTIFICATION_MAX_MESSAGE_AGE_MS: 1000 * 60 * 60, // 1 hour
  GMAIL_NOTIFICATION_MESSAGE_CLEANUP_AGE_MS: 1000 * 60 * 60 * 24, // 1 day

  REFOCUS_MAILBOX_INTERVAL_MS: 300
})
