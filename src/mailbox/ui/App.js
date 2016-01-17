import "./app.less"

const React = require('react')
const flux = {
	mailbox : require('../stores/mailbox'),
	google : require('../stores/google')
}
const GoogleMailboxWindow = require('./Mailbox/GoogleMailboxWindow')
const MailboxListItem = require('./Sidelist/MailboxListItem')
const MailboxListItemAdd = require('./Sidelist/MailboxListItemAdd')
const Welcome = require('./Welcome/Welcome')
const ipc = nativeRequire('electron').ipcRenderer;
const remote = nativeRequire('remote');
const app = remote.require('app');

module.exports = React.createClass({
	displayName:'App',
	/***************************************************************************/
	// Lifecycle
	/***************************************************************************/

  componentDidMount: function() {
  	flux.mailbox.S.listen(this.mailboxesChanged)
  	flux.google.A.startPollSync()
  	flux.google.A.syncAllProfiles()
  	flux.google.A.syncAllUnreadCounts()

  	document.addEventListener('drop', this.killEvent, false)
		document.addEventListener('dragover', this.killEvent, false)
		document.addEventListener('dragover', this.killEvent, false)
		ipc.on('switch-mailbox', this.ipcChangeActiveMailbox)
		ipc.on('auth-google-complete', this.ipcAuthMailboxSuccess)
		ipc.on('auth-google-error', this.ipcAuthMailboxFailure)
  },

  componentWillUnmount: function() {
  	flux.mailbox.S.unlisten(this.mailboxesChanged)
  	flux.google.A.stopPollSync()

  	document.removeEventListener('drop', this.killEvent)
		document.removeEventListener('dragover', this.killEvent)
		document.removeEventListener('dragover', this.killEvent)
		ipc.off('switch-mailbox', this.ipcChangeActiveMailbox)
		ipc.off('auth-google-complete', this.ipcAuthMailboxSuccess)
		ipc.off('auth-google-error', this.ipcAuthMailboxFailure)
  },

	/***************************************************************************/
	// Data lifecycle
	/***************************************************************************/

	/**
	* Generates the mailbox info for the state and also pipes
	* the mailboxes up to the main thread
	* @param store=mailbox store: the mailbox store to use
	*/
	generateMailboxInfo: function(store=flux.mailbox.S.getState()) {
		// Tell main thread about our mailboxes
		ipc.send('mailboxes-changed', {
  		mailboxes : store.all().map(mailbox => {
				return { id:mailbox.id, name:mailbox.name, email:mailbox.email }
			})
  	})

		// Tell the app about our unread count
		const unread = store.totalUnreadCount()
		app.dock.setBadge(unread ? unread.toString() : '')

		// Return the state update
  	return { mailbox_ids:store.ids() }
	},

	getInitialState: function() {
		return this.generateMailboxInfo()
  },

  mailboxesChanged: function(store) {
  	this.setState(this.generateMailboxInfo(store))
  },

  shouldComponentUpdate: function(nextProps, nextState) {
  	if (!this.state || !nextState) { return true }
  	if (this.state.mailbox_ids.length !== nextState.mailbox_ids.length) { return true }
  	if (this.state.mailbox_ids.find((id, i) => id !== nextState.mailbox_ids[i].id)) { return true }

  	return false
  },

  /***************************************************************************/
	// Events
	/***************************************************************************/

	/**
	* Stops an event propagating
	*/
	killEvent: function(evt) { evt.preventDefault(); },

	/**
	* Receives a change mailbox event
	* @param evt: the event that fired
	* @param req: the request that came through
	*/
	ipcChangeActiveMailbox: function(evt, req) {
		flux.mailbox.A.changeActive(req.mailboxId)
	},

	/**
	* Receives a mailbox success event
	* @param evt: the event that fired
	* @param req: the request that came through
	*/
	ipcAuthMailboxSuccess: function(evt, req) {
		flux.google.A.authMailboxSuccess(req)
	},

	/**
	* Receives a mailbox failure event
	* @param evt: the event that fired
	* @param req: the request that came through
	*/
	ipcAuthMailboxFailure: function(evt, req) {
		flux.google.A.authMailboxFailure(req)
	},


	/***************************************************************************/
	// Rendering
	/***************************************************************************/

	/**
	* Renders the mailbox list
	* @return jsx elements
	*/
	renderMailboxList: function() {
		let mailboxItems = []
		if (this.state.mailbox_ids.length) {
			mailboxItems = this.state.mailbox_ids.map((id, index) => {
				return <MailboxListItem mailbox_id={id} key={id} index={index} />
			})
		}

		mailboxItems.push(<MailboxListItemAdd key="__add__" />)
		return mailboxItems
	},

	/**
	* Renders the mailboxes
	* @return jsx elements
	*/
	renderMailboxWindows: function() {
		if (this.state.mailbox_ids.length) {
			return this.state.mailbox_ids.map(id => {
				return <GoogleMailboxWindow mailbox_id={id} key={id} />
			})
		} else {
			return <Welcome />
		}
	},

	/**
	* Renders the app
	*/
	render: function() {
		return (
			<div>
				<div className="master">
					<div className="mailbox-list">
						{this.renderMailboxList()}
					</div>
				</div>
		    <div className="detail">
		      <div className="mailboxes">
		      	{this.renderMailboxWindows()}
		      </div>
		    </div>
		  </div>
		)
	}
})