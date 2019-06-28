Template.main.helpers({
	privacyPolicyLink : function() {
		return clientUtils.makeAndroidLink("https://www.distrochess.com/static/privacy-policy.html");
	},

	isNeedCookieConsent : function() {
		return !Meteor.isCordova && !localStorage.getItem("cookie-consent");
	},

	toastText : function() {
		return toastText.get();
	},

	languages : function() {
		const languages = [];
		for (var code in utils.getLanguages()) {
			languages.push({
				code : code,
				name : utils.getLanguages()[code]
			});
		}
		languages.sort(function(lang1, lang2) {
			return lang1.name > lang2.name ? 1 : -1;
		});
		return languages;
	},

	templateName : function() {
		return templateName.get();
	},

	message : function() {
		return message.get();
	},

	isSpinner : function() {
		return isSpinner.get();
	},

	languageCancel : function() {
		return function() {
			dialog.set(null);
		};
	},
});

Template.main.events({
	"click #cookie-consent-ok-button" : function(e) {
		localStorage.setItem("cookie-consent", true);
		$("#cookie-consent").hide();
	},

	"click #message-ok-button" : function(e) {
		message.set(null);
	},

	"click .language-button" : function(e) {
		const language = this.code;
		TAPi18n.setLanguage(language);
		localStorage.setItem("language", language);
		dialog.set(null);
	},

	"click #header-logo" : function(e) {
		Router.go("/");
	},

	"click #message-ok-button" : function(e) {
		message.set(null);
	},
});


Template.main.onRendered(() => {
	//	Meteor.call("log", {
	//		innerWidth : innerWidth,
	//		outerWidth : outerWidth,
	//		"screen.width" : screen.width,
	//		"screen.availWidth" : screen.availWidth,
	//		isSmallScreen : clientUtils.isSmallScreen(),
	//		isMobile : clientUtils.isMobile(),
	//		isCordova : Meteor.isCordova,
	//	});
	if (clientUtils.isMobile() && !Meteor.isCordova) {
		// TODO apple store url...
		const storeUrl = clientUtils.isIOS() ? "https://www.distrochess.com/img/crapple.jpg" : "https://play.google.com/store/apps/details?id=com.distrochess";
		message.set(TAPi18n.__("use_the_app", {
			storeUrl : storeUrl
		}));
	}
});

Template.headerLink.helpers({
	selectedClass : function() {
		return this.key == templateName.get() || (this.key == "play" && templateName.get() == "chessBoard") ? "selected" : null;
	},
});


Template.headerLink.events({
	"click .header-menu-item" : function(e) {
		dialog.set(null);
		message.set(null);
		if (this.key == "language") {
			dialog.set("language-dialog");
		} else if (this.key == "play") {
			Router.go("/");
		} else {
			Router.go("/" + this.key);
		}
	},
});
