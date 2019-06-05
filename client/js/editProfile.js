Template.editProfile.helpers({
	dateFormat : function(date) {
		return moment(date).format("MMM D, YYYY HH:mm");
	},

	authService : function() {
		const services = Meteor.user() && Meteor.user().services;
		if (services) {
			if (services.google) {
				return "Google";
			} else if (services.github) {
				return "Github";
			}
		}
		return null;
	},
});

Template.editProfile.onRendered(function() {
	this.autorun(() => {
		if (Meteor.user()) {
			$("#username-field").val(utils.getUsername());
		}
	});
});
