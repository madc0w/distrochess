// see https://guide.meteor.com/accounts.html#publish-custom-data
Meteor.publish("userData", function() {
	//	this.unblock();
	if (this.userId) {
		return Meteor.users.find({
			_id : this.userId
		});
	}
	this.ready();
});

Meteor.publish("gameAssignments", function() {
	//	this.unblock();
	if (this.userId) {
		return GameAssignments.find({
			userId : this.userId
		});
	}
	this.ready();
});
