const alt = require('../alt')
const actions = require('./mailboxActions')
const Mailbox = require('shared/Models/Mailbox/Mailbox')
const { GMAIL_NOTIFICATION_MESSAGE_CLEANUP_AGE_MS } = require('shared/constants')
const uuid = require('uuid')
const persistence = {
  mailbox: window.remoteRequire('storage/mailboxStorage'),
  avatar: window.remoteRequire('storage/avatarStorage')
}

const INDEX_KEY = '__index__'
const BLANK_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAAtJREFUCB1jYAACAAAFAAGNu5vzAAAAAElFTkSuQmCC'

class MailboxStore {
  /* **************************************************************************/
  // Lifecycle
  /* **************************************************************************/

  constructor () {
    this.index = []
    this.mailboxes = new Map()
    this.avatars = new Map()
    this.active = null

    /* ****************************************/
    // Fetching Mailboxes
    /* ****************************************/

    /**
    * @return all the mailboxes in order
    */
    this.all = () => {
      return this.ids().map((id) => this.mailboxes.get(id))
    }

    /**
    * @return the ids
    */
    this.ids = () => { return Array.from(this.index) }

    /**
    * @return the mailbox
    */
    this.get = (id) => { return this.mailboxes.get(id) || null }

    /**
    * @return the index of the given mailbox id
    */
    this.indexOf = (id) => { return this.index.findIndex((i) => i === id) }

    /**
    * @return true if it is the first mailbox
    */
    this.isFirst = (id) => { return this.indexOf(id) === 0 }

    /**
    * @return true if it is the last mailbox
    */
    this.isLast = (id) => { return this.indexOf(id) === this.index.length - 1 }

    /**
    * @return true if the store has this item
    */
    this.has = (id) => { return this.indexOf(id) !== -1 }

    /* ****************************************/
    // Avatar
    /* ****************************************/

    this.getAvatar = (id) => { return this.avatars.get(id) || BLANK_IMAGE }

    /* ****************************************/
    // Active
    /* ****************************************/

    /**
    * @return the id of the active mailbox
    */
    this.activeId = () => { return this.active }

    /**
    * @return the active mailbox
    */
    this.active = () => { return this.mailboxes.get(this.active) }

    /* ****************************************/
    // Aggregated queries
    /* ****************************************/

    /**
    * @return the total amount of unread items
    */
    this.totalUnreadCount = () => {
      return this.all().reduce((acc, mailbox) => {
        if (mailbox && !isNaN(mailbox.unread)) {
          acc += mailbox.unread
        }
        return acc
      }, 0)
    }

    /**
    * @return the total amount of unread items taking mailbox settings into account
    */
    this.totalUnreadCountForAppBadge = () => {
      return this.all().reduce((acc, mailbox) => {
        if (mailbox && !isNaN(mailbox.unread) && mailbox.unreadCountsTowardsAppUnread) {
          acc += mailbox.unread
        }
        return acc
      }, 0)
    }

    /**
    * @return all the unread messages for the app badge
    */
    this.unreadMessagesForAppBadge = () => {
      return this.all().reduce((acc, mailbox) => {
        if (mailbox && mailbox.unreadCountsTowardsAppUnread) {
          if (mailbox.google) {
            acc[mailbox.id] = Object.assign({}, mailbox.google.unreadMessages)
          }
        }
        return acc
      }, {})
    }

    /* ****************************************/
    // Listeners
    /* ****************************************/

    this.bindListeners({
      handleLoad: actions.LOAD,
      handleCreate: actions.CREATE,
      handleRemove: actions.REMOVE,
      handleUpdate: actions.UPDATE,
      handleSetCustomAvatar: actions.SET_CUSTOM_AVATAR,

      handleChangeActive: actions.CHANGE_ACTIVE,

      handleMoveUp: actions.MOVE_UP,
      handleMoveDown: actions.MOVE_DOWN,

      handleUpdateGoogleConfig: actions.UPDATE_GOOGLE_CONFIG,
      handleSetGoogleUnreadMessageIds: actions.SET_GOOGLE_UNREAD_MESSAGE_IDS,
      handleUpdateGoogleUnread: actions.UPDATE_GOOGLE_UNREAD,
      handleSetGoogleUnreadNotificationsShown: actions.SET_GOOGLE_UNREAD_NOTIFICATIONS_SHOWN
    })
  }

