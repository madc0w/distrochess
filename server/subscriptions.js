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

Meteor.publish("users", function() {
	if (Meteor.user() && Meteor.user().isAdmin) {
		return Meteor.users.find();
	}
	this.ready();
});


Meteor.publish("userGames", function() {
	if (this.userId) {
		return Games.find({
			_id : {
				$in : Meteor.user().gameIds
			}
		}, {
			lastMoveTime : -1,
			limit : GAME_HISTORY_LIMIT
		});
	}
	this.ready();
});

Meteor.publish("game", function(gameId) {
	return Games.find({
		id : gameId
	});
});

Meteor.publish("comments", function(gameId) {
	return Comments.find({
		gameId : gameId
	}, {
		date : -1,
		limit : COMMENT_HISTORY_LIMIT
	});
});
