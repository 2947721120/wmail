const React = require('react')
const { SelectField, MenuItem, Toggle } = require('material-ui')
const GoogleInboxAccountSettings = require('./Accounts/GoogleInboxAccountSettings')
const GoogleMailAccountSettings = require('./Accounts/GoogleMailAccountSettings')
const flux = {
  mailbox: require('../../stores/mailbox')
}

/* eslint-disable react/prop-types */

module.exports = React.createClass({
  displayName: 'AccountSettings',

  /* **************************************************************************/
  // Lifecycle
  /* **************************************************************************/

  componentDidMount: function () {
    flux.mailbox.S.listen(this.mailboxesChanged)
  },

  componentWillUnmount: function () {
    flux.mailbox.S.unlisten(this.mailboxesChanged)
  },

  /* **************************************************************************/
  // Data lifecycle
  /* **************************************************************************/

  getInitialState: function () {
    const store = flux.mailbox.S.getState()
    const all = store.all()
    return {
      mailboxes: all,
      selected: all[0]
    }
  },

  mailboxesChanged: function (store) {
    const all = store.all()
    if (this.state.selected) {
      this.setState({ mailboxes: all, selected: store.get(this.state.selected.id) })
    } else {
      this.setState({ mailboxes: all, selected: all[0] })
    }
  },

  /* **************************************************************************/
  // User Interaction
  /* **************************************************************************/

  handleAccountChange: function (evt, index, mailboxId) {
    this.setState({ selected: flux.mailbox.S.getState().get(mailboxId) })
  },

  handleShowUnreadBadgeChange: function (evt, toggled) {
    flux.mailbox.A.update(this.state.selected.id, {
      showUnreadBadge: toggled
    })
  },

  /* **************************************************************************/
  // Rendering
  /* **************************************************************************/

  /**
  * Renders the app
  */
  render: function () {
    let content
    if (this.state.selected) {
      if (this.state.selected.type === flux.mailbox.M.TYPE_GINBOX) {
        content = <GoogleInboxAccountSettings mailbox={this.state.selected} />
      } else if (this.state.selected.type === flux.mailbox.M.TYPE_GMAIL) {
        content = <GoogleMailAccountSettings mailbox={this.state.selected} />
      }
    } else {
      content = (<div><small>No accounts available</small></div>)
    }
    
    return (
      <div {...this.props}>
        <SelectField
          value={this.state.selected ? this.state.selected.id : undefined}
          style={{ width: '100%' }}
          onChange={this.handleAccountChange}>
          {
            this.state.mailboxes.map(m => {
              return (
                <MenuItem
                  value={m.id}
                  key={m.id}
                  primaryText={(m.email || m.name || m.id) + ' (' + m.typeName + ')' } />
                )
            })
          }
        </SelectField>
        <br />
        <br />
        {content}
      </div>
    )
  }
})
