import 'flexboxgrid'

const React = require('react')

/* eslint-disable react/prop-types */

module.exports = React.createClass({
  displayName: 'FlexboxColSM',

  render: function () {
    return (
      <div
        {...this.props}
        className={'col-sm-' + this.props.size + (this.props.className ? ' ' + this.props.className : '')}>
        {this.props.children}
      </div>
    )
  }
})
