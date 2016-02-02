const alt = require('../alt')

class SettingsActions {
  /* **************************************************************************/
  // Loading
  /* **************************************************************************/

  /**
  * Indicates the store to drop all data and load from disk
  */
  load () { return {} }

  /* **************************************************************************/
  // Updates
  /* **************************************************************************/

  /**
  * Merges the updates in
  * @param updates: an object oto merge into settings
  */
  mergeUpdates (updates) {
    return { updates: updates }
  }

  /* **************************************************************************/
  // Proxy Server
  /* **************************************************************************/

  /**
  * Enables the proxy server
  * @param host: the host
  * @param port: the port
  */
  enableProxyServer (host, port) {
    if (host) {
      if (host.indexOf('://') === -1) {
        host = 'http://' + host
      }
    }
    if (port) {
      port = port.replace(/[^0-9\\.]+/g, '')
    }
    this.setProxyServer({ host: host, port: port, enabled: true })
    return {}
  }

  /**
  * Disables the proxy server
  */
  disableProxyServer () {
    this.setProxyServer({ enabled: false })
    return {}
  }

  setProxyServer (info) { return info }

  /* **************************************************************************/
  // OS Level settings
  /* **************************************************************************/

  /**
  * @param show: true to show the titlebar, false otherwise
  */
  setShowTitlebar (show) {
    return this.mergeUpdates({ showTitlebar: show })
  }

  /**
  * @param show: true to show the badge, false otherwise
  */
  setShowAppBadge (show) {
    return this.mergeUpdates({ showAppBadge: show })
  }

  /* **************************************************************************/
  // Spell checker
  /* **************************************************************************/

  /**
  * @param enabled: true to enable the spell checker, false otherwise
  */
  setEnableSpellchecker (enabled) {
    return this.mergeUpdates({ spellcheckerEnabled: enabled })
  }

}

module.exports = alt.createActions(SettingsActions)
