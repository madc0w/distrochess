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

Meteor.publish("usernames", function(userIds) {
	return Meteor.users.find({
		_id : {
			$in : userIds
		}
	}, {
		fields : {
			username : true,
			"profile.name" : true,
		}
	});

});

Meteor.publish("userGames", function() {
	if (this.userId) {
		return Games.find({
			_id : {
				$in : Meteor.user().gameIds
			}
		});
	}
	this.ready();
});

Meteor.publish("game", function(gameId) {
	return Games.find({
		id : gameId
	});
});
