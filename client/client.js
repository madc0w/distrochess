message = new ReactiveVar(null);
templateName = new ReactiveVar();
isSpinner = new ReactiveVar(false);
isOverlay = new ReactiveVar(false);
isSigninDialog = new ReactiveVar(false);

Meteor.startup(function() {
	// because we can't seem to redirect everything to www.distrochess.com by using DNS, for obscure reasons
	if (!location.host.startsWith("localhost") && location.host != "www.distrochess.com") {
		location = "http://www.distrochess.com";
	}

	TAPi18n.setLanguage(localStorage.getItem("language") || navigator.language);

	Meteor.subscribe("userData");
	Meteor.subscribe("gameAssignments");
});
