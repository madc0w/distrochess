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

	document.addEventListener("keyup", function(e) {
		if (e.key == "Escape") {
			message.set(null);
		}
	});

	TAPi18n.setLanguage(localStorage.getItem("language") || navigator.language);

	Meteor.subscribe("userData");
	Meteor.subscribe("gameAssignments");

	Template.registerHelper("equals", function(a, b) {
		return a == b;
	});

	/**
	 * pass any number of args from a template, like this:
	 *  {{#if or arg1 arg2 arg3}} .... {{/if}}
	 */
	Template.registerHelper("or", function() {
		for (var i in arguments) {
			if (i == arguments.length - 1) {
				return false;
			}
			if (arguments[i]) {
				return true;
			}
		}
		return false;
	});

	/**
	 * pass any number of args from a template, like this:
	 *  {{#if and arg1 arg2 arg3}} .... {{/if}}
	 */
	Template.registerHelper("and", function() {
		for (var i in arguments) {
			if (i == arguments.length - 1) {
				return true;
			}
			if (!arguments[i]) {
				return false;
			}
		}
		return true;
	});

	/**
	 * pass a single argument from a template, like this:
	 *  {{#if not arg}} .... {{/if}}
	 */
	Template.registerHelper("not", function(arg) {
		return !arg;
	});

});
