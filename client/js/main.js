Template.main.helpers({
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

	isNeedToSignIn : function() {
		return isNeedToSignIn.get();
	},
});

Template.main.events({
	"click" : function(e) {
		if (!$(e.target).hasClass("button")) {
			message.set(null);
		}
	},

	"click #header-logo" : function() {
		Router.go("/");
	},

	"click #message-ok-button" : function(e) {
		message.set(null);
	},

	"click .login-close-text" : function(e) {
		undoLastMove();
	},

	"click #need-to-sign-in-cancel-button" : function(e) {
		undoLastMove();
		isNeedToSignIn.set(false);
		isOverlay.set(false);
	},

	"click #need-to-sign-in-button" : function(e) {
		isNeedToSignIn.set(false);
		isOverlay.set(false);
		isSigninDialog.set(true);
	},
});


Template.main.onCreated(() => {

});
