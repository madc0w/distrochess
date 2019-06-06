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
});
