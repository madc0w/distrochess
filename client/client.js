moment = require("moment");

Meteor.startup(function() {
	Meteor.subscribe("userData");
	Meteor.subscribe("gameAssignments");
});
