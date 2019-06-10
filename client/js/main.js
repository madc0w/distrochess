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
		languages.sort(function(lang1, lang2) {
			return lang1.name > lang2.name ? 1 : -1;
		});
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
	"click #message-ok-button" : function(e) {
		message.set(null);
	},

	"click .language-button" : function(e) {
		const language = $(e.target).attr("language");
		TAPi18n.setLanguage(language);
		localStorage.setItem("language", language);
		isLanguageDialog.set(false);
	},

	"click #header-logo" : function(e) {
		Router.go("/");
	},

	"click #message-ok-button" : function(e) {
		message.set(null);
	},
});

Template.headerLink.helpers({
	selectedClass : function() {
		return this.key == templateName.get() || (this.key == "play" && templateName.get() == "chessBoard") ? "selected" : null;
	},
});


Template.headerLink.events({
	"click .header-menu-item" : function(e) {
		if (this.key == "language") {
			isLanguageDialog.set(true);
		} else if (this.key == "play") {
			Router.go("/");
		} else {
			Router.go("/" + this.key);
		}
	},
});
