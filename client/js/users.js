Template.users.helpers({
	users : function() {
		return Meteor.users.find({}, {
			sort : {
				createdAt : -1
			}
		});
	},

	username : function() {
		return utils.getUsername(this);
	},

	email : function() {
		return utils.getEmail(this);
	},

	avatarUrl : function() {
		return utils.getAvatar(this);
	},

	authService : function() {
		if (this.services && this.services.google) {
			return "Google";
		} else if (this.services && this.services.github) {
			return "Github";
		}
		return null;
	},

	dateFormat : function(date) {
		return utils.moment(date).format("D MMM, YYYY HH:mm");
	},
});

Template.users.events({

});

Template.users.onCreated(function() {
	this.subscribe("users");
});
