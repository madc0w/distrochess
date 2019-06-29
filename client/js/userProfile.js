const user = new ReactiveVar();

Template.userProfile.helpers({
	formatInt : function(i) {
		return i ? Math.round(i) : "-";
	},

	dateFormat : function(date) {
		return clientUtils.formatDateTime(date);
	},

	fromNow : function(date) {
		return clientUtils.fromNow(date);
	},

	user : function() {
		return user.get();
	},
});


Template.userProfile.onCreated(function() {
	user.set(null);
	isSpinner.set(true);
	Meteor.call("getUserData", profileUserId, function(err, result) {
		isSpinner.set(false);
		if (err) {
			message.set(err.reason);
		} else {
			user.set(result);
		}
	});
});
