Template.editProfile.helpers({
	avatar : function() {
		return utils.getAvatar();
	},

	formatInt : function(i) {
		return i ? Math.round(i) : "-";
	},

	dateFormat : function(date) {
		return clientUtils.formatDateTime(date);
	},

	authService : function() {
		const services = Meteor.user() && Meteor.user().services;
		if (services) {
			if (services.google) {
				return "Google";
			} else if (services.github) {
				return "Github";
			} else if (services.facebook) {
				return "Facebook";
			}
		}
		return null;
	},

	email : function() {
		return utils.getEmail();
	},
});

Template.editProfile.events({
	"click #receive-emails-checkbox" : function(e) {
		const isReceiveNotifications = $("#receive-emails-checkbox").prop("checked");
		isSpinner.set(true);
		Meteor.call("setReceiveNotifcations", isReceiveNotifications, function(err, result) {
			isSpinner.set(false);
		});
	},

	"click #save-password-button" : function(e) {
		$("#profile-password1-input").removeClass("invalid");
		$("#profile-password2-input").removeClass("invalid");
		const currentPassword = $("#current-password-input").val();
		const password = $("#profile-password1-input").val();
		const password2 = $("#profile-password2-input").val();

		var messageText = "";
		var isValid = true;
		if (password.length < 6) {
			$("#profile-password1-input").addClass("invalid");
			messageText += TAPi18n.__("password_too_short") + "<br/>";
			isValid = false;
		}

		if (password != password2) {
			$("#profile-password2-input").addClass("invalid");
			messageText += TAPi18n.__("passwords_do_not_match") + "<br/>";
			isValid = false;
		}
		if (isValid) {
			// contrary to what docs would have us believe, this function is not actually a thing
			// https://docs.meteor.com/api/passwords.html#Accounts-setPassword  wtf?!!?
			//			Accounts.setPassword(Meteor.userId(), password);
			isSpinner.set(true);
			Accounts.changePassword(currentPassword, password, function(err) {
				isSpinner.set(false);
				if (err) {
					message.set(err.reason);
				} else {
					message.set(TAPi18n.__("password_set"));
				}
			});

		} else {
			message.set(messageText);
		}
	},

	"click #save-username-button" : function(e) {
		$("#profile-username-input").removeClass("invalid");
		const username = $("#profile-username-input").val().trim();
		if (username.length < 3) {
			$("#profile-username-input").addClass("invalid");
			message.set(TAPi18n.__("username_too_short"));
		} else {
			isSpinner.set(true);
			Meteor.call("setUsername", username, function(err, isAvailable) {
				isSpinner.set(false);
				if (isAvailable) {
					message.set(TAPi18n.__("username_set"));
				} else {
					message.set(TAPi18n.__("username_in_use"));
					$("#profile-username-input").addClass("invalid");
				}
			});
		}
	},

	"click #save-email-button" : function(e) {
		$("#profile-email-input").removeClass("invalid");
		const email = $("#profile-email-input").val().trim();
		if (email.match(/^\S+@\S+\.\S+$/)) {
			isSpinner.set(true);
			Meteor.call("setEmail", email, function(err, isAvailable) {
				isSpinner.set(false);
				if (isAvailable) {
					message.set(TAPi18n.__("email_set"));
				} else {
					message.set(TAPi18n.__("email_in_use"));
					$("#profile-email-input").addClass("invalid");
				}
			});
		} else {
			$("#profile-email-input").addClass("invalid");
			message.set(TAPi18n.__("invalid_email"));
		}
	},
});


Template.editProfile.onRendered(function() {
	this.autorun(() => {
		if (Meteor.user()) {
			$("#username-field").val(utils.getUsername());
			$("#receive-emails-checkbox").prop("checked", !!Meteor.user().isReceiveNotifications);
			$("#profile-email-input").val(utils.getEmail());
		}
	});
});
