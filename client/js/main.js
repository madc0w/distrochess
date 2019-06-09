const isLanguageDialog = new ReactiveVar(false);

Template.main.helpers({
	languages : function() {
		const languages = [];
		for (var code in utils.getLanguages()) {
			languages.push({
				code : code,
				name : utils.getLanguages()[code]
			});
		}
		return languages;
	},

	isLanguageDialog : function() {
		return isLanguageDialog.get();
	},

	templateName : function() {
		return templateName.get();
	},

	message : function() {
		return message.get();
	},

	isOverlay : function() {
		return isOverlay.get();
	},

	isSpinner : function() {
		return isSpinner.get();
	},

	languageCancel : function() {
		return function() {
			isLanguageDialog.set(false);
		};
	},
});

Template.main.events({
	"click" : function(e) {
		if (!$(e.target).hasClass("button")) {
			message.set(null);
		}
	},

	"click .language-button" : function(e) {
		const language = $(e.target).attr("language");
		TAPi18n.setLanguage(language);
		localStorage.setItem("language", language);
		isLanguageDialog.set(false);
	},

	"click #language-link" : function(e) {
		isLanguageDialog.set(true);
	},

	"click #faq-link" : function(e) {
		Router.go("/faq");
	},

	"click #forum-link" : function(e) {
		Router.go("/forum");
	},

	"click #header-logo" : function(e) {
		Router.go("/");
	},

	"click #message-ok-button" : function(e) {
		message.set(null);
	},
});
