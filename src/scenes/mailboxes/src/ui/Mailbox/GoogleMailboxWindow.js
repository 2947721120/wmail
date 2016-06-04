const React = require('react')
const flux = {
  mailbox: require('../../stores/mailbox'),
  google: require('../../stores/google'),
  settings: require('../../stores/settings')
}
const {
  remote: {shell}, ipcRenderer
} = window.nativeRequire('electron')
const URL = window.nativeRequire('url')
const mailboxDispatch = require('../Dispatch/mailboxDispatch')
const TimerMixin = require('react-timer-mixin')
const {WebView} = require('../../Components')

module.exports = React.createClass({
  displayName: 'GoogleMailboxWindow',
  mixins: [TimerMixin],
  propTypes: {
    mailboxId: React.PropTypes.string.isRequired
  },

  /* **************************************************************************/
  // Lifecycle
  /* **************************************************************************/

  componentWillMount () {
    ipcRenderer.send('prepare-webview-session', {
      partition: 'persist:' + this.props.mailboxId
    })
  },

  componentDidMount () {
    // Stores
    flux.mailbox.S.listen(this.mailboxesChanged)

    // Handle dispatch events
    mailboxDispatch.on('devtools', this.handleOpenDevTools)
    mailboxDispatch.on('refocus', this.handleRefocus)
    mailboxDispatch.on('openMessage', this.handleOpenMessage)

    // Autofocus on the first run
    if (this.state.isActive) {
      this.setTimeout(() => { this.refs.browser.focus() })
    }
  },

  componentWillUnmount () {
    // Stores
    flux.mailbox.S.unlisten(this.mailboxesChanged)

    // Handle dispatch events
    mailboxDispatch.off('devtools', this.handleOpenDevTools)
    mailboxDispatch.off('refocus', this.handleRefocus)
    mailboxDispatch.off('openMessage', this.handleOpenMessage)
  },

  /* **************************************************************************/
  // Data lifecycle
  /* **************************************************************************/

  getInitialState (props = this.props) {
    const mailboxStore = flux.mailbox.S.getState()
    const mailbox = mailboxStore.getMailbox(props.mailboxId)
    return {
      mailbox: mailbox,
      isActive: mailboxStore.activeMailboxId() === props.mailboxId,
      browserSrc: mailbox.url
    }
  },

  componentWillReceiveProps (nextProps) {
    if (this.props.mailboxId !== nextProps.mailboxId) {
      ipcRenderer.send('prepare-webview-session', {
        partition: 'persist:' + nextProps.mailboxId
      })
      this.setState(this.getInitialState(nextProps))
    }
  },

  mailboxesChanged (store) {
    const mailbox = store.getMailbox(this.props.mailboxId)
    const zoomChanged = this.state.mailbox.zoomFactor !== mailbox.zoomFactor
    this.setState({
      mailbox: mailbox,
      isActive: store.activeMailboxId() === this.props.mailboxId,
      browserSrc: mailbox.url
    })
    if (zoomChanged) {
      this.refs.browser.send('zoom-factor-set', { value: this.state.mailbox.zoomFactor })
    }
  },

  /* **************************************************************************/
  // Dispatcher Events
  /* **************************************************************************/

  /**
  * Handles the inspector dispatch event
  * @param evt: the event that fired
  */
  handleOpenDevTools (evt) {
    if (evt.mailboxId === this.props.mailboxId) {
      this.refs.browser.openDevTools()
    }
  },

  /**
  * Handles refocusing the mailbox
  * @param evt: the event that fired
  */
  handleRefocus (evt) {
    if (evt.mailboxId === this.props.mailboxId || (!evt.mailboxId && this.state.isActive)) {
      this.setTimeout(() => { this.refs.browser.focus() })
    }
  },

  /* **************************************************************************/
  // Browser Events : Dispatcher
  /* **************************************************************************/

  /**
  * Dispatches browser IPC messages to the correct call
  * @param evt: the event that fired
  */
  dispatchBrowserIPCMessage (evt) {
    switch (evt.channel.type) {
      case 'page-click': this.handleBrowserPageClick(evt); break
      case 'js-new-window': this.handleBrowserJSNewWindow(evt); break
      default:
    }
  },

  /* **************************************************************************/
  // Browser Events
  /* **************************************************************************/

  /**
  * Handles a new window open request
  * @param evt: the event
  * @param webview: the webview element the event came from
  */
  handleBrowserOpenNewWindow (evt) {
    const url = URL.parse(evt.url, true)
    let mode = 'external'
    if (url.host === 'inbox.google.com') {
      mode = 'source'
    } else if (url.host === 'mail.google.com') {
      if (url.query.ui === '2') {
        mode = 'tab'
      } else {
        mode = 'source'
      }
    }

    switch (mode) {
      case 'external':
        shell.openExternal(evt.url, { activate: !flux.settings.S.getState().os.openLinksInBackground })
        break
      case 'source':
        this.setState({ browserSrc: evt.url })
        break
      case 'tab':
        ipcRenderer.send('new-window', { partition: this.refs.browser.partition, url: evt.url })
        break
    }
  },

  /**
  * Handles the Browser DOM becoming ready
  */
  handleBrowserDomReady () {
    // Push the settings across
    this.refs.browser.send('zoom-factor-set', { value: this.state.mailbox.zoomFactor })
    this.refs.browser.send('start-spellcheck', {
      enabled: flux.settings.S.getState().language.spellcheckerEnabled
    })
  },

  /**
  * Handles a browser receiving a click in the window
  * @param evt: the event that fired
  */
  handleBrowserPageClick (evt) {
    if (!flux.google.S.getState().hasOpenUnreadCountRequest(this.state.mailbox.id)) {
      flux.google.A.syncMailboxUnreadCount(this.state.mailbox.id)
    }
  },

  /**
  * Handles a new JS browser window
  * @Param evt: the event that fired
  */
  handleBrowserJSNewWindow (evt) {
    shell.openExternal(evt.channel.url, { activate: !flux.settings.S.getState().os.openLinksInBackground })
  },

  /**
  * Handles a browser preparing to navigate
  * @param evt: the event that fired
  */
  handleBrowserWillNavigate (evt) {
    // the lamest protection again dragging files into the window
    // but this is the only thing I could find that leaves file drag working
    if (evt.url.indexOf('file://') === 0) {
      this.setState({ browserSrc: this.state.mailbox.url })
    }
  },

  /**
  * Handles a browser focusing
  */
  handleBrowserFocused () {
    mailboxDispatch.focused(this.props.mailboxId)
  },

  /**
  * Handles a browser un-focusing
  */
  handleBrowserBlurred () {
    mailboxDispatch.blurred(this.props.mailboxId)
  },

  /* **************************************************************************/
  // Rendering
  /* **************************************************************************/

  /**
  * Renders the app
  */
  render () {
    if (!this.state.mailbox) { return false }

    const className = [
      'mailbox-window',
      this.state.isActive ? 'active' : undefined
    ].filter((c) => !!c).join(' ')

    return (
      <WebView
        ref='browser'
        preload='../platform/webviewInjection/google'
        partition={'persist:' + this.props.mailboxId}
        src={this.state.browserSrc}
        className={className}
        domReady={this.handleBrowserDomReady}
        ipcMessage={this.dispatchBrowserIPCMessage}
        newWindow={this.handleBrowserOpenNewWindow}
        willNavigate={this.handleBrowserWillNavigate}
        focus={this.handleBrowserFocused}
        blur={this.handleBrowserBlurred}
      />
    )
  }
})
