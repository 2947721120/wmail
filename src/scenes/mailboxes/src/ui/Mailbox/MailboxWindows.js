'use strict'

const React = require('react')
const flux = {
  mailbox: require('../../stores/mailbox')
}
const GoogleMailboxWindow = require('./GoogleMailboxWindow')
const Welcome = require('../Welcome/Welcome')

module.exports = React.createClass({
  displayName: 'MailboxWindows',

  /* **************************************************************************/
  // Lifecycle
  /* **************************************************************************/

  componentDidMount () {
    flux.mailbox.S.listen(this.mailboxesChanged)
  },

  componentWillUnmount () {
    flux.mailbox.S.unlisten(this.mailboxesChanged)
  },

  /* **************************************************************************/
  // Data lifecycle
  /* **************************************************************************/

  getInitialState () {
    return { mailbox_ids: flux.mailbox.S.getState().mailboxIds() }
  },

  mailboxesChanged (store) {
    this.setState({ mailbox_ids: store.mailboxIds() })
  },

  shouldComponentUpdate (nextProps, nextState) {
    if (!this.state || !nextState) { return true }
    if (this.state.mailbox_ids.length !== nextState.mailbox_ids.length) { return true }

    const mismatch = this.state.mailbox_ids.findIndex((id) => {
      return nextState.mailbox_ids.findIndex((nId) => nId === id) === -1
    }) !== -1
    if (mismatch) { return true }

    return false
  },

  /* **************************************************************************/
  // Rendering
  /* **************************************************************************/

  /**
  * Renders the app
  */
  render () {
    if (this.state.mailbox_ids.length) {
      return (
        <div className='mailboxes'>
          {this.state.mailbox_ids.map((id) => {
            return (<GoogleMailboxWindow mailbox_id={id} key={id} />)
          })}
        </div>
      )
    } else {
      return (
        <div className='mailboxes'>
          <Welcome />
        </div>
      )
    }
  }
})
