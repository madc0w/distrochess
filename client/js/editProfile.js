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

	email : function() {
		return Meteor.user() && Meteor.user().emails && Meteor.user().emails.length > 0 && Meteor.user().emails[0].address;
	},
});

Template.editProfile.events({
	"click #save-password-button" : function(e) {
		$("#password1-input").removeClass("invalid");
		$("#password2-input").removeClass("invalid");
		const currentPassword = $("#current-password-input").val();
		const password = $("#password1-input").val();
		const password2 = $("#password2-input").val();

		var messageText = "";
		var isValid = true;
		if (password.length < 6) {
			$("#password1-input").addClass("invalid");
			messageText += TAPi18n.__("password_too_short") + "<br/>";
			isValid = false;
		}

		if (password != password2) {
			$("#password2-input").addClass("invalid");
			messageText += TAPi18n.__("passwords_do_not_match") + "<br/>";
			isValid = false;
		}
		if (isValid) {
			// contrary to what docs would have us believe, this function is not actually a thing
			// https://docs.meteor.com/api/passwords.html#Accounts-setPassword  wtf?!!?
			//			Accounts.setPassword(Meteor.userId(), password);
			Accounts.changePassword(currentPassword, password, function(err) {
				if (!err) {
					message.set(TAPi18n.__("password_set"));
				}
			});

		} else {
			message.set(messageText);
		}
	},

	"click #save-username-button" : function(e) {
		$("#username-input").removeClass("invalid");
		const username = $("#username-input").val().trim();
		if (username.length < 3) {
			$("#username-input").addClass("invalid");
			message.set(TAPi18n.__("username_too_short"));
		} else {
			Meteor.call("setUsername", username, function(err, isAvailable) {
				if (isAvailable) {
					message.set(TAPi18n.__("username_set"));
				} else {
					message.set(TAPi18n.__("username_in_use"));
					$("#username-input").addClass("invalid");
				}
			});
		}
	},
});


Template.editProfile.onRendered(function() {
	this.autorun(() => {
		if (Meteor.user()) {
			$("#username-field").val(utils.getUsername());
		}
	});
});