  /* **************************************************************************/
  // Handlers CRUD
  /* **************************************************************************/

  /**
  * Loads the storage from disk
  */
  handleLoad () {
    // Load
    const allAvatars = persistence.avatar.allStrings()
    const allMailboxes = persistence.mailbox.allItems()
    this.index = []

    // Mailboxes
    Object.keys(allMailboxes).forEach((id) => {
      if (id === INDEX_KEY) {
        this.index = allMailboxes[INDEX_KEY]
      } else {
        this.mailboxes.set(id, new Mailbox(id, allMailboxes[id]))
      }
    })
    this.active = this.index[0] || null

    // Avatars
    Object.keys(allAvatars).forEach((id) => {
      this.avatars.set(id, allAvatars[id])
    })
  }

  /**
  * Creates a new mailbox
  * @param id: the id of the mailbox
  * @param data: the data to seed the mailbox with
  */
  handleCreate ({id, data}) {
    persistence.mailbox.setItem(id, data)
    this.mailboxes.set(id, new Mailbox(id, data))
    this.index.push(id)
    persistence.mailbox.setItem(INDEX_KEY, this.index)
    this.active = id
  }

  /**
  * Removes an item
  * @param id: the id to remove
  */
  handleRemove ({id}) {
    const wasActive = this.active === id
    this.index = this.index.filter((i) => i !== id)
    persistence.mailbox.setItem(INDEX_KEY, this.index)
    this.mailboxes.delete(id)
    persistence.mailbox.removeItem(id)

    if (wasActive) {
      this.active = this.index[0]
    }
  }

  /**
  * Handles a mailbox updating
  * @param id: the id of the tem
  * @param updates: the updates to merge in
  */
  handleUpdate ({id, updates}) {
    const mailboxJS = this.mailboxes.get(id).changeData(updates)
    persistence.mailbox.setItem(id, mailboxJS)
    this.mailboxes.set(id, new Mailbox(id, mailboxJS))
  }

  /**
  * Handles setting a custom avatar
  * @param: id the id of the mailbox
  * @param b64Image: a base64 version of the image
  */
  handleSetCustomAvatar ({id, b64Image}) {
    const mailbox = this.mailboxes.get(id)
    let data = mailbox.cloneData()
    if (b64Image) {
      const imageId = uuid.v4()
      data.customAvatar = imageId
      persistence.avatar.setString(imageId, b64Image)
      this.avatars.set(imageId, b64Image)
    } else {
      if (data.customAvatar) {
        persistence.avatar.removeItem(data.customAvatar)
        this.avatars.delete(data.customAvatar)
        delete data.customAvatar
      }
    }
    persistence.mailbox.setItem(id, data)
    this.mailboxes.set(id, new Mailbox(id, data))
  }

  /* **************************************************************************/
  // Handlers : Active & Ordering
  /* **************************************************************************/

  /**
  * Handles the active mailbox changing
  * @param id: the id of the mailbox
  */
  handleChangeActive ({id}) {
    this.active = id
  }

  /**
  * Handles moving the given mailbox id up
  */
  handleMoveUp ({id}) {
    const mailboxIndex = this.index.findIndex((i) => i === id)
    if (mailboxIndex !== -1 && mailboxIndex !== 0) {
      this.index.splice(mailboxIndex - 1, 0, this.index.splice(mailboxIndex, 1)[0])
      persistence.mailbox.setItem(INDEX_KEY, this.index)
    }
  }

  /**
  * Handles moving the given mailbox id down
  */
  handleMoveDown ({id}) {
    const mailboxIndex = this.index.findIndex((i) => i === id)
    if (mailboxIndex !== -1 && mailboxIndex < this.index.length) {
      this.index.splice(mailboxIndex + 1, 0, this.index.splice(mailboxIndex, 1)[0])
      persistence.mailbox.setItem(INDEX_KEY, this.index)
    }
  }

  /* **************************************************************************/
  // Handlers : Google
  /* **************************************************************************/

