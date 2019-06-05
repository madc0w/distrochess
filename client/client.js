moment = require("moment");

message = new ReactiveVar(null);
templateName = new ReactiveVar();
isNeedToSignIn = new ReactiveVar(false);
isSpinner = new ReactiveVar(false);
isOverlay = new ReactiveVar(false);
isSigninDialog = new ReactiveVar(false);

Meteor.startup(function() {
	// because we can't seem to redirect everything to www.distrochess.com by using DNS, for obscure reasons
	if (!location.host.startsWith("localhost") && location.host != "www.distrochess.com") {
		location = "http://www.distrochess.com";
	}

	Meteor.subscribe("userData");
	Meteor.subscribe("gameAssignments");
});
