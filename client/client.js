message = new ReactiveVar(null);
dialog = new ReactiveVar(null);
templateName = new ReactiveVar();
isSpinner = new ReactiveVar(false);
historyGameId = new ReactiveVar();
toastText = new ReactiveVar(null);

passwordResetToken = null;

Meteor.startup(function() {
	// because we can't seem to redirect everything to www.distrochess.com by using DNS, for obscure reasons
	if (!location.host.startsWith("localhost") && location.host != "www.distrochess.com") {
		location = "http://www.distrochess.com";
	}

	if (clientUtils.isMobile() && !Meteor.isCordova) {
		const viewport = document.createElement("meta");
		viewport.name = "viewport";
		document.getElementsByTagName("head")[0].appendChild(viewport);
		viewport.setAttribute("content", "width=device-width, initial-scale=0.8");
	}

	document.addEventListener("keyup", function(e) {
		if (e.key == "Escape") {
			message.set(null);
		}
	});

	Tracker.autorun(() => {
		const language = TAPi18n.getLanguage();
		if (Meteor.user()) {
			Meteor.call("setUserInfo", language, navigator.platform, navigator.userAgent, Meteor.isCordova, screen);
		}
	});
	TAPi18n.setLanguage(localStorage.getItem("language") || navigator.language);

	Tracker.autorun(() => {
		const _dialog = dialog.get();
		if (_dialog) {
			$("#" + _dialog + ",#overlay").fadeIn(200);
		} else {
			Tracker.nonreactive(() => {
				if (message.get()) {
					$(".dialog").hide();
				} else {
					$(".dialog,#overlay").hide();
				}
			});
		}
	});

	Tracker.autorun(() => {
		if (message.get()) {
			$("#overlay,#message").fadeIn(200);
		} else {
			Tracker.nonreactive(() => {
				if (dialog.get()) {
					$("#message").hide();
				} else {
					$("#overlay,#message").hide();
				}
			});
		}
	});

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

	Template.registerHelper("isSmallScreen", clientUtils.isSmallScreen);
	Template.registerHelper("isMobile", clientUtils.isMobile);
	Template.registerHelper("isCordova", function() {
		return Meteor.isCordova;
	});

});