  /**
  * Handles the google config updating
  * @param id: the id of the tem
  * @param updates: the updates to merge in
  */
  handleUpdateGoogleConfig ({id, updates}) {
    const data = this.mailboxes.get(id).cloneData()
    data.googleConf = Object.assign(data.googleConf || {}, updates)
    persistence.mailbox.setItem(id, data)
    this.mailboxes.set(id, new Mailbox(id, data))
  }

  /**
  * Marks the unread messages as seen & also marks any un-included messages
  * as read
  * @param id: the id of mailbox
  * @param messageIds: the complete lis of unread message ids
  */
  handleSetGoogleUnreadMessageIds ({id, messageIds}) {
    const data = this.mailboxes.get(id).cloneData()
    data.googleUnreadMessages = data.googleUnreadMessages || {}

    // Run through all the messages google has given us and mark them as unread
    // and also mark them as seen
    const now = new Date().getTime()
    const messageIdIndex = {}
    messageIds.forEach((messageId) => {
      messageIdIndex[messageId] = true
      if (data.googleUnreadMessages[messageId]) {
        data.googleUnreadMessages[messageId] = Object.assign(
          data.googleUnreadMessages[messageId],
          { seen: now, unread: true }
        )
      } else {
        data.googleUnreadMessages[messageId] = {
          recordCreated: now, seen: now, unread: true
        }
      }
    })

    // If we haven't seen a message from google, then it must be read, but
    // we might want to keep the record around to prevent duplicate notificiations
    Object.keys(data.googleUnreadMessages).forEach((messageId) => {
      if (!messageIdIndex[messageId]) {
        data.googleUnreadMessages[messageId].unread = false
      }
    })

    persistence.mailbox.setItem(id, data)
    this.mailboxes.set(id, new Mailbox(id, data))
  }

  /**
  * Merges the google unread items and removes any flags for updated ites
  * @param id: the id of the mailbox
  * @param messageIds: the ids of the messages
  * @param updates: the updates to apply
  */
  handleUpdateGoogleUnread ({id, messageIds, updates}) {
    const data = this.mailboxes.get(id).cloneData()
    data.googleUnreadMessages = data.googleUnreadMessages || {}

    // Add the update
    const now = new Date().getTime()
    messageIds.forEach((messageId) => {
      if (data.googleUnreadMessages[messageId]) {
        data.googleUnreadMessages[messageId] = Object.assign(
          data.googleUnreadMessages[messageId],
          { seen: now },
          updates)
      } else {
        data.googleUnreadMessages[messageId] = Object.assign({
          recordCreated: now, seen: now
        }, updates)
      }
    })

    // Clean up old records
    data.googleUnreadMessages = Object.keys(data.googleUnreadMessages).reduce((acc, messageId) => {
      const rec = data.googleUnreadMessages[messageId]
      if (now - rec.seen < GMAIL_NOTIFICATION_MESSAGE_CLEANUP_AGE_MS) {
        acc[messageId] = rec
      }
      return acc
    }, {})

    persistence.mailbox.setItem(id, data)
    this.mailboxes.set(id, new Mailbox(id, data))
  }

  /**
  * Sets that the given thread ids have sent notifications
  * @param id: the id of the mailbox
  * @param messageId: the id of the message to mark
  */
  handleSetGoogleUnreadNotificationsShown ({id, messageIds}) {
    const data = this.mailboxes.get(id).cloneData()
    data.googleUnreadMessages = data.googleUnreadMessages || {}

    const now = new Date().getTime()
    messageIds.forEach((messageId) => {
      if (data.googleUnreadMessages[messageId]) {
        data.googleUnreadMessages[messageId].notified = now
        data.googleUnreadMessages[messageId].seen = now
      }
    })

    // Clean up old records
    data.googleUnreadMessages = Object.keys(data.googleUnreadMessages).reduce((acc, messageId) => {
      const rec = data.googleUnreadMessages[messageId]
      if (now - rec.seen < GMAIL_NOTIFICATION_MESSAGE_CLEANUP_AGE_MS) {
        acc[messageId] = rec
      }
      return acc
    }, {})

    persistence.mailbox.setItem(id, data)
    this.mailboxes.set(id, new Mailbox(id, data))
  }

}

module.exports = alt.createStore(MailboxStore, 'MailboxStore')
