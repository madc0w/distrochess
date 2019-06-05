moment = require("moment");

templateName = new ReactiveVar();
isNeedToSignIn = new ReactiveVar(false);
isSpinner = new ReactiveVar(false);
isOverlay = new ReactiveVar(false);

Meteor.startup(function() {
	Meteor.subscribe("userData");
	Meteor.subscribe("gameAssignments");
});
